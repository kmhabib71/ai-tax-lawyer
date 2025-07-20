#!/usr/bin/env node

/**
 * Hybrid Search Routing Demonstration
 * Shows how AI will route queries between structured search vs vector search
 * Tests Bengali, English, and Banglish queries
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

class HybridRoutingDemo {
  constructor() {
    this.mongoUri = env.MONGODB_URI || process.env.MONGODB_URI;
    this.openaiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    this.client = null;
    this.db = null;
    this.vectorCollection = null;
    this.structuredCollection = null;
    this.openai = null;
  }

  async initialize() {
    console.log('🤖 Hybrid Search Routing Demonstration');
    console.log('======================================');
    console.log('Testing: AI Query Routing + Multi-language Support\n');

    this.openai = new OpenAI({ apiKey: this.openaiKey });
    this.client = new MongoClient(this.mongoUri);
    await this.client.connect();
    this.db = this.client.db('ai_tax_lawyer');
    this.vectorCollection = this.db.collection('document_chunks');
    this.structuredCollection = this.db.collection('structured_tax_records');
    
    console.log('✅ Connected to hybrid search system\n');
  }

  // Smart Query Routing Logic
  async routeQuery(query, userType = 'other') {
    const startTime = Date.now();
    
    // Step 1: Analyze query to determine routing strategy
    const routing = await this.analyzeQueryForRouting(query);
    
    let result = {
      query,
      userType,
      routing,
      searchTime: 0,
      totalTime: 0,
      success: false
    };

    try {
      if (routing.useStructured) {
        // Route to structured search
        result = await this.performStructuredSearch(query, routing);
      } else {
        // Route to vector search  
        result = await this.performVectorSearch(query, userType);
      }
      
      result.totalTime = Date.now() - startTime;
      return result;

    } catch (error) {
      result.error = error.message;
      result.totalTime = Date.now() - startTime;
      return result;
    }
  }

  // AI-powered query analysis for routing decisions
  async analyzeQueryForRouting(query) {
    const patterns = {
      // Exact HS code patterns
      exactHSCode: /^\d{4}\.\d{2}\.\d{2}$/,
      partialHSCode: /^\d{4}(\.\d{1,2})?$/,
      
      // Product-specific patterns (Bengali)
      bengaliProducts: /কোমল পানীয়|বিয়ার|চা|কফি|চিনি|তেল|গাড়ি|মোবাইল|ল্যাপটপ/,
      
      // Product-specific patterns (English)
      englishProducts: /beer|tea|coffee|sugar|oil|car|mobile|laptop|phone|computer/i,
      
      // Duty rate queries
      dutyQueries: /duty|শুল্ক|কর হার|tax rate|হার কত|rate কত/i,
      
      // Legal/general advice patterns
      legalQueries: /আইন|নিয়ম|বিধি|law|rule|regulation|advice|পরামর্শ|how to|কিভাবে/i,
      
      // Calculation queries
      calculationQueries: /calculate|গণনা|হিসাব|computation|total|মোট/i
    };

    // Determine routing strategy
    let useStructured = false;
    let searchStrategy = 'vector_default';
    let confidence = 0.5;
    let reasoning = '';

    // High confidence structured routing
    if (patterns.exactHSCode.test(query.trim())) {
      useStructured = true;
      searchStrategy = 'exact_hs_lookup';
      confidence = 0.95;
      reasoning = 'Exact HS code detected - direct structured lookup';
      
    } else if (patterns.partialHSCode.test(query.trim())) {
      useStructured = true;
      searchStrategy = 'partial_hs_lookup';
      confidence = 0.90;
      reasoning = 'Partial HS code detected - structured pattern search';
      
    } else if (patterns.bengaliProducts.test(query) || patterns.englishProducts.test(query)) {
      useStructured = true;
      searchStrategy = 'product_search';
      confidence = 0.85;
      reasoning = 'Product name detected - structured product lookup';
      
    } else if (patterns.dutyQueries.test(query) && (patterns.bengaliProducts.test(query) || patterns.englishProducts.test(query))) {
      useStructured = true;
      searchStrategy = 'duty_rate_lookup';
      confidence = 0.90;
      reasoning = 'Duty rate query for specific product - structured search for precise rates';
      
    } else if (patterns.calculationQueries.test(query)) {
      // Could use both - prefer structured for exact calculations
      useStructured = true;
      searchStrategy = 'calculation_focused';
      confidence = 0.75;
      reasoning = 'Calculation query - structured search for precise data, may combine with vector advice';
      
    } else if (patterns.legalQueries.test(query)) {
      useStructured = false;
      searchStrategy = 'vector_advice';
      confidence = 0.80;
      reasoning = 'Legal advice query - vector search for comprehensive guidance';
      
    } else {
      // Default to vector for general queries
      useStructured = false;
      searchStrategy = 'vector_general';
      confidence = 0.60;
      reasoning = 'General query - vector search for semantic understanding';
    }

    return {
      useStructured,
      searchStrategy,
      confidence,
      reasoning,
      detectedPatterns: {
        exactHS: patterns.exactHSCode.test(query.trim()),
        partialHS: patterns.partialHSCode.test(query.trim()),
        bengaliProduct: patterns.bengaliProducts.test(query),
        englishProduct: patterns.englishProducts.test(query),
        dutyQuery: patterns.dutyQueries.test(query),
        legalQuery: patterns.legalQueries.test(query),
        calculationQuery: patterns.calculationQueries.test(query)
      }
    };
  }

  async performStructuredSearch(query, routing) {
    const startTime = Date.now();
    let searchQuery = {};
    let sort = { duty_rate: -1 };

    // Build search query based on strategy
    switch (routing.searchStrategy) {
      case 'exact_hs_lookup':
        searchQuery = { hs_code: query.trim() };
        break;
        
      case 'partial_hs_lookup':
        searchQuery = { hs_code: { $regex: `^${query.trim()}`, $options: 'i' } };
        break;
        
      case 'product_search':
        // Search in descriptions (regex fallback since text index has issues)
        searchQuery = { description: { $regex: query, $options: 'i' } };
        break;
        
      case 'duty_rate_lookup':
        // Combine product search with duty rate sorting
        searchQuery = { description: { $regex: query.replace(/duty|শুল্ক|কর হার|tax rate|হার কত|rate কত/gi, '').trim(), $options: 'i' } };
        sort = { duty_rate: -1 };
        break;
        
      case 'calculation_focused':
        // Look for numerical patterns and product names
        const productMatch = query.match(/কোমল পানীয়|বিয়ার|beer|tea|coffee/i);
        if (productMatch) {
          searchQuery = { description: { $regex: productMatch[0], $options: 'i' } };
        } else {
          searchQuery = {}; // Return all, sorted by duty rate
        }
        break;
        
      default:
        searchQuery = { description: { $regex: query, $options: 'i' } };
    }

    // Execute structured search
    const results = await this.structuredCollection
      .find(searchQuery)
      .sort(sort)
      .limit(5)
      .toArray();

    const searchTime = Date.now() - startTime;

    return {
      query,
      routing,
      searchType: 'structured',
      results,
      resultCount: results.length,
      searchTime,
      success: results.length > 0,
      topResult: results.length > 0 ? {
        hs_code: results[0].hs_code,
        duty_rate: results[0].duty_rate,
        description: results[0].description?.substring(0, 100),
        source: results[0].source_act
      } : null
    };
  }

  async performVectorSearch(query, userType) {
    const startTime = Date.now();

    // Generate embedding
    const embeddingResponse = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Vector search
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

    const results = await this.vectorCollection.aggregate(pipeline).toArray();
    const searchTime = Date.now() - startTime;

    return {
      query,
      routing: { useStructured: false, searchStrategy: 'vector_search', reasoning: 'Vector search for semantic understanding' },
      searchType: 'vector',
      results,
      resultCount: results.length,
      searchTime,
      success: results.length > 0,
      topSimilarity: results.length > 0 ? results[0].similarity : 0
    };
  }

  async testMultilingualQueries() {
    console.log('🌍 Testing Multilingual Query Routing');
    console.log('=====================================');

    const testQueries = [
      // Bengali Queries
      {
        query: "২২০২.১০.০০",
        language: "Bengali",
        type: "Exact HS Code",
        expectedRoute: "structured"
      },
      {
        query: "কোমল পানীয়ের শুল্ক কত",
        language: "Bengali", 
        type: "Product Duty Query",
        expectedRoute: "structured"
      },
      {
        query: "বিয়ারের উপর কর হার",
        language: "Bengali",
        type: "Product Tax Rate",
        expectedRoute: "structured"
      },
      {
        query: "আয়কর আইনের নিয়ম কি",
        language: "Bengali",
        type: "Legal Advice",
        expectedRoute: "vector"
      },

      // English Queries
      {
        query: "2202.10.00",
        language: "English",
        type: "Exact HS Code", 
        expectedRoute: "structured"
      },
      {
        query: "beer duty rate",
        language: "English",
        type: "Product Duty Query",
        expectedRoute: "structured"
      },
      {
        query: "soft drinks tax calculation",
        language: "English",
        type: "Tax Calculation",
        expectedRoute: "structured"
      },
      {
        query: "income tax exemption rules",
        language: "English",
        type: "Legal Advice",
        expectedRoute: "vector"
      },

      // Banglish Queries
      {
        query: "beer er duty rate koto",
        language: "Banglish",
        type: "Product Duty Query",
        expectedRoute: "structured"
      },
      {
        query: "mobile phone import tax korar niyom",
        language: "Banglish",
        type: "Import Tax Rules",
        expectedRoute: "vector"
      },
      {
        query: "car er HS code ebong tax",
        language: "Banglish", 
        type: "Product Code & Tax",
        expectedRoute: "structured"
      },
      {
        query: "freelancer der tax calculate korar system",
        language: "Banglish",
        type: "Tax System Advice",
        expectedRoute: "vector"
      }
    ];

    console.log('Testing queries across Bengali, English, and Banglish...\n');

    const results = [];

    for (const testCase of testQueries) {
      console.log(`🔍 Query: "${testCase.query}"`);
      console.log(`   Language: ${testCase.language} | Type: ${testCase.type}`);
      console.log(`   Expected Route: ${testCase.expectedRoute}`);

      try {
        const result = await this.routeQuery(testCase.query);
        
        const actualRoute = result.routing.useStructured ? 'structured' : 'vector';
        const correctRoute = actualRoute === testCase.expectedRoute;
        
        console.log(`   🎯 Actual Route: ${actualRoute} ${correctRoute ? '✅' : '❌'}`);
        console.log(`   📊 Confidence: ${(result.routing.confidence * 100).toFixed(0)}%`);
        console.log(`   💭 Reasoning: ${result.routing.reasoning}`);
        console.log(`   ⚡ Search Time: ${result.searchTime}ms`);
        
        if (result.success) {
          if (result.searchType === 'structured' && result.topResult) {
            console.log(`   🏆 Top Result: ${result.topResult.hs_code} - ${result.topResult.duty_rate}% duty`);
          } else if (result.searchType === 'vector') {
            console.log(`   🏆 Top Similarity: ${result.topSimilarity?.toFixed(3)}`);
          }
        } else {
          console.log(`   ⚠️  No results found`);
        }

        results.push({
          ...testCase,
          result,
          correctRoute,
          actualRoute
        });

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.push({
          ...testCase,
          error: error.message,
          correctRoute: false
        });
      }

      console.log('');
    }

    return results;
  }

  async generateRoutingAnalysis(results) {
    console.log('📊 Routing Analysis');
    console.log('===================');

    const totalQueries = results.length;
    const correctRoutes = results.filter(r => r.correctRoute).length;
    const structuredQueries = results.filter(r => r.expectedRoute === 'structured').length;
    const vectorQueries = results.filter(r => r.expectedRoute === 'vector').length;

    console.log(`📈 Overall Accuracy: ${correctRoutes}/${totalQueries} (${(correctRoutes/totalQueries*100).toFixed(1)}%)`);
    console.log(`🔍 Structured Queries: ${structuredQueries}`);
    console.log(`🧠 Vector Queries: ${vectorQueries}`);

    // Analyze by language
    const languages = ['Bengali', 'English', 'Banglish'];
    console.log('\n🌍 Performance by Language:');
    
    languages.forEach(lang => {
      const langResults = results.filter(r => r.language === lang);
      const langCorrect = langResults.filter(r => r.correctRoute).length;
      console.log(`   ${lang}: ${langCorrect}/${langResults.length} (${(langCorrect/langResults.length*100).toFixed(0)}%)`);
    });

    // Performance metrics
    const successfulResults = results.filter(r => r.result && r.result.success);
    if (successfulResults.length > 0) {
      const avgSearchTime = successfulResults.reduce((sum, r) => sum + r.result.searchTime, 0) / successfulResults.length;
      console.log(`\n⚡ Average Search Time: ${avgSearchTime.toFixed(0)}ms`);
      
      const structuredResults = successfulResults.filter(r => r.result.searchType === 'structured');
      const vectorResults = successfulResults.filter(r => r.result.searchType === 'vector');
      
      if (structuredResults.length > 0) {
        const avgStructured = structuredResults.reduce((sum, r) => sum + r.result.searchTime, 0) / structuredResults.length;
        console.log(`   📊 Structured Search: ${avgStructured.toFixed(0)}ms average`);
      }
      
      if (vectorResults.length > 0) {
        const avgVector = vectorResults.reduce((sum, r) => sum + r.result.searchTime, 0) / vectorResults.length;
        console.log(`   🧠 Vector Search: ${avgVector.toFixed(0)}ms average`);
      }
    }

    return {
      totalQueries,
      correctRoutes,
      accuracy: correctRoutes / totalQueries,
      avgSearchTime: successfulResults.length > 0 ? 
        successfulResults.reduce((sum, r) => sum + r.result.searchTime, 0) / successfulResults.length : 0
    };
  }

  async demonstrateUserExperience() {
    console.log('\n👤 User Experience Simulation');
    console.log('=============================');

    const userScenarios = [
      {
        scenario: "Business owner wants exact duty rate",
        query: "কোমল পানীয়ের শুল্ক কত",
        expectedFlow: "Direct structured lookup → Exact duty rate"
      },
      {
        scenario: "Student asking about tax concepts", 
        query: "আয়কর কিভাবে হিসাব করে",
        expectedFlow: "Vector search → Educational explanation"
      },
      {
        scenario: "Importer checking HS code",
        query: "2202.10.00",
        expectedFlow: "Direct HS lookup → Instant precise result"
      },
      {
        scenario: "General tax consultation",
        query: "freelancer der tax calculation system",
        expectedFlow: "Vector search → Comprehensive advice"
      }
    ];

    for (const scenario of userScenarios) {
      console.log(`\n📋 Scenario: ${scenario.scenario}`);
      console.log(`💬 User Query: "${scenario.query}"`);
      console.log(`🔮 Expected: ${scenario.expectedFlow}`);

      const result = await this.routeQuery(scenario.query);
      
      console.log(`✅ Actual Flow: ${result.routing.useStructured ? 'Structured' : 'Vector'} search`);
      console.log(`⚡ Response Time: ${result.searchTime}ms`);
      console.log(`🎯 User Gets: ${result.routing.useStructured ? 'Precise data' : 'Comprehensive advice'}`);
    }
  }

  async runDemo() {
    try {
      await this.initialize();
      
      // Test multilingual routing
      const results = await this.testMultilingualQueries();
      
      // Analyze routing accuracy
      const analysis = await this.generateRoutingAnalysis(results);
      
      // Demonstrate user experience
      await this.demonstrateUserExperience();
      
      console.log('\n🎉 Hybrid Routing Demonstration Complete!');
      console.log('=========================================');
      console.log(`✅ Routing Accuracy: ${(analysis.accuracy * 100).toFixed(1)}%`);
      console.log(`⚡ Average Response: ${analysis.avgSearchTime.toFixed(0)}ms`);
      console.log('✅ Supports: Bengali, English, Banglish queries');
      console.log('✅ Intelligent routing between structured and vector search');
      console.log('✅ Optimized for both precise calculations and general advice');
      
      // Save demo results
      const demoReport = {
        timestamp: new Date().toISOString(),
        testResults: results,
        analysis,
        status: 'routing_demo_complete'
      };
      
      fs.writeFileSync('hybrid-routing-demo-results.json', JSON.stringify(demoReport, null, 2));
      console.log('\n💾 Demo results saved to: hybrid-routing-demo-results.json');
      
    } catch (error) {
      console.error('\n❌ Demo failed:', error.message);
    } finally {
      if (this.client) {
        await this.client.close();
        console.log('\n🔌 Connection closed');
      }
    }
  }
}

// Run demonstration
const demo = new HybridRoutingDemo();
demo.runDemo().catch(console.error);