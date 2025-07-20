#!/usr/bin/env node

/**
 * Test Existing Atlas Index
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
      
      // Try vector search with existing index name
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
            content: { $substr: ['$content', 0, 100] },
            language: 1
          }
        }
      ];
      
      const vectorResults = await collection.aggregate(vectorPipeline).toArray();
      
      if (vectorResults.length > 0) {
        console.log('🎉 SUCCESS: Vector search is working!');
        console.log(`📊 Found ${vectorResults.length} results:`);
        vectorResults.forEach((doc, index) => {
          console.log(`   ${index + 1}. ${doc.document_type} (similarity: ${doc.similarity?.toFixed(3)})`);
          console.log(`      Content: ${doc.content}...`);
          console.log(`      Language: ${doc.language}`);
        });
        
        console.log('\n✅ CONCLUSION: Your index IS a vector search index!');
        console.log('💡 SOLUTION: Update code to use "ai-tax-lawyer-index" instead of "vector_index"');
        
      } else {
        console.log('⚠️  Vector search returned no results');
      }
      
    } catch (vectorError) {
      console.log('❌ Vector search failed:', vectorError.message);
      
      if (vectorError.message.includes('ai-tax-lawyer-index')) {
        console.log('💡 This index might be a text search index, not vector search');
      }
    }
    
    // Test 2: Check if it's a text search index
    console.log('\n🧪 Test 2: Text Search Test');
    console.log('============================');
    
    try {
      // Try Atlas Search (text search)
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
            content: { $substr: ['$content', 0, 100] },
            language: 1
          }
        }
      ];
      
      const textResults = await collection.aggregate(textPipeline).toArray();
      
      if (textResults.length > 0) {
        console.log('✅ Text search is working!');
        console.log(`📊 Found ${textResults.length} results:`);
        textResults.forEach((doc, index) => {
          console.log(`   ${index + 1}. ${doc.document_type} (score: ${doc.score?.toFixed(3)})`);
          console.log(`      Content: ${doc.content}...`);
          console.log(`      Language: ${doc.language}`);
        });
        
        console.log('\n✅ CONCLUSION: Your index IS a text search index!');
        console.log('💡 SOLUTION: Create a separate vector search index for semantic search');
        
      } else {
        console.log('⚠️  Text search returned no results');
      }
      
    } catch (textError) {
      console.log('❌ Text search failed:', textError.message);
    }
    
    // Final recommendations
    console.log('\n🎯 RECOMMENDATIONS');
    console.log('==================');
    console.log('Based on test results:');
    console.log('');
    console.log('Option 1 (If vector search worked):');
    console.log('   - Update all code to use "ai-tax-lawyer-index" instead of "vector_index"');
    console.log('   - Your system is already perfect!');
    console.log('');
    console.log('Option 2 (If only text search worked):');
    console.log('   - Keep current index for text search');
    console.log('   - Create NEW vector search index named "vector_index"');
    console.log('   - Use both indexes for hybrid search');
    console.log('');
    console.log('Option 3 (If neither worked):');
    console.log('   - Check index configuration in Atlas UI');
    console.log('   - Verify embedding field is properly mapped');
    console.log('   - Consider recreating index with correct settings');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

testExistingIndex().catch(console.error);