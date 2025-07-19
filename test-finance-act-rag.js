/**
 * Test Finance Act RAG System - AI Tax Lawyer Bangladesh
 * Process OCR chunks, generate embeddings, store in vector DB, and test queries
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

class FinanceActRAGTester {
  constructor() {
    this.testQueries = [
      // Bengali queries
      {
        query: "মূল্য সংযোজন কর কি?",
        type: "definition",
        language: "bn",
        expected_context: "VAT definition"
      },
      {
        query: "আয়কর হার কত?",
        type: "rate_inquiry", 
        language: "bn",
        expected_context: "tax rates"
      },
      {
        query: "অর্থ আইন ২০২৫ এর ধারা ২৭ কি বলে?",
        type: "section_specific",
        language: "bn", 
        expected_context: "section 27"
      },
      // English queries
      {
        query: "What is VAT rate in Bangladesh?",
        type: "rate_inquiry",
        language: "en",
        expected_context: "VAT rate"
      },
      {
        query: "Finance Act 2025 changes",
        type: "general_inquiry",
        language: "en",
        expected_context: "finance act"
      },
      // Mixed queries (Banglish)
      {
        query: "VAT কিভাবে calculate করব?",
        type: "calculation",
        language: "mixed",
        expected_context: "VAT calculation"
      }
    ];
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

  async processAndStoreChunks(financeActFile) {
    console.log('\n🔄 Processing Finance Act chunks for vector storage...');
    console.log('='.repeat(60));
    
    // Read OCR processed file
    const data = JSON.parse(fs.readFileSync(financeActFile, 'utf8'));
    const chunks = data.chunks || [];
    
    console.log(`📦 Found ${chunks.length} chunks to process`);
    
    if (chunks.length === 0) {
      throw new Error('No chunks found in OCR processed file');
    }

    // First, clear existing finance act data
    console.log('🧹 Clearing existing finance act data...');
    const { error: deleteError } = await supabase
      .from('tax_documents')
      .delete()
      .eq('document_type', 'finance_act');
    
    if (deleteError) {
      console.warn('⚠️ Warning: Could not clear existing data:', deleteError.message);
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      console.log(`\n📄 Processing chunk ${i + 1}/${chunks.length}...`);
      console.log(`   Content preview: "${chunk.content.substring(0, 100)}..."`);
      
      try {
        // Generate embedding
        console.log('   🔮 Generating embedding...');
        const embedding = await this.generateEmbedding(chunk.content);
        
        // Prepare document data
        const documentData = {
          id: chunk.id,
          content: chunk.content,
          embedding: embedding,
          metadata: {
            ...chunk.metadata,
            chunk_index: i,
            total_chunks: chunks.length,
            processed_date: new Date().toISOString(),
            source_file: 'finance-act-2025-bangla.pdf',
            ocr_processed: true
          }
        };

        // Store in Supabase
        console.log('   💾 Storing in vector database...');
        const { data: insertData, error: insertError } = await supabase
          .from('tax_documents')
          .insert([documentData])
          .select();

        if (insertError) {
          throw insertError;
        }

        console.log(`   ✅ Chunk ${i + 1} stored successfully`);
        successCount++;
        
        results.push({
          chunk_id: chunk.id,
          chunk_index: i,
          embedding_dimension: embedding.length,
          content_length: chunk.content.length,
          status: 'success'
        });

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`   ❌ Error processing chunk ${i + 1}:`, error.message);
        errorCount++;
        
        results.push({
          chunk_id: chunk.id,
          chunk_index: i,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log('\n📊 EMBEDDING GENERATION SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully processed: ${successCount}/${chunks.length}`);
    console.log(`❌ Failed: ${errorCount}/${chunks.length}`);
    console.log(`📈 Success rate: ${Math.round((successCount / chunks.length) * 100)}%`);

    return {
      total_chunks: chunks.length,
      successful: successCount,
      failed: errorCount,
      success_rate: (successCount / chunks.length) * 100,
      results: results
    };
  }

  async testSemanticSearch(query, limit = 3) {
    console.log(`\n🔍 Testing semantic search for: "${query}"`);
    
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Perform similarity search using Supabase pgvector
      const { data, error } = await supabase.rpc('match_tax_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.1, // Lower threshold for testing
        match_count: limit
      });

      if (error) {
        throw error;
      }

      console.log(`   📋 Found ${data.length} relevant chunks:`);
      
      data.forEach((result, index) => {
        console.log(`\n   ${index + 1}. Similarity: ${(result.similarity * 100).toFixed(1)}%`);
        console.log(`      Chunk ID: ${result.id}`);
        console.log(`      Document: ${result.metadata?.document_name || 'Unknown'}`);
        console.log(`      Content preview: "${result.content.substring(0, 150)}..."`);
      });

      return data;
      
    } catch (error) {
      console.error(`   ❌ Search failed: ${error.message}`);
      return [];
    }
  }

  async testRAGQueries() {
    console.log('\n🧪 TESTING RAG SYSTEM WITH PREDEFINED QUERIES');
    console.log('='.repeat(60));
    
    const testResults = [];
    
    for (let i = 0; i < this.testQueries.length; i++) {
      const testQuery = this.testQueries[i];
      console.log(`\n📝 Test ${i + 1}/${this.testQueries.length}: ${testQuery.type} (${testQuery.language})`);
      console.log(`Query: "${testQuery.query}"`);
      
      try {
        const searchResults = await this.testSemanticSearch(testQuery.query, 2);
        
        const result = {
          query: testQuery.query,
          type: testQuery.type,
          language: testQuery.language,
          results_found: searchResults.length,
          top_similarity: searchResults.length > 0 ? searchResults[0].similarity : 0,
          success: searchResults.length > 0,
          expected_context: testQuery.expected_context
        };
        
        testResults.push(result);
        
        if (searchResults.length > 0) {
          console.log(`   ✅ Success: Found ${searchResults.length} relevant chunks`);
          console.log(`   🎯 Top similarity: ${(searchResults[0].similarity * 100).toFixed(1)}%`);
        } else {
          console.log('   ❌ No relevant chunks found');
        }
        
      } catch (error) {
        console.error(`   ❌ Query failed: ${error.message}`);
        testResults.push({
          query: testQuery.query,
          type: testQuery.type,
          language: testQuery.language,
          success: false,
          error: error.message
        });
      }
      
      // Delay between queries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return testResults;
  }

  async validateVectorDatabase() {
    console.log('\n🔍 VALIDATING VECTOR DATABASE');
    console.log('='.repeat(60));
    
    try {
      // Check document count
      const { data: documents, error: countError } = await supabase
        .from('tax_documents')
        .select('id, metadata')
        .eq('metadata->document_type', 'finance_act');

      if (countError) {
        throw countError;
      }

      console.log(`📊 Documents in database: ${documents.length}`);
      
      // Check for embeddings
      const documentsWithEmbeddings = documents.filter(doc => doc.embedding);
      console.log(`🔮 Documents with embeddings: ${documentsWithEmbeddings}`);
      
      // Sample document check
      if (documents.length > 0) {
        const sampleDoc = documents[0];
        console.log(`📋 Sample document ID: ${sampleDoc.id}`);
        console.log(`📋 Sample metadata: ${JSON.stringify(sampleDoc.metadata, null, 2)}`);
      }

      return {
        total_documents: documents.length,
        documents_with_embeddings: documentsWithEmbeddings,
        database_healthy: documents.length > 0
      };
      
    } catch (error) {
      console.error('❌ Database validation failed:', error.message);
      return {
        total_documents: 0,
        documents_with_embeddings: 0,
        database_healthy: false,
        error: error.message
      };
    }
  }

  async runCompleteTest() {
    const startTime = Date.now();
    
    console.log('🚀 AI TAX LAWYER BANGLADESH - FINANCE ACT RAG SYSTEM TEST');
    console.log('Testing with OCR-processed Finance Act 2025 (Bengali)');
    console.log('='.repeat(70));
    
    try {
      // Initialize OpenAI
      await initializeOpenAI();
      console.log('✅ OpenAI initialized');
      
      // Process and store chunks
      const financeActFile = 'ocr-processed-finance-act-2025-bangla.json';
      if (!fs.existsSync(financeActFile)) {
        throw new Error(`Finance Act file not found: ${financeActFile}`);
      }
      
      const embeddingResults = await this.processAndStoreChunks(financeActFile);
      
      // Validate database
      const dbValidation = await this.validateVectorDatabase();
      
      // Test RAG queries
      const queryResults = await this.testRAGQueries();
      
      // Generate summary report
      const report = {
        test_date: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
        embedding_results: embeddingResults,
        database_validation: dbValidation,
        query_test_results: queryResults,
        overall_success: embeddingResults.success_rate > 80 && dbValidation.database_healthy && queryResults.filter(r => r.success).length > 0
      };
      
      // Save test report
      const reportFile = `finance-act-rag-test-${Date.now()}.json`;
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      console.log('\n🎉 FINANCE ACT RAG TEST COMPLETE!');
      console.log('='.repeat(70));
      console.log(`📊 Overall Success: ${report.overall_success ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`⏱️ Total processing time: ${Math.round((Date.now() - startTime) / 1000)}s`);
      console.log(`📁 Test report saved: ${reportFile}`);
      
      if (report.overall_success) {
        console.log('\n🚀 System is ready for production with Finance Act!');
        console.log('   Next step: Process remaining documents');
      } else {
        console.log('\n⚠️ Issues found. Review test report for details.');
      }
      
      return report;
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      console.error(error.stack);
      return {
        success: false,
        error: error.message,
        processing_time_ms: Date.now() - startTime
      };
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const tester = new FinanceActRAGTester();
  tester.runCompleteTest().catch(console.error);
}

module.exports = { FinanceActRAGTester };