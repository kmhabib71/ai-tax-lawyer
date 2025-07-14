'use client'

import { useState } from 'react'

export default function DocumentAdminPage() {
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('nbr_rule')
  const [title, setTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [mode, setMode] = useState<'file' | 'text'>('file')

  const documentTypes = [
    { value: 'nbr_rule', label: 'NBR Rule' },
    { value: 'sro', label: 'SRO (Statutory Regulatory Order)' },
    { value: 'ordinance', label: 'Income Tax Ordinance' },
    { value: 'circular', label: 'NBR Circular' },
    { value: 'gazette', label: 'Government Gazette' }
  ]

  const sampleTexts = {
    nbr_rule: `Section 82C - Deductions from Total Income

(1) In computing the total income of an assessee, there shall be allowed as deductions from his income the following amounts:

(a) House Rent Allowance: Where the assessee is in receipt of house rent allowance as part of his salary, an amount equal to the least of the following:
    (i) The actual amount of house rent allowance received
    (ii) Fifty percent of the basic salary
    (iii) The excess of rent paid over ten percent of basic salary

(b) Medical Allowance: An amount equal to the actual medical expenses incurred, subject to a maximum of BDT 120,000 per year.

(c) Investment Allowance: Under Section 44, an assessee shall be allowed deduction of investments in approved securities, not exceeding BDT 15,00,000.

This section provides significant tax savings opportunities for salaried employees in Bangladesh.`,
    
    sro: `SRO No. 123/Law/Income Tax/2024
Date: March 15, 2024

Subject: Tax exemption for IT sector exports

In exercise of the powers conferred by section 44 of the Income Tax Ordinance, 1984, the National Board of Revenue is pleased to exempt the following income from tax:

1. Income from export of computer software, IT enabled services and data processing services shall be exempt from tax until June 30, 2026.

2. This exemption shall apply to companies engaged in:
   - Software development and export
   - Call center and business process outsourcing
   - Data entry and processing services

3. Conditions for exemption:
   - Company must be registered with Bangladesh Association of Software and Information Services (BASIS)
   - Minimum 80% of revenue must come from export
   - Proper documentation of export proceeds required

This SRO supersedes all previous notifications on this subject.`
  }

  const handleFileUpload = async () => {
    if (!selectedFile || !title.trim()) {
      alert('Please select a file and provide a title')
      return
    }

    setProcessing(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('action', 'upload_file')
      formData.append('file', selectedFile)
      formData.append('documentType', documentType)
      formData.append('title', title.trim())

      const response = await fetch('/api/process-documents', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error uploading file:', error)
      setResult({ error: 'Failed to process file' })
    } finally {
      setProcessing(false)
    }
  }

  const handleTextProcessing = async () => {
    if (!textContent.trim() || !title.trim()) {
      alert('Please provide both title and content')
      return
    }

    setProcessing(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('action', 'process_text')
      formData.append('text', textContent.trim())
      formData.append('title', title.trim())
      formData.append('documentType', documentType)
      formData.append('dateIssued', new Date().toISOString().split('T')[0])

      const response = await fetch('/api/process-documents', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error processing text:', error)
      setResult({ error: 'Failed to process text' })
    } finally {
      setProcessing(false)
    }
  }

  const loadSampleText = () => {
    const sample = sampleTexts[documentType as keyof typeof sampleTexts] || sampleTexts.nbr_rule
    setTextContent(sample)
    setTitle(`Sample ${documentTypes.find(t => t.value === documentType)?.label} Document`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Document Processing Admin</h1>
        
        {/* Mode Selection */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Processing Mode</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setMode('file')}
              className={`px-4 py-2 rounded ${mode === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              File Upload
            </button>
            <button
              onClick={() => setMode('text')}
              className={`px-4 py-2 rounded ${mode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Text Input
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">
              {mode === 'file' ? 'Upload Document' : 'Enter Text Content'}
            </h2>
            
            {/* Common fields */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter document title"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            {mode === 'file' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Select File</label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full p-2 border rounded"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Supported formats: PDF, DOCX, TXT
                  </p>
                </div>
                
                <button
                  onClick={handleFileUpload}
                  disabled={processing || !selectedFile || !title.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Upload & Process Document'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={loadSampleText}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                  >
                    Load Sample Text
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Document Content</label>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Paste or type document content here..."
                    className="w-full p-3 border rounded h-64 resize-none font-mono text-sm"
                  />
                </div>
                
                <button
                  onClick={handleTextProcessing}
                  disabled={processing || !textContent.trim() || !title.trim()}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Process Text Document'}
                </button>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Processing Results</h2>
            
            {processing && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Processing document...</p>
              </div>
            )}
            
            {result && !processing && (
              <div className="space-y-4">
                {result.success ? (
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <h3 className="font-semibold text-green-800 mb-2">✅ Success!</h3>
                    <p className="text-green-700 mb-3">{result.message}</p>
                    
                    <div className="bg-white rounded p-3 text-sm">
                      <p><strong>Document ID:</strong> {result.data.id}</p>
                      <p><strong>Title:</strong> {result.data.title}</p>
                      <p><strong>Type:</strong> {result.data.type}</p>
                      <p><strong>Language:</strong> {result.data.metadata.language}</p>
                      <p><strong>Word Count:</strong> {result.data.metadata.wordCount?.toLocaleString()}</p>
                      <p><strong>Chunks Created:</strong> {result.data.metadata.chunksCreated}</p>
                      
                      {result.data.metadata.keywords?.length > 0 && (
                        <div className="mt-2">
                          <strong>Keywords:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {result.data.metadata.keywords.map((keyword: string, idx: number) => (
                              <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {result.data.metadata.sections?.length > 0 && (
                        <div className="mt-2">
                          <strong>Sections:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {result.data.metadata.sections.map((section: string, idx: number) => (
                              <span key={idx} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                                {section}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded p-4">
                    <h3 className="font-semibold text-red-800 mb-2">❌ Error</h3>
                    <p className="text-red-700">{result.error || result.message}</p>
                  </div>
                )}
              </div>
            )}
            
            {!result && !processing && (
              <div className="text-gray-500 text-center py-8">
                Process a document to see results here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}