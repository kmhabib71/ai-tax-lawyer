import { NextRequest, NextResponse } from 'next/server'
import { taxChatService } from '@/lib/ai/chat'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body
    
    if (!text) {
      return NextResponse.json({
        error: 'Text is required'
      }, { status: 400 })
    }
    
    console.log('Testing embedding generation for text:', text.substring(0, 100))
    
    const startTime = Date.now()
    const embedding = await taxChatService.generateEmbedding(text)
    const endTime = Date.now()
    
    return NextResponse.json({
      success: true,
      data: {
        embeddingLength: embedding.length,
        processingTime: endTime - startTime,
        textLength: text.length,
        firstFewValues: embedding.slice(0, 5)
      }
    })
  } catch (error) {
    console.error('Embedding test error:', error)
    return NextResponse.json({
      error: 'Embedding generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Embedding test endpoint - POST with {"text": "your text"}'
  })
}