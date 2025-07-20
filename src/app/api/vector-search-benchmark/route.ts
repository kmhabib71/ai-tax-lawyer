import { NextRequest, NextResponse } from 'next/server'
import { mongodbVectorService } from '@/lib/ai/mongodb-vector'
import { ragSystem } from '@/lib/ai/rag-system'

interface BenchmarkResult {
  query: string
  language: string
  performance: {
    embeddingTime: number
    searchTime: number
    totalTime: number
  }
  results: {
    count: number
    topSimilarity: number
    avgSimilarity: number
  }
  success: boolean
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const { queries, mode = 'vector' } = await request.json()
    
    if (!queries || !Array.isArray(queries)) {
      return NextResponse.json({
        success: false,
        error: 'queries array is required'
      }, { status: 400 })
    }

    const results: BenchmarkResult[] = []
    let totalTime = 0

    console.log(`🚀 Running ${mode} search benchmark for ${queries.length} queries`)

    for (const queryData of queries) {
      const { query, language = 'unknown' } = queryData
      const startTime = Date.now()

      try {
        let searchResults
        let embeddingTime = 0

        if (mode === 'vector') {
          // Test vector search directly
          const embeddingStart = Date.now()
          searchResults = await mongodbVectorService.searchSimilar(query, 5, 0.6)
          embeddingTime = Date.now() - embeddingStart
        } else if (mode === 'rag') {
          // Test full RAG system
          const ragStart = Date.now()
          const ragResults = await ragSystem.query({
            question: query,
            userType: 'other',
            retrievalOptions: {
              maxResults: 5,
              similarityThreshold: 0.6,
              hybridSearch: false
            }
          })
          embeddingTime = Date.now() - ragStart
          searchResults = ragResults.sources.map(source => ({
            similarity: source.similarity,
            chunk: {
              content: source.content
            }
          }))
        } else {
          throw new Error('Invalid mode. Use "vector" or "rag"')
        }

        const searchTime = Date.now() - startTime - embeddingTime
        const queryTotalTime = Date.now() - startTime
        totalTime += queryTotalTime

        const similarities = searchResults.map(r => r.similarity).filter(s => s !== undefined)
        const avgSimilarity = similarities.length > 0 
          ? similarities.reduce((a, b) => a + b, 0) / similarities.length 
          : 0

        results.push({
          query,
          language,
          performance: {
            embeddingTime,
            searchTime,
            totalTime: queryTotalTime
          },
          results: {
            count: searchResults.length,
            topSimilarity: similarities[0] || 0,
            avgSimilarity
          },
          success: true
        })

      } catch (error) {
        const queryTotalTime = Date.now() - startTime
        totalTime += queryTotalTime

        results.push({
          query,
          language,
          performance: {
            embeddingTime: 0,
            searchTime: 0,
            totalTime: queryTotalTime
          },
          results: {
            count: 0,
            topSimilarity: 0,
            avgSimilarity: 0
          },
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Calculate summary statistics
    const successfulResults = results.filter(r => r.success)
    const summary = {
      totalQueries: queries.length,
      successfulQueries: successfulResults.length,
      successRate: (successfulResults.length / queries.length * 100).toFixed(1),
      totalTime,
      averageTime: successfulResults.length > 0 
        ? (successfulResults.reduce((sum, r) => sum + r.performance.totalTime, 0) / successfulResults.length).toFixed(1)
        : 0,
      averageSimilarity: successfulResults.length > 0
        ? (successfulResults.reduce((sum, r) => sum + r.results.avgSimilarity, 0) / successfulResults.length).toFixed(3)
        : 0,
      queriesPerSecond: (queries.length / (totalTime / 1000)).toFixed(2)
    }

    // Performance analysis
    const sub100ms = successfulResults.filter(r => r.performance.totalTime < 100).length
    const sub200ms = successfulResults.filter(r => r.performance.totalTime < 200).length
    const sub500ms = successfulResults.filter(r => r.performance.totalTime < 500).length

    const performanceBreakdown = {
      sub100ms: {
        count: sub100ms,
        percentage: successfulResults.length > 0 ? (sub100ms / successfulResults.length * 100).toFixed(1) : 0
      },
      sub200ms: {
        count: sub200ms,
        percentage: successfulResults.length > 0 ? (sub200ms / successfulResults.length * 100).toFixed(1) : 0
      },
      sub500ms: {
        count: sub500ms,
        percentage: successfulResults.length > 0 ? (sub500ms / successfulResults.length * 100).toFixed(1) : 0
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      summary,
      performanceBreakdown,
      results: results.map(r => ({
        query: r.query,
        language: r.language,
        totalTime: r.performance.totalTime,
        resultsCount: r.results.count,
        topSimilarity: r.results.topSimilarity.toFixed(3),
        success: r.success,
        error: r.error
      })),
      detailedResults: results
    })

  } catch (error) {
    console.error('Vector search benchmark error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Vector Search Benchmark API',
    endpoints: {
      'POST /api/vector-search-benchmark': {
        description: 'Run performance benchmark tests',
        body: {
          queries: [
            { query: 'string', language: 'string (optional)' }
          ],
          mode: 'vector | rag (default: vector)'
        }
      }
    },
    sampleQueries: {
      bengali: [
        'মূল্য সংযোজন কর হার',
        'আয়কর স্ল্যাব ২০২৪',
        'কর অব্যাহতির শর্ত'
      ],
      english: [
        'income tax rate',
        'VAT registration',
        'tax exemption limit'
      ],
      banglish: [
        'tax calculation er niyom',
        'VAT return file korar process',
        'freelancer der tax rate'
      ]
    },
    performanceTargets: {
      vectorSearch: '<100ms',
      ragSystem: '<2000ms',
      successRate: '>95%',
      similarity: '>0.7'
    }
  })
}