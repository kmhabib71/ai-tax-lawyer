#!/usr/bin/env node

/**
 * RAG System Performance Test
 * Tests end-to-end performance from query to AI response
 * Measures vector search + AI generation performance
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

class RAGPerformanceTester {
  constructor() {
    this.mongoUri = env.MONGODB_URI || process.env.MONGODB_URI;
    this.openaiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    this.client = null;
    this.db = null;
    this.collection = null;
    this.openai = null;
  }

  async initialize() {
    console.log('🤖 RAG System Performance Test');
    console.log('==============================');
    console.log('Testing: Vector Search + AI Response Generation\n');

    if (!this.mongoUri || !this.openaiKey) {
      throw new Error('❌ Missing environment variables');
    }

    this.openai = new OpenAI({ apiKey: this.openaiKey });
    this.client = new MongoClient(this.mongoUri);
    await this.client.connect();
    this.db = this.client.db('ai_tax_lawyer');
    this.collection = this.db.collection('document_chunks');
    console.log('✅ Connected to systems\n');
  }

  async performRAGQuery(query, userType = 'other') {
    const startTime = Date.now();
    const metrics = {};

    try {
      // Step 1: Generate embedding
      const embeddingStart = Date.now();
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query
      });
      metrics.embeddingTime = Date.now() - embeddingStart;
      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Step 2: Vector search
      const searchStart = Date.now();
      const pipeline = [
        {
          $vectorSearch: {
            index: 'ai-tax-lawyer-index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: 50,
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
            similarity: 1
          }
        }
      ];

      const searchResults = await this.collection.aggregate(pipeline).toArray();
      metrics.searchTime = Date.now() - searchStart;

      if (searchResults.length === 0) {
        return {
          query,
          success: false,
          error: 'No search results found',
          metrics: { ...metrics, totalTime: Date.now() - startTime }
        };
      }

      // Step 3: Prepare context
      const contextStart = Date.now();
      const contextString = searchResults
        .map((result, index) => {
          return `Document ${index + 1}: ${result.document_type}
Content: ${result.content}
Similarity: ${result.similarity?.toFixed(3)}
---`;
        })
        .join('\n\n');

      const prompt = `Based on the following Bangladesh tax documents, provide a clear and accurate answer to the user's question.

RETRIEVED DOCUMENTS:
${contextString}

USER TYPE: ${userType}
USER QUESTION: ${query}

INSTRUCTIONS:
1. Answer based ONLY on the information provided above
2. Quote specific sections or rules where relevant
3. Provide practical, actionable advice
4. If information is insufficient, clearly state this
5. Keep response under 300 words
6. Include relevant citations

Please provide a helpful response:`;

      metrics.contextTime = Date.now() - contextStart;

      // Step 4: Generate AI response
      const aiStart = Date.now();
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Fast model for testing
        messages: [
          {
            role: 'system',
            content: 'You are an expert Bangladesh tax advisor. Provide accurate, helpful advice based on official documents.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      });

      metrics.aiGenerationTime = Date.now() - aiStart;
      metrics.totalTime = Date.now() - startTime;

      const response = completion.choices[0].message.content;

      return {
        query,
        userType,
        success: true,
        response,
        searchResults: searchResults.length,
        topSimilarity: searchResults[0]?.similarity || 0,
        metrics,
        tokenUsage: completion.usage
      };

    } catch (error) {
      return {
        query,
        userType,
        success: false,
        error: error.message,
        metrics: { ...metrics, totalTime: Date.now() - startTime }
      };
    }
  }

  async runPerformanceTests() {
    console.log('🚀 Running RAG Performance Tests...\n');

    const testQueries = [
      // Quick queries (should be very fast)
      {
        query: "মূল্য সংযোজন কর হার",
        userType: "business",
        category: "Quick VAT Query",
        expectedTime: 2000 // 2 seconds
      },
      {
        query: "আয়কর স্ল্যাব",
        userType: "salaried",
        category: "Quick Income Tax Query", 
        expectedTime: 2000
      },
      {
        query: "tax exemption limit",
        userType: "other",
        category: "Quick English Query",
        expectedTime: 2000
      },

      // Medium complexity
      {
        query: "বেতনভোগী কর্মচারীর জন্য কর গণনার পদ্ধতি কি",
        userType: "salaried",
        category: "Medium Bengali Query",
        expectedTime: 3000 // 3 seconds
      },
      {
        query: "freelancer der tax calculation korar niyom",
        userType: "freelancer", 
        category: "Medium Banglish Query",
        expectedTime: 3000
      },
      {
        query: "What are the VAT registration requirements for small businesses",
        userType: "business",
        category: "Medium English Query",
        expectedTime: 3000
      },

      // Complex queries
      {
        query: "২০২৪-২৫ অর্থবছরে একজন ফ্রিল্যান্সার যিনি বিদেশি আয় করেন তার জন্য কর গণনা ও জমা দেওয়ার নিয়ম কি",
        userType: "freelancer",
        category: "Complex Bengali Query",
        expectedTime: 4000 // 4 seconds
      },
      {
        query: "business er income tax calculation, VAT registration, ebong quarterly tax payment er complete process",
        userType: "business",
        category: "Complex Banglish Query", 
        expectedTime: 4000
      },
      {
        query: "Comprehensive guide for salaried employee tax optimization including all deductions, rebates and advance tax planning",
        userType: "salaried",
        category: "Complex English Query",
        expectedTime: 4000
      }
    ];

    const results = [];
    let totalTests = testQueries.length;
    let passedTests = 0;

    for (let i = 0; i < testQueries.length; i++) {
      const testCase = testQueries[i];
      console.log(`🔍 Test ${i + 1}/${totalTests}: ${testCase.category}`);
      console.log(`   Query: "${testCase.query.substring(0, 60)}${testCase.query.length > 60 ? '...' : ''}"`);

      const result = await this.performRAGQuery(testCase.query, testCase.userType);
      
      if (result.success) {
        const withinExpected = result.metrics.totalTime <= testCase.expectedTime;
        passedTests += withinExpected ? 1 : 0;

        console.log(`   ✅ Success in ${result.metrics.totalTime}ms ${withinExpected ? '✅' : '⚠️'}`);
        console.log(`   📊 Breakdown: Embedding ${result.metrics.embeddingTime}ms + Search ${result.metrics.searchTime}ms + AI ${result.metrics.aiGenerationTime}ms`);
        console.log(`   🎯 Top similarity: ${result.topSimilarity?.toFixed(3)}, Results: ${result.searchResults}`);
        console.log(`   💬 Response: ${result.response?.substring(0, 100)}...`);
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }

      results.push({
        ...testCase,
        ...result,
        withinExpected: result.success && result.metrics.totalTime <= testCase.expectedTime
      });

      console.log('');
    }

    this.generatePerformanceAnalysis(results, passedTests, totalTests);
    return results;
  }

  generatePerformanceAnalysis(results, passedTests, totalTests) {
    console.log('📈 RAG PERFORMANCE ANALYSIS');
    console.log('===========================');

    const successfulResults = results.filter(r => r.success);
    const avgTotalTime = successfulResults.reduce((sum, r) => sum + r.metrics.totalTime, 0) / successfulResults.length;

    console.log(`✅ Success Rate: ${successfulResults.length}/${totalTests} (${(successfulResults.length/totalTests*100).toFixed(1)}%)`);
    console.log(`⚡ Performance Rate: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%) within expected time`);
    console.log(`📊 Average Total Time: ${avgTotalTime.toFixed(0)}ms`);

    // Component breakdown
    if (successfulResults.length > 0) {
      const avgEmbedding = successfulResults.reduce((sum, r) => sum + r.metrics.embeddingTime, 0) / successfulResults.length;
      const avgSearch = successfulResults.reduce((sum, r) => sum + r.metrics.searchTime, 0) / successfulResults.length;
      const avgAI = successfulResults.reduce((sum, r) => sum + r.metrics.aiGenerationTime, 0) / successfulResults.length;

      console.log('\n🔧 Component Performance:');
      console.log(`   🧠 Embedding Generation: ${avgEmbedding.toFixed(0)}ms (${(avgEmbedding/avgTotalTime*100).toFixed(1)}%)`);
      console.log(`   🔍 Vector Search: ${avgSearch.toFixed(0)}ms (${(avgSearch/avgTotalTime*100).toFixed(1)}%)`);
      console.log(`   🤖 AI Generation: ${avgAI.toFixed(0)}ms (${(avgAI/avgTotalTime*100).toFixed(1)}%)`);
    }

    // Performance by complexity
    console.log('\n📋 Performance by Complexity:');
    const categories = ['Quick', 'Medium', 'Complex'];
    categories.forEach(cat => {
      const catResults = successfulResults.filter(r => r.category.includes(cat));
      if (catResults.length > 0) {
        const catAvg = catResults.reduce((sum, r) => sum + r.metrics.totalTime, 0) / catResults.length;
        const catPassed = catResults.filter(r => r.withinExpected).length;
        console.log(`   ${cat}: ${catAvg.toFixed(0)}ms avg, ${catPassed}/${catResults.length} within target`);
      }
    });

    // Quality metrics
    const avgSimilarity = successfulResults.reduce((sum, r) => sum + r.topSimilarity, 0) / successfulResults.length;
    const avgResults = successfulResults.reduce((sum, r) => sum + r.searchResults, 0) / successfulResults.length;

    console.log('\n🎯 Quality Metrics:');
    console.log(`   Average Top Similarity: ${avgSimilarity.toFixed(3)}`);
    console.log(`   Average Results Retrieved: ${avgResults.toFixed(1)}`);

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (avgTotalTime < 2000) {
      console.log('🚀 EXCELLENT: System is very fast (<2s average)');
    } else if (avgTotalTime < 3000) {
      console.log('✅ GOOD: System performance is acceptable (<3s average)');
    } else {
      console.log('⚠️  NEEDS OPTIMIZATION: System is slower than ideal (>3s average)');
      console.log('   - Consider using gpt-4o-mini for faster responses');
      console.log('   - Implement response caching for common queries');
      console.log('   - Optimize context preparation');
    }

    if (passedTests / totalTests > 0.8) {
      console.log('✅ PRODUCTION READY: High percentage of queries within time targets');
    } else {
      console.log('⚠️  NEEDS OPTIMIZATION: Too many queries exceeding time targets');
    }
  }

  async runStressTest() {
    console.log('\n🔥 STRESS TEST: Multiple Concurrent Queries');
    console.log('============================================');

    const stressQuery = "আয়কর হার কত";
    const concurrentQueries = 5;
    
    console.log(`Testing ${concurrentQueries} concurrent queries...`);
    
    const startTime = Date.now();
    const promises = Array(concurrentQueries).fill().map(() => 
      this.performRAGQuery(stressQuery, 'other')
    );
    
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    const successful = results.filter(r => r.success).length;
    const avgTime = results.filter(r => r.success)
      .reduce((sum, r) => sum + r.metrics.totalTime, 0) / successful;
    
    console.log(`✅ Concurrent Success: ${successful}/${concurrentQueries}`);
    console.log(`⚡ Total Time: ${totalTime}ms`);
    console.log(`📊 Average Query Time: ${avgTime.toFixed(0)}ms`);
    console.log(`🚀 Queries per Second: ${(concurrentQueries / (totalTime / 1000)).toFixed(2)}`);
  }

  async runTests() {
    try {
      await this.initialize();
      const results = await this.runPerformanceTests();
      await this.runStressTest();
      
      // Save results
      const timestamp = Date.now();
      const filename = `rag-performance-test-${timestamp}.json`;
      fs.writeFileSync(filename, JSON.stringify(results, null, 2));
      console.log(`\n💾 Results saved to: ${filename}`);
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
    } finally {
      if (this.client) {
        await this.client.close();
        console.log('\n🔌 Connection closed');
      }
    }
  }
}

// Run tests
const tester = new RAGPerformanceTester();
tester.runTests().catch(console.error);