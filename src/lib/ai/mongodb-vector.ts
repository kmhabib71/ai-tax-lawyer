import { MongoClient } from 'mongodb'
import { openaiService } from './openai'

export interface SearchResult {
  chunk: {
    id: string
    content: string
    metadata: {
      document_title: string
      document_type: string
      document_id: string
      section?: string
      date_issued?: string
      language: string
      source_document: string
      chunk_index: number
      character_count: number
    }
  }
  similarity: number
  score?: number
}

export interface SearchFilters {
  document_type?: string[]
  language?: string[]
  keywords?: string[]
  date_after?: string
}

export class MongoDBVectorService {
  private client: MongoClient | null = null
  private db: any = null
  private collection: any = null

  async initialize() {
    if (!this.client) {
      const connectionString = process.env.MONGODB_URI
      if (!connectionString) {
        throw new Error('MONGODB_URI environment variable is required')
      }
      
      this.client = new MongoClient(connectionString)
      await this.client.connect()
      this.db = this.client.db('ai_tax_lawyer')
      this.collection = this.db.collection('document_chunks')
      
      console.log('✅ MongoDB Atlas connected for vector search')
    }
  }

  async searchSimilar(
    query: string,
    limit: number = 10,
    similarityThreshold: number = 0.7,
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    try {
      await this.initialize()

      // Generate embedding for the query
      const queryEmbedding = await openaiService.generateEmbedding(query)

      // Try Atlas Vector Search first (if index exists)
      try {
        const vectorResults = await this.vectorSearch(queryEmbedding, limit, filters)
        if (vectorResults.length > 0) {
          return vectorResults.filter(result => result.similarity >= similarityThreshold)
        }
      } catch (vectorError) {
        console.log('Vector search not available, falling back to text search')
      }

      // Fallback to text search
      return await this.textSearch(query, limit, filters)

    } catch (error) {
      console.error('MongoDB vector search error:', error)
      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async vectorSearch(
    queryEmbedding: number[],
    limit: number,
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: 'ai-tax-lawyer-index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: limit * 10,
          limit: limit
        }
      },
      {
        $addFields: {
          similarity: { $meta: 'vectorSearchScore' }
        }
      },
      {
        $project: {
          _id: 1,
          content: 1,
          document_type: 1,
          source_document: 1,
          language: 1,
          chunk_index: 1,
          character_count: 1,
          section: 1,
          chunk_id: 1,
          processing_date: 1,
          similarity: 1
        }
      }
    ]

    // Add filters if specified
    if (filters) {
      const matchConditions: any = {}
      
      if (filters.document_type && filters.document_type.length > 0) {
        matchConditions.document_type = { $in: filters.document_type }
      }
      
      if (filters.language && filters.language.length > 0) {
        matchConditions.language = { $in: filters.language }
      }

      if (Object.keys(matchConditions).length > 0) {
        // Add filter to vector search
        pipeline[0].$vectorSearch.filter = matchConditions
      }
    }

    const results = await this.collection.aggregate(pipeline).toArray()

    return results.map((doc: any) => ({
      chunk: {
        id: doc.chunk_id || doc._id.toString(),
        content: doc.content,
        metadata: {
          document_title: this.getDocumentTitle(doc.document_type, doc.source_document),
          document_type: doc.document_type,
          document_id: doc.source_document,
          section: doc.section,
          date_issued: doc.processing_date,
          language: doc.language,
          source_document: doc.source_document,
          chunk_index: doc.chunk_index,
          character_count: doc.character_count
        }
      },
      similarity: doc.similarity || 0,
      score: doc.similarity || 0
    }))
  }

  private async textSearch(
    query: string,
    limit: number,
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    const searchQuery: any = {
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { $text: { $search: query } }
      ]
    }

    // Add filters
    if (filters) {
      if (filters.document_type && filters.document_type.length > 0) {
        searchQuery.document_type = { $in: filters.document_type }
      }
      
      if (filters.language && filters.language.length > 0) {
        searchQuery.language = { $in: filters.language }
      }
    }

    const results = await this.collection
      .find(searchQuery)
      .limit(limit)
      .toArray()

    return results.map((doc: any) => ({
      chunk: {
        id: doc.chunk_id || doc._id.toString(),
        content: doc.content,
        metadata: {
          document_title: this.getDocumentTitle(doc.document_type, doc.source_document),
          document_type: doc.document_type,
          document_id: doc.source_document,
          section: doc.section,
          date_issued: doc.processing_date,
          language: doc.language,
          source_document: doc.source_document,
          chunk_index: doc.chunk_index,
          character_count: doc.character_count
        }
      },
      similarity: 0.8, // Default similarity for text search
      score: 0.8
    }))
  }

  async hybridSearch(
    query: string,
    limit: number = 10,
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    try {
      await this.initialize()

      // Get vector search results
      const vectorResults = await this.searchSimilar(query, Math.ceil(limit * 0.7), 0.6, filters)
      
      // Get text search results
      const textResults = await this.textSearch(query, Math.ceil(limit * 0.3), filters)
      
      // Combine and deduplicate
      const combinedResults = [...vectorResults, ...textResults]
      const uniqueResults = new Map<string, SearchResult>()
      
      combinedResults.forEach(result => {
        const id = result.chunk.id
        if (!uniqueResults.has(id) || uniqueResults.get(id)!.similarity < result.similarity) {
          uniqueResults.set(id, result)
        }
      })
      
      // Sort by similarity and return top results
      return Array.from(uniqueResults.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)

    } catch (error) {
      console.error('Hybrid search error:', error)
      // Fallback to text search only
      return await this.textSearch(query, limit, filters)
    }
  }

  async getKnowledgeBaseStats(): Promise<{
    totalDocuments: number
    totalChunks: number
    documentsByType: Record<string, number>
    lastUpdated: string
  }> {
    try {
      await this.initialize()

      const totalChunks = await this.collection.countDocuments({})
      
      // Get document breakdown by type
      const typeAggregation = await this.collection.aggregate([
        {
          $group: {
            _id: '$document_type',
            count: { $sum: 1 }
          }
        }
      ]).toArray()

      const documentsByType: Record<string, number> = {}
      typeAggregation.forEach((doc: any) => {
        documentsByType[doc._id] = doc.count
      })

      // Get unique source documents
      const uniqueDocuments = await this.collection.distinct('source_document')

      return {
        totalDocuments: uniqueDocuments.length,
        totalChunks,
        documentsByType,
        lastUpdated: new Date().toISOString()
      }

    } catch (error) {
      console.error('Error getting knowledge base stats:', error)
      return {
        totalDocuments: 0,
        totalChunks: 0,
        documentsByType: {},
        lastUpdated: new Date().toISOString()
      }
    }
  }

  async addDocument(
    content: string,
    metadata: {
      document_type: string
      source_document: string
      language: string
      section?: string
      chunk_index: number
    }
  ): Promise<string> {
    try {
      await this.initialize()

      // Generate embedding
      const embedding = await openaiService.generateEmbedding(content)

      // Create document
      const doc = {
        content,
        embedding,
        document_type: metadata.document_type,
        source_document: metadata.source_document,
        language: metadata.language,
        section: metadata.section,
        chunk_index: metadata.chunk_index,
        character_count: content.length,
        chunk_id: `${metadata.document_type}_chunk_${metadata.chunk_index}`,
        processing_date: new Date().toISOString(),
        created_at: new Date()
      }

      const result = await this.collection.insertOne(doc)
      return result.insertedId.toString()

    } catch (error) {
      console.error('Error adding document:', error)
      throw error
    }
  }

  private getDocumentTitle(documentType: string, sourceDocument: string): string {
    const titleMap: Record<string, string> = {
      'finance_act': 'Finance Act 2025 (Bengali)',
      'income_tax_act': 'Income Tax Act 2023 (Bengali)', 
      'vat_act': 'VAT Act 2012 (Bengali)'
    }

    return titleMap[documentType] || sourceDocument
  }

  async close() {
    if (this.client) {
      await this.client.close()
      this.client = null
      this.db = null
      this.collection = null
    }
  }

  // Test methods
  async testConnection(): Promise<boolean> {
    try {
      await this.initialize()
      await this.collection.findOne({})
      return true
    } catch (error) {
      console.error('MongoDB connection test failed:', error)
      return false
    }
  }

  async testVectorSearch(query: string = "মূল্য সংযোজন কর"): Promise<{
    success: boolean
    results: number
    method: 'vector' | 'text'
    error?: string
  }> {
    try {
      await this.initialize()

      // Try vector search
      const queryEmbedding = await openaiService.generateEmbedding(query)
      
      try {
        const vectorResults = await this.vectorSearch(queryEmbedding, 3)
        return {
          success: true,
          results: vectorResults.length,
          method: 'vector'
        }
      } catch (vectorError) {
        // Fall back to text search
        const textResults = await this.textSearch(query, 3)
        return {
          success: true,
          results: textResults.length,
          method: 'text'
        }
      }

    } catch (error) {
      return {
        success: false,
        results: 0,
        method: 'text',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const mongodbVectorService = new MongoDBVectorService()