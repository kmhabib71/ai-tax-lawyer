/**
 * Advanced Document Processing Pipeline for AI Tax Lawyer Bangladesh
 * Handles Bengali, English, and mixed-language legal documents
 * Supports OCR, intelligent chunking, and multilingual embeddings
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
// import pdf from 'pdf-parse'; // Dynamic import to avoid initialization issues

// Types
interface DocumentChunk {
  id: string;
  content: string;
  content_bn?: string;
  content_en?: string;
  metadata: ChunkMetadata;
  embeddings?: number[];
  keywords_bn: string[];
  keywords_en: string[];
}

interface ChunkMetadata {
  document_id: string;
  document_name: string;
  document_type: 'finance_act' | 'income_tax' | 'vat_act' | 'sro' | 'circular';
  language: 'bn' | 'en' | 'mixed';
  section_number?: string;
  section_title?: string;
  page_number?: number;
  chunk_index: number;
  total_chunks: number;
  act_year?: string;
  effective_date?: string;
  source_file: string;
}

interface ProcessingResult {
  success: boolean;
  document_id: string;
  chunks_processed: number;
  errors?: string[];
  processing_time: number;
}

// Configuration
const CHUNK_SIZE = 800; // Optimal for Bengali text
const CHUNK_OVERLAP = 100;
const MAX_RETRIES = 3;
const SUPPORTED_LANGUAGES = ['bn', 'en', 'mixed'];

class DocumentProcessor {
  private openai: OpenAI;
  private supabase: any;
  private processingStats = {
    totalDocuments: 0,
    totalChunks: 0,
    successfulEmbeddings: 0,
    errors: [] as string[]
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Main processing function - handles all document types
   */
  async processDocument(filePath: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    const document_id = this.generateDocumentId(filePath);
    
    console.log(`🚀 Starting processing: ${path.basename(filePath)}`);

    try {
      // Step 1: Extract text from PDF
      const extractedText = await this.extractTextFromPDF(filePath);
      
      // Step 2: Detect language and document type
      const metadata = await this.analyzeDocument(extractedText, filePath);
      
      // Step 3: Clean and preprocess text
      const cleanedText = await this.cleanText(extractedText, metadata.language);
      
      // Step 4: Intelligent chunking
      const chunks = await this.createIntelligentChunks(cleanedText, metadata);
      
      // Step 5: Generate embeddings
      const processedChunks = await this.generateEmbeddings(chunks);
      
      // Step 6: Store in database
      await this.storeChunks(processedChunks);
      
      const processingTime = Date.now() - startTime;
      
      this.processingStats.totalDocuments++;
      this.processingStats.totalChunks += chunks.length;
      
      console.log(`✅ Completed processing: ${chunks.length} chunks in ${processingTime}ms`);
      
      return {
        success: true,
        document_id,
        chunks_processed: chunks.length,
        processing_time: processingTime
      };

    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
      this.processingStats.errors.push(`${filePath}: ${error.message}`);
      
      return {
        success: false,
        document_id,
        chunks_processed: 0,
        processing_time: Date.now() - startTime,
        errors: [error.message]
      };
    }
  }

  /**
   * Extract text from PDF with OCR fallback
   */
  private async extractTextFromPDF(filePath: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    
    try {
      // Primary: Use pdf-parse for text extraction (dynamic import)
      const pdf = (await import('pdf-parse')).default;
      const data = await pdf(dataBuffer, {
        // Optimize for Bengali text
        normalizeWhitespace: true,
        disableCombineTextItems: false
      });
      
      if (data.text && data.text.trim().length > 100) {
        console.log(`📄 Extracted ${data.text.length} characters using pdf-parse`);
        return data.text;
      }
      
      // Fallback: OCR with Tesseract (if pdf-parse fails)
      return await this.performOCR(dataBuffer);
      
    } catch (error) {
      console.log(`🔍 PDF parsing failed, falling back to OCR: ${error.message}`);
      return await this.performOCR(dataBuffer);
    }
  }

  /**
   * OCR fallback for image-based PDFs
   */
  private async performOCR(dataBuffer: Buffer): Promise<string> {
    // For now, we'll use a simple fallback
    // In production, integrate with Tesseract.js or similar
    console.log(`🔍 OCR processing would be implemented here`);
    throw new Error('OCR not implemented - PDF text extraction failed');
  }

  /**
   * Analyze document to determine language and type
   */
  private async analyzeDocument(text: string, filePath: string): Promise<ChunkMetadata> {
    const fileName = path.basename(filePath).toLowerCase();
    const sample = text.substring(0, 2000); // First 2000 chars for analysis
    
    // Detect language
    const bengaliPattern = /[\u0980-\u09FF]/;
    const englishPattern = /[A-Za-z]/;
    
    const hasBengali = bengaliPattern.test(sample);
    const hasEnglish = englishPattern.test(sample);
    
    let language: 'bn' | 'en' | 'mixed';
    if (hasBengali && hasEnglish) {
      language = 'mixed';
    } else if (hasBengali) {
      language = 'bn';
    } else {
      language = 'en';
    }

    // Determine document type
    let document_type: ChunkMetadata['document_type'];
    let act_year: string | undefined;

    if (fileName.includes('finance') || fileName.includes('অর্থ')) {
      document_type = 'finance_act';
      act_year = this.extractYear(fileName) || '2025';
    } else if (fileName.includes('income') || fileName.includes('আয়কর')) {
      document_type = 'income_tax';
      act_year = this.extractYear(fileName) || '1984';
    } else if (fileName.includes('vat') || fileName.includes('মূসক')) {
      document_type = 'vat_act';
      act_year = this.extractYear(fileName) || '2012';
    } else {
      document_type = 'circular';
    }

    return {
      document_id: this.generateDocumentId(filePath),
      document_name: fileName,
      document_type,
      language,
      act_year,
      source_file: filePath,
      chunk_index: 0,
      total_chunks: 0
    };
  }

  /**
   * Clean and normalize text for both Bengali and English
   */
  private async cleanText(text: string, language: 'bn' | 'en' | 'mixed'): Promise<string> {
    let cleaned = text;

    // Remove common PDF artifacts
    cleaned = cleaned.replace(/\f/g, '\n'); // Form feeds
    cleaned = cleaned.replace(/\r\n/g, '\n'); // Windows line endings
    cleaned = cleaned.replace(/\r/g, '\n'); // Mac line endings
    
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' '); // Max 1 space
    
    // Bengali-specific cleaning
    if (language === 'bn' || language === 'mixed') {
      // Normalize Bengali characters
      cleaned = cleaned.replace(/[\u09BC]/g, ''); // Remove nukta
      cleaned = cleaned.replace(/[\u200C\u200D]/g, ''); // Remove zero-width chars
      
      // Fix common OCR errors in Bengali
      cleaned = cleaned.replace(/০/g, '০'); // Normalize Bengali zero
      cleaned = cleaned.replace(/১/g, '১'); // Normalize Bengali one
    }

    // English-specific cleaning
    if (language === 'en' || language === 'mixed') {
      // Fix common OCR errors
      cleaned = cleaned.replace(/\bl\b/g, 'I'); // Common OCR mistake
      cleaned = cleaned.replace(/\bO\b/g, '0'); // O -> 0 in numbers
    }

    // Remove header/footer patterns
    cleaned = this.removeHeadersFooters(cleaned);

    return cleaned.trim();
  }

  /**
   * Create intelligent chunks with section awareness
   */
  private async createIntelligentChunks(text: string, baseMetadata: ChunkMetadata): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    
    // Split by sections first (using Bengali and English patterns)
    const sections = this.splitBySections(text);
    
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const section = sections[sectionIndex];
      
      // Extract section number and title
      const sectionInfo = this.extractSectionInfo(section.content);
      
      // Split large sections into smaller chunks
      const sectionChunks = this.splitTextIntoChunks(section.content, CHUNK_SIZE, CHUNK_OVERLAP);
      
      for (let chunkIndex = 0; chunkIndex < sectionChunks.length; chunkIndex++) {
        const chunkContent = sectionChunks[chunkIndex];
        
        // Generate keywords for this chunk
        const keywords = await this.extractKeywords(chunkContent, baseMetadata.language);
        
        const chunk: DocumentChunk = {
          id: `${baseMetadata.document_id}_${sectionIndex}_${chunkIndex}`,
          content: chunkContent,
          metadata: {
            ...baseMetadata,
            section_number: sectionInfo.number,
            section_title: sectionInfo.title,
            chunk_index: chunks.length,
            total_chunks: 0 // Will be updated later
          },
          keywords_bn: keywords.bengali,
          keywords_en: keywords.english
        };

        chunks.push(chunk);
      }
    }

    // Update total_chunks for all chunks
    chunks.forEach(chunk => {
      chunk.metadata.total_chunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Split text by sections using multiple patterns
   */
  private splitBySections(text: string): { content: string; type: string }[] {
    const sections: { content: string; type: string }[] = [];
    
    // Bengali section patterns
    const bengaliPatterns = [
      /ধারা\s*[\u09E6-\u09EF\d]+/g, // ধারা ১, ধারা ২, etc.
      /অনুচ্ছেদ\s*[\u09E6-\u09EF\d]+/g, // অনুচ্ছেদ ১
      /খণ্ড\s*[\u09E6-\u09EF\d]+/g, // খণ্ড ১
      /পরিচ্ছেদ\s*[\u09E6-\u09EF\d]+/g // পরিচ্ছেদ ১
    ];
    
    // English section patterns
    const englishPatterns = [
      /Section\s+\d+/gi,
      /Chapter\s+\d+/gi,
      /Part\s+[A-Z\d]+/gi,
      /Article\s+\d+/gi
    ];

    // Combine all patterns
    const allPatterns = [...bengaliPatterns, ...englishPatterns];
    const matches: { index: number; pattern: string }[] = [];

    // Find all section markers
    for (const pattern of allPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          index: match.index,
          pattern: match[0]
        });
      }
    }

    // Sort by index
    matches.sort((a, b) => a.index - b.index);

    if (matches.length === 0) {
      // No sections found, return entire text as one section
      return [{ content: text, type: 'full_document' }];
    }

    // Create sections
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
      
      sections.push({
        content: text.substring(start, end).trim(),
        type: 'section'
      });
    }

    return sections;
  }

  /**
   * Extract section number and title from content
   */
  private extractSectionInfo(content: string): { number?: string; title?: string } {
    const lines = content.split('\n').slice(0, 3); // Check first 3 lines
    
    for (const line of lines) {
      // Bengali patterns
      const bengaliMatch = line.match(/(ধারা|অনুচ্ছেদ|খণ্ড|পরিচ্ছেদ)\s*([\u09E6-\u09EF\d]+)\.?\s*(.+)?/);
      if (bengaliMatch) {
        return {
          number: bengaliMatch[2],
          title: bengaliMatch[3]?.trim()
        };
      }

      // English patterns
      const englishMatch = line.match(/(Section|Chapter|Part|Article)\s+(\d+[A-Z]?)\.?\s*(.+)?/i);
      if (englishMatch) {
        return {
          number: englishMatch[2],
          title: englishMatch[3]?.trim()
        };
      }
    }

    return {};
  }

  /**
   * Split text into chunks with overlap
   */
  private splitTextIntoChunks(text: string, maxSize: number, overlap: number): string[] {
    if (text.length <= maxSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + maxSize, text.length);
      
      // Try to end at a sentence boundary
      if (end < text.length) {
        const sentenceEnd = this.findSentenceEnd(text, start, end);
        if (sentenceEnd > start + maxSize * 0.7) { // Ensure minimum chunk size
          end = sentenceEnd;
        }
      }

      chunks.push(text.substring(start, end).trim());
      start = Math.max(start + maxSize - overlap, end - overlap);
      
      if (start >= text.length) break;
    }

    return chunks;
  }

  /**
   * Find sentence end for natural chunk boundaries
   */
  private findSentenceEnd(text: string, start: number, maxEnd: number): number {
    // Bengali sentence enders
    const bengaliEnders = /[।!?]/g;
    // English sentence enders
    const englishEnders = /[.!?]/g;

    let lastEnd = start;
    
    // Check Bengali sentence enders
    let match;
    bengaliEnders.lastIndex = start;
    while ((match = bengaliEnders.exec(text)) !== null && match.index < maxEnd) {
      lastEnd = match.index + 1;
    }

    // Check English sentence enders
    englishEnders.lastIndex = start;
    while ((match = englishEnders.exec(text)) !== null && match.index < maxEnd) {
      if (match.index > lastEnd) {
        lastEnd = match.index + 1;
      }
    }

    return lastEnd > start ? lastEnd : maxEnd;
  }

  /**
   * Extract keywords using AI for better search
   */
  private async extractKeywords(text: string, language: 'bn' | 'en' | 'mixed'): Promise<{ bengali: string[]; english: string[] }> {
    try {
      const prompt = this.createKeywordExtractionPrompt(text, language);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.3
      });

      const result = response.choices[0]?.message?.content || '{}';
      const keywords = JSON.parse(result);
      
      return {
        bengali: keywords.bengali || [],
        english: keywords.english || []
      };
    } catch (error) {
      console.error('Keyword extraction failed:', error);
      return {
        bengali: this.fallbackKeywordExtraction(text, 'bn'),
        english: this.fallbackKeywordExtraction(text, 'en')
      };
    }
  }

  /**
   * Create keyword extraction prompt
   */
  private createKeywordExtractionPrompt(text: string, language: 'bn' | 'en' | 'mixed'): string {
    const sample = text.substring(0, 500); // Use first 500 chars
    
    return `Extract 5-10 important tax law keywords from this text in both Bengali and English.
    
    Text: "${sample}"
    
    Return as JSON:
    {
      "bengali": ["কর", "বেতন", "আয়", "ছাড়"],
      "english": ["tax", "salary", "income", "deduction"]
    }
    
    Focus on legal and tax terminology.`;
  }

  /**
   * Fallback keyword extraction using simple patterns
   */
  private fallbackKeywordExtraction(text: string, language: 'bn' | 'en'): string[] {
    if (language === 'bn') {
      const bengaliKeywords = ['কর', 'বেতন', 'আয়', 'ছাড়', 'ধারা', 'আইন', 'অর্থ', 'মূসক'];
      return bengaliKeywords.filter(keyword => text.includes(keyword));
    } else {
      const englishKeywords = ['tax', 'income', 'salary', 'deduction', 'section', 'act', 'finance', 'vat'];
      return englishKeywords.filter(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
    }
  }

  /**
   * Generate embeddings using OpenAI
   */
  private async generateEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    const processedChunks: DocumentChunk[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🔗 Generating embedding ${i + 1}/${chunks.length}`);
      
      try {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk.content,
          encoding_format: 'float'
        });

        chunk.embeddings = response.data[0].embedding;
        processedChunks.push(chunk);
        this.processingStats.successfulEmbeddings++;
        
        // Rate limiting - wait 50ms between requests
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`Failed to generate embedding for chunk ${i}:`, error);
        // Continue without embedding for this chunk
        processedChunks.push(chunk);
      }
    }

    return processedChunks;
  }

  /**
   * Store processed chunks in Supabase
   */
  private async storeChunks(chunks: DocumentChunk[]): Promise<void> {
    for (const chunk of chunks) {
      try {
        const { error } = await this.supabase
          .from('document_chunks')
          .upsert({
            id: chunk.id,
            content: chunk.content,
            content_bn: chunk.content_bn,
            content_en: chunk.content_en,
            metadata: chunk.metadata,
            embeddings: chunk.embeddings,
            keywords_bn: chunk.keywords_bn,
            keywords_en: chunk.keywords_en,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error storing chunk:', error);
        }
      } catch (error) {
        console.error('Failed to store chunk:', error);
      }
    }
  }

  /**
   * Utility functions
   */
  private generateDocumentId(filePath: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    const timestamp = Date.now();
    return `${fileName}_${timestamp}`;
  }

  private extractYear(fileName: string): string | undefined {
    const yearMatch = fileName.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : undefined;
  }

  private removeHeadersFooters(text: string): string {
    const lines = text.split('\n');
    const filteredLines = lines.filter(line => {
      const cleaned = line.trim().toLowerCase();
      
      // Remove common header/footer patterns
      return !(
        cleaned.startsWith('page') ||
        cleaned.startsWith('পৃষ্ঠা') ||
        cleaned.match(/^\d+$/) || // Page numbers
        cleaned.includes('government of bangladesh') ||
        cleaned.includes('bangladesh gazette') ||
        cleaned.includes('বাংলাদেশ গেজেট')
      );
    });
    
    return filteredLines.join('\n');
  }

  /**
   * Process all documents in Act-files folder
   */
  async processAllDocuments(): Promise<void> {
    const actFilesPath = path.join(process.cwd(), 'Act-files');
    const files = fs.readdirSync(actFilesPath).filter(file => file.endsWith('.pdf'));
    
    console.log(`📚 Found ${files.length} PDF files to process`);
    
    for (const file of files) {
      const filePath = path.join(actFilesPath, file);
      console.log(`\n🔄 Processing: ${file}`);
      
      const result = await this.processDocument(filePath);
      
      if (result.success) {
        console.log(`✅ Successfully processed ${file}: ${result.chunks_processed} chunks`);
      } else {
        console.log(`❌ Failed to process ${file}: ${result.errors?.join(', ')}`);
      }
    }
    
    this.printProcessingStats();
  }

  /**
   * Print processing statistics
   */
  private printProcessingStats(): void {
    console.log('\n📊 Processing Statistics:');
    console.log(`Documents processed: ${this.processingStats.totalDocuments}`);
    console.log(`Total chunks created: ${this.processingStats.totalChunks}`);
    console.log(`Successful embeddings: ${this.processingStats.successfulEmbeddings}`);
    console.log(`Errors: ${this.processingStats.errors.length}`);
    
    if (this.processingStats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.processingStats.errors.forEach(error => console.log(`  - ${error}`));
    }
  }
}

export { DocumentProcessor, DocumentChunk, ChunkMetadata, ProcessingResult };
export default DocumentProcessor;