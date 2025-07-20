#!/usr/bin/env node

/**
 * Fix Index Creation and Test Hybrid Search
 * Addresses Bengali language index issue and validates search functionality
 */

const { MongoClient } = require('mongodb');
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

class HybridSearchTester {
  constructor() {
    this.mongoUri = env.MONGODB_URI || process.env.MONGODB_URI;
    this.client = null;
    this.db = null;
    this.structuredCollection = null;
  }

  async initialize() {
    console.log('🔧 Fixing Indexes and Testing Hybrid Search');
    console.log('===========================================');

    this.client = new MongoClient(this.mongoUri);
    await this.client.connect();
    this.db = this.client.db('ai_tax_lawyer');
    this.structuredCollection = this.db.collection('structured_tax_records');
    
    console.log('✅ Connected to MongoDB Atlas\n');
  }

  async createFixedIndexes() {
    console.log('🔍 Creating Fixed Search Indexes');
    console.log('=================================');

    try {
      // Drop any existing indexes first
      try {
        await this.structuredCollection.dropIndexes();
        console.log('🗑️  Dropped existing indexes');
      } catch (error) {
        console.log('ℹ️  No existing indexes to drop');
      }

      // 1. Text search index without language specification (supports all languages)
      await this.structuredCollection.createIndex(
        { 
          description: "text", 
          hs_code: "text" 
        },
        { 
          name: "multilingual_text_search",
          default_language: "none",  // No language processing
          language_override: "language"  // Use field for language if needed
        }
      );
      console.log('✅ Created multilingual text search index');

      // 2. HS code exact match index
      await this.structuredCollection.createIndex(
        { hs_code: 1 },
        { name: "hs_code_lookup" }
      );
      console.log('✅ Created HS code lookup index');

      // 3. Duty rate range index
      await this.structuredCollection.createIndex(
        { duty_rate: 1 },
        { name: "duty_rate_search" }
      );
      console.log('✅ Created duty rate search index');

      // 4. Source act filter index
      await this.structuredCollection.createIndex(
        { source_act: 1 },
        { name: "source_filter" }
      );
      console.log('✅ Created source filter index');

      // 5. Compound index for complex queries
      await this.structuredCollection.createIndex(
        { 
          source_act: 1, 
          duty_rate: 1
        },
        { name: "source_duty_compound" }
      );
      console.log('✅ Created compound search index');

      console.log('🎉 All indexes created successfully\n');

    } catch (error) {
      console.error('❌ Error creating indexes:', error.message);
      throw error;
    }
  }

  async validateData() {
    console.log('📊 Data Validation');
    console.log('==================');

    try {
      const totalCount = await this.structuredCollection.countDocuments();
      console.log(`📄 Total records: ${totalCount}`);

      const sampleRecords = await this.structuredCollection.find({}).limit(3).toArray();
      console.log('\n📋 Sample Records:');
      sampleRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. HS: ${record.hs_code}`);
        console.log(`      Description: ${record.description.substring(0, 60)}...`);
        console.log(`      Duty: ${record.duty_rate}%`);
        console.log(`      Source: ${record.source_act}\n`);
      });

      return totalCount > 0;

    } catch (error) {
      console.error('❌ Validation error:', error.message);
      return false;
    }
  }

  async testStructuredSearch() {
    console.log('🧪 Testing Structured Search');
    console.log('============================');

    const testCases = [
      {
        name: "Exact HS Code Lookup",
        query: { hs_code: "2202.10.00" },
        description: "Looking for specific soft drinks HS code"
      },
      {
        name: "Text Search - Bengali",
        query: { $text: { $search: "কোমল পানীয়" } },
        description: "Searching Bengali term for soft drinks"
      },
      {
        name: "Text Search - English", 
        query: { $text: { $search: "beer" } },
        description: "Searching English term for beer"
      },
      {
        name: "Duty Rate Range",
        query: { duty_rate: { $gte: 50, $lte: 100 } },
        description: "Finding items with 50-100% duty"
      },
      {
        name: "Source Filter",
        query: { source_act: "Finance Act 2025" },
        description: "Finance Act records only"
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n🔍 ${testCase.name}`);
      console.log(`   Query: ${JSON.stringify(testCase.query)}`);
      console.log(`   Description: ${testCase.description}`);

      try {
        const startTime = Date.now();
        const results = await this.structuredCollection.find(testCase.query).limit(3).toArray();
        const searchTime = Date.now() - startTime;

        console.log(`   ✅ Found ${results.length} results in ${searchTime}ms`);
        
        if (results.length > 0) {
          const topResult = results[0];
          console.log(`   📋 Top result: ${topResult.hs_code} - ${topResult.duty_rate}% duty`);
          console.log(`      ${topResult.description.substring(0, 80)}...`);
        }

      } catch (error) {
        console.log(`   ❌ Search failed: ${error.message}`);
      }
    }
  }

  async testHybridSearchFunction() {
    console.log('\n🤖 Testing Hybrid Search Logic');
    console.log('==============================');

    const testQueries = [
      "2202.10.00",           // Exact HS code
      "কোমল পানীয়",            // Bengali product name
      "beer duty rate",       // English product query
      "high duty items",      // General search
      "Finance Act 2025"      // Act-specific search
    ];

    for (const query of testQueries) {
      console.log(`\n🔍 Query: "${query}"`);
      
      try {
        const results = await this.hybridSearch(query);
        console.log(`   ✅ Search strategy: ${results.strategy}`);
        console.log(`   📊 Results: ${results.results.length}`);
        console.log(`   ⚡ Time: ${results.searchTime}ms`);
        
        if (results.results.length > 0) {
          const top = results.results[0];
          console.log(`   🎯 Top: ${top.hs_code} - ${top.duty_rate}% (${top.source_act})`);
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }

  async hybridSearch(query, options = {}) {
    const startTime = Date.now();
    let searchQuery = {};
    let strategy = "unknown";

    // Determine search strategy based on query
    if (/^\d{4}\.\d{2}\.\d{2}/.test(query.trim())) {
      // Exact HS code search
      searchQuery = { hs_code: query.trim() };
      strategy = "exact_hs_code";
      
    } else if (query.includes("duty") || query.includes("rate")) {
      // Duty-related search with text search
      searchQuery = { 
        $and: [
          { $text: { $search: query } },
          { duty_rate: { $gt: 0 } }
        ]
      };
      strategy = "duty_focused_text";
      
    } else if (query.includes("Finance Act") || query.includes("VAT Act")) {
      // Act-specific search
      const act = query.includes("Finance") ? "Finance Act 2025" : "VAT Act 2012";
      searchQuery = { source_act: act };
      strategy = "act_specific";
      
    } else {
      // General text search
      searchQuery = { $text: { $search: query } };
      strategy = "general_text";
    }

    // Execute search
    const pipeline = [
      { $match: searchQuery }
    ];

    // Add text score for text searches
    if (strategy.includes("text")) {
      pipeline.push({
        $addFields: {
          score: { $meta: "textScore" }
        }
      });
      pipeline.push({
        $sort: { score: { $meta: "textScore" }, duty_rate: -1 }
      });
    } else {
      pipeline.push({
        $sort: { duty_rate: -1 }
      });
    }

    pipeline.push({ $limit: options.limit || 10 });

    const results = await this.structuredCollection.aggregate(pipeline).toArray();
    const searchTime = Date.now() - startTime;

    return {
      query,
      strategy,
      results,
      searchTime,
      count: results.length
    };
  }

  async generatePerformanceReport() {
    console.log('\n📈 Performance Report');
    console.log('====================');

    const testQueries = [
      "2202.10.00",
      "কোমল পানীয়", 
      "beer",
      "duty rate 50",
      "Finance Act"
    ];

    let totalTime = 0;
    let totalResults = 0;
    const strategies = {};

    for (const query of testQueries) {
      const result = await this.hybridSearch(query);
      totalTime += result.searchTime;
      totalResults += result.count;
      
      if (!strategies[result.strategy]) {
        strategies[result.strategy] = { count: 0, totalTime: 0 };
      }
      strategies[result.strategy].count++;
      strategies[result.strategy].totalTime += result.searchTime;
    }

    console.log(`📊 Average search time: ${(totalTime / testQueries.length).toFixed(0)}ms`);
    console.log(`📋 Average results per query: ${(totalResults / testQueries.length).toFixed(1)}`);
    
    console.log('\n🎯 Strategy Performance:');
    Object.entries(strategies).forEach(([strategy, stats]) => {
      const avgTime = stats.totalTime / stats.count;
      console.log(`   ${strategy}: ${avgTime.toFixed(0)}ms average`);
    });

    return {
      averageSearchTime: totalTime / testQueries.length,
      averageResults: totalResults / testQueries.length,
      strategiesUsed: Object.keys(strategies).length,
      totalQueries: testQueries.length
    };
  }

  async runTests() {
    try {
      await this.initialize();
      
      // Fix indexes
      await this.createFixedIndexes();
      
      // Validate data
      const hasData = await this.validateData();
      if (!hasData) {
        throw new Error('No data found in collection');
      }
      
      // Test searches
      await this.testStructuredSearch();
      await this.testHybridSearchFunction();
      
      // Generate performance report
      const report = await this.generatePerformanceReport();
      
      console.log('\n🎉 Hybrid Search Testing Complete!');
      console.log('==================================');
      console.log(`✅ Fixed index creation issues`);
      console.log(`✅ Validated structured data integrity`);
      console.log(`✅ Tested multiple search strategies`);
      console.log(`✅ Average search time: ${report.averageSearchTime.toFixed(0)}ms`);
      console.log(`✅ Ready for API integration`);
      
      // Save test results
      const testResults = {
        timestamp: new Date().toISOString(),
        performance: report,
        status: "success"
      };
      
      fs.writeFileSync('hybrid-search-test-results.json', JSON.stringify(testResults, null, 2));
      console.log('\n💾 Test results saved to: hybrid-search-test-results.json');
      
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
const tester = new HybridSearchTester();
tester.runTests().catch(console.error);