import { NextRequest, NextResponse } from 'next/server'
import { DocumentProcessor } from '@/lib/ai/document-pipeline'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import fs from 'fs'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, filePath, batchProcess } = body

    const processor = new DocumentProcessor()

    if (action === 'process_single' && filePath) {
      // Process single file from Act-files directory
      const result = await processor.processDocument(filePath)
      
      return NextResponse.json({
        success: result.success,
        result: result,
        message: result.success 
          ? `Successfully processed ${result.chunks_processed} chunks`
          : `Failed to process: ${result.errors?.join(', ')}`
      })

    } else if (action === 'process_act_files' || batchProcess) {
      // Process all files in Act-files directory
      const actFilesPath = path.join(process.cwd(), 'Act-files')
      
      if (!fs.existsSync(actFilesPath)) {
        return NextResponse.json({
          success: false,
          error: 'Act-files directory not found'
        }, { status: 400 })
      }

      const files = fs.readdirSync(actFilesPath)
        .filter(file => file.toLowerCase().endsWith('.pdf'))
        .map(file => path.join(actFilesPath, file))

      const results = []
      let totalChunks = 0
      let successCount = 0

      for (const filePath of files) {
        console.log(`Processing: ${path.basename(filePath)}`)
        
        try {
          const result = await processor.processDocument(filePath)
          results.push({
            file: path.basename(filePath),
            success: result.success,
            chunks: result.chunks_processed,
            time: result.processing_time,
            errors: result.errors
          })

          if (result.success) {
            successCount++
            totalChunks += result.chunks_processed
          }

          // Small delay between files to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          results.push({
            file: path.basename(filePath),
            success: false,
            chunks: 0,
            time: 0,
            errors: [error.message]
          })
        }
      }

      return NextResponse.json({
        success: true,
        results: results,
        summary: {
          total_files: files.length,
          successful_files: successCount,
          failed_files: files.length - successCount,
          total_chunks: totalChunks
        }
      })

    } else if (action === 'upload_file') {
      // Handle file upload (legacy support)
      const formData = await request.formData()
      return await handleFileUpload(formData)
        
    } else if (action === 'process_text') {
      // Handle text processing (legacy support)
      const formData = await request.formData()
      return await handleTextProcessing(formData)
        
    } else if (action === 'status') {
      // Get processing status from database
      const { data, error } = await supabase
        .from('document_processing_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        logs: data
      })

    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action or missing parameters',
        supportedActions: ['process_single', 'process_act_files', 'upload_file', 'process_text', 'status']
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Document processing API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    if (action === 'list_files') {
      // List available PDF files in Act-files directory
      const actFilesPath = path.join(process.cwd(), 'Act-files')
      
      if (!fs.existsSync(actFilesPath)) {
        return NextResponse.json({
          success: false,
          error: 'Act-files directory not found'
        }, { status: 400 })
      }

      const files = fs.readdirSync(actFilesPath)
        .filter(file => file.toLowerCase().endsWith('.pdf'))
        .map(file => {
          const filePath = path.join(actFilesPath, file)
          const stats = fs.statSync(filePath)
          return {
            name: file,
            path: filePath,
            size: stats.size,
            sizeKB: Math.round(stats.size / 1024),
            modified: stats.mtime,
            language: file.includes('bangla') || file.includes('বাংলা') ? 'Bengali' : 
                     file.includes('english') ? 'English' : 'Unknown'
          }
        })

      return NextResponse.json({
        success: true,
        files: files,
        total: files.length
      })

    } else if (action === 'db_status') {
      // Check database status and processing logs
      try {
        const { count: chunkCount, error: chunksError } = await supabase
          .from('document_chunks')
          .select('*', { count: 'exact', head: true })

        const { data: logs, error: logsError } = await supabase
          .from('document_processing_log')
          .select('processing_status')

        const statusCounts = logs?.reduce((acc, log) => {
          acc[log.processing_status] = (acc[log.processing_status] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}

        return NextResponse.json({
          success: true,
          database_status: {
            total_chunks: chunksError ? 0 : chunkCount || 0,
            processing_logs: statusCounts,
            tables_exist: !chunksError && !logsError
          }
        })
      } catch (error) {
        return NextResponse.json({
          success: true,
          database_status: {
            total_chunks: 0,
            processing_logs: {},
            tables_exist: false,
            note: 'Run schema SQL to create tables'
          }
        })
      }

    } else if (action === 'recent_logs') {
      // Get recent processing logs
      const { data, error } = await supabase
        .from('document_processing_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        logs: data
      })

    } else {
      // Default API info
      return NextResponse.json({
        message: 'AI Tax Lawyer Bangladesh - Enhanced Document Processing API',
        status: 'operational',
        version: '2.0.0',
        features: [
          'Bengali, English, and Banglish support',
          'Advanced OCR with PDF text extraction',
          'Intelligent section-aware chunking',
          'OpenAI embeddings with vector search',
          'Multilingual keyword extraction',
          'Fuzzy text matching for Bengali',
          'Hybrid semantic + keyword search',
          'Batch processing of Act-files',
          'Real-time processing status',
          'Comprehensive analytics logging'
        ],
        supportedFormats: ['pdf'],
        supportedDocumentTypes: ['finance_act', 'income_tax', 'vat_act', 'sro', 'circular'],
        endpoints: {
          'POST /api/process-documents': {
            'action=process_single': 'Process single PDF file',
            'action=process_act_files': 'Process all files in Act-files directory',
            'action=status': 'Get processing status and logs',
            'action=upload_file': 'Legacy file upload support',
            'action=process_text': 'Legacy text processing support'
          },
          'GET /api/process-documents': {
            'action=list_files': 'List available PDF files',
            'action=db_status': 'Check database status',
            'action=recent_logs': 'Get recent processing logs',
            'default': 'API information and status'
          }
        },
        act_files_found: fs.existsSync(path.join(process.cwd(), 'Act-files')) 
          ? fs.readdirSync(path.join(process.cwd(), 'Act-files')).filter(f => f.endsWith('.pdf')).length
          : 0
      })
    }

  } catch (error) {
    console.error('Document processing API GET error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}