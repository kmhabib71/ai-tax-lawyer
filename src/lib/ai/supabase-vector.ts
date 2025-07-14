import { createClient } from '@supabase/supabase-js'
import { taxChatService } from './chat'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export interface DocumentChunk {
  id: string
  content: string
  embedding: number[]
  metadata: {
    document_id: string
    document_title: string
    document_type: 'nbr_rule' | 'sro' | 'ordinance' | 'circular' | 'gazette'
    page_number?: number
    section?: string
    date_issued?: string
    keywords: string[]
  }
}

export interface SearchResult {
  chunk: DocumentChunk
  similarity: number
}

export class SupabaseVectorService {
  
  async checkDatabaseSetup(): Promise<{
    tablesExist: boolean
    functionsExist: boolean
    sampleDataExists: boolean
    errors: string[]
  }> {
    const errors: string[] = []
    let tablesExist = true
    let functionsExist = true
    let sampleDataExists = false

    try {
      // Check if tables exist
      const { error: docsError } = await supabase
        .from('tax_documents')
        .select('id')
        .limit(1)
      
      if (docsError) {
        tablesExist = false
        errors.push(`tax_documents table: ${docsError.message}`)
      }

      const { error: chunksError } = await supabase
        .from('document_chunks')
        .select('id')
        .limit(1)
      
      if (chunksError) {
        tablesExist = false
        errors.push(`document_chunks table: ${chunksError.message}`)
      }

      // Check if search function exists
      try {
        const { error: funcError } = await supabase.rpc('search_similar_chunks', {
          query_embedding: new Array(1536).fill(0),
          similarity_threshold: 0.7,
          match_count: 1
        })
        
        if (funcError && funcError.message.includes('function') && funcError.message.includes('does not exist')) {
          functionsExist = false
          errors.push(`search_similar_chunks function: ${funcError.message}`)
        }
      } catch (error) {
        functionsExist = false
        errors.push(`Function test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Check if sample data exists
      const { data: sampleData } = await supabase
        .from('tax_documents')
        .select('id')
        .eq('id', 'sample_nbr_001')
        .single()
      
      if (sampleData) {
        sampleDataExists = true
      }

    } catch (error) {
      errors.push(`Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      tablesExist,
      functionsExist,
      sampleDataExists,
      errors
    }
  }

  async initializeTables() {
    try {
      // Check if tables exist by querying them
      const { error: docsError } = await supabase
        .from('tax_documents')
        .select('id')
        .limit(1)
      
      if (docsError) {
        console.warn('Tax documents table may not exist:', docsError.message)
        console.log('Please run the supabase-setup.sql script in your Supabase SQL editor')
      }

      const { error: chunksError } = await supabase
        .from('document_chunks')
        .select('id')
        .limit(1)
      
      if (chunksError) {
        console.warn('Document chunks table may not exist:', chunksError.message)
        console.log('Please run the supabase-setup.sql script in your Supabase SQL editor')
      }

      if (!docsError && !chunksError) {
        console.log('Supabase vector tables verified successfully')
      }
    } catch (error) {
      console.error('Error initializing Supabase tables:', error)
      // Don't throw error to allow service to continue working
      console.log('Continuing with service initialization...')
    }
  }

  async storeDocument(
    documentId: string,
    title: string,
    content: string,
    type: DocumentChunk['metadata']['document_type'],
    metadata: Partial<DocumentChunk['metadata']> = {}
  ): Promise<void> {
    try {
      // Store document metadata
      const { error: docError } = await supabase
        .from('tax_documents')
        .upsert({
          id: documentId,
          title,
          type,
          content,
          metadata: {
            ...metadata,
            processed_at: new Date().toISOString()
          }
        })

      if (docError) throw docError

      // Process content into chunks
      const chunks = await this.processIntoChunks(content, {
        document_id: documentId,
        document_title: title,
        document_type: type,
        keywords: metadata.keywords || ['tax', 'bangladesh', 'nbr'],
        ...metadata
      })

      // Store chunks with embeddings
      for (const chunk of chunks) {
        await this.storeChunk(chunk)
      }

      console.log(`Document ${documentId} stored with ${chunks.length} chunks`)
    } catch (error) {
      console.error('Error storing document:', error)
      throw error
    }
  }

  async storeChunk(chunk: DocumentChunk): Promise<void> {
    try {
      const { error } = await supabase
        .from('document_chunks')
        .upsert({
          id: chunk.id,
          content: chunk.content,
          embedding: chunk.embedding,
          document_id: chunk.metadata.document_id,
          document_title: chunk.metadata.document_title,
          document_type: chunk.metadata.document_type,
          page_number: chunk.metadata.page_number,
          section: chunk.metadata.section,
          date_issued: chunk.metadata.date_issued,
          keywords: chunk.metadata.keywords
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing chunk:', error)
      throw error
    }
  }

  async searchSimilar(
    query: string,
    limit: number = 5,
    similarityThreshold: number = 0.7,
    filters?: {
      document_type?: string[]
      keywords?: string[]
      date_after?: string
    }
  ): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await taxChatService.generateEmbedding(query)

      // Build the search query
      let searchQuery = supabase
        .from('document_chunks')
        .select(`
          id,
          content,
          embedding,
          document_id,
          document_title,
          document_type,
          page_number,
          section,
          date_issued,
          keywords
        `)
        .order('similarity', { ascending: false })
        .limit(limit)

      // Apply filters
      if (filters?.document_type) {
        searchQuery = searchQuery.in('document_type', filters.document_type)
      }

      if (filters?.date_after) {
        searchQuery = searchQuery.gte('date_issued', filters.date_after)
      }

      // Execute similarity search using pgvector
      const { data, error } = await supabase.rpc('search_similar_chunks', {
        query_embedding: queryEmbedding,
        similarity_threshold: similarityThreshold,
        match_count: limit
      })

      if (error) throw error

      // Format results
      const results: SearchResult[] = (data || []).map((row: any) => ({
        chunk: {
          id: row.id,
          content: row.content,
          embedding: row.embedding,
          metadata: {
            document_id: row.document_id,
            document_title: row.document_title,
            document_type: row.document_type,
            page_number: row.page_number,
            section: row.section,
            date_issued: row.date_issued,
            keywords: row.keywords || []
          }
        },
        similarity: row.similarity
      }))

      return results
    } catch (error) {
      console.error('Error searching similar chunks:', error)
      return []
    }
  }

  async getDocumentsByType(type: DocumentChunk['metadata']['document_type']): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('tax_documents')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching documents by type:', error)
      return []
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      // Delete chunks first
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId)

      if (chunksError) throw chunksError

      // Delete document
      const { error: docError } = await supabase
        .from('tax_documents')
        .delete()
        .eq('id', documentId)

      if (docError) throw docError

      console.log(`Document ${documentId} deleted successfully`)
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  }

  private async processIntoChunks(
    content: string,
    metadata: DocumentChunk['metadata']
  ): Promise<DocumentChunk[]> {
    // Split content into chunks (approximately 500-700 tokens each)
    const chunkSize = 1500 // characters - reduced for better performance
    const overlap = 150 // characters overlap between chunks
    const maxChunks = 20 // Limit total chunks to prevent long processing times
    
    const chunks: DocumentChunk[] = []
    let startIndex = 0
    let chunkIndex = 0

    while (startIndex < content.length && chunkIndex < maxChunks) {
      const endIndex = Math.min(startIndex + chunkSize, content.length)
      let chunkContent = content.slice(startIndex, endIndex)

      // Try to break at sentence boundaries
      if (endIndex < content.length) {
        const lastSentenceEnd = Math.max(
          chunkContent.lastIndexOf('.'),
          chunkContent.lastIndexOf('।'), // Bangla sentence end
          chunkContent.lastIndexOf('\n')
        )
        
        if (lastSentenceEnd > chunkSize * 0.7) {
          chunkContent = chunkContent.slice(0, lastSentenceEnd + 1)
        }
      }

      // Generate embedding for the chunk with error handling
      console.log(`Generating embedding for chunk ${chunkIndex + 1}/${Math.min(maxChunks, Math.ceil(content.length / chunkSize))}`)
      let embedding: number[]
      try {
        embedding = await taxChatService.generateEmbedding(chunkContent)
      } catch (error) {
        console.error(`Error generating embedding for chunk ${chunkIndex}:`, error)
        // Skip this chunk if embedding fails
        continue
      }

      // Extract keywords (simple approach)
      const keywords = this.extractKeywords(chunkContent)

      chunks.push({
        id: `${metadata.document_id}_chunk_${chunkIndex}`,
        content: chunkContent.trim(),
        embedding,
        metadata: {
          ...metadata,
          keywords: [...(metadata.keywords || []), ...keywords]
        }
      })

      startIndex = endIndex - overlap
      chunkIndex++
    }

    return chunks
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction for tax documents
    const taxKeywords = [
      'tax', 'income', 'deduction', 'exemption', 'rate', 'slab',
      'section', 'rule', 'ordinance', 'sro', 'nbr', 'return',
      'assessment', 'year', 'allowance', 'rebate', 'penalty',
      'compliance', 'filing', 'advance', 'withholding'
    ]

    const bangladeshTerms = [
      'bangladesh', 'dhaka', 'chittagong', 'bdt', 'taka',
      'government', 'ministry', 'finance', 'revenue'
    ]

    const allKeywords = [...taxKeywords, ...bangladeshTerms]
    const foundKeywords: string[] = []

    const lowercaseText = text.toLowerCase()
    for (const keyword of allKeywords) {
      if (lowercaseText.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword)
      }
    }

    return [...new Set(foundKeywords)] // Remove duplicates
  }
}

export const supabaseVectorService = new SupabaseVectorService()