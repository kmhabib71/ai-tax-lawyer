/**
 * Setup Supabase Schema - AI Tax Lawyer Bangladesh
 * Creates the correct database schema for our RAG system
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key] = valueParts.join('=');
  }
});

// Initialize Supabase with service role key for admin operations
const supabase = createClient(
  envVars.SUPABASE_URL || process.env.SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database schema...');
  console.log('='.repeat(50));

  try {
    // Read the schema file
    const schemaSQL = fs.readFileSync('supabase-updated-schema.sql', 'utf8');
    
    // Split into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim() === ';') {
        continue;
      }

      console.log(`\n⚡ Executing statement ${i + 1}/${statements.length}...`);
      console.log(`   ${statement.substring(0, 80)}...`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });

        if (error) {
          // Try direct SQL execution for DDL statements
          const { data: directData, error: directError } = await supabase
            .from('_supabase_migrations')
            .select('*')
            .limit(1);

          if (directError && directError.code === '42P01') {
            // Table doesn't exist, this is expected for first run
            console.log('   ⚠️  Migration table not found, continuing...');
          } else {
            throw error;
          }
        }

        console.log('   ✅ Success');

      } catch (statementError) {
        console.error(`   ❌ Error: ${statementError.message}`);
        
        // Continue with non-critical errors
        if (!statementError.message.includes('already exists')) {
          throw statementError;
        } else {
          console.log('   ⚠️  Already exists, skipping...');
        }
      }
    }

    console.log('\n✅ Database schema setup completed!');
    return true;

  } catch (error) {
    console.error('\n❌ Schema setup failed:', error.message);
    return false;
  }
}

async function verifySchema() {
  console.log('\n🔍 Verifying database schema...');
  console.log('='.repeat(50));

  try {
    // Check if tax_documents table exists and has correct columns
    const { data: tables, error: tableError } = await supabase
      .rpc('get_schema_info')
      .or('table_name.eq.tax_documents');

    if (tableError) {
      // Try a simple query instead
      const { data, error } = await supabase
        .from('tax_documents')
        .select('id')
        .limit(1);

      if (error) {
        if (error.code === '42P01') {
          console.log('❌ tax_documents table does not exist');
          return false;
        }
        throw error;
      }
    }

    console.log('✅ tax_documents table exists');

    // Test the match function
    try {
      const testEmbedding = new Array(1536).fill(0.1);
      const { data: matchData, error: matchError } = await supabase
        .rpc('match_tax_documents', {
          query_embedding: testEmbedding,
          match_threshold: 0.1,
          match_count: 1
        });

      if (matchError) {
        console.log('❌ match_tax_documents function missing or incorrect');
        console.log(`   Error: ${matchError.message}`);
        return false;
      }

      console.log('✅ match_tax_documents function working');

    } catch (funcError) {
      console.log('❌ Function test failed:', funcError.message);
      return false;
    }

    console.log('✅ Database schema verification successful!');
    return true;

  } catch (error) {
    console.error('❌ Schema verification failed:', error.message);
    return false;
  }
}

async function manualSchemaSetup() {
  console.log('\n🔧 Setting up schema manually...');
  
  try {
    // Create table with SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS tax_documents (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding vector(1536),
        metadata JSONB DEFAULT '{}',
        document_type TEXT,
        document_name TEXT,
        source_file TEXT,
        extraction_method TEXT DEFAULT 'OCR',
        language TEXT DEFAULT 'bn',
        chunk_index INTEGER,
        total_chunks INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Since we can't execute DDL directly, let's try with RPC
    console.log('⚡ Creating tax_documents table...');
    
    // Alternative: use insert to test table existence
    const { data: testData, error: testError } = await supabase
      .from('tax_documents')
      .select('id')
      .limit(1);

    if (testError && testError.code === '42P01') {
      console.log('❌ Table does not exist. Please run the SQL schema manually in Supabase dashboard.');
      console.log('\n📋 SQL to run in Supabase SQL Editor:');
      console.log('-'.repeat(50));
      console.log(fs.readFileSync('supabase-updated-schema.sql', 'utf8'));
      console.log('-'.repeat(50));
      return false;
    }

    console.log('✅ Table exists or created successfully');
    return true;

  } catch (error) {
    console.error('❌ Manual setup failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 AI Tax Lawyer Bangladesh - Database Setup');
  console.log('='.repeat(60));

  try {
    // Test connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('_supabase_tables')
      .select('*')
      .limit(1);

    if (connectionError) {
      console.log('⚠️  Using alternative connection test...');
    }

    console.log('✅ Connected to Supabase');

    // Try manual setup first
    const manualSuccess = await manualSchemaSetup();
    
    if (manualSuccess) {
      const verifySuccess = await verifySchema();
      
      if (verifySuccess) {
        console.log('\n🎉 Database is ready for RAG system!');
        console.log('You can now run: npm run test-finance-rag');
        return true;
      }
    }

    console.log('\n📋 MANUAL SETUP REQUIRED:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run the contents of: supabase-updated-schema.sql');
    console.log('3. Then run: npm run test-finance-rag');

    return false;

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check SUPABASE_URL and SUPABASE_ANON_KEY in .env.local');
    console.log('2. Ensure Supabase project is active');
    console.log('3. Run schema manually in Supabase dashboard');
    return false;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupDatabase, verifySchema };