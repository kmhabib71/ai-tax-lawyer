import { NextRequest, NextResponse } from 'next/server'
import { supabaseVectorService } from '@/lib/ai/supabase-vector'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const query = url.searchParams.get('query')
    const type = url.searchParams.get('type')
    
    switch (action) {
      case 'search':
        if (!query) {
          return NextResponse.json(
            { error: 'Query parameter is required for search' },
            { status: 400 }
          )
        }
        
        const searchResults = await supabaseVectorService.searchSimilar(
          query,
          5, // limit
          0.7, // similarity threshold
          type ? { document_type: [type] } : undefined
        )
        
        return NextResponse.json({
          success: true,
          data: {
            query,
            results: searchResults,
            count: searchResults.length
          }
        })
        
      case 'documents':
        if (!type) {
          return NextResponse.json(
            { error: 'Type parameter is required for documents listing' },
            { status: 400 }
          )
        }
        
        const documents = await supabaseVectorService.getDocumentsByType(
          type as any
        )
        
        return NextResponse.json({
          success: true,
          data: {
            type,
            documents,
            count: documents.length
          }
        })
        
      case 'status':
        return NextResponse.json({
          success: true,
          data: {
            status: 'operational',
            message: 'Vector database is ready',
            supportedTypes: ['nbr_rule', 'sro', 'ordinance', 'circular', 'gazette'],
            features: [
              'Document storage with vector embeddings',
              'Semantic similarity search',
              'Keyword-based filtering',
              'Multi-language support (English/Bengali)'
            ]
          }
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid action',
          supportedActions: ['search', 'documents', 'status']
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Vector DB API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process vector database request'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body
    
    switch (action) {
      case 'store_document':
        const { documentId, title, content, type, metadata } = data
        
        if (!documentId || !title || !content || !type) {
          return NextResponse.json(
            { error: 'documentId, title, content, and type are required' },
            { status: 400 }
          )
        }
        
        await supabaseVectorService.storeDocument(
          documentId,
          title,
          content,
          type,
          metadata || {}
        )
        
        return NextResponse.json({
          success: true,
          message: `Document ${documentId} stored successfully`,
          data: { documentId, title, type }
        })
        
      case 'initialize':
        await supabaseVectorService.initializeTables()
        
        return NextResponse.json({
          success: true,
          message: 'Vector database tables initialized successfully'
        })
        
      case 'delete_document':
        const { documentId: deleteId } = data
        
        if (!deleteId) {
          return NextResponse.json(
            { error: 'documentId is required for deletion' },
            { status: 400 }
          )
        }
        
        await supabaseVectorService.deleteDocument(deleteId)
        
        return NextResponse.json({
          success: true,
          message: `Document ${deleteId} deleted successfully`
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid action',
          supportedActions: ['store_document', 'initialize', 'delete_document']
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Vector DB POST API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process vector database request'
      },
      { status: 500 }
    )
  }
}