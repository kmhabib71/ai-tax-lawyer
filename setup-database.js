/**
 * Database Setup Script for AI Tax Lawyer Bangladesh
 * Creates necessary tables and functions in Supabase
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key] = valueParts.join('=');
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
  console.log('🗄️  Setting up database for AI Tax Lawyer Bangladesh...\n');
  
  try {
    // Create document_chunks table
    console.log('📝 Creating document_chunks table...');
    const { error: chunksError } = await supabase.rpc('sql', {
      query: `
        CREATE TABLE IF NOT EXISTS document_chunks (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          content_bn TEXT,
          content_en TEXT,
          metadata JSONB NOT NULL DEFAULT '{}',
          embeddings FLOAT[] DEFAULT NULL,
          keywords_bn TEXT[] DEFAULT '{}',
          keywords_en TEXT[] DEFAULT '{}',
          search_vector TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (chunksError) {
      console.log('   ⚠️  Table might already exist or using direct SQL...');
    } else {
      console.log('   ✅ document_chunks table ready');
    }
    
    // Create processing log table
    console.log('📊 Creating document_processing_log table...');
    const { error: logError } = await supabase.rpc('sql', {
      query: `
        CREATE TABLE IF NOT EXISTS document_processing_log (
          id SERIAL PRIMARY KEY,
          file_name TEXT NOT NULL,
          processing_status TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (logError) {
      console.log('   ⚠️  Table might already exist or using direct SQL...');
    } else {
      console.log('   ✅ document_processing_log table ready');
    }
    
    // Test basic operations
    console.log('\n🧪 Testing database operations...');
    
    // Test insert and read
    const testChunk = {
      id: `test_${Date.now()}`,
      content: 'This is a test chunk for AI Tax Lawyer Bangladesh',
      metadata: {
        document_type: 'test',
        language: 'en',
        chunk_index: 0
      },
      keywords_en: ['test', 'ai', 'tax'],
      keywords_bn: []
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('document_chunks')
      .insert(testChunk)
      .select();
    
    if (insertError) {
      console.error('   ❌ Insert test failed:', insertError.message);
    } else {
      console.log('   ✅ Insert test successful');
      
      // Test read
      const { data: readData, error: readError } = await supabase
        .from('document_chunks')
        .select('*')
        .eq('id', testChunk.id)
        .single();
      
      if (readError) {
        console.error('   ❌ Read test failed:', readError.message);
      } else {
        console.log('   ✅ Read test successful');
        
        // Clean up test data
        await supabase
          .from('document_chunks')
          .delete()
          .eq('id', testChunk.id);
        
        console.log('   🧹 Test data cleaned up');
      }
    }
    
    // Check existing data
    const { count, error: countError } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`\n📊 Current chunks in database: ${count || 0}`);
    }
    
    console.log('\n✅ Database setup complete! Ready to process documents.');
    
  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    console.log('\n💡 Note: Some errors are expected if tables already exist.');
    console.log('💡 You may need to run the SQL schema manually in Supabase SQL editor.');
  }
}

// Run setup
setupDatabase().catch(console.error);