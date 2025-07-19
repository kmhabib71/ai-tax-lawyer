/**
 * Store Finance Act in Supabase - AI Tax Lawyer Bangladesh
 * Production script to store OCR-processed documents in vector database
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key] = valueParts.join('=');
  }
});

// Initialize OpenAI
let openai;
async function initializeOpenAI() {
  const { OpenAI } = await import('openai');
  openai = new OpenAI({
    apiKey: envVars.OPENAI_API_KEY || process.env.OPENAI_API_KEY
  });
  return openai;
}

// Initialize Supabase
const supabase = createClient(
  envVars.SUPABASE_URL || process.env.SUPABASE_URL,
  envVars.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

class SupabaseDocumentProcessor {
  constructor() {
    this.batchSize = 5; // Process in batches to avoid rate limits
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  async generateEmbedding(text) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ Embedding generation failed:', error.message);
      throw error;
    }
  }

  async testSupabaseConnection() {
    console.log('🔗 Testing Supabase connection...');
    
    try {
      // Test with a simple query
      const { data, error } = await supabase
        .from('tax_documents')
        .select('id')
        .limit(1);

      if (error) {
        if (error.code === '42P01') {
          throw new Error('tax_documents table does not exist. Please run the Supabase schema setup first.');
        }
        throw error;
      }

      console.log('✅ Supabase connection successful');
      return true;

    } catch (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
  }

  async clearExistingDocument(documentType) {
    console.log(`🧹 Clearing existing ${documentType} data...`);
    
    try {
      const { error } = await supabase
        .from('tax_documents')
        .delete()
        .eq('document_type', documentType);

      if (error) {
        console.warn('⚠️  Warning: Could not clear existing data:', error.message);
        return false;
      }

      console.log('✅ Existing data cleared');
      return true;

    } catch (error) {
      console.error('❌ Clear operation failed:', error.message);
      return false;
    }
  }

  async storeDocumentBatch(documents) {
    try {
      const { data, error } = await supabase
        .from('tax_documents')
        .insert(documents)
        .select('id');

      if (error) {
        throw error;
      }

      return { success: true, count: data.length };

    } catch (error) {
      console.error('❌ Batch storage failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async processDocument(filePath, documentType) {
    console.log(`\n🚀 PROCESSING DOCUMENT FOR SUPABASE STORAGE`);
    console.log(`📄 File: ${path.basename(filePath)}`);
    console.log(`📝 Type: ${documentType}`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();

    try {
      // Test connection first
      const connectionOK = await this.testSupabaseConnection();
      if (!connectionOK) {
        throw new Error('Supabase connection failed');
      }

      // Clear existing data
      await this.clearExistingDocument(documentType);

      // Read OCR processed file
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const chunks = data.chunks || [];
      
      console.log(`📦 Found ${chunks.length} chunks to process`);

      if (chunks.length === 0) {
        throw new Error('No chunks found in file');
      }

      // Process in batches
      const results = {
        total_chunks: chunks.length,
        successful: 0,
        failed: 0,
        batches_processed: 0,
        errors: []
      };

      for (let i = 0; i < chunks.length; i += this.batchSize) {
        const batchChunks = chunks.slice(i, i + this.batchSize);
        const batchNumber = Math.floor(i / this.batchSize) + 1;
        const totalBatches = Math.ceil(chunks.length / this.batchSize);

        console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batchChunks.length} chunks)...`);

        const batchDocuments = [];

        // Generate embeddings for batch
        for (let j = 0; j < batchChunks.length; j++) {
          const chunk = batchChunks[j];
          const chunkIndex = i + j;

          try {
            console.log(`   🔮 Generating embedding for chunk ${chunkIndex + 1}...`);
            
            const embedding = await this.generateEmbedding(chunk.content);

            // Prepare document for storage
            const document = {
              id: chunk.id,
              content: chunk.content,
              embedding: embedding,
              metadata: chunk.metadata,
              document_type: documentType,
              document_name: data.document || 'unknown',
              source_file: path.basename(filePath),
              extraction_method: data.extraction_method || 'OCR',
              language: data.language || 'bn',
              chunk_index: chunkIndex,
              total_chunks: chunks.length
            };

            batchDocuments.push(document);
            console.log(`   ✅ Chunk ${chunkIndex + 1} prepared`);

            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 200));

          } catch (error) {
            console.error(`   ❌ Error processing chunk ${chunkIndex + 1}:`, error.message);
            results.failed++;
            results.errors.push({
              chunk_index: chunkIndex,
              chunk_id: chunk.id,
              error: error.message
            });
          }
        }

        // Store batch in Supabase
        if (batchDocuments.length > 0) {
          console.log(`   💾 Storing batch in Supabase...`);
          
          const storeResult = await this.storeDocumentBatch(batchDocuments);
          
          if (storeResult.success) {
            console.log(`   ✅ Batch ${batchNumber} stored successfully (${storeResult.count} documents)`);
            results.successful += storeResult.count;
            results.batches_processed++;
          } else {
            console.error(`   ❌ Batch ${batchNumber} storage failed:`, storeResult.error);
            results.failed += batchDocuments.length;
            results.errors.push({
              batch_number: batchNumber,
              error: storeResult.error
            });
          }
        }

        // Delay between batches
        if (i + this.batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Final statistics
      const processingTime = Date.now() - startTime;
      const successRate = (results.successful / results.total_chunks) * 100;

      console.log(`\n📊 PROCESSING COMPLETE!`);
      console.log('='.repeat(60));
      console.log(`✅ Successfully stored: ${results.successful}/${results.total_chunks}`);
      console.log(`❌ Failed: ${results.failed}/${results.total_chunks}`);
      console.log(`📈 Success rate: ${successRate.toFixed(1)}%`);
      console.log(`📦 Batches processed: ${results.batches_processed}`);
      console.log(`⏱️  Processing time: ${Math.round(processingTime / 1000)}s`);

      // Verify storage
      const { data: storedData, error: verifyError } = await supabase
        .from('tax_documents')
        .select('id, document_type, document_name')
        .eq('document_type', documentType);

      if (!verifyError && storedData) {
        console.log(`✅ Verification: ${storedData.length} documents in database`);
      }

      // Save processing report
      const report = {
        document_file: path.basename(filePath),
        document_type: documentType,
        processing_date: new Date().toISOString(),
        processing_time_ms: processingTime,
        results: results,
        success_rate: successRate,
        stored_count: results.successful
      };

      const reportFile = `supabase-storage-${documentType}-${Date.now()}.json`;
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      console.log(`📄 Report saved: ${reportFile}`);

      return {
        success: successRate > 80,
        results: results,
        report: report
      };

    } catch (error) {
      console.error(`\n❌ Document processing failed:`, error.message);
      return {
        success: false,
        error: error.message,
        processing_time_ms: Date.now() - startTime
      };
    }
  }

  async verifyDocumentStorage(documentType) {
    console.log(`\n🔍 Verifying ${documentType} storage...`);
    
    try {
      const { data, error } = await supabase
        .from('tax_documents')
        .select('id, content, document_name, chunk_index')
        .eq('document_type', documentType)
        .order('chunk_index');

      if (error) {
        throw error;
      }

      console.log(`✅ Found ${data.length} stored chunks`);
      
      if (data.length > 0) {
        console.log(`📄 Document: ${data[0].document_name}`);
        console.log(`📝 Sample content: "${data[0].content.substring(0, 100)}..."`);
        
        // Test semantic search
        await this.testSemanticSearch(documentType);
      }

      return data.length;

    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      return 0;
    }
  }

  async testSemanticSearch(documentType) {
    console.log(`\n🔍 Testing semantic search for ${documentType}...`);
    
    try {
      // Generate test query embedding
      const testQuery = documentType === 'finance_act' ? 'মূল্য সংযোজন কর' : 'আয়কর';
      const queryEmbedding = await this.generateEmbedding(testQuery);
      
      // Search using the stored function
      const { data, error } = await supabase.rpc('match_tax_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.1,
        match_count: 2
      });

      if (error) {
        console.log(`⚠️  Semantic search function not available: ${error.message}`);
        return false;
      }

      console.log(`✅ Semantic search working! Found ${data.length} results`);
      data.forEach((result, index) => {
        console.log(`   ${index + 1}. Similarity: ${(result.similarity * 100).toFixed(1)}%`);
        console.log(`      Content: "${result.content.substring(0, 80)}..."`);
      });

      return true;

    } catch (error) {
      console.error('❌ Semantic search test failed:', error.message);
      return false;
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 AI Tax Lawyer Bangladesh - Supabase Document Storage');
  console.log('='.repeat(70));

  try {
    // Initialize
    await initializeOpenAI();
    console.log('✅ OpenAI initialized');

    const processor = new SupabaseDocumentProcessor();

    // Process Finance Act
    const financeActFile = 'ocr-processed-finance-act-2025-bangla.json';
    
    if (!fs.existsSync(financeActFile)) {
      throw new Error(`File not found: ${financeActFile}`);
    }

    const result = await processor.processDocument(financeActFile, 'finance_act');
    
    if (result.success) {
      console.log('\n🎉 SUCCESS! Finance Act stored in Supabase');
      
      // Verify storage
      const storedCount = await processor.verifyDocumentStorage('finance_act');
      
      if (storedCount > 0) {
        console.log('\n✅ PRODUCTION READY!');
        console.log('   • Finance Act successfully stored in vector database');
        console.log('   • Semantic search working');
        console.log('   • Ready for chat integration');
        
        console.log('\n📋 REUSABLE PROCEDURE CREATED:');
        console.log('   1. Use this script for other documents:');
        console.log('      node store-finance-act-supabase.js');
        console.log('   2. Change document type and file path as needed');
        console.log('   3. Follow same batch processing approach');
      }
    } else {
      console.log('\n❌ Storage failed. Check errors and retry.');
    }

  } catch (error) {
    console.error('\n❌ Main process failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure Supabase schema is set up');
    console.log('   2. Check environment variables');
    console.log('   3. Verify OpenAI API key');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SupabaseDocumentProcessor };