import { NextRequest, NextResponse } from 'next/server'
import { taxChatService } from '@/lib/ai'
import connectDB from '@/lib/db/connection'
import { Conversation } from '@/lib/db/models'
import { withSecurity } from '@/lib/auth/security'
import { validateChatMessage } from '@/lib/auth/validation'
import { chatRateLimit } from '@/lib/auth/rate-limit'

async function handleStreamingResponse(message: string, userType: 'salaried' | 'freelancer' | 'landlord' | 'business' | 'other', conversationId?: string) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Generate streaming response
        const responseStream = await taxChatService.generateStreamingResponse({
          message,
          userType,
          conversationHistory: [], // TODO: Load from conversation if conversationId provided
          context: [], // TODO: Implement RAG retrieval
        })
        
        for await (const chunk of responseStream) {
          const data = JSON.stringify({ 
            type: 'chunk', 
            content: chunk.content,
            finished: chunk.finished 
          })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          
          if (chunk.finished) {
            // Send final metadata
            const finalData = JSON.stringify({ 
              type: 'complete',
              metadata: {
                tokens: chunk.tokens || 0,
                cost: chunk.cost || 0,
                confidence: chunk.confidence || 0.6,
                sources: chunk.sources || [],
                citations: chunk.citations || []
              }
            })
            controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
            break
          }
        }
        
        controller.close()
      } catch (error) {
        console.error('Streaming error:', error)
        const errorData = JSON.stringify({ 
          type: 'error', 
          content: 'Sorry, I encountered an error. Please try again.' 
        })
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
        controller.close()
      }
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { message, userType = 'other', conversationId, stream = true } = body
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }
    
    // Check if streaming is requested
    if (stream) {
      return handleStreamingResponse(message, userType, conversationId)
    }
    
    // Generate AI response (non-streaming)
    const aiResponse = await taxChatService.generateResponse({
      message,
      userType,
      conversationHistory: [], // TODO: Load from conversation if conversationId provided
      context: [], // TODO: Implement RAG retrieval
    })
    
    // TODO: Save conversation to database
    // if (conversationId) {
    //   await Conversation.findByIdAndUpdate(conversationId, {
    //     $push: {
    //       messages: [
    //         { role: 'user', content: message, timestamp: new Date() },
    //         { role: 'assistant', content: aiResponse.response, timestamp: new Date(), metadata: { confidence: aiResponse.confidence, tokens: aiResponse.tokens } }
    //       ]
    //     }
    //   })
    // }
    
    return NextResponse.json({
      success: true,
      data: {
        response: aiResponse.response,
        confidence: aiResponse.confidence,
        sources: aiResponse.sources,
        citations: aiResponse.citations,
        metadata: {
          tokens: aiResponse.tokens,
          cost: aiResponse.cost,
          model: 'gpt-4o-mini' // TODO: return actual model used
        }
      }
    })
    
  } catch (error) {
    console.error('Chat API error:', error)
    
    let errorMessage = 'Failed to process your request. Please try again.'
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try a simpler question.'
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.'
      } else if (error.message.includes('API key')) {
        errorMessage = 'Configuration error. Please contact support.'
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Tax Lawyer Chat API',
    status: 'operational',
    version: '1.0.0'
  })
}