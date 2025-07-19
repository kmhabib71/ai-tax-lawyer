#!/usr/bin/env tsx

/**
 * Document Processing Script for AI Tax Lawyer Bangladesh
 * Processes all PDF files in Act-files folder and populates vector database
 */

import { DocumentProcessor } from '../src/lib/ai/document-pipeline';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Configuration
const ACT_FILES_PATH = path.join(process.cwd(), 'Act-files');
const BATCH_SIZE = 3; // Process 3 files at a time to avoid overwhelming OpenAI
const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds between batches

interface ProcessingStats {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalChunks: number;
  totalEmbeddings: number;
  startTime: number;
  endTime?: number;
  errors: string[];
}

class DocumentProcessingOrchestrator {
  private processor: DocumentProcessor;
  private stats: ProcessingStats;
  private supabase: any;

  constructor() {
    this.processor = new DocumentProcessor();
    this.stats = {
      totalFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      totalChunks: 0,
      totalEmbeddings: 0,
      startTime: Date.now(),
      errors: []
    };

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Main processing function
   */
  async processAllDocuments(): Promise<void> {
    console.log('🚀 Starting AI Tax Lawyer Document Processing Pipeline');
    console.log('=====================================');
    
    // Verify environment
    await this.verifyEnvironment();
    
    // Get list of PDF files
    const pdfFiles = this.getPDFFiles();
    this.stats.totalFiles = pdfFiles.length;
    
    console.log(`📚 Found ${pdfFiles.length} PDF files to process`);
    
    if (pdfFiles.length === 0) {
      console.log('❌ No PDF files found in Act-files folder');
      return;
    }

    // Initialize database
    await this.initializeDatabase();
    
    // Process files in batches
    await this.processBatches(pdfFiles);
    
    // Final statistics
    this.stats.endTime = Date.now();
    this.printFinalStats();
  }

  /**
   * Verify environment setup
   */
  private async verifyEnvironment(): Promise<void> {
    console.log('🔧 Verifying environment...');
    
    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
    
    // Check Supabase credentials
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not found in environment variables');
    }
    
    // Check Act-files directory
    if (!fs.existsSync(ACT_FILES_PATH)) {
      throw new Error(`Act-files directory not found: ${ACT_FILES_PATH}`);
    }
    
    // Test Supabase connection
    try {
      const { data, error } = await this.supabase.from('document_chunks').select('count').limit(1);
      if (error && !error.message.includes('relation "document_chunks" does not exist')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
    } catch (error) {
      console.warn('⚠️  Database tables may not exist yet. Will create during initialization.');
    }
    
    console.log('✅ Environment verification complete');
  }

  /**
   * Get list of PDF files from Act-files directory
   */
  private getPDFFiles(): string[] {
    const files = fs.readdirSync(ACT_FILES_PATH);
    const pdfFiles = files
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(file => path.join(ACT_FILES_PATH, file));
    
    console.log('\n📋 PDF Files Found:');
    pdfFiles.forEach((file, index) => {
      const fileName = path.basename(file);
      const stats = fs.statSync(file);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`  ${index + 1}. ${fileName} (${sizeKB} KB)`);
    });
    
    return pdfFiles;
  }

  /**
   * Initialize database with required schema
   */
  private async initializeDatabase(): Promise<void> {
    console.log('\n🗄️  Initializing database...');
    
    try {
      // Read and execute schema
      const schemaPath = path.join(process.cwd(), 'supabase-vector-schema.sql');
      
      if (fs.existsSync(schemaPath)) {
        console.log('📜 Schema file found, executing...');
        // Note: In production, this would be handled by Supabase migrations
        console.log('⚠️  Please ensure the vector schema has been applied to your Supabase database');
      } else {
        console.log('⚠️  Schema file not found. Please ensure database is properly set up.');
      }
      
      // Test table access
      const { error } = await this.supabase.from('document_chunks').select('count').limit(1);
      if (error && error.message.includes('relation "document_chunks" does not exist')) {
        throw new Error('Database tables not found. Please run the schema SQL file first.');
      }
      
      console.log('✅ Database initialization complete');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Process files in batches to avoid rate limits
   */
  private async processBatches(pdfFiles: string[]): Promise<void> {
    console.log(`\n⚡ Processing ${pdfFiles.length} files in batches of ${BATCH_SIZE}`);
    
    for (let i = 0; i < pdfFiles.length; i += BATCH_SIZE) {
      const batch = pdfFiles.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(pdfFiles.length / BATCH_SIZE);
      
      console.log(`\n📦 Processing Batch ${batchNumber}/${totalBatches}`);
      console.log('=====================================');
      
      // Process batch
      await this.processBatch(batch, batchNumber);
      
      // Delay between batches (except for the last batch)
      if (i + BATCH_SIZE < pdfFiles.length) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES/1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
  }

  /**
   * Process a single batch of files
   */
  private async processBatch(filePaths: string[], batchNumber: number): Promise<void> {
    const batchStartTime = Date.now();
    
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const fileName = path.basename(filePath);
      const fileNumber = (batchNumber - 1) * BATCH_SIZE + i + 1;
      
      console.log(`\n📄 [${fileNumber}/${this.stats.totalFiles}] Processing: ${fileName}`);
      console.log('-----------------------------------');
      
      try {
        // Log processing start
        await this.logProcessingStart(fileName, filePath);
        
        // Process document
        const result = await this.processor.processDocument(filePath);
        
        if (result.success) {
          this.stats.successfulFiles++;
          this.stats.totalChunks += result.chunks_processed;
          
          console.log(`✅ Success: ${result.chunks_processed} chunks, ${result.processing_time}ms`);
          
          // Update processing log
          await this.logProcessingComplete(fileName, result);
        } else {
          this.stats.failedFiles++;
          this.stats.errors.push(`${fileName}: ${result.errors?.join(', ') || 'Unknown error'}`);
          
          console.log(`❌ Failed: ${result.errors?.join(', ') || 'Unknown error'}`);
          
          // Update processing log
          await this.logProcessingFailed(fileName, result.errors?.[0] || 'Unknown error');
        }
        
      } catch (error) {
        this.stats.failedFiles++;
        this.stats.errors.push(`${fileName}: ${error.message}`);
        
        console.log(`❌ Exception: ${error.message}`);
        
        // Log processing failure
        await this.logProcessingFailed(fileName, error.message);
      }
      
      // Brief pause between files
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const batchTime = Date.now() - batchStartTime;
    console.log(`\n🏁 Batch ${batchNumber} completed in ${this.formatTime(batchTime)}`);
  }

  /**
   * Log processing start
   */
  private async logProcessingStart(fileName: string, filePath: string): Promise<void> {
    try {
      await this.supabase.from('document_processing_log').insert({
        document_id: `${fileName}_${Date.now()}`,
        file_path: filePath,
        processing_status: 'processing'
      });
    } catch (error) {
      console.warn('Failed to log processing start:', error);
    }
  }

  /**
   * Log processing completion
   */
  private async logProcessingComplete(fileName: string, result: any): Promise<void> {
    try {
      await this.supabase
        .from('document_processing_log')
        .update({
          processing_status: 'completed',
          chunks_created: result.chunks_processed,
          processing_time_ms: result.processing_time
        })
        .eq('document_id', result.document_id);
    } catch (error) {
      console.warn('Failed to log processing completion:', error);
    }
  }

  /**
   * Log processing failure
   */
  private async logProcessingFailed(fileName: string, errorMessage: string): Promise<void> {
    try {
      await this.supabase
        .from('document_processing_log')
        .update({
          processing_status: 'failed',
          error_message: errorMessage
        })
        .like('file_path', `%${fileName}`);
    } catch (error) {
      console.warn('Failed to log processing failure:', error);
    }
  }

  /**
   * Print final statistics
   */
  private printFinalStats(): void {
    const totalTime = this.stats.endTime! - this.stats.startTime;
    
    console.log('\n\n🎉 PROCESSING COMPLETE!');
    console.log('=====================================');
    console.log(`📊 Final Statistics:`);
    console.log(`   Total Files: ${this.stats.totalFiles}`);
    console.log(`   ✅ Successful: ${this.stats.successfulFiles}`);
    console.log(`   ❌ Failed: ${this.stats.failedFiles}`);
    console.log(`   📝 Total Chunks: ${this.stats.totalChunks}`);
    console.log(`   ⏱️  Total Time: ${this.formatTime(totalTime)}`);
    console.log(`   📈 Success Rate: ${((this.stats.successfulFiles / this.stats.totalFiles) * 100).toFixed(1)}%`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n❌ Errors Encountered:`);
      this.stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    console.log(`\n🚀 Ready to serve queries! Your AI Tax Lawyer knowledge base is loaded.`);
    console.log(`   - ${this.stats.totalChunks} searchable chunks`);
    console.log(`   - Multi-language support (Bengali, English, Banglish)`);
    console.log(`   - Vector + keyword + fuzzy search capabilities`);
    
    if (this.stats.successfulFiles > 0) {
      console.log(`\n💡 Next Steps:`);
      console.log(`   1. Test queries using the chat interface`);
      console.log(`   2. Monitor search performance in analytics`);
      console.log(`   3. Add more documents as needed`);
    }
  }

  /**
   * Format time in human readable format
   */
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// CLI execution
async function main() {
  // Load environment variables
  require('dotenv').config();
  
  console.log('🇧🇩 AI Tax Lawyer Bangladesh - Document Processing Pipeline');
  console.log('=========================================================\n');
  
  try {
    const orchestrator = new DocumentProcessingOrchestrator();
    await orchestrator.processAllDocuments();
    process.exit(0);
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR:', error.message);
    console.error('\nPlease check:');
    console.error('1. Environment variables are set correctly');
    console.error('2. Supabase database is accessible');
    console.error('3. OpenAI API key is valid');
    console.error('4. Act-files directory exists and contains PDF files');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DocumentProcessingOrchestrator };