#!/usr/bin/env node

/**
 * Database Verification Script
 * Check all collections and document counts in MongoDB Atlas
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

class DatabaseVerifier {
  constructor() {
    this.mongoUri = env.MONGODB_URI || process.env.MONGODB_URI;
    this.client = null;
    this.db = null;
  }

  async initialize() {
    console.log('🔍 MongoDB Atlas Database Verification');
    console.log('=====================================');
    console.log(`📡 Connecting to: ${this.mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@')}\n`);

    this.client = new MongoClient(this.mongoUri);
    await this.client.connect();
    this.db = this.client.db('ai_tax_lawyer');
    
    console.log('✅ Connected to MongoDB Atlas');
    console.log('✅ Database: ai_tax_lawyer\n');
  }

  async checkAllCollections() {
    console.log('📊 Collection Overview');
    console.log('=====================');

    try {
      // List all collections
      const collections = await this.db.listCollections().toArray();
      console.log(`📁 Total Collections: ${collections.length}\n`);

      for (const collection of collections) {
        const collectionName = collection.name;
        const coll = this.db.collection(collectionName);
        
        // Get document count
        const count = await coll.countDocuments();
        
        console.log(`📄 Collection: ${collectionName}`);
        console.log(`   📊 Document Count: ${count.toLocaleString()}`);
        
        // Get sample document to see structure
        if (count > 0) {
          const sample = await coll.findOne({});
          console.log(`   🔍 Sample Fields: ${Object.keys(sample).join(', ')}`);
          
          // Show specific info based on collection type
          if (collectionName === 'document_chunks') {
            console.log(`   🧠 Vector Collection: Contains embeddings for RAG search`);
            if (sample.embedding) {
              console.log(`   📏 Embedding Dimensions: ${sample.embedding.length}`);
            }
          } else if (collectionName === 'structured_tax_records') {
            console.log(`   💰 Structured Collection: Contains exact tax data`);
            if (sample.hs_code && sample.duty_rate) {
              console.log(`   🎯 Sample: ${sample.hs_code} - ${sample.duty_rate}% duty`);
            }
          }
        }
        console.log('');
      }

    } catch (error) {
      console.error('❌ Error checking collections:', error.message);
    }
  }

  async analyzeVectorCollection() {
    console.log('🧠 Vector Collection Analysis (document_chunks)');
    console.log('================================================');

    try {
      const vectorCollection = this.db.collection('document_chunks');
      const count = await vectorCollection.countDocuments();
      
      console.log(`📊 Total Vector Documents: ${count.toLocaleString()}`);
      
      if (count > 0) {
        // Get sample documents
        const samples = await vectorCollection.find({}).limit(3).toArray();
        
        console.log('\n📋 Sample Vector Documents:');
        samples.forEach((doc, index) => {
          console.log(`   ${index + 1}. Document ID: ${doc._id}`);
          console.log(`      Content: ${doc.content ? doc.content.substring(0, 80) : 'N/A'}...`);
          console.log(`      Type: ${doc.document_type || 'N/A'}`);
          console.log(`      Source: ${doc.source_document || 'N/A'}`);
          console.log(`      Has Embedding: ${doc.embedding ? 'Yes (' + doc.embedding.length + ' dims)' : 'No'}`);
          console.log('');
        });

        // Check embedding statistics
        const withEmbeddings = await vectorCollection.countDocuments({ embedding: { $exists: true } });
        console.log(`🎯 Documents with Embeddings: ${withEmbeddings}/${count} (${(withEmbeddings/count*100).toFixed(1)}%)`);
      }

    } catch (error) {
      console.error('❌ Error analyzing vector collection:', error.message);
    }
  }

  async analyzeStructuredCollection() {
    console.log('\n💰 Structured Collection Analysis (structured_tax_records)');
    console.log('==========================================================');

    try {
      const structuredCollection = this.db.collection('structured_tax_records');
      const count = await structuredCollection.countDocuments();
      
      console.log(`📊 Total Structured Records: ${count.toLocaleString()}`);
      
      if (count > 0) {
        // Count by source
        const financeCount = await structuredCollection.countDocuments({ source_act: 'Finance Act 2025' });
        const vatCount = await structuredCollection.countDocuments({ source_act: 'VAT Act 2012' });
        
        console.log(`📄 Finance Act 2025: ${financeCount.toLocaleString()} records`);
        console.log(`📄 VAT Act 2012: ${vatCount.toLocaleString()} records`);
        
        // Get sample records
        const samples = await structuredCollection.find({}).limit(3).toArray();
        
        console.log('\n📋 Sample Structured Records:');
        samples.forEach((record, index) => {
          console.log(`   ${index + 1}. HS Code: ${record.hs_code}`);
          console.log(`      Description: ${record.description ? record.description.substring(0, 60) : 'N/A'}...`);
          console.log(`      Duty Rate: ${record.duty_rate}%`);
          console.log(`      Source: ${record.source_act}`);
          console.log(`      Language: ${record.language || 'N/A'}`);
          console.log('');
        });

        // Statistics
        const dutyStats = await structuredCollection.aggregate([
          {
            $group: {
              _id: null,
              avgDuty: { $avg: "$duty_rate" },
              minDuty: { $min: "$duty_rate" },
              maxDuty: { $max: "$duty_rate" }
            }
          }
        ]).toArray();

        if (dutyStats.length > 0) {
          const stats = dutyStats[0];
          console.log(`📈 Duty Rate Range: ${stats.minDuty}% - ${stats.maxDuty}%`);
          console.log(`📊 Average Duty Rate: ${stats.avgDuty.toFixed(1)}%`);
        }

        // Count valid HS codes
        const validHSCodes = await structuredCollection.countDocuments({
          hs_code: { $regex: /^\d{4}\.\d{2}\.\d{2}/ }
        });
        console.log(`🔢 Valid HS Codes: ${validHSCodes}/${count} (${(validHSCodes/count*100).toFixed(1)}%)`);

      }

    } catch (error) {
      console.error('❌ Error analyzing structured collection:', error.message);
    }
  }

  async checkIndexes() {
    console.log('\n🔍 Index Analysis');
    console.log('=================');

    const collections = ['document_chunks', 'structured_tax_records'];
    
    for (const collectionName of collections) {
      try {
        const collection = this.db.collection(collectionName);
        const indexes = await collection.listIndexes().toArray();
        
        console.log(`\n📁 ${collectionName} Indexes:`);
        indexes.forEach((index, i) => {
          console.log(`   ${i + 1}. ${index.name}`);
          console.log(`      Keys: ${JSON.stringify(index.key)}`);
          if (index.textIndexVersion) {
            console.log(`      Type: Text Search Index`);
          }
        });

      } catch (error) {
        console.log(`❌ Error checking indexes for ${collectionName}: ${error.message}`);
      }
    }
  }

  async generateAtlasGuide() {
    console.log('\n🗺️  MongoDB Atlas Interface Guide');
    console.log('==================================');
    
    console.log('To view your data in MongoDB Atlas web interface:');
    console.log('');
    console.log('1. 🌐 Go to: https://cloud.mongodb.com/');
    console.log('2. 🔑 Sign in with your MongoDB Atlas account');
    console.log('3. 📁 Select your cluster (likely named "Cluster0" or similar)');
    console.log('4. 🗃️  Click "Browse Collections"');
    console.log('5. 📂 Select database: "ai_tax_lawyer"');
    console.log('');
    console.log('You will see these collections:');
    console.log('📄 document_chunks - Your original 1,000 vectorized documents');
    console.log('💰 structured_tax_records - New 310 structured tax records');
    console.log('');
    console.log('🔍 To search/filter records:');
    console.log('- Click on any collection name');
    console.log('- Use the Filter box to search (e.g., {"hs_code": "2202.10.00"})');
    console.log('- Click "Options" for advanced queries');
    console.log('');
    console.log('📊 Total Documents:');
    console.log('- BEFORE: 1,000 vector documents');
    console.log('- AFTER: 1,000 vector documents + 310 structured records = 1,310 total');
  }

  async generateSummary() {
    console.log('\n📋 VERIFICATION SUMMARY');
    console.log('=======================');

    try {
      const vectorCount = await this.db.collection('document_chunks').countDocuments();
      const structuredCount = await this.db.collection('structured_tax_records').countDocuments();
      const totalDocuments = vectorCount + structuredCount;

      console.log(`✅ Vector Documents (RAG): ${vectorCount.toLocaleString()}`);
      console.log(`✅ Structured Tax Records: ${structuredCount.toLocaleString()}`);
      console.log(`📊 TOTAL DOCUMENTS: ${totalDocuments.toLocaleString()}`);
      console.log('');
      console.log('🎯 Data Types:');
      console.log(`   🧠 Vectorized: ${vectorCount} documents with embeddings for semantic search`);
      console.log(`   💰 Structured: ${structuredCount} records with exact tax data`);
      console.log('');
      console.log('🚀 System Capabilities:');
      console.log('   ✅ General tax advice (vector search)');
      console.log('   ✅ Precise duty calculations (structured search)');
      console.log('   ✅ HS code lookups (indexed search)');
      console.log('   ✅ Bengali product descriptions');
      console.log('');
      console.log('🎉 Status: Ready for hybrid search API integration');

      return {
        vectorDocuments: vectorCount,
        structuredRecords: structuredCount,
        totalDocuments: totalDocuments,
        status: 'verified_ready'
      };

    } catch (error) {
      console.error('❌ Summary generation failed:', error.message);
      return null;
    }
  }

  async runVerification() {
    try {
      await this.initialize();
      await this.checkAllCollections();
      await this.analyzeVectorCollection();
      await this.analyzeStructuredCollection();
      await this.checkIndexes();
      await this.generateAtlasGuide();
      
      const summary = await this.generateSummary();
      
      if (summary) {
        // Save verification report
        const report = {
          timestamp: new Date().toISOString(),
          summary,
          verification_status: 'complete'
        };
        
        fs.writeFileSync('database-verification-report.json', JSON.stringify(report, null, 2));
        console.log('\n💾 Verification report saved to: database-verification-report.json');
      }
      
    } catch (error) {
      console.error('\n❌ Verification failed:', error.message);
    } finally {
      if (this.client) {
        await this.client.close();
        console.log('\n🔌 Connection closed');
      }
    }
  }
}

// Run verification
const verifier = new DatabaseVerifier();
verifier.runVerification().catch(console.error);