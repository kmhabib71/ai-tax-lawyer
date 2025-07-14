import { NextRequest, NextResponse } from 'next/server'
import { taxChatService } from '@/lib/ai/chat'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, userType = 'salaried' } = body
    
    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }
    
    // Test basic AI response without RAG
    const response = await taxChatService.generateResponse({
      message: question,
      userType,
      conversationHistory: [],
      context: [] // No RAG context for now
    })
    
    return NextResponse.json({
      success: true,
      data: {
        question,
        answer: response.response,
        confidence: response.confidence,
        tokens: response.tokens,
        cost: response.cost
      }
    })
    
  } catch (error) {
    console.error('Basic AI test error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Basic AI Test API - Working without RAG',
    status: 'operational'
  })
}