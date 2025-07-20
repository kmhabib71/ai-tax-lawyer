#!/usr/bin/env node

/**
 * Comprehensive Vector Search Test System
 * Tests MongoDB Atlas Vector Search with Bengali, English, and Banglish queries
 * Measures performance, quality, and relevance of results
 */

const { MongoClient } = require('mongodb');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.log('⚠️  Could not load .env.local file:', error.message);
    return {};
  }
}

const env = loadEnv();

class ComprehensiveVectorSearchTester {
  constructor() {
    this.mongoUri = env.MONGODB_URI || process.env.MONGODB_URI;
    this.openaiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    this.client = null;
    this.db = null;
    this.collection = null;
    this.openai = null;
    this.results = [];
  }

  async initialize() {
    console.log('🚀 Comprehensive Vector Search Test System');
    console.log('==========================================');
    console.log('Database: ai_tax_lawyer (vector search)');
    console.log('Target: Sub-100ms performance with high relevance\n');

    if (!this.mongoUri) {
      throw new Error('❌ MONGODB_URI not found in environment variables');
    }
    if (!this.openaiKey) {
      throw new Error('❌ OPENAI_API_KEY not found in environment variables');
    }

    // Initialize OpenAI
    this.openai = new OpenAI({ apiKey: this.openaiKey });

    // Initialize MongoDB Atlas (vector search database)
    console.log('🔌 Connecting to MongoDB Atlas (ai_tax_lawyer)...');
    this.client = new MongoClient(this.mongoUri);
    await this.client.connect();
    this.db = this.client.db('ai_tax_lawyer');
    this.collection = this.db.collection('document_chunks');
    console.log('✅ Connected to vector search database\n');
  }

  async performVectorSearch(query, language, expectedRelevance = null) {
    const startTime = Date.now();
    
    try {
      // Generate embedding
      const embeddingStart = Date.now();
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query
      });
      const embeddingTime = Date.now() - embeddingStart;
      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Perform vector search
      const searchStart = Date.now();
      const pipeline = [
        {
          $vectorSearch: {
            index: 'ai-tax-lawyer-index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: 5
          }
        },
        {
          $addFields: {
            similarity: { $meta: 'vectorSearchScore' }
          }
        },
        {
          $project: {
            content: 1,
            document_type: 1,
            source_document: 1,
            language: 1,
            chunk_index: 1,
            similarity: 1,
            chunk_id: 1
          }
        }
      ];

      const vectorResults = await this.collection.aggregate(pipeline).toArray();
      const searchTime = Date.now() - searchStart;
      const totalTime = Date.now() - startTime;

      return {
        query,
        language,
        expectedRelevance,
        results: vectorResults,
        performance: {
          embeddingTime,
          searchTime,
          totalTime
        },
        success: vectorResults.length > 0
      };

    } catch (error) {
      return {
        query,
        language,
        expectedRelevance,
        results: [],
        performance: {
          embeddingTime: 0,
          searchTime: 0,
          totalTime: Date.now() - startTime
        },
        success: false,
        error: error.message
      };
    }
  }

  async runTestSuite() {
    const testQueries = [
      // Bengali Queries (Primary Language)
      {
        query: "মূল্য সংযোজন কর হার কত",
        language: "Bengali",
        expectedRelevance: "VAT rates and calculations",
        category: "VAT"
      },
      {
        query: "আয়কর স্ল্যাব ২০২৪-২৫",
        language: "Bengali", 
        expectedRelevance: "Income tax slabs for 2024-25",
        category: "Income Tax"
      },
      {
        query: "কর অব্যাহতির শর্তাবলী",
        language: "Bengali",
        expectedRelevance: "Tax exemption conditions",
        category: "Exemptions"
      },
      {
        query: "ব্যবসায়িক খরচ বাদ দেওয়ার নিয়ম",
        language: "Bengali",
        expectedRelevance: "Business expense deduction rules",
        category: "Business"
      },
      {
        query: "বেতনভোগী কর্মচারীর কর গণনা",
        language: "Bengali",
        expectedRelevance: "Salaried employee tax calculation",
        category: "Salaried"
      },

      // English Queries
      {
        query: "income tax rate for freelancers",
        language: "English",
        expectedRelevance: "Freelancer tax rates",
        category: "Freelancer"
      },
      {
        query: "VAT registration requirements",
        language: "English",
        expectedRelevance: "VAT registration process",
        category: "VAT"
      },
      {
        query: "tax deduction at source TDS",
        language: "English",
        expectedRelevance: "TDS rules and rates", 
        category: "TDS"
      },
      {
        query: "advance tax payment rules",
        language: "English",
        expectedRelevance: "Advance tax payment procedures",
        category: "Advance Tax"
      },
      {
        query: "house rent allowance exemption",
        language: "English",
        expectedRelevance: "HRA exemption rules",
        category: "HRA"
      },

      // Banglish Queries (Mixed Bengali-English)
      {
        query: "income tax return file korar niyom",
        language: "Banglish",
        expectedRelevance: "Income tax return filing rules",
        category: "Return Filing"
      },
      {
        query: "VAT certificate collect korar process",
        language: "Banglish", 
        expectedRelevance: "VAT certificate collection process",
        category: "VAT"
      },
      {
        query: "tax calculation er formula",
        language: "Banglish",
        expectedRelevance: "Tax calculation formulas",
        category: "Calculation"
      },
      {
        query: "business er jonno tax benefit",
        language: "Banglish",
        expectedRelevance: "Tax benefits for business",
        category: "Business"
      },
      {
        query: "freelancer der tax payment system",
        language: "Banglish",
        expectedRelevance: "Freelancer tax payment system",
        category: "Freelancer"
      },

      // Complex Queries
      {
        query: "২০২৪-২৫ অর্থবছরে সর্বোচ্চ কর হার কত এবং কোন আয়ের উপর প্রযোজ্য",
        language: "Bengali",
        expectedRelevance: "Maximum tax rate for 2024-25 and applicable income",
        category: "Tax Rates"
      },
      {
        query: "What is the penalty for late filing of income tax return",
        language: "English",
        expectedRelevance: "Late filing penalties",
        category: "Penalties"
      },
      {
        query: "export income er upor ki tax rate applicable",
        language: "Banglish",
        expectedRelevance: "Tax rate on export income",
        category: "Export"
      }
    ];

    console.log('🧪 Running Comprehensive Test Suite');
    console.log(`📊 Testing ${testQueries.length} queries across 3 languages\n`);

    const results = [];
    let totalQueries = 0;
    let successfulQueries = 0;
    let totalTime = 0;

    for (const testCase of testQueries) {
      totalQueries++;
      console.log(`🔍 Query ${totalQueries}: [${testCase.language}] "${testCase.query}"`);
      
      const result = await this.performVectorSearch(
        testCase.query,
        testCase.language,
        testCase.expectedRelevance
      );

      if (result.success) {
        successfulQueries++;
        totalTime += result.performance.totalTime;
        
        console.log(`   ✅ Found ${result.results.length} results`);
        console.log(`   ⚡ Performance: ${result.performance.totalTime}ms total (embedding: ${result.performance.embeddingTime}ms, search: ${result.performance.searchTime}ms)`);
        console.log(`   🎯 Top result: ${result.results[0]?.document_type} (similarity: ${result.results[0]?.similarity?.toFixed(3)})`);
        console.log(`   📄 Content: ${result.results[0]?.content?.substring(0, 100)}...`);
      } else {
        console.log(`   ❌ Failed: ${result.error || 'No results found'}`);
      }

      results.push({
        ...testCase,
        ...result
      });

      console.log('');
    }

    this.results = results;
    this.generatePerformanceReport(results, totalQueries, successfulQueries, totalTime);
    this.generateQualityReport(results);
    this.generateLanguageAnalysis(results);
    this.generateRecommendations(results);
  }

  generatePerformanceReport(results, totalQueries, successfulQueries, totalTime) {
    console.log('📈 PERFORMANCE ANALYSIS');
    console.log('======================');
    
    const avgTime = totalTime / successfulQueries;
    const sub100ms = results.filter(r => r.success && r.performance.totalTime < 100).length;
    const sub200ms = results.filter(r => r.success && r.performance.totalTime < 200).length;
    
    console.log(`✅ Success Rate: ${successfulQueries}/${totalQueries} (${(successfulQueries/totalQueries*100).toFixed(1)}%)`);
    console.log(`⚡ Average Response Time: ${avgTime.toFixed(1)}ms`);
    console.log(`🎯 Sub-100ms Queries: ${sub100ms}/${successfulQueries} (${(sub100ms/successfulQueries*100).toFixed(1)}%)`);
    console.log(`🎯 Sub-200ms Queries: ${sub200ms}/${successfulQueries} (${(sub200ms/successfulQueries*100).toFixed(1)}%)`);
    
    // Performance breakdown
    const embeddingTimes = results.filter(r => r.success).map(r => r.performance.embeddingTime);
    const searchTimes = results.filter(r => r.success).map(r => r.performance.searchTime);
    
    const avgEmbedding = embeddingTimes.reduce((a, b) => a + b, 0) / embeddingTimes.length;
    const avgSearch = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
    
    console.log(`🧠 Avg Embedding Time: ${avgEmbedding.toFixed(1)}ms`);
    console.log(`🔍 Avg Vector Search Time: ${avgSearch.toFixed(1)}ms`);
    
    // Performance by language
    const languages = ['Bengali', 'English', 'Banglish'];
    languages.forEach(lang => {
      const langResults = results.filter(r => r.language === lang && r.success);
      if (langResults.length > 0) {
        const langAvg = langResults.reduce((sum, r) => sum + r.performance.totalTime, 0) / langResults.length;
        console.log(`🌐 ${lang} Avg: ${langAvg.toFixed(1)}ms`);
      }
    });
    
    console.log('');
  }

  generateQualityReport(results) {
    console.log('🎯 QUALITY ANALYSIS');
    console.log('===================');
    
    const successfulResults = results.filter(r => r.success);
    
    // Similarity score analysis
    const similarities = successfulResults.flatMap(r => 
      r.results.map(result => result.similarity)
    );
    
    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const highQuality = similarities.filter(s => s > 0.8).length;
    const mediumQuality = similarities.filter(s => s > 0.6 && s <= 0.8).length;
    const lowQuality = similarities.filter(s => s <= 0.6).length;
    
    console.log(`📊 Average Similarity Score: ${avgSimilarity.toFixed(3)}`);
    console.log(`🟢 High Quality (>0.8): ${highQuality}/${similarities.length} (${(highQuality/similarities.length*100).toFixed(1)}%)`);
    console.log(`🟡 Medium Quality (0.6-0.8): ${mediumQuality}/${similarities.length} (${(mediumQuality/similarities.length*100).toFixed(1)}%)`);
    console.log(`🔴 Low Quality (<0.6): ${lowQuality}/${similarities.length} (${(lowQuality/similarities.length*100).toFixed(1)}%)`);
    
    // Document type coverage
    const docTypes = {};
    successfulResults.forEach(r => {
      r.results.forEach(result => {
        docTypes[result.document_type] = (docTypes[result.document_type] || 0) + 1;
      });
    });
    
    console.log('\n📚 Document Type Coverage:');
    Object.entries(docTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} results`);
    });
    
    console.log('');
  }

  generateLanguageAnalysis(results) {
    console.log('🌐 LANGUAGE ANALYSIS');
    console.log('===================');
    
    const languages = ['Bengali', 'English', 'Banglish'];
    
    languages.forEach(lang => {
      const langResults = results.filter(r => r.language === lang);
      const successRate = langResults.filter(r => r.success).length / langResults.length;
      
      console.log(`\n📝 ${lang} Results:`);
      console.log(`   Success Rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`   Queries Tested: ${langResults.length}`);
      
      if (langResults.length > 0) {
        const successfulLang = langResults.filter(r => r.success);
        if (successfulLang.length > 0) {
          const avgTime = successfulLang.reduce((sum, r) => sum + r.performance.totalTime, 0) / successfulLang.length;
          const avgSimilarity = successfulLang.flatMap(r => r.results.map(res => res.similarity))
            .reduce((a, b) => a + b, 0) / successfulLang.flatMap(r => r.results).length;
          
          console.log(`   Avg Response Time: ${avgTime.toFixed(1)}ms`);
          console.log(`   Avg Similarity: ${avgSimilarity.toFixed(3)}`);
        }
      }
    });
    
    console.log('');
  }

  generateRecommendations(results) {
    console.log('💡 RECOMMENDATIONS');
    console.log('==================');
    
    const avgTime = results.filter(r => r.success)
      .reduce((sum, r) => sum + r.performance.totalTime, 0) / results.filter(r => r.success).length;
    
    const sub100Count = results.filter(r => r.success && r.performance.totalTime < 100).length;
    const successRate = results.filter(r => r.success).length / results.length;
    const avgSimilarity = results.filter(r => r.success)
      .flatMap(r => r.results.map(res => res.similarity))
      .reduce((a, b) => a + b, 0) / results.filter(r => r.success).flatMap(r => r.results).length;

    // Performance recommendations
    if (avgTime < 100) {
      console.log('✅ EXCELLENT: Average response time under 100ms target');
    } else if (avgTime < 200) {
      console.log('🟡 GOOD: Average response time under 200ms, consider optimization');
    } else {
      console.log('🔴 NEEDS IMPROVEMENT: Average response time over 200ms');
      console.log('   - Consider using smaller embedding model');
      console.log('   - Optimize vector index configuration');
      console.log('   - Use query caching for common queries');
    }

    // Quality recommendations
    if (avgSimilarity > 0.8) {
      console.log('✅ EXCELLENT: High quality search results');
    } else if (avgSimilarity > 0.6) {
      console.log('🟡 GOOD: Medium quality results, consider improvements');
    } else {
      console.log('🔴 NEEDS IMPROVEMENT: Low quality search results');
      console.log('   - Review document chunking strategy');
      console.log('   - Consider hybrid search (vector + text)');
      console.log('   - Expand training data coverage');
    }

    // Success rate recommendations
    if (successRate > 0.95) {
      console.log('✅ EXCELLENT: Very high success rate');
    } else if (successRate > 0.8) {
      console.log('🟡 GOOD: High success rate');
    } else {
      console.log('🔴 NEEDS IMPROVEMENT: Low success rate');
      console.log('   - Check vector index configuration');
      console.log('   - Ensure all documents are properly indexed');
    }

    console.log('\n🚀 PRODUCTION READINESS:');
    
    if (avgTime < 150 && successRate > 0.9 && avgSimilarity > 0.7) {
      console.log('✅ READY FOR PRODUCTION: All metrics meet requirements');
    } else {
      console.log('⚠️  NEEDS OPTIMIZATION before production deployment');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Run this test regularly to monitor performance');
    console.log('2. Add more diverse test queries as needed');
    console.log('3. Consider implementing query caching for common queries');
    console.log('4. Monitor real user query patterns and add to test suite');
  }

  async saveResults() {
    const timestamp = Date.now();
    const filename = `vector-search-test-results-${timestamp}.json`;
    
    const report = {
      timestamp: new Date().toISOString(),
      testConfig: {
        database: 'ai_tax_lawyer',
        collection: 'document_chunks',
        embeddingModel: 'text-embedding-3-small',
        vectorDimensions: 1536
      },
      summary: {
        totalQueries: this.results.length,
        successfulQueries: this.results.filter(r => r.success).length,
        avgResponseTime: this.results.filter(r => r.success)
          .reduce((sum, r) => sum + r.performance.totalTime, 0) / this.results.filter(r => r.success).length,
        avgSimilarity: this.results.filter(r => r.success)
          .flatMap(r => r.results.map(res => res.similarity))
          .reduce((a, b) => a + b, 0) / this.results.filter(r => r.success).flatMap(r => r.results).length
      },
      detailedResults: this.results
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed results saved to: ${filename}`);
  }

  async runTests() {
    try {
      await this.initialize();
      await this.runTestSuite();
      await this.saveResults();
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      console.error(error.stack);
    } finally {
      if (this.client) {
        await this.client.close();
        console.log('\n🔌 MongoDB connection closed');
      }
    }
  }
}

// Run comprehensive tests
const tester = new ComprehensiveVectorSearchTester();
tester.runTests().catch(console.error);