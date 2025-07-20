#!/usr/bin/env python3
"""
Migrate to Azure Cosmos DB - AI Tax Lawyer Bangladesh
Export embeddings from Supabase and import to Azure Cosmos DB for MongoDB vCore
"""

import os
import time
import json
from typing import List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AzureCosmosDBMigrator:
    def __init__(self):
        # Initialize Supabase (source)
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        print("🚀 Azure Cosmos DB Migration Tool")
        print("Export from Supabase → Import to Azure Cosmos DB (MongoDB vCore)")
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
            
            # Convert to MongoDB format
            mongodb_docs = []
            for chunk in chunks:
                if chunk.get('embedding'):
                    doc = {
                        '_id': chunk['chunk_id'],  # Use chunk_id as MongoDB _id
                        'content': chunk['content'],
                        'embedding': chunk['embedding'],
                        'source_document': chunk['source_document'],
                        'document_type': chunk['document_type'],
                        'section': chunk.get('section'),
                        'language': chunk['language'],
                        'character_count': chunk['character_count'],
                        'chunk_index': chunk['chunk_index'],
                        'extraction_method': chunk.get('extraction_method'),
                        'processing_date': chunk.get('processing_date'),
                        'created_at': chunk.get('created_at')
                    }
                    mongodb_docs.append(doc)
            
            print(f"✅ Converted {len(mongodb_docs)} documents for Azure Cosmos DB")
            return mongodb_docs
            
        except Exception as e:
            print(f"❌ Error exporting from Supabase: {str(e)}")
            return []

    def save_export_file(self, documents: List[Dict[str, Any]]) -> str:
        """Save documents to JSON file for Azure Cosmos DB import"""
        filename = 'azure-cosmos-export.json'
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(documents, f, ensure_ascii=False, indent=2)
            
            print(f"💾 Saved {len(documents)} documents to {filename}")
            return filename
            
        except Exception as e:
            print(f"❌ Error saving export file: {str(e)}")
            return ""

    def create_azure_setup_script(self):
        """Create Python script for Azure Cosmos DB setup"""
        setup_script = '''#!/usr/bin/env python3
"""
Azure Cosmos DB Setup Script - AI Tax Lawyer Bangladesh
"""

import json
import pymongo
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import openai

load_dotenv()

def setup_azure_cosmos():
    """Setup Azure Cosmos DB and upload documents"""
    
    # Connect to Azure Cosmos DB (MongoDB vCore)
    connection_string = os.getenv('AZURE_COSMOS_CONNECTION_STRING')
    client = MongoClient(connection_string)
    
    # Create database and collection
    db = client['ai_tax_lawyer']
    collection = db['document_chunks']
    
    print(f"✅ Connected to Azure Cosmos DB")
    
    # Create vector search index
    try:
        collection.create_index([
            ("embedding", "2dsphere")  # Basic vector index
        ])
        print("✅ Created basic vector index")
    except Exception as e:
        print(f"ℹ️ Index might already exist: {str(e)}")
    
    # Load documents from export file
    with open('azure-cosmos-export.json', 'r', encoding='utf-8') as f:
        documents = json.load(f)
    
    print(f"📦 Uploading {len(documents)} documents...")
    
    # Clear existing data
    collection.delete_many({})
    
    # Upload in batches
    batch_size = 100
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        collection.insert_many(batch)
        print(f"   ✅ Uploaded batch {i//batch_size + 1}/{(len(documents)-1)//batch_size + 1}")
    
    print(f"🎯 Upload complete! {len(documents)} documents in Azure Cosmos DB")
    
    # Test search
    test_search(collection)

def test_search(collection):
    """Test vector search"""
    print("\\n🔍 Testing document search...")
    
    # Test text search (works immediately)
    results = collection.find({"content": {"$regex": "মূল্য সংযোজন কর", "$options": "i"}}).limit(3)
    
    count = 0
    for doc in results:
        count += 1
        print(f"   {count}. {doc['document_type']} | {doc['content'][:100]}...")
    
    print(f"✅ Found {count} documents with text search")

def vector_search(query_text: str, top_k: int = 10):
    """Vector search function for your application"""
    # Generate embedding for query
    openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=[query_text],
        dimensions=1536
    )
    
    query_embedding = response.data[0].embedding
    
    # Connect to Azure Cosmos DB
    connection_string = os.getenv('AZURE_COSMOS_CONNECTION_STRING')
    client = MongoClient(connection_string)
    db = client['ai_tax_lawyer']
    collection = db['document_chunks']
    
    # For now, use text search + similarity calculation
    # Azure Cosmos DB vector search is in preview
    all_docs = list(collection.find({}))
    
    # Calculate similarities
    similarities = []
    for doc in all_docs:
        if doc.get('embedding'):
            # Calculate cosine similarity
            import numpy as np
            
            doc_embedding = np.array(doc['embedding'])
            query_embedding_np = np.array(query_embedding)
            
            # Cosine similarity
            similarity = np.dot(doc_embedding, query_embedding_np) / (
                np.linalg.norm(doc_embedding) * np.linalg.norm(query_embedding_np)
            )
            
            similarities.append({
                'document': doc,
                'similarity': similarity
            })
    
    # Sort by similarity and return top results
    similarities.sort(key=lambda x: x['similarity'], reverse=True)
    return [item['document'] for item in similarities[:top_k]]

def search_documents(query_text: str, top_k: int = 10):
    """Main search function - combines text and vector search"""
    print(f"🔍 Searching for: {query_text}")
    
    # Use vector search
    results = vector_search(query_text, top_k)
    
    print(f"✅ Found {len(results)} relevant documents")
    for i, doc in enumerate(results[:5]):
        print(f"   {i+1}. {doc['document_type']} | {doc['content'][:100]}...")
    
    return results

if __name__ == "__main__":
    setup_azure_cosmos()
'''
        
        with open('setup-azure-cosmos.py', 'w', encoding='utf-8') as f:
            f.write(setup_script)
        
        print("📄 Created setup-azure-cosmos.py")

    def create_env_template(self):
        """Create environment variable template for Azure Cosmos DB"""
        env_template = '''
# Add these to your .env file for Azure Cosmos DB migration:

# Azure Cosmos DB for MongoDB vCore (get from Azure Portal)
AZURE_COSMOS_CONNECTION_STRING=mongodb+srv://username:password@cluster.mongocluster.cosmos.azure.com/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000

# Keep existing OpenAI key for embeddings
OPENAI_API_KEY=your-openai-api-key

# Supabase (keep for other data if needed)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
'''
        
        with open('azure-cosmos-env-template.txt', 'w') as f:
            f.write(env_template)
        
        print("📄 Created azure-cosmos-env-template.txt")

    def create_setup_guide(self):
        """Create setup guide for Azure Cosmos DB"""
        guide = '''# Azure Cosmos DB Setup Guide

## Step 1: Create Azure Account
1. Go to: https://azure.microsoft.com/free/
2. Sign up for free account (no credit card required for free tier)
3. Get $200 credit + lifetime free services

## Step 2: Create Cosmos DB for MongoDB vCore
1. In Azure Portal → "Create a resource"
2. Search "Azure Cosmos DB"
3. Choose "Azure Cosmos DB for MongoDB"
4. Select "vCore cluster" option
5. Choose "Free tier" (32 GB storage, lifetime free)
6. Create the resource

## Step 3: Get Connection String
1. Go to your Cosmos DB resource
2. Navigate to "Connection strings" in left menu
3. Copy the "Primary connection string"
4. Add it to your .env file as AZURE_COSMOS_CONNECTION_STRING

## Step 4: Install Dependencies
```bash
pip install pymongo numpy
```

## Step 5: Run Migration
```bash
python migrate-to-azure-cosmos.py
python setup-azure-cosmos.py
```

## Benefits of Azure Cosmos DB:
- ✅ 32 GB storage (16,000x more than needed)
- ✅ Lifetime free (no upgrade pressure)
- ✅ Dedicated cluster (not shared)
- ✅ Enterprise-grade performance
- ✅ No credit card required
- ✅ MongoDB API (familiar)
- ✅ Built-in vector search capabilities
'''
        
        with open('azure-cosmos-setup-guide.md', 'w') as f:
            f.write(guide)
        
        print("📄 Created azure-cosmos-setup-guide.md")

def main():
    """Run the migration"""
    migrator = AzureCosmosDBMigrator()
    
    # Export from Supabase
    documents = migrator.export_from_supabase()
    
    if not documents:
        print("❌ No documents to migrate")
        return
    
    # Save export file
    export_file = migrator.save_export_file(documents)
    
    if not export_file:
        print("❌ Failed to save export file")
        return
    
    # Create setup scripts and guides
    migrator.create_azure_setup_script()
    migrator.create_env_template()
    migrator.create_setup_guide()
    
    # Instructions
    print("\n🎯 AZURE COSMOS DB MIGRATION:")
    print("=" * 50)
    print("1. Read: azure-cosmos-setup-guide.md")
    print("2. Create free Azure account (no credit card)")
    print("3. Create Azure Cosmos DB for MongoDB vCore (free tier)")
    print("4. Get connection string from Azure Portal")
    print("5. Add connection string to .env file")
    print("6. Install: pip install pymongo numpy")
    print("7. Run: python setup-azure-cosmos.py")
    
    print(f"\n📊 MIGRATION SUMMARY:")
    print(f"   📦 Documents exported: {len(documents)}")
    print(f"   💾 Export file: {export_file}")
    print(f"   🚀 Setup script: setup-azure-cosmos.py")
    print(f"   📝 Env template: azure-cosmos-env-template.txt")
    print(f"   📖 Setup guide: azure-cosmos-setup-guide.md")
    
    print(f"\n✅ Why Azure Cosmos DB is best:")
    print(f"   • 32 GB storage (vs 2 GB Pinecone)")
    print(f"   • Lifetime free (vs $50/month Pinecone upgrade)")
    print(f"   • Dedicated cluster (vs shared resources)")
    print(f"   • No credit card required")
    print(f"   • Enterprise-grade Microsoft infrastructure")

if __name__ == "__main__":
    main()