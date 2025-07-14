import { NextRequest, NextResponse } from 'next/server'
import { ragSystem, RAGQuery } from '@/lib/ai/rag-system'
import connectDB from '@/lib/db/connection'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { action, ...data } = body
    
    switch (action) {
      case 'query':
        return await handleRAGQuery(data)
        
      case 'search':
        return await handleKnowledgeBaseSearch(data)
        
      case 'add_document':
        return await handleAddDocument(data)
        
      case 'test_system':
        return await handleTestSystem(data)
        
      default:
        return NextResponse.json({
          error: 'Invalid action',
          supportedActions: ['query', 'search', 'add_document', 'test_system']
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('RAG API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process RAG request'
      },
      { status: 500 }
    )
  }
}

async function handleRAGQuery(data: any) {
  const { question, userType, context, filters, retrievalOptions } = data
  
  if (!question || !userType) {
    return NextResponse.json(
      { error: 'question and userType are required' },
      { status: 400 }
    )
  }
  
  const ragQuery: RAGQuery = {
    question,
    userType,
    context,
    filters,
    retrievalOptions
  }
  
  try {
    const response = await ragSystem.query(ragQuery)
    
    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('RAG query error:', error)
    return NextResponse.json(
      { error: 'Failed to process RAG query', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleKnowledgeBaseSearch(data: any) {
  const { query, filters, limit = 10 } = data
  
  if (!query) {
    return NextResponse.json(
      { error: 'query is required' },
      { status: 400 }
    )
  }
  
  try {
    const results = await ragSystem.searchKnowledgeBase(query, filters, limit)
    
    return NextResponse.json({
      success: true,
      data: {
        query,
        results: results.map(result => ({
          id: result.chunk.id,
          content: result.chunk.content.substring(0, 200) + '...',
          title: result.chunk.metadata.document_title,
          type: result.chunk.metadata.document_type,
          similarity: result.similarity,
          section: result.chunk.metadata.section,
          keywords: result.chunk.metadata.keywords
        })),
        count: results.length
      }
    })
  } catch (error) {
    console.error('Knowledge base search error:', error)
    return NextResponse.json(
      { error: 'Failed to search knowledge base', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleAddDocument(data: any) {
  const { content, title, type, metadata = {} } = data
  
  if (!content || !title || !type) {
    return NextResponse.json(
      { error: 'content, title, and type are required' },
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
  
  try {
    const documentId = await ragSystem.addDocumentToKnowledgeBase(
      content,
      title,
      type,
      metadata
    )
    
    return NextResponse.json({
      success: true,
      message: 'Document added to knowledge base successfully',
      data: { documentId, title, type }
    })
  } catch (error) {
    console.error('Add document error:', error)
    return NextResponse.json(
      { error: 'Failed to add document to knowledge base', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleTestSystem(data: any) {
  const { queries = [] } = data
  
  const defaultTestQueries = [
    'How to claim house rent allowance for salaried employees?',
    'What is the maximum investment allowance limit in Bangladesh?',
    'How to calculate tax for freelancers earning foreign income?',
    'What are the tax benefits for IT sector exports?',
    'How to file advance tax for business income?'
  ]
  
  const testQueries = queries.length > 0 ? queries : defaultTestQueries
  
  try {
    const results = await ragSystem.testRAGSystem(testQueries)
    
    return NextResponse.json({
      success: true,
      message: 'RAG system test completed',
      data: {
        totalQueries: testQueries.length,
        successfulQueries: results.filter(r => r.success).length,
        results: results.map(result => ({
          query: result.query,
          success: result.success,
          confidence: result.success ? result.response.confidence : 0,
          sourcesFound: result.success ? result.response.sources.length : 0,
          processingTime: result.success ? result.response.metadata.processingTime : 0,
          error: result.error
        }))
      }
    })
  } catch (error) {
    console.error('Test system error:', error)
    return NextResponse.json(
      { error: 'Failed to test RAG system', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    
    switch (action) {
      case 'stats':
        const stats = await ragSystem.getKnowledgeBaseStats()
        return NextResponse.json({
          success: true,
          data: stats
        })
        
      case 'status':
        return NextResponse.json({
          success: true,
          data: {
            status: 'operational',
            message: 'RAG system is ready',
            capabilities: [
              'Semantic document search',
              'Contextual question answering',
              'Multi-document reasoning',
              'Source attribution',
              'Confidence scoring'
            ],
            supportedDocumentTypes: ['nbr_rule', 'sro', 'ordinance', 'circular', 'gazette'],
            supportedUserTypes: ['salaried', 'freelancer', 'landlord', 'business', 'other']
          }
        })
        
      default:
        return NextResponse.json({
          message: 'AI Tax Lawyer - RAG Query API',
          status: 'operational',
          version: '1.0.0',
          endpoints: {
            'POST /api/rag-query': {
              'action=query': 'Ask questions with document retrieval',
              'action=search': 'Search knowledge base',
              'action=add_document': 'Add document to knowledge base',
              'action=test_system': 'Test RAG system performance'
            },
            'GET /api/rag-query?action=stats': 'Get knowledge base statistics',
            'GET /api/rag-query?action=status': 'Get system status'
          }
        })
    }
    
  } catch (error) {
    console.error('RAG GET API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process RAG request'
      },
      { status: 500 }
    )
  }
}