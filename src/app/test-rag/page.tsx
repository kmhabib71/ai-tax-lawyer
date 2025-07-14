'use client'

import { useState } from 'react'

export default function TestRAGPage() {
  const [question, setQuestion] = useState('')
  const [userType, setUserType] = useState('salaried')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'query' | 'search' | 'test'>('query')

  const sampleQuestions = [
    'How to claim house rent allowance for salaried employees?',
    'What is the maximum investment allowance limit in Bangladesh?',
    'How to calculate tax for freelancers earning foreign income?',
    'What are the deductions available under Section 82C?',
    'How to file advance tax for business income?',
    'What documents are needed for tax return filing?',
    'How to claim medical expense deduction?',
    'What is the current tax slab for individual taxpayers?'
  ]

  const userTypes = [
    { value: 'salaried', label: 'Salaried Employee' },
    { value: 'freelancer', label: 'Freelancer' },
    { value: 'landlord', label: 'Landlord' },
    { value: 'business', label: 'Business Owner' },
    { value: 'other', label: 'Other' }
  ]

  const handleRAGQuery = async () => {
    if (!question.trim()) {
      alert('Please enter a question')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/rag-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'query',
          question: question.trim(),
          userType,
          context: {
            assessmentYear: '2024-25'
          },
          retrievalOptions: {
            maxResults: 5,
            similarityThreshold: 0.7,
            hybridSearch: true
          }
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error querying RAG system:', error)
      setResult({ error: 'Failed to query RAG system' })
    } finally {
      setLoading(false)
    }
  }

  const handleKnowledgeBaseSearch = async () => {
    if (!question.trim()) {
      alert('Please enter a search query')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/rag-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'search',
          query: question.trim(),
          limit: 10
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error searching knowledge base:', error)
      setResult({ error: 'Failed to search knowledge base' })
    } finally {
      setLoading(false)
    }
  }

  const handleTestSystem = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/rag-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_system',
          queries: sampleQuestions
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error testing RAG system:', error)
      setResult({ error: 'Failed to test RAG system' })
    } finally {
      setLoading(false)
    }
  }

  const loadSampleQuestion = (sampleQuestion: string) => {
    setQuestion(sampleQuestion)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">RAG System Testing Interface</h1>
        
        {/* Tab Navigation */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setActiveTab('query')}
              className={`px-4 py-2 rounded ${activeTab === 'query' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              RAG Query
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 rounded ${activeTab === 'search' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Knowledge Search
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`px-4 py-2 rounded ${activeTab === 'test' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              System Test
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">
              {activeTab === 'query' && 'Ask Tax Questions'}
              {activeTab === 'search' && 'Search Knowledge Base'}
              {activeTab === 'test' && 'Test RAG System'}
            </h2>
            
            {activeTab !== 'test' && (
              <>
                <div className="space-y-4 mb-6">
                  {activeTab === 'query' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">User Type</label>
                      <select
                        value={userType}
                        onChange={(e) => setUserType(e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        {userTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {activeTab === 'query' ? 'Your Question' : 'Search Query'}
                    </label>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder={
                        activeTab === 'query' 
                          ? "Ask about tax deductions, regulations, filing requirements..."
                          : "Search for specific tax terms, sections, or topics..."
                      }
                      className="w-full p-3 border rounded h-24 resize-none"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Sample Questions:</p>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {sampleQuestions.map((sample, index) => (
                      <button
                        key={index}
                        onClick={() => loadSampleQuestion(sample)}
                        className="text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={activeTab === 'query' ? handleRAGQuery : handleKnowledgeBaseSearch}
                  disabled={loading || !question.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 
                   activeTab === 'query' ? 'Get AI Answer' : 'Search Documents'}
                </button>
              </>
            )}

            {activeTab === 'test' && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  This will test the RAG system with multiple sample questions to evaluate performance.
                </p>
                
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-medium mb-2">Test Queries ({sampleQuestions.length}):</p>
                  <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                    {sampleQuestions.map((q, idx) => (
                      <div key={idx} className="py-1">
                        {idx + 1}. {q}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleTestSystem}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'Testing System...' : 'Run System Test'}
                </button>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">
                  {activeTab === 'test' ? 'Running system tests...' : 'Processing your request...'}
                </p>
              </div>
            )}
            
            {result && !loading && (
              <div className="space-y-4">
                {result.success ? (
                  <div>
                    {activeTab === 'query' && result.data.answer && (
                      <div className="space-y-4">
                        {/* AI Answer */}
                        <div className="bg-green-50 border border-green-200 rounded p-4">
                          <h3 className="font-semibold text-green-800 mb-2">🤖 AI Answer</h3>
                          <div className="text-green-700 whitespace-pre-wrap">
                            {result.data.answer}
                          </div>
                          <div className="mt-3 text-sm text-green-600">
                            <strong>Confidence:</strong> {(result.data.confidence * 100).toFixed(1)}% | 
                            <strong> Sources:</strong> {result.data.sources.length} | 
                            <strong> Processing:</strong> {result.data.metadata.processingTime}ms
                          </div>
                        </div>

                        {/* Sources */}
                        {result.data.sources.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-4">
                            <h3 className="font-semibold text-blue-800 mb-3">📚 Sources</h3>
                            <div className="space-y-3">
                              {result.data.sources.map((source: any, idx: number) => (
                                <div key={idx} className="bg-white p-3 rounded border">
                                  <div className="font-medium text-blue-900">{source.title}</div>
                                  <div className="text-sm text-blue-700">
                                    Type: {source.type} | 
                                    Similarity: {(source.similarity * 100).toFixed(1)}%
                                    {source.section && ` | Section: ${source.section}`}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">{source.content}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'search' && result.data.results && (
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">
                          Found {result.data.count} results for &ldquo;{result.data.query}&rdquo;
                        </div>
                        {result.data.results.map((item: any, idx: number) => (
                          <div key={idx} className="border rounded p-3">
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-gray-600">
                              Type: {item.type} | Similarity: {(item.similarity * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm mt-1">{item.content}</div>
                            {item.keywords && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.keywords.slice(0, 5).map((keyword: string, kidx: number) => (
                                  <span key={kidx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'test' && result.data.results && (
                      <div className="space-y-4">
                        <div className="bg-purple-50 border border-purple-200 rounded p-4">
                          <h3 className="font-semibold text-purple-800 mb-2">📊 Test Summary</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>Total Queries: {result.data.totalQueries}</div>
                            <div>Successful: {result.data.successfulQueries}</div>
                            <div>Success Rate: {((result.data.successfulQueries / result.data.totalQueries) * 100).toFixed(1)}%</div>
                          </div>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {result.data.results.map((test: any, idx: number) => (
                            <div key={idx} className={`border rounded p-3 ${test.success ? 'border-green-200' : 'border-red-200'}`}>
                              <div className="font-medium text-sm">{test.query}</div>
                              <div className="text-xs mt-1">
                                {test.success ? (
                                  <span className="text-green-600">
                                    ✅ Success | Confidence: {(test.confidence * 100).toFixed(1)}% | 
                                    Sources: {test.sourcesFound} | Time: {test.processingTime}ms
                                  </span>
                                ) : (
                                  <span className="text-red-600">❌ Failed: {test.error}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded p-4">
                    <h3 className="font-semibold text-red-800 mb-2">❌ Error</h3>
                    <p className="text-red-700">{result.error || result.message}</p>
                  </div>
                )}
              </div>
            )}
            
            {!result && !loading && (
              <div className="text-gray-500 text-center py-8">
                {activeTab === 'query' && 'Ask a question to get AI-powered answers with source citations'}
                {activeTab === 'search' && 'Search the knowledge base to find relevant documents'}
                {activeTab === 'test' && 'Run system tests to evaluate RAG performance'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}