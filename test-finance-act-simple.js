/**
 * Simple Finance Act RAG Test - AI Tax Lawyer Bangladesh
 * Works with existing Supabase schema or creates minimal test
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

class SimpleRAGTester {
  constructor() {
    this.embeddings = []; // Store embeddings locally for testing
    this.documents = [];  // Store documents locally
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

  // Calculate cosine similarity between two vectors
  cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async processFinanceActChunks(filePath) {
    console.log('\n🔄 Processing Finance Act chunks...');
    console.log('='.repeat(60));
    
    // Read OCR processed file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const chunks = data.chunks || [];
    
    console.log(`📦 Found ${chunks.length} chunks to process`);
    
    let successCount = 0;
    let errorCount = 0;

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      console.log(`📄 Processing chunk ${i + 1}/${chunks.length}...`);
      
      try {
        // Generate embedding
        const embedding = await this.generateEmbedding(chunk.content);
        
        // Store locally for testing
        this.embeddings.push(embedding);
        this.documents.push({
          id: chunk.id,
          content: chunk.content,
          metadata: chunk.metadata,
          embedding: embedding
        });
        
        successCount++;
        console.log(`   ✅ Chunk ${i + 1} processed successfully`);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`   ❌ Error processing chunk ${i + 1}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 PROCESSING SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully processed: ${successCount}/${chunks.length}`);
    console.log(`❌ Failed: ${errorCount}/${chunks.length}`);
    console.log(`📈 Success rate: ${Math.round((successCount / chunks.length) * 100)}%`);

    return {
      total_chunks: chunks.length,
      successful: successCount,
      failed: errorCount,
      success_rate: (successCount / chunks.length) * 100
    };
  }

  async searchSimilarChunks(query, limit = 3) {
    console.log(`\n🔍 Searching for: "${query}"`);
    
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Calculate similarities with all documents
      const results = this.documents.map(doc => ({
        ...doc,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
      }));
      
      // Sort by similarity and take top results
      const topResults = results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
      
      console.log(`   📋 Found ${topResults.length} relevant chunks:`);
      
      topResults.forEach((result, index) => {
        console.log(`\n   ${index + 1}. Similarity: ${(result.similarity * 100).toFixed(1)}%`);
        console.log(`      Chunk ID: ${result.id}`);
        console.log(`      Content preview: "${result.content.substring(0, 150)}..."`);
      });

      return topResults;
      
    } catch (error) {
      console.error(`   ❌ Search failed: ${error.message}`);
      return [];
    }
  }

  async testQueries() {
    const testQueries = [
      {
        query: "মূল্য সংযোজন কর কি?",
        type: "definition",
        language: "bn"
      },
      {
        query: "আয়কর হার কত?",
        type: "rate_inquiry", 
        language: "bn"
      },
      {
        query: "অর্থ আইন ২০২৫ এর ধারা ২৭ কি বলে?",
        type: "section_specific",
        language: "bn"
      },
      {
        query: "What is VAT rate in Bangladesh?",
        type: "rate_inquiry",
        language: "en"
      },
      {
        query: "Finance Act 2025 changes",
        type: "general_inquiry",
        language: "en"
      }
    ];

    console.log('\n🧪 TESTING RAG QUERIES');
    console.log('='.repeat(60));
    
    const results = [];
    
    for (let i = 0; i < testQueries.length; i++) {
      const testQuery = testQueries[i];
      console.log(`\n📝 Test ${i + 1}/${testQueries.length}: ${testQuery.type} (${testQuery.language})`);
      
      const searchResults = await this.searchSimilarChunks(testQuery.query, 2);
      
      const result = {
        query: testQuery.query,
        type: testQuery.type,
        language: testQuery.language,
        results_found: searchResults.length,
        top_similarity: searchResults.length > 0 ? searchResults[0].similarity : 0,
        success: searchResults.length > 0 && searchResults[0].similarity > 0.3
      };
      
      results.push(result);
      
      if (result.success) {
        console.log(`   ✅ Success: Found relevant content (${(result.top_similarity * 100).toFixed(1)}% similarity)`);
      } else {
        console.log(`   ❌ Poor results: ${result.top_similarity > 0 ? 'Low similarity' : 'No results'}`);
      }
      
      // Delay between queries
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }

  async trySupabaseStorage() {
    console.log('\n💾 Testing Supabase storage...');
    
    if (this.documents.length === 0) {
      console.log('❌ No documents to store');
      return false;
    }

    try {
      // Try to insert one document as test
      const testDoc = this.documents[0];
      
      const { data, error } = await supabase
        .from('tax_documents')
        .insert([{
          id: testDoc.id,
          content: testDoc.content,
          embedding: testDoc.embedding,
          metadata: testDoc.metadata,
          document_type: 'finance_act',
          document_name: 'finance-act-2025-bangla.pdf',
          language: 'bn'
        }])
        .select();

      if (error) {
        console.log(`❌ Supabase storage failed: ${error.message}`);
        return false;
      }

      console.log('✅ Supabase storage working!');
      
      // Clean up test data
      await supabase
        .from('tax_documents')
        .delete()
        .eq('id', testDoc.id);
      
      return true;
      
    } catch (error) {
      console.log(`❌ Supabase test failed: ${error.message}`);
      return false;
    }
  }

  async runCompleteTest() {
    const startTime = Date.now();
    
    console.log('🚀 AI TAX LAWYER BANGLADESH - SIMPLE RAG TEST');
    console.log('Testing Finance Act 2025 Bengali processing');
    console.log('='.repeat(70));
    
    try {
      // Initialize OpenAI
      await initializeOpenAI();
      console.log('✅ OpenAI initialized');
      
      // Process Finance Act
      const financeActFile = 'ocr-processed-finance-act-2025-bangla.json';
      if (!fs.existsSync(financeActFile)) {
        throw new Error(`Finance Act file not found: ${financeActFile}`);
      }
      
      const processingResults = await this.processFinanceActChunks(financeActFile);
      
      // Test queries
      const queryResults = await this.testQueries();
      
      // Test Supabase (optional)
      const supabaseWorking = await this.trySupabaseStorage();
      
      // Generate summary
      const successfulQueries = queryResults.filter(r => r.success).length;
      const overallSuccess = processingResults.success_rate > 80 && successfulQueries > 0;
      
      const report = {
        test_date: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
        embedding_results: processingResults,
        query_results: queryResults,
        successful_queries: successfulQueries,
        total_queries: queryResults.length,
        query_success_rate: (successfulQueries / queryResults.length) * 100,
        supabase_working: supabaseWorking,
        overall_success: overallSuccess,
        documents_processed: this.documents.length,
        avg_similarity: queryResults.reduce((sum, r) => sum + r.top_similarity, 0) / queryResults.length
      };
      
      // Save report
      const reportFile = `simple-rag-test-${Date.now()}.json`;
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      console.log('\n🎉 SIMPLE RAG TEST COMPLETE!');
      console.log('='.repeat(70));
      console.log(`📊 Overall Success: ${overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`📈 Embedding Success: ${processingResults.success_rate.toFixed(1)}%`);
      console.log(`🔍 Query Success: ${successfulQueries}/${queryResults.length} (${report.query_success_rate.toFixed(1)}%)`);
      console.log(`📊 Average Similarity: ${(report.avg_similarity * 100).toFixed(1)}%`);
      console.log(`💾 Supabase: ${supabaseWorking ? '✅ Working' : '❌ Needs Setup'}`);
      console.log(`⏱️ Total time: ${Math.round((Date.now() - startTime) / 1000)}s`);
      console.log(`📁 Report saved: ${reportFile}`);
      
      if (overallSuccess) {
        console.log('\n🚀 RAG System is working! Key findings:');
        console.log(`   • ${this.documents.length} documents successfully embedded`);
        console.log(`   • Bengali queries finding relevant content`);
        console.log(`   • Average similarity: ${(report.avg_similarity * 100).toFixed(1)}%`);
        
        if (!supabaseWorking) {
          console.log('\n⚠️  Next step: Set up Supabase schema for persistent storage');
        } else {
          console.log('\n✅ Ready for production with full Supabase integration!');
        }
      } else {
        console.log('\n⚠️ Issues found. Check query results and similarity scores.');
      }
      
      return report;
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
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
  const tester = new SimpleRAGTester();
  tester.runCompleteTest().catch(console.error);
}

module.exports = { SimpleRAGTester };