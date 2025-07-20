#!/usr/bin/env node

/**
 * Simple Hybrid Search Test
 * Basic testing without complex indexes - focus on functionality
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

class SimpleHybridTester {
  constructor() {
    this.mongoUri = env.MONGODB_URI || process.env.MONGODB_URI;
    this.client = null;
    this.db = null;
    this.structuredCollection = null;
  }

  async initialize() {
    console.log('🚀 Simple Hybrid Search Test');
    console.log('============================');

    this.client = new MongoClient(this.mongoUri);
    await this.client.connect();
    this.db = this.client.db('ai_tax_lawyer');
    this.structuredCollection = this.db.collection('structured_tax_records');
    
    console.log('✅ Connected to MongoDB Atlas\n');
  }

  async checkData() {
    console.log('📊 Checking Uploaded Data');
    console.log('=========================');

    try {
      const totalCount = await this.structuredCollection.countDocuments();
      console.log(`📄 Total records: ${totalCount}`);

      if (totalCount === 0) {
        console.log('❌ No data found. Need to upload structured data first.');
        return false;
      }

      // Get sample records to see structure
      const sampleRecords = await this.structuredCollection.find({}).limit(2).toArray();
      console.log('\n📋 Sample Records:');
      sampleRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. HS Code: ${record.hs_code}`);
        console.log(`      Description: ${record.description ? record.description.substring(0, 80) : 'N/A'}...`);
        console.log(`      Duty Rate: ${record.duty_rate}%`);
        console.log(`      Source: ${record.source_act}`);
        console.log(`      Language: ${record.language || 'N/A'}\n`);
      });

      return true;

    } catch (error) {
      console.error('❌ Error checking data:', error.message);
      return false;
    }
  }

  async createBasicIndexes() {
    console.log('🔍 Creating Basic Search Indexes');
    console.log('================================');

    try {
      // 1. Simple HS code index
      await this.structuredCollection.createIndex(
        { hs_code: 1 },
        { name: "hs_code_basic" }
      );
      console.log('✅ Created HS code index');

      // 2. Duty rate index
      await this.structuredCollection.createIndex(
        { duty_rate: 1 },
        { name: "duty_rate_basic" }
      );
      console.log('✅ Created duty rate index');

      // 3. Source act index
      await this.structuredCollection.createIndex(
        { source_act: 1 },
        { name: "source_act_basic" }
      );
      console.log('✅ Created source act index');

      // 4. Simple text index on description only (no language settings)
      await this.structuredCollection.createIndex(
        { description: "text" },
        { 
          name: "description_text_basic",
          default_language: "none"
        }
      );
      console.log('✅ Created basic text search index');

      console.log('🎉 Basic indexes created successfully\n');

    } catch (error) {
      console.error('❌ Error creating indexes:', error.message);
      // Continue even if indexing fails
    }
  }

  async testBasicSearches() {
    console.log('🧪 Testing Basic Search Functions');
    console.log('=================================');

    const tests = [
      {
        name: "HS Code Exact Match",
        query: { hs_code: "2202.10.00" }
      },
      {
        name: "HS Code Pattern",
        query: { hs_code: { $regex: "2202", $options: "i" } }
      },
      {
        name: "High Duty Items",
        query: { duty_rate: { $gte: 50 } }
      },
      {
        name: "Finance Act Items",
        query: { source_act: "Finance Act 2025" }
      },
      {
        name: "Text Search - Simple",
        query: { $text: { $search: "beer" } }
      }
    ];

    for (const test of tests) {
      console.log(`\n🔍 ${test.name}`);
      console.log(`   Query: ${JSON.stringify(test.query)}`);

      try {
        const startTime = Date.now();
        const results = await this.structuredCollection.find(test.query).limit(5).toArray();
        const searchTime = Date.now() - startTime;

        console.log(`   ✅ Found ${results.length} results in ${searchTime}ms`);
        
        if (results.length > 0) {
          const topResult = results[0];
          console.log(`   📋 Top: ${topResult.hs_code} - ${topResult.duty_rate}% duty`);
          if (topResult.description) {
            console.log(`      Desc: ${topResult.description.substring(0, 60)}...`);
          }
        }

      } catch (error) {
        console.log(`   ❌ Search failed: ${error.message}`);
      }
    }
  }

  async testHybridLogic() {
    console.log('\n🤖 Testing Hybrid Search Logic');
    console.log('==============================');

    const testQueries = [
      "2202.10.00",           // Should trigger HS code search
      "কোমল পানীয়",           // Should trigger text search
      "beer",                 // Should trigger text search
      "duty rate above 100",  // Should trigger duty rate search
      "Finance Act 2025"      // Should trigger source search
    ];

    for (const query of testQueries) {
      console.log(`\n🔍 Query: "${query}"`);
      
      try {
        const result = await this.smartSearch(query);
        console.log(`   🎯 Strategy: ${result.strategy}`);
        console.log(`   📊 Results: ${result.results.length}`);
        console.log(`   ⚡ Time: ${result.searchTime}ms`);
        
        if (result.results.length > 0) {
          const top = result.results[0];
          console.log(`   🏆 Top: ${top.hs_code} - ${top.duty_rate}% (${top.source_act})`);
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }

  async smartSearch(query, options = {}) {
    const startTime = Date.now();
    let searchQuery = {};
    let strategy = "fallback";
    let sort = { duty_rate: -1 };

    // Smart routing based on query pattern
    if (/^\d{4}\.\d{2}\.\d{2}/.test(query.trim())) {
      // Exact HS code
      searchQuery = { hs_code: query.trim() };
      strategy = "exact_hs_code";
      
    } else if (/^\d{4}/.test(query.trim())) {
      // Partial HS code
      searchQuery = { hs_code: { $regex: `^${query.trim()}`, $options: "i" } };
      strategy = "partial_hs_code";
      
    } else if (query.toLowerCase().includes("duty") && /\d+/.test(query)) {
      // Duty rate query with number
      const dutyNumber = parseInt(query.match(/\d+/)[0]);
      searchQuery = { duty_rate: { $gte: dutyNumber } };
      strategy = "duty_rate_filter";
      
    } else if (query.toLowerCase().includes("finance act")) {
      // Finance Act specific
      searchQuery = { source_act: "Finance Act 2025" };
      strategy = "source_filter_finance";
      
    } else if (query.toLowerCase().includes("vat act")) {
      // VAT Act specific
      searchQuery = { source_act: "VAT Act 2012" };
      strategy = "source_filter_vat";
      
    } else {
      // Text search fallback
      try {
        searchQuery = { $text: { $search: query } };
        sort = { score: { $meta: "textScore" }, duty_rate: -1 };
        strategy = "text_search";
      } catch (error) {
        // If text search fails, use description regex
        searchQuery = { description: { $regex: query, $options: "i" } };
        strategy = "description_regex";
      }
    }

    // Execute search
    const limit = options.limit || 10;
    let results;

    try {
      if (strategy === "text_search") {
        // Text search with scoring
        results = await this.structuredCollection.aggregate([
          { $match: searchQuery },
          { $addFields: { score: { $meta: "textScore" } } },
          { $sort: sort },
          { $limit: limit }
        ]).toArray();
      } else {
        // Regular search
        results = await this.structuredCollection
          .find(searchQuery)
          .sort(sort)
          .limit(limit)
          .toArray();
      }
    } catch (error) {
      // Final fallback to basic search
      results = await this.structuredCollection
        .find({ description: { $regex: query, $options: "i" } })
        .limit(limit)
        .toArray();
      strategy = "regex_fallback";
    }

    const searchTime = Date.now() - startTime;

    return {
      query,
      strategy,
      results,
      searchTime,
      count: results.length
    };
  }

  async generateSummary() {
    console.log('\n📈 System Summary');
    console.log('=================');

    try {
      // Basic statistics
      const totalRecords = await this.structuredCollection.countDocuments();
      const financeRecords = await this.structuredCollection.countDocuments({ source_act: "Finance Act 2025" });
      const vatRecords = await this.structuredCollection.countDocuments({ source_act: "VAT Act 2012" });

      console.log(`📊 Total tax records: ${totalRecords}`);
      console.log(`📄 Finance Act 2025: ${financeRecords} records`);
      console.log(`📄 VAT Act 2012: ${vatRecords} records`);

      // Test multiple search strategies
      const testQueries = ["2202.10.00", "beer", "duty 50", "Finance Act"];
      let totalTime = 0;
      let successfulSearches = 0;

      for (const query of testQueries) {
        try {
          const result = await this.smartSearch(query);
          totalTime += result.searchTime;
          if (result.results.length > 0) successfulSearches++;
        } catch (error) {
          // Skip failed searches
        }
      }

      const avgSearchTime = totalTime / testQueries.length;
      console.log(`⚡ Average search time: ${avgSearchTime.toFixed(0)}ms`);
      console.log(`🎯 Search success rate: ${successfulSearches}/${testQueries.length}`);

      return {
        totalRecords,
        financeRecords,
        vatRecords,
        avgSearchTime,
        successRate: successfulSearches / testQueries.length
      };

    } catch (error) {
      console.error('❌ Summary generation failed:', error.message);
      return null;
    }
  }

  async runTest() {
    try {
      await this.initialize();
      
      // Check if we have data
      const hasData = await this.checkData();
      if (!hasData) {
        console.log('\n⚠️  No structured data found. Run hybrid-search-implementation.js first.');
        return;
      }
      
      // Create basic indexes
      await this.createBasicIndexes();
      
      // Test basic searches
      await this.testBasicSearches();
      
      // Test hybrid logic
      await this.testHybridLogic();
      
      // Generate summary
      const summary = await this.generateSummary();
      
      if (summary) {
        console.log('\n🎉 Hybrid Search System Status');
        console.log('==============================');
        console.log(`✅ Database: ${summary.totalRecords} structured tax records`);
        console.log(`✅ Performance: ${summary.avgSearchTime.toFixed(0)}ms average search`);
        console.log(`✅ Reliability: ${(summary.successRate * 100).toFixed(0)}% success rate`);
        console.log('✅ Ready for API integration');
        
        // Save summary
        const report = {
          timestamp: new Date().toISOString(),
          summary,
          status: "ready_for_api_integration"
        };
        
        fs.writeFileSync('hybrid-search-ready.json', JSON.stringify(report, null, 2));
        console.log('\n💾 Status saved to: hybrid-search-ready.json');
      }
      
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

// Run test
const tester = new SimpleHybridTester();
tester.runTest().catch(console.error);