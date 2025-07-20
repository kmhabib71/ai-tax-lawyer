import { NextRequest, NextResponse } from 'next/server'
import { mongodbVectorService } from '@/lib/ai/mongodb-vector'
import { ragSystem } from '@/lib/ai/rag-system'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing MongoDB Atlas Vector Search...')
    
    // Test 1: Connection
    const connectionTest = await mongodbVectorService.testConnection()
    console.log(`Connection test: ${connectionTest ? 'PASS' : 'FAIL'}`)
    
    if (!connectionTest) {
      return NextResponse.json({
        success: false,
        error: 'MongoDB Atlas connection failed'
      }, { status: 500 })
    }

    // Test 2: Knowledge base stats
    const stats = await mongodbVectorService.getKnowledgeBaseStats()
    console.log('Knowledge base stats:', stats)

    // Test 3: Vector search
    const searchTest = await mongodbVectorService.testVectorSearch("মূল্য সংযোজন কর হার")
    console.log('Vector search test:', searchTest)

    // Test 4: Text search
    const textResults = await mongodbVectorService.searchSimilar(
      "আয়কর রেট",
      5,
      0.5,
      { document_type: ['income_tax_act'] }
    )
    console.log(`Text search results: ${textResults.length}`)

    // Test 5: RAG system
    const ragResults = await ragSystem.query({
      question: "মূল্য সংযোজন কর হার কত?",
      userType: 'business',
      retrievalOptions: {
        maxResults: 3,
        similarityThreshold: 0.6,
        hybridSearch: false
      }
    })
    console.log(`RAG system test: ${ragResults.sources.length} sources`)

    return NextResponse.json({
      success: true,
      tests: {
        connection: connectionTest,
        stats,
        vectorSearch: searchTest,
        textSearchResults: textResults.length,
        ragSystem: {
          sources: ragResults.sources.length,
          answerLength: ragResults.answer.length,
          confidence: ragResults.confidence,
          searchMethod: ragResults.metadata.searchMethod
        }
      },
      results: {
        textSearchSample: textResults.slice(0, 2).map(r => ({
          type: r.chunk.metadata.document_type,
          content: r.chunk.content.substring(0, 100) + '...',
          similarity: r.similarity
        })),
        ragAnswer: ragResults.answer.substring(0, 200) + '...',
        ragSources: ragResults.sources.map(s => ({
          type: s.type,
          title: s.title,
          similarity: s.similarity,
          content: s.content.substring(0, 100) + '...'
        }))
      }
    })

  } catch (error) {
    console.error('MongoDB vector test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, maxResults = 5, documentType } = await request.json()

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Query parameter is required'
      }, { status: 400 })
    }

    // Perform search
    const results = await mongodbVectorService.searchSimilar(
      query,
      maxResults,
      0.6,
      documentType ? { document_type: [documentType] } : undefined
    )

    // Get RAG response
    const ragResponse = await ragSystem.query({
      question: query,
      userType: 'other',
      retrievalOptions: {
        maxResults,
        similarityThreshold: 0.6,
        hybridSearch: true
      },
      filters: documentType ? { documentTypes: [documentType] } : undefined
    })

    return NextResponse.json({
      success: true,
      query,
      searchResults: {
        count: results.length,
        results: results.map(r => ({
          id: r.chunk.id,
          type: r.chunk.metadata.document_type,
          content: r.chunk.content.substring(0, 200) + '...',
          similarity: r.similarity,
          section: r.chunk.metadata.section
        }))
      },
      ragResponse: {
        answer: ragResponse.answer,
        confidence: ragResponse.confidence,
        sources: ragResponse.sources.length,
        metadata: ragResponse.metadata
      }
    })

  } catch (error) {
    console.error('MongoDB vector search API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}