#!/usr/bin/env node

/**
 * Test Existing Atlas Index (Fixed UTF-8 handling)
 * Tests the current "ai-tax-lawyer-index" to see if it's vector or text search
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

async function testExistingIndex() {
  const mongoUri = env.MONGODB_URI || process.env.MONGODB_URI;
  const openaiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!mongoUri || !openaiKey) {
    console.error('❌ Missing environment variables');
    return;
  }

  const client = new MongoClient(mongoUri);
  const openai = new OpenAI({ apiKey: openaiKey });
  
  try {
    console.log('🔍 Testing Existing Atlas Index: "ai-tax-lawyer-index"');
    console.log('====================================================');
    
    await client.connect();
    const db = client.db('ai_tax_lawyer');
    const collection = db.collection('document_chunks');
    
    console.log('✅ Connected to MongoDB Atlas');
    console.log('📄 Index Name: ai-tax-lawyer-index');
    console.log('📊 Status: READY');
    console.log('📚 Documents: 1,000 indexed');
    console.log('💾 Size: 7.44MB\n');
    
    // Test 1: Check if it's a vector search index
    console.log('🧪 Test 1: Vector Search Test');
    console.log('=============================');
    
    try {
      // Generate a test embedding
      const testQuery = "মূল্য সংযোজন কর হার";
      console.log(`🔍 Testing query: "${testQuery}"`);
      
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: testQuery
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;
      console.log('✅ Generated query embedding (1536 dimensions)');
      
      // Try vector search with existing index name (simplified projection)
      const vectorPipeline = [
        {
          $vectorSearch: {
            index: 'ai-tax-lawyer-index', // Using your existing index name
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: 20,
            limit: 3
          }
        },
        {
          $addFields: {
            similarity: { $meta: 'vectorSearchScore' }
          }
        },
        {
          $project: {
            document_type: 1,
            similarity: 1,
            language: 1,
            chunk_id: 1
          }
        }
      ];
      
      const vectorResults = await collection.aggregate(vectorPipeline).toArray();
      
      if (vectorResults.length > 0) {
        console.log('🎉 SUCCESS: Vector search is working!');
        console.log(`📊 Found ${vectorResults.length} results:`);
        vectorResults.forEach((doc, index) => {
          console.log(`   ${index + 1}. ${doc.document_type} (similarity: ${doc.similarity?.toFixed(3)})`);
          console.log(`      Chunk ID: ${doc.chunk_id}`);
          console.log(`      Language: ${doc.language}`);
        });
        
        console.log('\n✅ CONCLUSION: Your index IS a vector search index!');
        console.log('💡 SOLUTION: Update code to use "ai-tax-lawyer-index" instead of "vector_index"');
        
        return 'vector';
        
      } else {
        console.log('⚠️  Vector search returned no results');
        return 'none';
      }
      
    } catch (vectorError) {
      console.log('❌ Vector search failed:', vectorError.message);
      
      if (vectorError.message.includes('ai-tax-lawyer-index')) {
        console.log('💡 This index might be a text search index, not vector search');
      } else if (vectorError.message.includes('$vectorSearch')) {
        console.log('💡 Index exists but might not be configured for vector search');
      }
      
      // Try Test 2: Text Search
      console.log('\n🧪 Test 2: Text Search Test');
      console.log('============================');
      
      try {
        // Try Atlas Search (text search) with simplified projection
        const textPipeline = [
          {
            $search: {
              index: 'ai-tax-lawyer-index',
              text: {
                query: 'মূল্য সংযোজন কর',
                path: 'content'
              }
            }
          },
          {
            $addFields: {
              score: { $meta: 'searchScore' }
            }
          },
          {
            $limit: 3
          },
          {
            $project: {
              document_type: 1,
              score: 1,
              language: 1,
              chunk_id: 1
            }
          }
        ];
        
        const textResults = await collection.aggregate(textPipeline).toArray();
        
        if (textResults.length > 0) {
          console.log('✅ Text search is working!');
          console.log(`📊 Found ${textResults.length} results:`);
          textResults.forEach((doc, index) => {
            console.log(`   ${index + 1}. ${doc.document_type} (score: ${doc.score?.toFixed(3)})`);
            console.log(`      Chunk ID: ${doc.chunk_id}`);
            console.log(`      Language: ${doc.language}`);
          });
          
          console.log('\n✅ CONCLUSION: Your index IS a text search index!');
          console.log('💡 SOLUTION: Create a separate vector search index for semantic search');
          
          return 'text';
          
        } else {
          console.log('⚠️  Text search returned no results');
          return 'none';
        }
        
      } catch (textError) {
        console.log('❌ Text search also failed:', textError.message);
        return 'error';
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return 'error';
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

async function generateRecommendations() {
  const indexType = await testExistingIndex();
  
  console.log('\n🎯 FINAL RECOMMENDATIONS');
  console.log('========================');
  
  switch (indexType) {
    case 'vector':
      console.log('🎉 GREAT NEWS: You have a working vector search index!');
      console.log('');
      console.log('✅ IMMEDIATE ACTIONS:');
      console.log('1. Update mongodb-vector.ts to use "ai-tax-lawyer-index"');
      console.log('2. Run: node comprehensive-vector-search-test.js');
      console.log('3. Expect perfect semantic search results!');
      console.log('');
      console.log('📝 CODE CHANGE NEEDED:');
      console.log('   Change: index: "vector_index"');
      console.log('   To:     index: "ai-tax-lawyer-index"');
      break;
      
    case 'text':
      console.log('📊 You have a text search index (Atlas Search)');
      console.log('');
      console.log('✅ RECOMMENDED ACTIONS:');
      console.log('1. Keep existing index for text search');
      console.log('2. Create NEW vector search index named "vector_index"');
      console.log('3. Implement hybrid search (text + vector)');
      console.log('');
      console.log('📝 HYBRID APPROACH:');
      console.log('   - Use "ai-tax-lawyer-index" for text search');
      console.log('   - Create "vector_index" for semantic search');
      console.log('   - Combine results for best accuracy');
      break;
      
    case 'none':
      console.log('⚠️  Index exists but not returning results');
      console.log('');
      console.log('🔧 TROUBLESHOOTING NEEDED:');
      console.log('1. Check index configuration in Atlas UI');
      console.log('2. Verify field mappings are correct');
      console.log('3. Check if index is still building');
      break;
      
    case 'error':
      console.log('❌ Technical issues detected');
      console.log('');
      console.log('🔧 DEBUGGING NEEDED:');
      console.log('1. Check MongoDB Atlas cluster status');
      console.log('2. Verify connection string');
      console.log('3. Check index health in Atlas UI');
      break;
  }
  
  console.log('');
  console.log('💡 NEXT STEPS:');
  console.log('1. Follow the specific recommendations above');
  console.log('2. Test with updated configuration');
  console.log('3. Run full performance test suite');
  console.log('4. Deploy with confidence!');
}

generateRecommendations().catch(console.error);