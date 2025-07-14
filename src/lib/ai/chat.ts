import OpenAI from 'openai'
import openai, { AI_CONFIG } from './openai'
import { SYSTEM_PROMPTS, RESPONSE_TEMPLATES, DISCLAIMER_TEXT } from './prompts'

export interface ChatRequest {
  message: string
  userType: 'salaried' | 'freelancer' | 'landlord' | 'business' | 'other'
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  context?: string[] // Retrieved documents for RAG
}

export interface ChatResponse {
  response: string
  sources: string[]
  confidence: number
  tokens: number
  cost: number
  citations: string[]
}

export interface StreamChunk {
  content: string
  finished: boolean
  tokens?: number
  cost?: number
  confidence?: number
  sources?: string[]
  citations?: string[]
}

export class TaxChatService {
  private calculateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4)
  }

  private calculateCost(tokens: number, model: string): number {
    // OpenAI pricing (as of 2024) - in USD
    const pricing = {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 }, // per 1K tokens
      'gpt-4o': { input: 0.005, output: 0.015 },
    }
    
    const modelPricing = pricing[model as keyof typeof pricing]
    if (!modelPricing) return 0
    
    return (tokens / 1000) * modelPricing.input
  }

  private getSystemPrompt(userType: string): string {
    const basePrompt = SYSTEM_PROMPTS.BASE
    
    switch (userType) {
      case 'salaried':
        return `${basePrompt}\n\n${SYSTEM_PROMPTS.SALARIED_EMPLOYEE}`
      case 'freelancer':
        return `${basePrompt}\n\n${SYSTEM_PROMPTS.FREELANCER}`
      case 'business':
        return `${basePrompt}\n\n${SYSTEM_PROMPTS.BUSINESS_OWNER}`
      case 'landlord':
        return `${basePrompt}\n\n${SYSTEM_PROMPTS.LANDLORD}`
      default:
        return basePrompt
    }
  }

  private determineModel(message: string, context?: string[]): string {
    const messageTokens = this.calculateTokens(message)
    const contextTokens = context ? context.reduce((sum, doc) => sum + this.calculateTokens(doc), 0) : 0
    
    // Use simple model for basic queries
    if (messageTokens < 50 && !context?.length) {
      return AI_CONFIG.DEFAULT_MODEL
    }
    
    // Use complex model for detailed analysis or when we have context
    if (contextTokens > 2000 || messageTokens > 200) {
      return AI_CONFIG.COMPLEX_MODEL
    }
    
    return AI_CONFIG.DEFAULT_MODEL
  }

  async *generateStreamingResponse(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const { message, userType, conversationHistory = [], context = [] } = request
      
      const systemPrompt = this.getSystemPrompt(userType)
      const model = this.determineModel(message, context)
      
      // Prepare context from RAG if available
      const contextText = context.length > 0 
        ? `\n\nRelevant Tax Documents:\n${context.join('\n\n---\n\n')}\n\n`
        : ''
      
      // Build conversation messages
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: systemPrompt + contextText
        },
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ]
      
      // Make streaming OpenAI API call
      const stream = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: AI_CONFIG.MAX_TOKENS,
        temperature: AI_CONFIG.TEMPERATURE,
        top_p: AI_CONFIG.TOP_P,
        stream: true,
      })
      
      let fullResponse = ''
      let totalTokens = 0
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        
        if (content) {
          fullResponse += content
          totalTokens += this.calculateTokens(content)
          
          yield {
            content,
            finished: false
          }
        }
      }
      
      // Calculate final metrics
      const cost = this.calculateCost(totalTokens, model)
      const citations = this.extractCitations(fullResponse)
      const sources = context.map((_, index) => `Document ${index + 1}`)
      const confidence = this.calculateConfidence(fullResponse, context.length, citations.length)
      
      // Add disclaimer to the final response
      const disclaimerChunk = DISCLAIMER_TEXT
      yield {
        content: disclaimerChunk,
        finished: false
      }
      
      // Final chunk with metadata
      yield {
        content: '',
        finished: true,
        tokens: totalTokens,
        cost,
        confidence,
        sources,
        citations
      }
      
    } catch (error) {
      console.error('Error generating streaming AI response:', error)
      yield {
        content: RESPONSE_TEMPLATES.ERROR,
        finished: true,
        tokens: 0,
        cost: 0,
        confidence: 0,
        sources: [],
        citations: []
      }
    }
  }

  async generateResponse(request: ChatRequest): Promise<ChatResponse> {
    try {
      const { message, userType, conversationHistory = [], context = [] } = request
      
      const systemPrompt = this.getSystemPrompt(userType)
      const model = this.determineModel(message, context)
      
      // Prepare context from RAG if available
      const contextText = context.length > 0 
        ? `\n\nRelevant Tax Documents:\n${context.join('\n\n---\n\n')}\n\n`
        : ''
      
      // Build conversation messages
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: systemPrompt + contextText
        },
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ]
      
      // Make OpenAI API call
      const completion = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: AI_CONFIG.MAX_TOKENS,
        temperature: AI_CONFIG.TEMPERATURE,
        top_p: AI_CONFIG.TOP_P,
        stream: false,
      })
      
      const response = completion.choices[0]?.message?.content || ''
      const tokens = completion.usage?.total_tokens || 0
      const cost = this.calculateCost(tokens, model)
      
      // Extract citations and sources from response
      const citations = this.extractCitations(response)
      const sources = context.map((_, index) => `Document ${index + 1}`)
      
      // Calculate confidence based on context availability and response quality
      const confidence = this.calculateConfidence(response, context.length, citations.length)
      
      // Append disclaimer
      const finalResponse = response + DISCLAIMER_TEXT
      
      return {
        response: finalResponse,
        sources,
        confidence,
        tokens,
        cost,
        citations
      }
      
    } catch (error) {
      console.error('Error generating AI response:', error)
      
      return {
        response: RESPONSE_TEMPLATES.ERROR,
        sources: [],
        confidence: 0,
        tokens: 0,
        cost: 0,
        citations: []
      }
    }
  }

  private extractCitations(response: string): string[] {
    // Extract patterns like [Section 82C], [SRO 123/2023], [Rule 44]
    const citationPattern = /\[(Section|SRO|Rule|Ordinance)[^\]]+\]/g
    return response.match(citationPattern) || []
  }

  private calculateConfidence(response: string, contextCount: number, citationCount: number): number {
    let confidence = 0.5 // Base confidence
    
    // Increase confidence if we have context documents
    if (contextCount > 0) {
      confidence += Math.min(contextCount * 0.1, 0.3)
    }
    
    // Increase confidence if response includes citations
    if (citationCount > 0) {
      confidence += Math.min(citationCount * 0.05, 0.15)
    }
    
    // Increase confidence for longer, detailed responses
    if (response.length > 500) {
      confidence += 0.1
    }
    
    return Math.min(confidence, 0.95) // Cap at 95%
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Embedding generation timeout')), 30000) // 30 second timeout
      })
      
      const embeddingPromise = openai.embeddings.create({
        model: AI_CONFIG.EMBEDDING_MODEL,
        input: text.slice(0, 8000), // Limit text length to prevent issues
      })
      
      const response = await Promise.race([embeddingPromise, timeoutPromise])
      
      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Embedding generation timed out - try with shorter text')
      }
      throw new Error('Failed to generate embedding')
    }
  }

  async calculateSimilarity(embedding1: number[], embedding2: number[]): Promise<number> {
    // Calculate cosine similarity
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }
}

export const taxChatService = new TaxChatService()