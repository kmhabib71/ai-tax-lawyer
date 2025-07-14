import { NextRequest, NextResponse } from 'next/server'
import { documentProcessor } from '@/lib/ai/document-processor'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const action = formData.get('action') as string
    
    switch (action) {
      case 'upload_file':
        return await handleFileUpload(formData)
        
      case 'process_text':
        return await handleTextProcessing(formData)
        
      case 'batch_process':
        return await handleBatchProcessing(formData)
        
      default:
        return NextResponse.json({
          error: 'Invalid action',
          supportedActions: ['upload_file', 'process_text', 'batch_process']
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Document processing API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process document'
      },
      { status: 500 }
    )
  }
}

async function handleFileUpload(formData: FormData) {
  const file = formData.get('file') as File
  const documentType = formData.get('documentType') as string
  const title = formData.get('title') as string
  
  if (!file) {
    return NextResponse.json(
      { error: 'File is required' },
      { status: 400 }
    )
  }
  
  if (!documentType || !['nbr_rule', 'sro', 'ordinance', 'circular', 'gazette'].includes(documentType)) {
    return NextResponse.json(
      { error: 'Valid documentType is required (nbr_rule, sro, ordinance, circular, gazette)' },
      { status: 400 }
    )
  }
  
  // Convert file to buffer
  const buffer = Buffer.from(await file.arrayBuffer())
  
  // Process options
  const options = {
    chunkSize: parseInt(formData.get('chunkSize') as string) || 2000,
    chunkOverlap: parseInt(formData.get('chunkOverlap') as string) || 200,
    extractKeywords: formData.get('extractKeywords') !== 'false',
    detectLanguage: formData.get('detectLanguage') !== 'false',
    preserveFormatting: formData.get('preserveFormatting') === 'true'
  }
  
  // Process the document
  const processed = await documentProcessor.processFile(
    buffer,
    title || file.name,
    documentType as any,
    options
  )
  
  // Store in vector database
  await documentProcessor.storeProcessedDocument(processed)
  
  return NextResponse.json({
    success: true,
    message: 'Document processed and stored successfully',
    data: {
      id: processed.id,
      title: processed.title,
      type: processed.type,
      metadata: {
        fileSize: processed.metadata.fileSize,
        wordCount: processed.metadata.wordCount,
        language: processed.metadata.language,
        chunksCreated: processed.chunks.length,
        keywords: processed.metadata.keywords.slice(0, 10), // Limit for response
        sections: processed.metadata.sections.slice(0, 5)
      }
    }
  })
}

async function handleTextProcessing(formData: FormData) {
  const text = formData.get('text') as string
  const title = formData.get('title') as string
  const documentType = formData.get('documentType') as string
  
  if (!text || !title || !documentType) {
    return NextResponse.json(
      { error: 'text, title, and documentType are required' },
      { status: 400 }
    )
  }
  
  if (!['nbr_rule', 'sro', 'ordinance', 'circular', 'gazette'].includes(documentType)) {
    return NextResponse.json(
      { error: 'Valid documentType is required' },
      { status: 400 }
    )
  }
  
  // Additional metadata from form
  const additionalMetadata: Record<string, any> = {}
  
  const dateIssued = formData.get('dateIssued') as string
  if (dateIssued) {
    additionalMetadata.date_issued = dateIssued
  }
  
  const section = formData.get('section') as string
  if (section) {
    additionalMetadata.section = section
  }
  
  const keywords = formData.get('keywords') as string
  if (keywords) {
    additionalMetadata.keywords = keywords.split(',').map(k => k.trim())
  }
  
  // Process options
  const options = {
    chunkSize: parseInt(formData.get('chunkSize') as string) || 2000,
    chunkOverlap: parseInt(formData.get('chunkOverlap') as string) || 200,
    extractKeywords: formData.get('extractKeywords') !== 'false',
    detectLanguage: formData.get('detectLanguage') !== 'false'
  }
  
  // Process the text document
  const processed = await documentProcessor.processTextDocument(
    text,
    title,
    documentType as any,
    additionalMetadata,
    options
  )
  
  // Store in vector database
  await documentProcessor.storeProcessedDocument(processed)
  
  return NextResponse.json({
    success: true,
    message: 'Text document processed and stored successfully',
    data: {
      id: processed.id,
      title: processed.title,
      type: processed.type,
      metadata: {
        wordCount: processed.metadata.wordCount,
        language: processed.metadata.language,
        chunksCreated: processed.chunks.length,
        keywords: processed.metadata.keywords.slice(0, 10),
        sections: processed.metadata.sections.slice(0, 5)
      }
    }
  })
}

async function handleBatchProcessing(formData: FormData) {
  // Handle multiple files at once
  const files: Array<{ buffer: Buffer; fileName: string; type: any }> = []
  
  // Extract all files from form data
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('file_') && value instanceof File) {
      const index = key.split('_')[1]
      const documentType = formData.get(`type_${index}`) as string
      
      if (documentType && ['nbr_rule', 'sro', 'ordinance', 'circular', 'gazette'].includes(documentType)) {
        const buffer = Buffer.from(await value.arrayBuffer())
        files.push({
          buffer,
          fileName: value.name,
          type: documentType
        })
      }
    }
  }
  
  if (files.length === 0) {
    return NextResponse.json(
      { error: 'No valid files provided for batch processing' },
      { status: 400 }
    )
  }
  
  // Process options
  const options = {
    chunkSize: parseInt(formData.get('chunkSize') as string) || 2000,
    chunkOverlap: parseInt(formData.get('chunkOverlap') as string) || 200,
    extractKeywords: formData.get('extractKeywords') !== 'false',
    detectLanguage: formData.get('detectLanguage') !== 'false'
  }
  
  // Process all files
  const results = await documentProcessor.processBatch(files, options)
  
  const summary = {
    totalFiles: files.length,
    processedSuccessfully: results.length,
    totalChunks: results.reduce((sum, doc) => sum + doc.chunks.length, 0),
    totalWords: results.reduce((sum, doc) => sum + doc.metadata.wordCount, 0),
    documents: results.map(doc => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      chunksCreated: doc.chunks.length,
      language: doc.metadata.language
    }))
  }
  
  return NextResponse.json({
    success: true,
    message: `Batch processing completed: ${results.length}/${files.length} files processed successfully`,
    data: summary
  })
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Tax Lawyer - Document Processing API',
    status: 'operational',
    version: '1.0.0',
    supportedFormats: ['pdf', 'docx', 'txt'],
    supportedDocumentTypes: ['nbr_rule', 'sro', 'ordinance', 'circular', 'gazette'],
    features: [
      'File upload and text extraction',
      'Multi-language support (English/Bengali)',
      'Automatic keyword extraction',
      'Intelligent text chunking',
      'Vector embedding generation',
      'Batch processing support'
    ],
    endpoints: {
      'POST /api/process-documents': {
        'action=upload_file': 'Process uploaded file (PDF, DOCX, TXT)',
        'action=process_text': 'Process raw text content',
        'action=batch_process': 'Process multiple files at once'
      }
    }
  })
}