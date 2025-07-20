#!/usr/bin/env python3
"""
Create Vector Search Index Programmatically - AI Tax Lawyer Bangladesh
Alternative method if Atlas UI is giving issues
"""

import requests
import json
import os
from dotenv import load_dotenv
import base64

load_dotenv()

def create_vector_index_via_api():
    """Create vector search index using MongoDB Atlas Admin API"""
    
    print("🔧 CREATING VECTOR SEARCH INDEX VIA API")
    print("=" * 50)
    
    # You'll need these from Atlas → Access Manager → API Keys
    print("❌ This method requires Atlas API keys")
    print("📋 Easier to use Atlas UI with correct JSON format:")
    print()
    
    print("🎯 CORRECT JSON FOR ATLAS UI (JSON Editor):")
    print("-" * 45)
    
    vector_index_config = {
        "mappings": {
            "dynamic": True,
            "fields": {
                "embedding": {
                    "type": "knnVector",
                    "dimensions": 1536,
                    "similarity": "cosine"
                },
                "document_type": {
                    "type": "token"
                },
                "language": {
                    "type": "token"
                }
            }
        }
    }
    
    print(json.dumps(vector_index_config, indent=2))
    print()
    
    print("📋 STEPS:")
    print("1. Go to Atlas UI → Your cluster → Search")
    print("2. Create Search Index → Atlas Vector Search")
    print("3. Database: ai_tax_lawyer")
    print("4. Collection: document_chunks")
    print("5. Index Name: vector_index")
    print("6. Switch to 'JSON Editor'")
    print("7. Paste the JSON above")
    print("8. Create Index")
    print()
    
    print("⏳ Index creation takes 2-5 minutes")
    print("✅ After creation, run: python3 test-vector-search.py")

def check_existing_indexes():
    """Check what indexes already exist"""
    from pymongo import MongoClient
    
    print("\n🔍 CHECKING EXISTING INDEXES:")
    print("-" * 35)
    
    try:
        connection_string = os.getenv('MONGODB_URI')
        client = MongoClient(connection_string)
        db = client['ai_tax_lawyer']
        collection = db['document_chunks']
        
        indexes = collection.list_indexes()
        print("📊 Current indexes:")
        
        for i, index in enumerate(indexes):
            print(f"   {i+1}. {index['name']}")
            if 'key' in index:
                print(f"      Keys: {index['key']}")
        
        # Check if documents have embeddings
        sample_doc = collection.find_one({"embedding": {"$exists": True}})
        if sample_doc:
            print(f"\n✅ Documents ready: {len(sample_doc['embedding'])} dimensions")
        else:
            print(f"\n❌ No documents with embeddings found")
            
    except Exception as e:
        print(f"❌ Error checking indexes: {str(e)}")

def test_basic_search_without_vector_index():
    """Test search functionality without vector index"""
    from pymongo import MongoClient
    
    print("\n🔍 TESTING BASIC SEARCH (NO VECTOR INDEX):")
    print("-" * 45)
    
    try:
        connection_string = os.getenv('MONGODB_URI')
        client = MongoClient(connection_string)
        db = client['ai_tax_lawyer']
        collection = db['document_chunks']
        
        # Test text search
        search_term = "মূল্য সংযোজন কর"
        results = collection.find(
            {"content": {"$regex": search_term, "$options": "i"}}
        ).limit(3)
        
        count = 0
        for doc in results:
            count += 1
            print(f"   {count}. {doc['document_type']} | {doc['content'][:100]}...")
        
        print(f"✅ Basic text search found {count} documents")
        print("ℹ️ This works without vector index!")
        
    except Exception as e:
        print(f"❌ Basic search failed: {str(e)}")

if __name__ == "__main__":
    create_vector_index_via_api()
    check_existing_indexes()
    test_basic_search_without_vector_index()