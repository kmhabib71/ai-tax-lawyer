#!/usr/bin/env python3
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
    print("\n🔍 Testing document search...")
    
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
