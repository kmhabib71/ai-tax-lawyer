#!/usr/bin/env python3
"""
Migrate to Pinecone - AI Tax Lawyer Bangladesh
Export embeddings from Supabase and import to Pinecone for better vector search
"""

import os
import time
import json
from typing import List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class PineconeMigrator:
    def __init__(self):
        # Initialize Supabase (source)
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        print("🚀 Pinecone Migration Tool")
        print("Export from Supabase → Import to Pinecone")
        print("=" * 50)

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
            
            # Convert to Pinecone format
            pinecone_vectors = []
            for chunk in chunks:
                if chunk.get('embedding'):
                    vector_data = {
                        'id': chunk['chunk_id'],
                        'values': chunk['embedding'],
                        'metadata': {
                            'content': chunk['content'][:1000],  # Pinecone metadata limit
                            'source_document': chunk['source_document'],
                            'document_type': chunk['document_type'],
                            'section': chunk.get('section', ''),
                            'language': chunk['language'],
                            'character_count': chunk['character_count'],
                            'chunk_index': chunk['chunk_index']
                        }
                    }
                    pinecone_vectors.append(vector_data)
            
            print(f"✅ Converted {len(pinecone_vectors)} vectors for Pinecone")
            return pinecone_vectors
            
        except Exception as e:
            print(f"❌ Error exporting from Supabase: {str(e)}")
            return []

    def save_export_file(self, vectors: List[Dict[str, Any]]) -> str:
        """Save vectors to JSON file for manual Pinecone import"""
        filename = 'pinecone-vectors-export.json'
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(vectors, f, ensure_ascii=False, indent=2)
            
            print(f"💾 Saved {len(vectors)} vectors to {filename}")
            return filename
            
        except Exception as e:
            print(f"❌ Error saving export file: {str(e)}")
            return ""

    def create_pinecone_setup_script(self):
        """Create Python script for Pinecone setup"""
        setup_script = '''#!/usr/bin/env python3
"""
Pinecone Setup Script - AI Tax Lawyer Bangladesh
"""

import json
import pinecone
from dotenv import load_dotenv
import os

load_dotenv()

def setup_pinecone():
    """Setup Pinecone index and upload vectors"""
    
    # Initialize Pinecone
    pinecone.init(
        api_key=os.getenv('PINECONE_API_KEY'),
        environment=os.getenv('PINECONE_ENV')  # e.g., 'us-east-1-aws'
    )
    
    # Create index
    index_name = "ai-tax-lawyer"
    
    if index_name not in pinecone.list_indexes():
        pinecone.create_index(
            index_name,
            dimension=1536,
            metric="cosine"
        )
        print(f"✅ Created Pinecone index: {index_name}")
    else:
        print(f"✅ Using existing index: {index_name}")
    
    # Connect to index
    index = pinecone.Index(index_name)
    
    # Load vectors from export file
    with open('pinecone-vectors-export.json', 'r', encoding='utf-8') as f:
        vectors = json.load(f)
    
    print(f"📦 Uploading {len(vectors)} vectors...")
    
    # Upload in batches (Pinecone recommendation)
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i + batch_size]
        index.upsert(vectors=batch)
        print(f"   ✅ Uploaded batch {i//batch_size + 1}/{(len(vectors)-1)//batch_size + 1}")
    
    print(f"🎯 Upload complete! {len(vectors)} vectors in Pinecone")
    
    # Test search
    test_search(index)

def test_search(index):
    """Test vector search"""
    print("\\n🔍 Testing vector search...")
    
    # Get a sample vector for testing
    with open('pinecone-vectors-export.json', 'r', encoding='utf-8') as f:
        vectors = json.load(f)
    
    if vectors:
        sample_vector = vectors[0]['values']
        
        # Search
        results = index.query(
            vector=sample_vector,
            top_k=5,
            include_metadata=True
        )
        
        print(f"✅ Found {len(results['matches'])} similar chunks")
        for i, match in enumerate(results['matches']):
            print(f"   {i+1}. Score: {match['score']:.3f} | {match['metadata']['content'][:100]}...")

def search_documents(query_text: str, top_k: int = 10):
    """Search function for your application"""
    import openai
    
    # Generate embedding for query
    openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=[query_text],
        dimensions=1536
    )
    
    query_embedding = response.data[0].embedding
    
    # Search Pinecone
    index = pinecone.Index("ai-tax-lawyer")
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )
    
    return results['matches']

if __name__ == "__main__":
    setup_pinecone()
'''
        
        with open('setup-pinecone.py', 'w', encoding='utf-8') as f:
            f.write(setup_script)
        
        print("📄 Created setup-pinecone.py")

    def create_env_template(self):
        """Create environment variable template for Pinecone"""
        env_template = '''
# Add these to your .env file for Pinecone migration:

# Pinecone Configuration (get from https://app.pinecone.io/)
PINECONE_API_KEY=your-pinecone-api-key-here
PINECONE_ENV=us-east-1-aws

# Keep existing OpenAI key for embeddings
OPENAI_API_KEY=your-openai-api-key

# Supabase (keep for other data if needed)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
'''
        
        with open('pinecone-env-template.txt', 'w') as f:
            f.write(env_template)
        
        print("📄 Created pinecone-env-template.txt")

def main():
    """Run the migration"""
    migrator = PineconeMigrator()
    
    # Export from Supabase
    vectors = migrator.export_from_supabase()
    
    if not vectors:
        print("❌ No vectors to migrate")
        return
    
    # Save export file
    export_file = migrator.save_export_file(vectors)
    
    if not export_file:
        print("❌ Failed to save export file")
        return
    
    # Create setup scripts
    migrator.create_pinecone_setup_script()
    migrator.create_env_template()
    
    # Instructions
    print("\n🎯 MIGRATION STEPS:")
    print("=" * 40)
    print("1. Sign up for Pinecone free account: https://app.pinecone.io/")
    print("2. Get your API key and environment from Pinecone dashboard")
    print("3. Add Pinecone credentials to your .env file (see pinecone-env-template.txt)")
    print("4. Install Pinecone: pip install pinecone-client")
    print("5. Run: python setup-pinecone.py")
    print("\n✅ Your vectors are ready for migration!")
    
    print(f"\n📊 MIGRATION SUMMARY:")
    print(f"   📦 Vectors exported: {len(vectors)}")
    print(f"   💾 Export file: {export_file}")
    print(f"   🚀 Setup script: setup-pinecone.py")
    print(f"   📝 Env template: pinecone-env-template.txt")

if __name__ == "__main__":
    main()