import { NextRequest, NextResponse } from 'next/server'
import { supabaseVectorService } from '@/lib/ai/supabase-vector'
import { taxChatService } from '@/lib/ai/chat'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, type = 'nbr_rule', metadata = {} } = body
    
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }
    
    const validTypes = ['nbr_rule', 'sro', 'ordinance', 'circular', 'gazette']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Simple document ID generation
    const documentId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Store document directly in Supabase
    await supabaseVectorService.storeDocument(
      documentId,
      title,
      content,
      type,
      {
        ...metadata,
        date_issued: metadata.date_issued || new Date().toISOString().split('T')[0],
        keywords: metadata.keywords || ['tax', 'bangladesh', 'nbr']
      }
    )
    
    return NextResponse.json({
      success: true,
      message: 'Document added successfully',
      data: {
        documentId,
        title,
        type,
        contentLength: content.length
      }
    })
    
  } catch (error) {
    console.error('Add text document error:', error)
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
    message: 'Simple text document addition API',
    status: 'operational',
    usage: 'POST with {title, content, type, metadata}'
  })
}