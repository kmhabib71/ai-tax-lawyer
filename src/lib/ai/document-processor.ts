import { supabaseVectorService, DocumentChunk } from './supabase-vector'
import { taxChatService } from './chat'

// Dynamic imports for document processing libraries
async function parsePDF(buffer: Buffer) {
  const pdfParse = (await import('pdf-parse')).default
  return await pdfParse(buffer)
}

async function parseDocx(buffer: Buffer) {
  const mammoth = await import('mammoth')
  return await mammoth.extractRawText({ buffer })
}

export interface ProcessedDocument {
  id: string
  title: string
  type: DocumentChunk['metadata']['document_type']
  content: string
  metadata: {
    fileSize: number
    pageCount?: number
    wordCount: number
    language: 'en' | 'bn' | 'mixed'
    extractedAt: string
    keywords: string[]
    sections: string[]
  }
  chunks: DocumentChunk[]
}

export interface ProcessingOptions {
  chunkSize?: number
  chunkOverlap?: number
  extractKeywords?: boolean
  detectLanguage?: boolean
  preserveFormatting?: boolean
}

export class DocumentProcessor {
  private readonly defaultOptions: Required<ProcessingOptions> = {
    chunkSize: 2000,
    chunkOverlap: 200,
    extractKeywords: true,
    detectLanguage: true,
    preserveFormatting: false
  }

  async processFile(
    file: Buffer,
    fileName: string,
    documentType: DocumentChunk['metadata']['document_type'],
    options: ProcessingOptions = {}
  ): Promise<ProcessedDocument> {
    const opts = { ...this.defaultOptions, ...options }
    
    try {
      // Extract text based on file type
      const extractedContent = await this.extractTextFromFile(file, fileName)
      
      // Clean and process content
      const cleanedContent = this.cleanText(extractedContent.text)
      
      // Generate document metadata
      const metadata = {
        fileSize: file.length,
        pageCount: extractedContent.pageCount,
        wordCount: this.countWords(cleanedContent),
        language: opts.detectLanguage ? this.detectLanguage(cleanedContent) : 'en' as const,
        extractedAt: new Date().toISOString(),
        keywords: opts.extractKeywords ? this.extractKeywords(cleanedContent) : [],
        sections: this.extractSections(cleanedContent)
      }
      
      // Create document ID from filename
      const documentId = this.generateDocumentId(fileName, documentType)
      
      // Generate title from filename or content
      const title = this.generateTitle(fileName, cleanedContent)
      
      // Process content into chunks
      const chunks = await this.createChunks(
        cleanedContent,
        documentId,
        title,
        documentType,
        metadata,
        opts
      )
      
      return {
        id: documentId,
        title,
        type: documentType,
        content: cleanedContent,
        metadata,
        chunks
      }
      
    } catch (error) {
      console.error('Error processing document:', error)
      throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async processTextDocument(
    text: string,
    title: string,
    documentType: DocumentChunk['metadata']['document_type'],
    additionalMetadata: Record<string, any> = {},
    options: ProcessingOptions = {}
  ): Promise<ProcessedDocument> {
    const opts = { ...this.defaultOptions, ...options }
    
    try {
      // Clean and process content
      const cleanedContent = this.cleanText(text)
      
      // Generate document metadata
      const metadata = {
        fileSize: Buffer.byteLength(text, 'utf8'),
        wordCount: this.countWords(cleanedContent),
        language: opts.detectLanguage ? this.detectLanguage(cleanedContent) : 'en' as const,
        extractedAt: new Date().toISOString(),
        keywords: opts.extractKeywords ? this.extractKeywords(cleanedContent) : [],
        sections: this.extractSections(cleanedContent),
        ...additionalMetadata
      }
      
      // Create document ID
      const documentId = this.generateDocumentId(title, documentType)
      
      // Process content into chunks
      const chunks = await this.createChunks(
        cleanedContent,
        documentId,
        title,
        documentType,
        metadata,
        opts
      )
      
      return {
        id: documentId,
        title,
        type: documentType,
        content: cleanedContent,
        metadata,
        chunks
      }
      
    } catch (error) {
      console.error('Error processing text document:', error)
      throw new Error(`Failed to process text document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async storeProcessedDocument(processedDoc: ProcessedDocument): Promise<void> {
    try {
      await supabaseVectorService.storeDocument(
        processedDoc.id,
        processedDoc.title,
        processedDoc.content,
        processedDoc.type,
        {
          ...processedDoc.metadata,
          keywords: processedDoc.metadata.keywords,
          section: processedDoc.metadata.sections.join(', ')
        }
      )
      
      console.log(`Successfully stored document: ${processedDoc.title}`)
    } catch (error) {
      console.error('Error storing processed document:', error)
      throw error
    }
  }

  private async extractTextFromFile(file: Buffer, fileName: string): Promise<{ text: string; pageCount?: number }> {
    const fileExtension = fileName.toLowerCase().split('.').pop()
    
    try {
      switch (fileExtension) {
        case 'pdf':
          const pdfData = await parsePDF(file)
          return {
            text: pdfData.text,
            pageCount: pdfData.numpages
          }
          
        case 'docx':
          const docxResult = await parseDocx(file)
          return {
            text: docxResult.value
          }
          
        case 'txt':
          return {
            text: file.toString('utf-8')
          }
          
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`)
      }
    } catch (error) {
      console.error('Error extracting text from file:', error)
      throw new Error(`Failed to extract text from ${fileExtension} file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private cleanText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim()
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length
  }

  private detectLanguage(text: string): 'en' | 'bn' | 'mixed' {
    // Simple language detection based on Unicode ranges
    const englishChars = text.match(/[a-zA-Z]/g)?.length || 0
    const banglaChars = text.match(/[\u0980-\u09FF]/g)?.length || 0
    const totalChars = englishChars + banglaChars
    
    if (totalChars === 0) return 'en'
    
    const banglaRatio = banglaChars / totalChars
    
    if (banglaRatio > 0.7) return 'bn'
    if (banglaRatio > 0.1) return 'mixed'
    return 'en'
  }

  private extractKeywords(text: string): string[] {
    // Tax-related keywords for Bangladesh
    const taxKeywords = [
      // English terms
      'tax', 'income', 'deduction', 'exemption', 'allowance', 'rebate',
      'section', 'rule', 'ordinance', 'sro', 'nbr', 'return', 'filing',
      'assessment', 'year', 'penalty', 'compliance', 'withholding',
      'advance', 'rate', 'slab', 'threshold', 'limit', 'ceiling',
      'investment', 'savings', 'insurance', 'medical', 'house', 'rent',
      'salary', 'freelance', 'business', 'corporate', 'individual',
      
      // Bengali terms (transliterated)
      'kar', 'ayakar', 'chhad', 'mukti', 'bhata', 'dharabahikari',
      'bibaran', 'grihabhada', 'bichinshakaran', 'byabasa', 'betan',
      
      // Official terms
      'bangladesh', 'dhaka', 'chittagong', 'bdt', 'taka', 'government',
      'ministry', 'finance', 'revenue', 'board', 'national'
    ]

    const foundKeywords: string[] = []
    const lowercaseText = text.toLowerCase()
    
    for (const keyword of taxKeywords) {
      if (lowercaseText.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword)
      }
    }
    
    // Remove duplicates and limit to most relevant
    return [...new Set(foundKeywords)].slice(0, 20)
  }

  private extractSections(text: string): string[] {
    const sections: string[] = []
    
    // Extract section numbers (e.g., "Section 82C", "Rule 44", "SRO 123")
    const sectionPatterns = [
      /Section\s+(\d+[A-Z]*)/gi,
      /Rule\s+(\d+)/gi,
      /SRO\s+([\d-/]+)/gi,
      /অধ্যায়\s+(\d+)/gi, // Bengali "Chapter"
      /ধারা\s+(\d+)/gi     // Bengali "Section"
    ]
    
    for (const pattern of sectionPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        sections.push(match[0])
      }
    }
    
    return [...new Set(sections)]
  }

  private generateDocumentId(fileName: string, type: string): string {
    const cleanName = fileName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars
      .toLowerCase()
    
    const timestamp = Date.now()
    return `${type}_${cleanName}_${timestamp}`
  }

  private generateTitle(fileName: string, content: string): string {
    // Try to extract title from filename
    let title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
    
    // Try to extract title from content (first meaningful line)
    const lines = content.split('\n').filter(line => line.trim().length > 10)
    if (lines.length > 0) {
      const firstLine = lines[0].trim()
      if (firstLine.length < 200 && firstLine.length > title.length) {
        title = firstLine
      }
    }
    
    return title
  }

  private async createChunks(
    content: string,
    documentId: string,
    title: string,
    type: DocumentChunk['metadata']['document_type'],
    metadata: any,
    options: Required<ProcessingOptions>
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = []
    let startIndex = 0
    let chunkIndex = 0
    
    while (startIndex < content.length) {
      const endIndex = Math.min(startIndex + options.chunkSize, content.length)
      let chunkContent = content.slice(startIndex, endIndex)
      
      // Try to break at sentence boundaries
      if (endIndex < content.length) {
        const sentenceEnds = ['.', '।', '\n', '!', '?']
        let bestBreakPoint = -1
        
        for (const end of sentenceEnds) {
          const lastOccurrence = chunkContent.lastIndexOf(end)
          if (lastOccurrence > options.chunkSize * 0.7) {
            bestBreakPoint = Math.max(bestBreakPoint, lastOccurrence + 1)
          }
        }
        
        if (bestBreakPoint > -1) {
          chunkContent = chunkContent.slice(0, bestBreakPoint)
        }
      }
      
      // Generate embedding for the chunk
      const embedding = await taxChatService.generateEmbedding(chunkContent)
      
      // Extract chunk-specific keywords
      const chunkKeywords = this.extractKeywords(chunkContent)
      
      chunks.push({
        id: `${documentId}_chunk_${chunkIndex}`,
        content: chunkContent.trim(),
        embedding,
        metadata: {
          document_id: documentId,
          document_title: title,
          document_type: type,
          keywords: [...(metadata.keywords || []), ...chunkKeywords],
          ...metadata
        }
      })
      
      startIndex = endIndex - options.chunkOverlap
      chunkIndex++
    }
    
    return chunks
  }

  // Utility method to process multiple documents in batch
  async processBatch(
    files: Array<{ buffer: Buffer; fileName: string; type: DocumentChunk['metadata']['document_type'] }>,
    options: ProcessingOptions = {}
  ): Promise<ProcessedDocument[]> {
    const results: ProcessedDocument[] = []
    
    for (const file of files) {
      try {
        const processed = await this.processFile(
          file.buffer,
          file.fileName,
          file.type,
          options
        )
        results.push(processed)
        
        // Store each document as it's processed
        await this.storeProcessedDocument(processed)
        
        console.log(`✓ Processed: ${file.fileName}`)
      } catch (error) {
        console.error(`✗ Failed to process: ${file.fileName}`, error)
      }
    }
    
    return results
  }
}

export const documentProcessor = new DocumentProcessor()