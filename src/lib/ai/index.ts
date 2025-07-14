// Export all AI utilities from a single file
export { default as openai, AI_CONFIG, COST_OPTIMIZATION } from './openai'
export { SYSTEM_PROMPTS, RESPONSE_TEMPLATES, DISCLAIMER_TEXT } from './prompts'
export { TaxChatService, taxChatService } from './chat'
export { supabaseVectorService } from './supabase-vector'
export { documentProcessor } from './document-processor'
export { ragSystem } from './rag-system'

// Export types
export type { ChatRequest, ChatResponse, StreamChunk } from './chat'
export type { DocumentChunk, SearchResult } from './supabase-vector'
export type { ProcessedDocument } from './document-processor'
export type { RAGQuery, RAGResponse } from './rag-system'