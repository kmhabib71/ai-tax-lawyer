import { taxChatService, ChatRequest, ChatResponse } from './chat'
import { mongodbVectorService, SearchResult } from './mongodb-vector'
import { documentProcessor } from './document-processor'

export interface RAGQuery {
  question: string
  userType: 'salaried' | 'freelancer' | 'landlord' | 'business' | 'other'
  context?: {
    income?: number
    assessmentYear?: string
    location?: string
  }
  filters?: {
    documentTypes?: string[]
    dateAfter?: string
    keywords?: string[]
  }
  retrievalOptions?: {
    maxResults?: number
    similarityThreshold?: number
    hybridSearch?: boolean
  }
}

export interface RAGResponse {
  answer: string
  sources: Array<{
    id: string
    title: string
    type: string
    content: string
    similarity: number
    section?: string
    date?: string
  }>
  confidence: number
  citations: string[]
  metadata: {
    retrievedDocuments: number
    totalTokens: number
    processingTime: number
    searchMethod: 'semantic' | 'hybrid' | 'keyword'
  }
}

export class RAGSystem {
  async query(ragQuery: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now()
    
    try {
      // Step 1: Retrieve relevant documents
      const retrievedDocs = await this.retrieveRelevantDocuments(ragQuery)
      
      // Step 2: Re-rank and select best contexts
      const selectedContexts = await this.selectBestContexts(
        retrievedDocs,
        ragQuery.question,
        ragQuery.retrievalOptions?.maxResults || 5
      )
      
      // Step 3: Generate contextual response
      const aiResponse = await this.generateContextualResponse(
        ragQuery,
        selectedContexts
      )
      
      // Step 4: Format and return response
      const processingTime = Date.now() - startTime
      
      return {
        answer: aiResponse.response,
        sources: selectedContexts.map(ctx => ({
          id: ctx.chunk.id,
          title: ctx.chunk.metadata.document_title,
          type: ctx.chunk.metadata.document_type,
          content: ctx.chunk.content.substring(0, 300) + '...',
          similarity: ctx.similarity,
          section: ctx.chunk.metadata.section,
          date: ctx.chunk.metadata.date_issued
        })),
        confidence: aiResponse.confidence,
        citations: aiResponse.citations,
        metadata: {
          retrievedDocuments: retrievedDocs.length,
          totalTokens: aiResponse.tokens,
          processingTime,
          searchMethod: this.determineSearchMethod(ragQuery)
        }
      }
      
    } catch (error) {
      console.error('RAG System error:', error)
      throw new Error(`RAG query failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async addDocumentToKnowledgeBase(
    content: string,
    title: string,
    type: 'nbr_rule' | 'sro' | 'ordinance' | 'circular' | 'gazette',
    metadata: Record<string, any> = {}
  ): Promise<string> {
    try {
      const processed = await documentProcessor.processTextDocument(
        content,
        title,
        type,
        metadata
      )
      
      await documentProcessor.storeProcessedDocument(processed)
      
      return processed.id
    } catch (error) {
      console.error('Error adding document to knowledge base:', error)
      throw error
    }
  }

  async updateKnowledgeBase(
    files: Array<{ buffer: Buffer; fileName: string; type: string }>
  ): Promise<{ processed: number; failed: number; documentIds: string[] }> {
    const results = await documentProcessor.processBatch(
      files as any,
      {
        chunkSize: 2000,
        chunkOverlap: 200,
        extractKeywords: true,
        detectLanguage: true
      }
    )
    
    return {
      processed: results.length,
      failed: files.length - results.length,
      documentIds: results.map(doc => doc.id)
    }
  }

  async searchKnowledgeBase(
    query: string,
    filters?: RAGQuery['filters'],
    limit: number = 10
  ): Promise<SearchResult[]> {
    return await mongodbVectorService.searchSimilar(
      query,
      limit,
      0.7, // similarity threshold
      {
        document_type: filters?.documentTypes,
        keywords: filters?.keywords,
        date_after: filters?.dateAfter
      }
    )
  }

  async getKnowledgeBaseStats(): Promise<{
    totalDocuments: number
    totalChunks: number
    documentsByType: Record<string, number>
    lastUpdated: string
  }> {
    try {
      return await mongodbVectorService.getKnowledgeBaseStats()
    } catch (error) {
      console.error('Error getting knowledge base stats:', error)
      throw error
    }
  }

  private async retrieveRelevantDocuments(ragQuery: RAGQuery): Promise<SearchResult[]> {
    const { question, filters, retrievalOptions } = ragQuery
    
    // Use hybrid search if enabled, otherwise semantic search
    if (retrievalOptions?.hybridSearch) {
      return await mongodbVectorService.hybridSearch(
        question,
        retrievalOptions?.maxResults || 8,
        {
          document_type: filters?.documentTypes,
          keywords: filters?.keywords,
          date_after: filters?.dateAfter
        }
      )
    } else {
      // Primary semantic search using MongoDB Atlas
      return await mongodbVectorService.searchSimilar(
        question,
        retrievalOptions?.maxResults || 8,
        retrievalOptions?.similarityThreshold || 0.7,
        {
          document_type: filters?.documentTypes,
          keywords: filters?.keywords,
          date_after: filters?.dateAfter
        }
      )
    }
  }

  private async selectBestContexts(
    results: SearchResult[],
    question: string,
    maxResults: number
  ): Promise<SearchResult[]> {
    // Sort by similarity score
    const sortedResults = results.sort((a, b) => b.similarity - a.similarity)
    
    // Select top results ensuring diversity
    const selectedResults: SearchResult[] = []
    const usedDocuments = new Set<string>()
    
    for (const result of sortedResults) {
      if (selectedResults.length >= maxResults) break
      
      // Ensure we don't take too many chunks from the same document
      const docId = result.chunk.metadata.document_id
      const chunksFromThisDoc = selectedResults.filter(
        r => r.chunk.metadata.document_id === docId
      ).length
      
      if (chunksFromThisDoc < 2) {
        selectedResults.push(result)
        usedDocuments.add(docId)
      }
    }
    
    return selectedResults
  }

  private async generateContextualResponse(
    ragQuery: RAGQuery,
    contexts: SearchResult[]
  ): Promise<ChatResponse> {
    // Prepare context from retrieved documents
    const contextString = contexts
      .map((ctx, index) => {
        return `Document ${index + 1}: ${ctx.chunk.metadata.document_title}
Type: ${ctx.chunk.metadata.document_type}
${ctx.chunk.metadata.section ? `Section: ${ctx.chunk.metadata.section}` : ''}
Content: ${ctx.chunk.content}
---`
      })
      .join('\n\n')
    
    // Build enhanced prompt with context
    const enhancedPrompt = this.buildContextualPrompt(ragQuery, contextString)
    
    // Generate response using the chat service
    const chatRequest: ChatRequest = {
      message: enhancedPrompt,
      userType: ragQuery.userType,
      conversationHistory: [],
      context: contexts.map(ctx => ctx.chunk.content)
    }
    
    return await taxChatService.generateResponse(chatRequest)
  }

  private buildContextualPrompt(ragQuery: RAGQuery, context: string): string {
    const { question, userType, context: userContext } = ragQuery
    
    let prompt = `Based on the following official Bangladesh tax documents, please provide a comprehensive answer to the user's question.

RETRIEVED DOCUMENTS:
${context}

USER PROFILE:
- Type: ${userType}
${userContext?.income ? `- Annual Income: BDT ${userContext.income.toLocaleString()}` : ''}
${userContext?.assessmentYear ? `- Assessment Year: ${userContext.assessmentYear}` : ''}
${userContext?.location ? `- Location: ${userContext.location}` : ''}

USER QUESTION: ${question}

INSTRUCTIONS:
1. Answer based ONLY on the information provided in the documents above
2. Quote specific sections, rules, or provisions where relevant
3. Provide practical, actionable advice for the user's profile
4. If the documents don't contain sufficient information, clearly state this
5. Include relevant NBR rule citations in your response
6. Consider the user's specific circumstances in your advice

Please provide a detailed, accurate response that helps the user understand their tax obligations and opportunities.`

    return prompt
  }

  private extractQueryKeywords(question: string): string[] {
    // Simple keyword extraction for tax queries
    const taxTerms = [
      'tax', 'deduction', 'exemption', 'allowance', 'rebate', 'slab',
      'income', 'salary', 'freelance', 'business', 'rental', 'investment',
      'section', 'rule', 'sro', 'ordinance', 'nbr', 'filing', 'return',
      'advance', 'withholding', 'penalty', 'compliance', 'medical',
      'house', 'rent', 'insurance', 'savings', 'certificate'
    ]
    
    const questionLower = question.toLowerCase()
    const foundKeywords = taxTerms.filter(term => 
      questionLower.includes(term)
    )
    
    return foundKeywords
  }

  private determineSearchMethod(ragQuery: RAGQuery): 'semantic' | 'hybrid' | 'keyword' {
    if (ragQuery.retrievalOptions?.hybridSearch) {
      return 'hybrid'
    }
    return 'semantic'
  }

  // Utility method for testing the RAG system
  async testRAGSystem(testQueries: string[]): Promise<Array<{
    query: string
    response: RAGResponse
    success: boolean
    error?: string
  }>> {
    const results = []
    
    for (const query of testQueries) {
      try {
        const response = await this.query({
          question: query,
          userType: 'other',
          retrievalOptions: {
            maxResults: 3,
            similarityThreshold: 0.6
          }
        })
        
        results.push({
          query,
          response,
          success: true
        })
      } catch (error) {
        results.push({
          query,
          response: {} as RAGResponse,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return results
  }
}

export const ragSystem = new RAGSystem()