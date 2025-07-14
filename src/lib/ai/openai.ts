import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not defined in environment variables')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default openai

// Configuration constants
export const AI_CONFIG = {
  DEFAULT_MODEL: 'gpt-4o-mini', // Cost-effective for most queries
  COMPLEX_MODEL: 'gpt-4o', // For complex tax scenarios
  EMBEDDING_MODEL: 'text-embedding-3-small', // Cost-effective embeddings
  MAX_TOKENS: 1000, // Reduced for faster responses
  TEMPERATURE: 0.1, // Low temperature for factual responses
  TOP_P: 0.95,
} as const

export const COST_OPTIMIZATION = {
  SIMPLE_QUERY_THRESHOLD: 50, // tokens
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  MAX_CONTEXT_LENGTH: 8000, // tokens
} as const