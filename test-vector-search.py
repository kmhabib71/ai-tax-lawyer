#!/usr/bin/env python3
"""
Test MongoDB Atlas Vector Search - AI Tax Lawyer Bangladesh
Run AFTER creating the vector search index in Atlas UI
"""

import os
from pymongo import MongoClient
from dotenv import load_dotenv
import openai

load_dotenv()

def test_atlas_vector_search():
    """Test Atlas Vector Search functionality"""
    
    print("🔍 TESTING MONGODB ATLAS VECTOR SEARCH")
    print("=" * 50)
    
    # Connect to MongoDB Atlas
    connection_string = os.getenv('MONGODB_URI')
    client = MongoClient(connection_string)
    db = client['ai_tax_lawyer']
    collection = db['document_chunks']
    
    # Test 1: Check if documents are there
    total_docs = collection.count_documents({})
    print(f"✅ Total documents: {total_docs}")
    
    # Test 2: Generate query embedding
    print("\n🧮 Generating query embedding...")
    query_text = "মূল্য সংযোজন কর হার কত?"
    
    try:
        openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=[query_text],
            dimensions=1536
        )
        query_embedding = response.data[0].embedding
        print(f"✅ Query embedding generated: {len(query_embedding)} dimensions")
        
    except Exception as e:
        print(f"❌ Failed to generate embedding: {str(e)}")
        return
    
    # Test 3: Atlas Vector Search
    print(f"\n🔍 Testing Atlas Vector Search for: '{query_text}'")
    
    try:
        # Atlas Vector Search pipeline
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": 100,
                    "limit": 5
                }
            },
            {
                "$addFields": {
                    "score": {"$meta": "vectorSearchScore"}
                }
            },
            {
                "$project": {
                    "content": 1,
                    "document_type": 1,
                    "source_document": 1,
                    "language": 1,
                    "score": 1
                }
            }
        ]
        
        results = list(collection.aggregate(pipeline))
        
        if results:
            print(f"🎯 Found {len(results)} results using Atlas Vector Search:")
            for i, doc in enumerate(results):
                score = doc.get('score', 0)
                content = doc['content'][:150]
                doc_type = doc['document_type']
                print(f"\n   {i+1}. Score: {score:.4f} | Type: {doc_type}")
                print(f"      Content: {content}...")
            
            print(f"\n✅ ATLAS VECTOR SEARCH IS WORKING PERFECTLY!")
            
        else:
            print("❌ No results found. Check if 'vector_index' is created and ready in Atlas UI")
            
    except Exception as e:
        print(f"❌ Vector search failed: {str(e)}")
        print("🔧 Make sure you've created the 'vector_index' in MongoDB Atlas UI!")
        return
    
    # Test 4: Test with different document types
    print(f"\n🎯 Testing filtered search (Finance Act only)...")
    
    try:
        filtered_pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index", 
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": 50,
                    "limit": 3,
                    "filter": {
                        "document_type": {"$eq": "finance_act"}
                    }
                }
            },
            {
                "$addFields": {
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]
        
        filtered_results = list(collection.aggregate(filtered_pipeline))
        
        if filtered_results:
            print(f"✅ Filtered search found {len(filtered_results)} Finance Act results:")
            for i, doc in enumerate(filtered_results):
                score = doc.get('score', 0)
                content = doc['content'][:100]
                print(f"   {i+1}. Score: {score:.4f} | {content}...")
        else:
            print("ℹ️ No filtered results (index might still be building)")
            
    except Exception as e:
        print(f"ℹ️ Filtered search: {str(e)}")
    
    print(f"\n🎉 VECTOR SEARCH TEST COMPLETE!")
    print(f"✅ MongoDB Atlas is ready for production vector search!")

def demo_search_functions():
    """Demo the search functions for your app"""
    
    print(f"\n📚 SEARCH FUNCTIONS FOR YOUR AI TAX LAWYER APP:")
    print("=" * 55)
    
    # Sample usage
    sample_queries = [
        "মূল্য সংযোজন কর হার",
        "আয়কর অব্যাহতি নিয়ম", 
        "ভ্যাট নিবন্ধন প্রক্রিয়া"
    ]
    
    for query in sample_queries:
        print(f"\n🔍 Query: '{query}'")
        print(f"   → Use: vector_search_with_openai('{query}', top_k=5)")
        print(f"   → Or: hybrid_search('{query}', top_k=10)")

# Production search functions
def vector_search_with_openai(query_text: str, top_k: int = 10, document_type: str = None):
    """
    Complete vector search with OpenAI embedding generation
    Use this in your AI Tax Lawyer application
    """
    
    # Generate embedding for query
    openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=[query_text],
        dimensions=1536
    )
    query_embedding = response.data[0].embedding
    
    # Connect to MongoDB Atlas
    connection_string = os.getenv('MONGODB_URI')
    client = MongoClient(connection_string)
    db = client['ai_tax_lawyer']
    collection = db['document_chunks']
    
    # Build vector search pipeline
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding", 
                "queryVector": query_embedding,
                "numCandidates": top_k * 10,
                "limit": top_k
            }
        },
        {
            "$addFields": {
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ]
    
    # Add document type filter if specified
    if document_type:
        pipeline[0]["$vectorSearch"]["filter"] = {
            "document_type": {"$eq": document_type}
        }
    
    # Execute search
    results = list(collection.aggregate(pipeline))
    return results

def hybrid_search(query_text: str, top_k: int = 10):
    """
    Hybrid search combining vector and text search
    Best of both worlds for your AI Tax Lawyer
    """
    
    # Vector search
    vector_results = vector_search_with_openai(query_text, top_k//2)
    
    # Text search fallback
    connection_string = os.getenv('MONGODB_URI')
    client = MongoClient(connection_string)
    db = client['ai_tax_lawyer']
    collection = db['document_chunks']
    
    # Simple text search
    text_results = list(collection.find(
        {"content": {"$regex": query_text, "$options": "i"}}
    ).limit(top_k//2))
    
    # Combine results (remove duplicates)
    combined_results = vector_results + text_results
    seen_ids = set()
    unique_results = []
    
    for doc in combined_results:
        doc_id = doc.get('_id')
        if doc_id not in seen_ids:
            seen_ids.add(doc_id)
            unique_results.append(doc)
    
    return unique_results[:top_k]

if __name__ == "__main__":
    test_atlas_vector_search()
    demo_search_functions()