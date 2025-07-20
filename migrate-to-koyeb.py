#!/usr/bin/env python3
"""
Migrate to Koyeb PostgreSQL - AI Tax Lawyer Bangladesh
Export embeddings from Supabase and import to Koyeb PostgreSQL with pgvector
"""

import os
import json
import psycopg2
from typing import List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class KoyebMigrator:
    def __init__(self):
        # Initialize Supabase (source)
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        print("🚀 Koyeb PostgreSQL Migration Tool")
        print("Export from Supabase → Import to Koyeb PostgreSQL + pgvector")
        print("=" * 60)

    def export_from_supabase(self) -> List[Dict[str, Any]]:
        """Export all embeddings from Supabase"""
        print("\n📤 Exporting from Supabase...")
        
        try:
            # Get all chunks with embeddings
            result = self.supabase.table('document_chunks').select('*').execute()
            
            if not result.data:
                print("❌ No data found in Supabase")
                return []
            
            chunks = result.data
            print(f"✅ Exported {len(chunks)} chunks from Supabase")
            return chunks
            
        except Exception as e:
            print(f"❌ Error exporting from Supabase: {str(e)}")
            return []

    def save_export_file(self, chunks: List[Dict[str, Any]]) -> str:
        """Save chunks to JSON file for Koyeb import"""
        filename = 'koyeb-postgresql-export.json'
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(chunks, f, ensure_ascii=False, indent=2)
            
            print(f"💾 Saved {len(chunks)} chunks to {filename}")
            return filename
            
        except Exception as e:
            print(f"❌ Error saving export file: {str(e)}")
            return ""

    def create_koyeb_setup_script(self):
        """Create Python script for Koyeb PostgreSQL setup"""
        setup_script = '''#!/usr/bin/env python3
"""
Koyeb PostgreSQL Setup Script - AI Tax Lawyer Bangladesh
"""

import json
import psycopg2
import psycopg2.extras
import numpy as np
from dotenv import load_dotenv
import os
import openai

load_dotenv()

def setup_koyeb_postgresql():
    """Setup Koyeb PostgreSQL with pgvector and upload documents"""
    
    # Connect to Koyeb PostgreSQL
    conn = psycopg2.connect(
        host=os.getenv('KOYEB_DB_HOST'),
        database=os.getenv('KOYEB_DB_NAME'),
        user=os.getenv('KOYEB_DB_USER'),
        password=os.getenv('KOYEB_DB_PASSWORD'),
        port=os.getenv('KOYEB_DB_PORT', 5432)
    )
    
    cur = conn.cursor()
    print(f"✅ Connected to Koyeb PostgreSQL")
    
    # Enable pgvector extension
    try:
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        conn.commit()
        print("✅ pgvector extension enabled")
    except Exception as e:
        print(f"ℹ️ pgvector might already be enabled: {str(e)}")
    
    # Create table with vector column
    cur.execute("""
        CREATE TABLE IF NOT EXISTS document_chunks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            content TEXT NOT NULL,
            embedding VECTOR(1536),
            source_document TEXT,
            document_type TEXT,
            chunk_index INTEGER,
            section TEXT,
            language TEXT,
            character_count INTEGER,
            chunk_id TEXT UNIQUE,
            extraction_method TEXT,
            processing_date TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    conn.commit()
    print("✅ Created document_chunks table")
    
    # Create vector index (this should work on Koyeb with 1GB RAM)
    try:
        cur.execute("""
            CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
            ON document_chunks USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 50);
        """)
        conn.commit()
        print("✅ Created vector index successfully!")
    except Exception as e:
        print(f"⚠️ Vector index creation failed: {str(e)}")
        print("Vector search will still work, just slower")
    
    # Create other indexes
    cur.execute("""
        CREATE INDEX IF NOT EXISTS document_chunks_source_idx ON document_chunks(source_document);
        CREATE INDEX IF NOT EXISTS document_chunks_type_idx ON document_chunks(document_type);
        CREATE INDEX IF NOT EXISTS document_chunks_language_idx ON document_chunks(language);
        CREATE INDEX IF NOT EXISTS document_chunks_chunk_id_idx ON document_chunks(chunk_id);
    """)
    conn.commit()
    print("✅ Created additional indexes")
    
    # Load documents from export file
    with open('koyeb-postgresql-export.json', 'r', encoding='utf-8') as f:
        chunks = json.load(f)
    
    print(f"📦 Uploading {len(chunks)} documents...")
    
    # Clear existing data
    cur.execute("TRUNCATE TABLE document_chunks;")
    conn.commit()
    
    # Upload in batches
    batch_size = 50
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        
        for chunk in batch:
            try:
                cur.execute("""
                    INSERT INTO document_chunks (
                        content, embedding, source_document, document_type,
                        chunk_index, section, language, character_count,
                        chunk_id, extraction_method, processing_date
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    chunk['content'],
                    chunk['embedding'],
                    chunk['source_document'],
                    chunk['document_type'],
                    chunk['chunk_index'],
                    chunk.get('section'),
                    chunk['language'],
                    chunk['character_count'],
                    chunk['chunk_id'],
                    chunk.get('extraction_method'),
                    chunk.get('processing_date')
                ))
            except Exception as e:
                print(f"   ⚠️ Skipped chunk {chunk.get('chunk_id')}: {str(e)}")
        
        conn.commit()
        print(f"   ✅ Uploaded batch {i//batch_size + 1}/{(len(chunks)-1)//batch_size + 1}")
    
    print(f"🎯 Upload complete!")
    
    # Test search
    test_search(cur)
    
    cur.close()
    conn.close()

def test_search(cursor):
    """Test vector search"""
    print("\\n🔍 Testing vector search...")
    
    # Get total count
    cursor.execute("SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;")
    count = cursor.fetchone()[0]
    print(f"✅ {count} documents with embeddings")
    
    # Test similarity search with a sample vector
    cursor.execute("SELECT embedding FROM document_chunks WHERE embedding IS NOT NULL LIMIT 1;")
    sample_embedding = cursor.fetchone()[0]
    
    if sample_embedding:
        cursor.execute("""
            SELECT chunk_id, content, document_type,
                   1 - (embedding <=> %s) AS similarity
            FROM document_chunks 
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> %s
            LIMIT 5;
        """, (sample_embedding, sample_embedding))
        
        results = cursor.fetchall()
        print(f"✅ Found {len(results)} similar documents:")
        for i, (chunk_id, content, doc_type, similarity) in enumerate(results):
            print(f"   {i+1}. {doc_type} | Sim: {similarity:.3f} | {content[:80]}...")

def vector_search(query_text: str, top_k: int = 10, document_type: str = None):
    """Vector search function for your application"""
    # Generate embedding for query
    openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=[query_text],
        dimensions=1536
    )
    
    query_embedding = response.data[0].embedding
    
    # Connect to Koyeb PostgreSQL
    conn = psycopg2.connect(
        host=os.getenv('KOYEB_DB_HOST'),
        database=os.getenv('KOYEB_DB_NAME'),
        user=os.getenv('KOYEB_DB_USER'),
        password=os.getenv('KOYEB_DB_PASSWORD'),
        port=os.getenv('KOYEB_DB_PORT', 5432)
    )
    
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Build query with optional document type filter
    if document_type:
        cur.execute("""
            SELECT id, content, source_document, document_type, section, language,
                   chunk_id, 1 - (embedding <=> %s) AS similarity
            FROM document_chunks 
            WHERE embedding IS NOT NULL AND document_type = %s
            ORDER BY embedding <=> %s
            LIMIT %s;
        """, (query_embedding, document_type, query_embedding, top_k))
    else:
        cur.execute("""
            SELECT id, content, source_document, document_type, section, language,
                   chunk_id, 1 - (embedding <=> %s) AS similarity
            FROM document_chunks 
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> %s
            LIMIT %s;
        """, (query_embedding, query_embedding, top_k))
    
    results = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return [dict(row) for row in results]

def search_documents(query_text: str, top_k: int = 10, document_type: str = None):
    """Main search function for your AI Tax Lawyer application"""
    print(f"🔍 Searching for: {query_text}")
    
    results = vector_search(query_text, top_k, document_type)
    
    print(f"✅ Found {len(results)} relevant documents")
    for i, doc in enumerate(results[:5]):
        print(f"   {i+1}. {doc['document_type']} | Sim: {doc['similarity']:.3f} | {doc['content'][:80]}...")
    
    return results

if __name__ == "__main__":
    setup_koyeb_postgresql()
'''
        
        with open('setup-koyeb-postgresql.py', 'w', encoding='utf-8') as f:
            f.write(setup_script)
        
        print("📄 Created setup-koyeb-postgresql.py")

    def create_env_template(self):
        """Create environment variable template for Koyeb PostgreSQL"""
        env_template = '''
# Add these to your .env file for Koyeb PostgreSQL migration:

# Koyeb PostgreSQL Database (get from Koyeb dashboard)
KOYEB_DB_HOST=your-database-host.koyeb.app
KOYEB_DB_NAME=your-database-name
KOYEB_DB_USER=your-database-user
KOYEB_DB_PASSWORD=your-database-password
KOYEB_DB_PORT=5432

# Keep existing OpenAI key for embeddings
OPENAI_API_KEY=your-openai-api-key

# Supabase (keep for other data if needed)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
'''
        
        with open('koyeb-env-template.txt', 'w') as f:
            f.write(env_template)
        
        print("📄 Created koyeb-env-template.txt")

    def create_setup_guide(self):
        """Create setup guide for Koyeb PostgreSQL"""
        guide = '''# Koyeb PostgreSQL Setup Guide

## Step 1: Create Koyeb Account
1. Go to: https://app.koyeb.com/
2. Sign up for free account
3. No credit card required for free tier

## Step 2: Create PostgreSQL Database
1. In Koyeb dashboard → "Create Service"
2. Choose "Database"
3. Select "PostgreSQL"
4. Choose free tier: 1 GB RAM, 0.25 CPU, 50 hours/month
5. Enable pgvector extension (check the box)
6. Create the database

## Step 3: Get Connection Details
1. Go to your database service in Koyeb
2. Navigate to "Settings" → "Environment"
3. Copy the connection details:
   - KOYEB_DB_HOST
   - KOYEB_DB_NAME
   - KOYEB_DB_USER
   - KOYEB_DB_PASSWORD
4. Add them to your .env file

## Step 4: Install Dependencies
```bash
pip install psycopg2-binary numpy
```

## Step 5: Run Migration
```bash
python migrate-to-koyeb.py
python setup-koyeb-postgresql.py
```

## Benefits of Koyeb PostgreSQL:
- ✅ 1 GB RAM (can handle vector indexes)
- ✅ Full pgvector support (unlike Supabase limitations)
- ✅ 50 hours/month (auto-sleeps to save resources)
- ✅ True PostgreSQL (no vendor lock-in)
- ✅ No existing account restrictions
- ✅ One-click database setup
- ✅ Built-in pgvector extension

## Usage in Your Application:
```python
from setup_koyeb_postgresql import search_documents

# Search all documents
results = search_documents("মূল্য সংযোজন কর", top_k=10)

# Search specific document type
results = search_documents("ভ্যাট হার", top_k=5, document_type="vat_act")
```
'''
        
        with open('koyeb-setup-guide.md', 'w') as f:
            f.write(guide)
        
        print("📄 Created koyeb-setup-guide.md")

def main():
    """Run the migration"""
    migrator = KoyebMigrator()
    
    # Export from Supabase
    chunks = migrator.export_from_supabase()
    
    if not chunks:
        print("❌ No chunks to migrate")
        return
    
    # Save export file
    export_file = migrator.save_export_file(chunks)
    
    if not export_file:
        print("❌ Failed to save export file")
        return
    
    # Create setup scripts and guides
    migrator.create_koyeb_setup_script()
    migrator.create_env_template()
    migrator.create_setup_guide()
    
    # Instructions
    print("\n🎯 KOYEB POSTGRESQL MIGRATION:")
    print("=" * 50)
    print("1. Read: koyeb-setup-guide.md")
    print("2. Create free Koyeb account at app.koyeb.com")
    print("3. Create PostgreSQL database with pgvector")
    print("4. Get connection details from Koyeb dashboard")
    print("5. Add connection details to .env file")
    print("6. Install: pip install psycopg2-binary numpy")
    print("7. Run: python setup-koyeb-postgresql.py")
    
    print(f"\n📊 MIGRATION SUMMARY:")
    print(f"   📦 Chunks exported: {len(chunks)}")
    print(f"   💾 Export file: {export_file}")
    print(f"   🚀 Setup script: setup-koyeb-postgresql.py")
    print(f"   📝 Env template: koyeb-env-template.txt")
    print(f"   📖 Setup guide: koyeb-setup-guide.md")
    
    print(f"\n✅ Why Koyeb PostgreSQL is perfect:")
    print(f"   • 1 GB RAM (vs Supabase's 32MB limit)")
    print(f"   • Full pgvector support")
    print(f"   • No existing account restrictions")
    print(f"   • 50 hours/month free")
    print(f"   • True PostgreSQL (no vendor lock-in)")
    print(f"   • Auto-sleep saves resources")

if __name__ == "__main__":
    main()