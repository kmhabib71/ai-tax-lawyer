'use client'

import { useState } from 'react'

export default function SimpleTestPage() {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [documentAdded, setDocumentAdded] = useState(false)

  const sampleDocument = {
    title: 'Income Tax Ordinance 1984 - Section 82C Deductions',
    content: `Section 82C - Deductions from Total Income

(1) In computing the total income of an assessee, there shall be allowed as deductions from his income the following amounts:

(a) House Rent Allowance: Where the assessee is in receipt of house rent allowance as part of his salary, an amount equal to the least of the following:
    (i) The actual amount of house rent allowance received
    (ii) Fifty percent of the basic salary
    (iii) The excess of rent paid over ten percent of basic salary

(b) Medical Allowance: An amount equal to the actual medical expenses incurred, subject to a maximum of BDT 120,000 per year.

(c) Investment Allowance: Under Section 44, an assessee shall be allowed deduction of investments in approved securities, not exceeding BDT 15,00,000.

This section provides significant tax savings opportunities for salaried employees in Bangladesh.`,
    type: 'ordinance',
    metadata: {
      section: '82C',
      keywords: ['deduction', 'house rent', 'medical', 'investment'],
      date_issued: '1984-06-01'
    }
  }

  const testBasicAI = async () => {
    if (!question.trim()) {
      alert('Please enter a question')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-basic-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          userType: 'salaried'
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error testing basic AI:', error)
      setResult({ error: 'Failed to test basic AI', details: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const addSampleDocument = async () => {
    setLoading(true)

    try {
      // Test embedding generation first
      const embeddingResponse = await fetch('/api/test-embedding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sampleDocument.content
        }),
      })

      const embeddingData = await embeddingResponse.json()
      
      if (embeddingData.success) {
        // If embedding works, try document addition
        const response = await fetch('/api/add-text-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sampleDocument),
        })

        const data = await response.json()
        if (data.success) {
          setDocumentAdded(true)
          alert('Sample document added successfully!')
        } else {
          alert('Failed to add document: ' + data.message)
        }
      } else {
        alert('Embedding test failed: ' + embeddingData.message)
      }
    } catch (error) {
      console.error('Error adding document:', error)
      alert('Failed to add document: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const testRAGQuery = async () => {
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
          userType: 'salaried',
          retrievalOptions: {
            maxResults: 3,
            similarityThreshold: 0.5
          }
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error testing RAG:', error)
      setResult({ error: 'Failed to test RAG', details: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Simple System Test</h1>
        
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            
            {/* Step 1: Add Sample Document */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-semibold text-blue-800 mb-2">Step 1: Add Sample Document</h3>
              <p className="text-sm text-blue-700 mb-3">
                First, add a sample NBR document to test the RAG system
              </p>
              <button
                onClick={addSampleDocument}
                disabled={loading || documentAdded}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
              >
                {documentAdded ? '✅ Document Added' : 'Add Sample Document'}
              </button>
            </div>

            {/* Step 2: Test Questions */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Step 2: Ask Tax Questions</h3>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about tax deductions, house rent allowance, investment limits..."
                className="w-full p-3 border rounded h-24 resize-none"
              />
              
              <div className="grid grid-cols-1 gap-2 mt-2">
                <button
                  onClick={() => setQuestion('How to claim house rent allowance for salaried employees?')}
                  className="text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border"
                >
                  How to claim house rent allowance for salaried employees?
                </button>
                <button
                  onClick={() => setQuestion('What is the maximum investment allowance limit?')}
                  className="text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border"
                >
                  What is the maximum investment allowance limit?
                </button>
                <button
                  onClick={() => setQuestion('How much medical allowance can I claim per year?')}
                  className="text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border"
                >
                  How much medical allowance can I claim per year?
                </button>
              </div>
            </div>

            {/* Step 3: Test Options */}
            <div className="space-y-3">
              <button
                onClick={testBasicAI}
                disabled={loading || !question.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Basic AI (No RAG)'}
              </button>
              
              <button
                onClick={testRAGQuery}
                disabled={loading || !question.trim() || !documentAdded}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test RAG System (With Documents)'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Testing system...</p>
              </div>
            )}
            
            {result && !loading && (
              <div className="space-y-4">
                {result.success ? (
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <h3 className="font-semibold text-green-800 mb-2">✅ Success!</h3>
                    
                    {result.data.answer && (
                      <div className="mb-4">
                        <strong className="text-green-800">Answer:</strong>
                        <div className="text-green-700 whitespace-pre-wrap mt-2 p-3 bg-white rounded border">
                          {result.data.answer}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-sm text-green-600 space-y-1">
                      <p><strong>Question:</strong> {result.data.question}</p>
                      <p><strong>Confidence:</strong> {(result.data.confidence * 100).toFixed(1)}%</p>
                      <p><strong>Tokens Used:</strong> {result.data.tokens}</p>
                      <p><strong>Cost:</strong> ${result.data.cost?.toFixed(6) || 0}</p>
                      {result.data.sources && (
                        <p><strong>Sources Found:</strong> {result.data.sources.length}</p>
                      )}
                    </div>

                    {result.data.sources && result.data.sources.length > 0 && (
                      <div className="mt-4">
                        <strong className="text-green-800">Sources:</strong>
                        <div className="mt-2 space-y-2">
                          {result.data.sources.map((source: any, idx: number) => (
                            <div key={idx} className="bg-white p-3 rounded border">
                              <div className="font-medium text-blue-900">{source.title}</div>
                              <div className="text-sm text-blue-700">
                                Type: {source.type} | Similarity: {(source.similarity * 100).toFixed(1)}%
                              </div>
                              <div className="text-sm text-gray-600 mt-1">{source.content}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded p-4">
                    <h3 className="font-semibold text-red-800 mb-2">❌ Error</h3>
                    <p className="text-red-700 mb-2">{result.error}</p>
                    {result.details && (
                      <p className="text-sm text-red-600">{result.details}</p>
                    )}
                    {result.message && (
                      <p className="text-sm text-red-600">{result.message}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {!result && !loading && (
              <div className="text-gray-500 text-center py-8">
                <p>Follow the steps to test the system:</p>
                <ol className="text-left mt-4 space-y-2">
                  <li>1. Add sample document to knowledge base</li>
                  <li>2. Enter a tax-related question</li>
                  <li>3. Test basic AI or RAG system</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}