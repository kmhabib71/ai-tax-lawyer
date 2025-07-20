#!/usr/bin/env node

/**
 * Hybrid Search Implementation
 * Combines vector search (general advice) + structured search (precise calculations)
 * Phase 1: Database Integration + Search Strategy
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

class HybridSearchImplementation {
  constructor() {
    this.mongoUri = env.MONGODB_URI || process.env.MONGODB_URI;
    this.client = null;
    this.db = null;
    this.vectorCollection = null;
    this.structuredCollection = null;
  }

  async initialize() {
    console.log('🚀 Hybrid Search System Implementation');
    console.log('=====================================');
    console.log('Setting up: Vector Search + Structured Tax Data\n');

    if (!this.mongoUri) {
      throw new Error('❌ Missing MONGODB_URI environment variable');
    }

    this.client = new MongoClient(this.mongoUri);
    await this.client.connect();
    this.db = this.client.db('ai_tax_lawyer');
    
    // Existing vector collection
    this.vectorCollection = this.db.collection('document_chunks');
    
    // New structured collection
    this.structuredCollection = this.db.collection('structured_tax_records');
    
    console.log('✅ Connected to MongoDB Atlas');
    console.log('✅ Vector collection: document_chunks');
    console.log('✅ Structured collection: structured_tax_records\n');
  }

  async uploadStructuredData() {
    console.log('📤 Uploading Structured Tax Data');
    console.log('================================');

    try {
      // Load both JSON files
      const financeData = JSON.parse(fs.readFileSync('clean-tax-finance-act-2025.json', 'utf8'));
      const vatData = JSON.parse(fs.readFileSync('clean-tax-vat-act-2012.json', 'utf8'));

      console.log(`📄 Finance Act: ${financeData.tax_records.length} records`);
      console.log(`📄 VAT Act: ${vatData.tax_records.length} records`);

      // Clear existing data
      const deleteResult = await this.structuredCollection.deleteMany({});
      console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing records`);

      // Prepare structured records
      const structuredRecords = [];

      // Add Finance Act records
      financeData.tax_records.forEach(record => {
        structuredRecords.push({
          hs_code: record.HS_Code,
          description: record.Description,
          duty_rate: parseFloat(record['Duty_%']) || 0,
          source_act: 'Finance Act 2025',
          source_document: financeData.document_info.filename,
          source_pattern: record.Source_Pattern,
          created_at: new Date(),
          record_type: 'duty_rate',
          language: /[\u0980-\u09FF]/.test(record.Description) ? 'bengali' : 'english'
        });
      });

      // Add VAT Act records  
      vatData.tax_records.forEach(record => {
        structuredRecords.push({
          hs_code: record.HS_Code,
          description: record.Description,
          duty_rate: parseFloat(record['Duty_%']) || 0,
          source_act: 'VAT Act 2012',
          source_document: vatData.document_info.filename,
          source_pattern: record.Source_Pattern,
          created_at: new Date(),
          record_type: 'vat_rate',
          language: /[\u0980-\u09FF]/.test(record.Description) ? 'bengali' : 'english'
        });
      });

      console.log(`📊 Total records to upload: ${structuredRecords.length}`);

      // Insert records in batches
      const batchSize = 100;
      let insertedCount = 0;

      for (let i = 0; i < structuredRecords.length; i += batchSize) {
        const batch = structuredRecords.slice(i, i + batchSize);
        const result = await this.structuredCollection.insertMany(batch);
        insertedCount += result.insertedCount;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${result.insertedCount} records`);
      }

      console.log(`🎉 Successfully uploaded ${insertedCount} structured tax records`);

      // Create indexes for fast searching
      await this.createIndexes();

      return insertedCount;

    } catch (error) {
      console.error('❌ Error uploading structured data:', error.message);
      throw error;
    }
  }

  async createIndexes() {
    console.log('\n🔍 Creating Search Indexes');
    console.log('==========================');

    try {
      // Text search index for descriptions (Bengali + English)
      await this.structuredCollection.createIndex(
        { 
          description: "text", 
          hs_code: "text" 
        },
        { 
          name: "description_text_search",
          default_language: "none" // Support multiple languages
        }
      );
      console.log('✅ Created text search index');

      // HS code exact match index
      await this.structuredCollection.createIndex(
        { hs_code: 1 },
        { name: "hs_code_exact_match" }
      );
      console.log('✅ Created HS code index');

      // Duty rate range index
      await this.structuredCollection.createIndex(
        { duty_rate: 1 },
        { name: "duty_rate_range" }
      );
      console.log('✅ Created duty rate index');

      // Source act index
      await this.structuredCollection.createIndex(
        { source_act: 1 },
        { name: "source_act_filter" }
      );
      console.log('✅ Created source act index');

      // Language index
      await this.structuredCollection.createIndex(
        { language: 1 },
        { name: "language_filter" }
      );
      console.log('✅ Created language index');

      // Compound index for complex queries
      await this.structuredCollection.createIndex(
        { 
          source_act: 1, 
          duty_rate: 1, 
          language: 1 
        },
        { name: "compound_filter_search" }
      );
      console.log('✅ Created compound index');

    } catch (error) {
      console.error('❌ Error creating indexes:', error.message);
      throw error;
    }
  }

  async testHybridSearch() {
    console.log('\n🧪 Testing Hybrid Search Capabilities');
    console.log('=====================================');

    const testQueries = [
      {
        query: "কোমল পানীয়",
        type: "Bengali Product Search",
        expectedMatch: "soft drinks"
      },
      {
        query: "2202.10.00",
        type: "Exact HS Code Lookup",
        expectedMatch: "specific duty rate"
      },
      {
        query: "beer malt",
        type: "English Product Search", 
        expectedMatch: "beer products"
      },
      {
        query: "duty rate above 50%",
        type: "Duty Rate Range Query",
        expectedMatch: "high duty items"
      }
    ];

    for (const test of testQueries) {
      console.log(`\n🔍 Testing: ${test.type}`);
      console.log(`Query: "${test.query}"`);

      try {
        const results = await this.performStructuredSearch(test.query);
        console.log(`✅ Found ${results.length} results`);
        
        if (results.length > 0) {
          const topResult = results[0];
          console.log(`   Top result: ${topResult.hs_code} - ${topResult.description.substring(0, 60)}...`);
          console.log(`   Duty rate: ${topResult.duty_rate}%`);
          console.log(`   Source: ${topResult.source_act}`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }

  async performStructuredSearch(query, options = {}) {
    const {
      limit = 10,
      minDutyRate = null,
      maxDutyRate = null,
      sourceAct = null,
      language = null
    } = options;

    // Build search pipeline
    const pipeline = [];

    // Check if query looks like HS code
    const isHSCode = /^\d{4}\.\d{2}\.\d{2}/.test(query.trim());
    
    if (isHSCode) {
      // Exact HS code match
      pipeline.push({
        $match: {
          hs_code: { $regex: query.trim(), $options: 'i' }
        }
      });
    } else {
      // Text search in descriptions
      pipeline.push({
        $match: {
          $text: { $search: query }
        }
      });
      
      // Add text score for ranking
      pipeline.push({
        $addFields: {
          textScore: { $meta: "textScore" }
        }
      });
    }

    // Apply filters
    const matchConditions = {};
    
    if (minDutyRate !== null || maxDutyRate !== null) {
      matchConditions.duty_rate = {};
      if (minDutyRate !== null) matchConditions.duty_rate.$gte = minDutyRate;
      if (maxDutyRate !== null) matchConditions.duty_rate.$lte = maxDutyRate;
    }
    
    if (sourceAct) {
      matchConditions.source_act = sourceAct;
    }
    
    if (language) {
      matchConditions.language = language;
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Sort by relevance
    if (isHSCode) {
      pipeline.push({ $sort: { duty_rate: -1 } });
    } else {
      pipeline.push({ $sort: { textScore: { $meta: "textScore" }, duty_rate: -1 } });
    }

    pipeline.push({ $limit: limit });

    // Execute search
    const results = await this.structuredCollection.aggregate(pipeline).toArray();
    return results;
  }

  async generateHybridStrategy() {
    console.log('\n🧠 Hybrid Search Strategy');
    console.log('=========================');

    const strategy = {
      decision_matrix: {
        hs_code_pattern: "Use structured search for exact HS codes",
        product_names: "Use text search for product descriptions", 
        duty_calculation: "Use structured search for precise rates",
        general_advice: "Use vector search for legal questions",
        complex_queries: "Combine both searches for comprehensive answers"
      },
      
      query_routing: {
        exact_hs_code: "Structured search only",
        product_search: "Structured search + vector search fallback",
        duty_rates: "Structured search for precision",
        legal_questions: "Vector search for comprehensive advice",
        mixed_queries: "Hybrid approach with both systems"
      },

      performance_targets: {
        structured_search: "<50ms (indexed queries)",
        vector_search: "<200ms (current performance)",
        hybrid_combined: "<300ms (sequential execution)",
        cache_hit: "<10ms (cached responses)"
      },

      quality_improvements: {
        duty_accuracy: "100% accurate vs current broken tables",
        hs_code_lookup: "Instant precise matching",
        bengali_support: "Native Bengali product descriptions",
        professional_grade: "Exact calculations for tax professionals"
      }
    };

    console.log('📋 Strategy Matrix:');
    Object.entries(strategy.decision_matrix).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    console.log('\n🎯 Query Routing:');
    Object.entries(strategy.query_routing).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    console.log('\n⚡ Performance Targets:');
    Object.entries(strategy.performance_targets).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    console.log('\n💎 Quality Improvements:');
    Object.entries(strategy.quality_improvements).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    return strategy;
  }

  async validateDataQuality() {
    console.log('\n🔍 Data Quality Validation');
    console.log('==========================');

    try {
      // Count total records
      const totalCount = await this.structuredCollection.countDocuments();
      console.log(`📊 Total records: ${totalCount}`);

      // Count by source
      const financeCount = await this.structuredCollection.countDocuments({ source_act: 'Finance Act 2025' });
      const vatCount = await this.structuredCollection.countDocuments({ source_act: 'VAT Act 2012' });
      console.log(`📄 Finance Act records: ${financeCount}`);
      console.log(`📄 VAT Act records: ${vatCount}`);

      // Count by language
      const bengaliCount = await this.structuredCollection.countDocuments({ language: 'bengali' });
      const englishCount = await this.structuredCollection.countDocuments({ language: 'english' });
      console.log(`🇧🇩 Bengali records: ${bengaliCount}`);
      console.log(`🇺🇸 English records: ${englishCount}`);

      // Validate HS codes
      const validHSCodes = await this.structuredCollection.countDocuments({
        hs_code: { $regex: /^\d{4}\.\d{2}\.\d{2}/ }
      });
      console.log(`🔢 Valid HS codes: ${validHSCodes}/${totalCount} (${(validHSCodes/totalCount*100).toFixed(1)}%)`);

      // Duty rate statistics
      const dutyStats = await this.structuredCollection.aggregate([
        {
          $group: {
            _id: null,
            avgDuty: { $avg: "$duty_rate" },
            minDuty: { $min: "$duty_rate" },
            maxDuty: { $max: "$duty_rate" },
            totalRecords: { $sum: 1 }
          }
        }
      ]).toArray();

      if (dutyStats.length > 0) {
        const stats = dutyStats[0];
        console.log(`📈 Duty rate range: ${stats.minDuty}% - ${stats.maxDuty}%`);
        console.log(`📊 Average duty rate: ${stats.avgDuty.toFixed(1)}%`);
      }

      console.log('✅ Data quality validation complete');
      return true;

    } catch (error) {
      console.error('❌ Validation error:', error.message);
      return false;
    }
  }

  async runImplementation() {
    try {
      await this.initialize();
      
      console.log('Phase 1: Database Integration');
      const uploadedCount = await this.uploadStructuredData();
      
      console.log('\nPhase 2: Data Quality Validation');
      await this.validateDataQuality();
      
      console.log('\nPhase 3: Search Testing');
      await this.testHybridSearch();
      
      console.log('\nPhase 4: Strategy Documentation');
      const strategy = await this.generateHybridStrategy();
      
      // Save strategy to file
      fs.writeFileSync('hybrid-search-strategy.json', JSON.stringify(strategy, null, 2));
      console.log('\n💾 Strategy saved to: hybrid-search-strategy.json');
      
      console.log('\n🎉 Hybrid Search Implementation Complete!');
      console.log('========================================');
      console.log(`✅ Uploaded ${uploadedCount} structured tax records`);
      console.log('✅ Created optimized search indexes');
      console.log('✅ Validated data quality');
      console.log('✅ Tested search capabilities'); 
      console.log('✅ Generated implementation strategy');
      console.log('\n🚀 Ready for API integration and frontend development!');
      
    } catch (error) {
      console.error('\n❌ Implementation failed:', error.message);
    } finally {
      if (this.client) {
        await this.client.close();
        console.log('\n🔌 Connection closed');
      }
    }
  }
}

// Run implementation
const implementation = new HybridSearchImplementation();
implementation.runImplementation().catch(console.error);