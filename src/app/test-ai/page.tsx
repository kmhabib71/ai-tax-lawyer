'use client'

import { useState } from 'react'

interface TaxScenario {
  userType: 'salaried' | 'freelancer' | 'landlord' | 'business' | 'other'
  income: {
    basic?: number
    allowances?: number
    freelanceIncome?: number
    rentalIncome?: number
    businessIncome?: number
    foreignIncome?: number
  }
  deductions: {
    investments?: number
    insurance?: number
    houseRent?: number
    medicalExpenses?: number
    professionalExpenses?: number
    businessExpenses?: number
  }
  location?: 'dhaka' | 'chittagong' | 'other'
  assessmentYear: string
}

export default function TestAIPage() {
  const [scenario, setScenario] = useState<TaxScenario>({
    userType: 'salaried',
    income: {
      basic: 600000,
      allowances: 100000
    },
    deductions: {
      investments: 500000,
      houseRent: 150000
    },
    assessmentYear: '2024-25'
  })
  
  const [question, setQuestion] = useState('How can I optimize my tax savings?')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'analysis' | 'consultation'>('analysis')

  const testTaxAdvice = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const payload = mode === 'consultation' 
        ? { scenario, question }
        : { scenario }
      
      const response = await fetch('/api/tax-advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error testing AI:', error)
      setResult({ error: 'Failed to test AI system' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI Tax Lawyer - System Test</h1>
        
        {/* Mode Selection */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Mode</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setMode('analysis')}
              className={`px-4 py-2 rounded ${mode === 'analysis' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Tax Analysis
            </button>
            <button
              onClick={() => setMode('consultation')}
              className={`px-4 py-2 rounded ${mode === 'consultation' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              AI Consultation
            </button>
          </div>
        </div>

        {/* Scenario Configuration */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Tax Scenario</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">User Type</label>
              <select
                value={scenario.userType}
                onChange={(e) => setScenario({
                  ...scenario,
                  userType: e.target.value as any
                })}
                className="w-full p-2 border rounded"
              >
                <option value="salaried">Salaried Employee</option>
                <option value="freelancer">Freelancer</option>
                <option value="landlord">Landlord</option>
                <option value="business">Business Owner</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Assessment Year</label>
              <input
                type="text"
                value={scenario.assessmentYear}
                onChange={(e) => setScenario({
                  ...scenario,
                  assessmentYear: e.target.value
                })}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Basic Salary (BDT)</label>
              <input
                type="number"
                value={scenario.income.basic || ''}
                onChange={(e) => setScenario({
                  ...scenario,
                  income: {
                    ...scenario.income,
                    basic: parseInt(e.target.value) || 0
                  }
                })}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Investments (BDT)</label>
              <input
                type="number"
                value={scenario.deductions.investments || ''}
                onChange={(e) => setScenario({
                  ...scenario,
                  deductions: {
                    ...scenario.deductions,
                    investments: parseInt(e.target.value) || 0
                  }
                })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </div>

        {/* Question Input for Consultation Mode */}
        {mode === 'consultation' && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Your Question</h2>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about tax optimization, deductions, compliance, etc."
              className="w-full p-3 border rounded h-24 resize-none"
            />
          </div>
        )}

        {/* Test Button */}
        <div className="text-center mb-6">
          <button
            onClick={testTaxAdvice}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Testing AI System...' : `Test ${mode === 'analysis' ? 'Tax Analysis' : 'AI Consultation'}`}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}