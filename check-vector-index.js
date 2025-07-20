#!/usr/bin/env node

/**
 * Check Vector Index Status
 * Verifies that the Atlas Vector Search index is properly configured
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

async function checkVectorIndex() {
  const mongoUri = env.MONGODB_URI || process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }

  const client = new MongoClient(mongoUri);
  
  try {
    console.log('🔍 Checking Vector Index Status');
    console.log('===============================');
    
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('ai_tax_lawyer');
    const collection = db.collection('document_chunks');
    
    // Check collection exists and has documents
    const docCount = await collection.countDocuments({});
    console.log(`📄 Documents in collection: ${docCount}`);
    
    if (docCount === 0) {
      console.log('❌ No documents found! Vector search cannot work without documents.');
      return;
    }
    
    // Check if documents have embeddings
    const sampleDoc = await collection.findOne({});
    console.log('📋 Sample document structure:');
    console.log(`   - Has embedding: ${sampleDoc.embedding ? 'Yes' : 'No'}`);
    if (sampleDoc.embedding) {
      const embeddingType = Array.isArray(sampleDoc.embedding) ? 'array' : typeof sampleDoc.embedding;
      const embeddingLength = Array.isArray(sampleDoc.embedding) ? sampleDoc.embedding.length : 'unknown';
      console.log(`   - Embedding type: ${embeddingType}`);
      console.log(`   - Embedding dimensions: ${embeddingLength}`);
    }
    console.log(`   - Document type: ${sampleDoc.document_type}`);
    console.log(`   - Language: ${sampleDoc.language}`);
    console.log(`   - Content length: ${sampleDoc.content?.length || 0} chars`);
    
    // Test vector search with simplified pipeline
    console.log('\n🧪 Testing Vector Search Index...');
    
    try {
      // First try to get some documents to check embedding format
      const docsWithEmbeddings = await collection.find({ embedding: { $exists: true } }).limit(5).toArray();
      console.log(`📊 Documents with embeddings: ${docsWithEmbeddings.length}`);
      
      if (docsWithEmbeddings.length === 0) {
        console.log('❌ No documents have embeddings! This explains why vector search fails.');
        console.log('💡 Solution: Run the embedding generation script to add embeddings to documents.');
        return;
      }
      
      // Check embedding format
      const firstEmbedding = docsWithEmbeddings[0].embedding;
      const isArray = Array.isArray(firstEmbedding);
      const dimensions = isArray ? firstEmbedding.length : 0;
      
      console.log(`🔍 Embedding format check:`);
      console.log(`   - Is array: ${isArray}`);
      console.log(`   - Dimensions: ${dimensions}`);
      
      if (!isArray || dimensions !== 1536) {
        console.log('❌ Embedding format issue detected!');
        console.log('💡 Embeddings should be arrays of 1536 numbers for text-embedding-3-small');
        return;
      }
      
      // Try a simple vector search
      const testEmbedding = new Array(1536).fill(0.1); // Simple test vector
      
      const vectorSearchPipeline = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: testEmbedding,
            numCandidates: 10,
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
            content: { $substr: ['$content', 0, 50] }
          }
        }
      ];
      
      const vectorResults = await collection.aggregate(vectorSearchPipeline).toArray();
      
      if (vectorResults.length > 0) {
        console.log('✅ Vector search is working!');
        console.log(`📊 Test results: ${vectorResults.length} documents found`);
        vectorResults.forEach((doc, index) => {
          console.log(`   ${index + 1}. ${doc.document_type} (similarity: ${doc.similarity?.toFixed(3)})`);
        });
      } else {
        console.log('⚠️  Vector search returned no results');
        console.log('💡 This might be due to:');
        console.log('   - Vector index not properly created in Atlas UI');
        console.log('   - Index name mismatch (should be "vector_index")');
        console.log('   - Embedding field path mismatch (should be "embedding")');
      }
      
    } catch (vectorError) {
      console.log('❌ Vector search failed:', vectorError.message);
      
      if (vectorError.message.includes('vector_index')) {
        console.log('\n💡 SOLUTION: Create Vector Search Index in MongoDB Atlas');
        console.log('============================================');
        console.log('1. Go to MongoDB Atlas UI');
        console.log('2. Navigate to your cluster');
        console.log('3. Go to Search → Create Search Index');
        console.log('4. Choose "Atlas Vector Search"');
        console.log('5. Database: ai_tax_lawyer');
        console.log('6. Collection: document_chunks');
        console.log('7. Index Name: vector_index');
        console.log('8. Use this JSON configuration:');
        console.log(JSON.stringify({
          "fields": [
            {
              "numDimensions": 1536,
              "path": "embedding",
              "similarity": "cosine",
              "type": "vector"
            }
          ]
        }, null, 2));
      } else {
        console.log('💡 Other potential issues:');
        console.log('   - Check MongoDB Atlas cluster is running');
        console.log('   - Verify connection string is correct');
        console.log('   - Ensure embeddings are in correct format');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

checkVectorIndex().catch(console.error);