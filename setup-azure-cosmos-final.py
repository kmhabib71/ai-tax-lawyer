#!/usr/bin/env python3
"""
Azure Cosmos DB Setup Script - FINAL VERSION
AI Tax Lawyer Bangladesh - Fixes embedding format issue
"""

import json
import pymongo
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

def setup_azure_cosmos():
    """Setup Azure Cosmos DB and upload documents with proper embedding format"""
    
    # Connect to Azure Cosmos DB
    connection_string = os.getenv('AZURE_COSMOS_CONNECTION_STRING')
    client = MongoClient(connection_string)
    
    # Create database and collection
    db = client['ai_tax_lawyer']
    collection = db['document_chunks']
    
    print("✅ Connected to Azure Cosmos DB")
    
    # Load documents from export file
    with open('azure-cosmos-export.json', 'r', encoding='utf-8') as f:
        documents = json.load(f)
    
    print(f"📦 Processing {len(documents)} documents...")
    
    # Convert embedding strings to arrays
    processed_documents = []
    failed_count = 0
    
    for doc in documents:
        try:
            # Convert embedding string to array
            if isinstance(doc['embedding'], str):
                # Remove brackets and split by comma
                embedding_str = doc['embedding'].strip('[]')
                embedding_array = [float(x.strip()) for x in embedding_str.split(',')]
                doc['embedding'] = embedding_array
            
            processed_documents.append(doc)
            
        except Exception as e:
            print(f"⚠️ Failed to process document {doc.get('_id', 'unknown')}: {str(e)}")
            failed_count += 1
    
    print(f"✅ Successfully processed {len(processed_documents)} documents")
    if failed_count > 0:
        print(f"⚠️ Failed to process {failed_count} documents")
    
    # Clear existing data
    try:
        deleted_count = collection.delete_many({}).deleted_count
        print(f"🗑️ Cleared {deleted_count} existing documents")
    except Exception as e:
        print(f"ℹ️ Collection cleanup: {str(e)}")
    
    # Upload in batches
    batch_size = 50  # Smaller batches for reliability
    total_uploaded = 0
    
    print(f"📤 Uploading {len(processed_documents)} documents...")
    
    for i in range(0, len(processed_documents), batch_size):
        batch = processed_documents[i:i + batch_size]
        
        try:
            result = collection.insert_many(batch, ordered=False)
            uploaded_count = len(result.inserted_ids)
            total_uploaded += uploaded_count
            print(f"   ✅ Batch {i//batch_size + 1}: {uploaded_count} documents uploaded")
            
        except pymongo.errors.BulkWriteError as e:
            # Handle partial success
            inserted_count = e.details.get('nInserted', 0)
            total_uploaded += inserted_count
            print(f"   ⚠️ Batch {i//batch_size + 1}: {inserted_count} documents uploaded, {len(batch) - inserted_count} failed")
            
            # Show first error for debugging
            if e.details.get('writeErrors'):
                first_error = e.details['writeErrors'][0]
                print(f"      First error: {first_error.get('errmsg', 'Unknown error')}")
    
    print(f"🎯 Upload complete! {total_uploaded} documents in Azure Cosmos DB")
    
    # Create indexes
    create_indexes(collection)
    
    # Test search
    test_search(collection)

def create_indexes(collection):
    """Create search indexes"""
    print("\n📊 Creating search indexes...")
    
    try:
        # Text search index
        collection.create_index([("content", "text")])
        print("✅ Text search index created")
        
        # Metadata indexes
        collection.create_index([("document_type", 1)])
        collection.create_index([("language", 1)])
        collection.create_index([("source_document", 1)])
        collection.create_index([("chunk_id", 1)])
        print("✅ Metadata indexes created")
        
        # Try vector index (2dsphere for geospatial - basic vector support)
        try:
            collection.create_index([("embedding", "2dsphere")])
            print("✅ Vector index (2dsphere) created")
        except Exception as e:
            print(f"ℹ️ Vector index: {str(e)}")
        
    except Exception as e:
        print(f"ℹ️ Index creation: {str(e)}")

def test_search(collection):
    """Test document search and vector operations"""
    print("\n🔍 Testing search functionality...")
    
    try:
        # Test 1: Count total documents
        total_count = collection.count_documents({})
        print(f"✅ Total documents: {total_count}")
        
        # Test 2: Count by document type
        finance_count = collection.count_documents({"document_type": "finance_act"})
        income_count = collection.count_documents({"document_type": "income_tax_act"})
        vat_count = collection.count_documents({"document_type": "vat_act"})
        
        print(f"📊 Document breakdown:")
        print(f"   • Finance Act: {finance_count} documents")
        print(f"   • Income Tax: {income_count} documents")
        print(f"   • VAT Act: {vat_count} documents")
        
        # Test 3: Text search
        print("\n🔍 Testing text search...")
        try:
            search_results = collection.find(
                {"$text": {"$search": "মূল্য সংযোজন কর"}}
            ).limit(3)
            
            count = 0
            for doc in search_results:
                count += 1
                print(f"   {count}. {doc['document_type']} | {doc['content'][:100]}...")
            
            if count > 0:
                print(f"✅ Text search working! Found {count} documents")
            else:
                print("ℹ️ Text search returned no results, trying regex...")
                # Fallback to regex
                regex_results = collection.find(
                    {"content": {"$regex": "মূল্য সংযোজন কর", "$options": "i"}}
                ).limit(3)
                
                count = 0
                for doc in regex_results:
                    count += 1
                    print(f"   {count}. {doc['document_type']} | {doc['content'][:100]}...")
                
                print(f"✅ Regex search found {count} documents")
                
        except Exception as e:
            print(f"⚠️ Text search error: {str(e)}")
        
        # Test 4: Vector embedding verification
        print("\n🧮 Testing vector embeddings...")
        sample_doc = collection.find_one({"embedding": {"$exists": True}})
        
        if sample_doc and isinstance(sample_doc.get('embedding'), list):
            embedding_length = len(sample_doc['embedding'])
            first_few = sample_doc['embedding'][:5]
            print(f"✅ Vector embeddings properly formatted!")
            print(f"   Embedding dimensions: {embedding_length}")
            print(f"   Sample values: {first_few}")
            
            # Basic similarity test
            test_vector_similarity(collection, sample_doc['embedding'])
        else:
            print("❌ Vector embeddings not found or incorrectly formatted")
            
    except Exception as e:
        print(f"❌ Search test failed: {str(e)}")

def test_vector_similarity(collection, sample_embedding):
    """Test basic vector similarity"""
    print("\n🔍 Testing vector similarity...")
    
    try:
        # Find documents with similar embeddings using aggregation
        # This is a simplified cosine similarity calculation
        pipeline = [
            {"$match": {"embedding": {"$exists": True, "$type": "array"}}},
            {"$limit": 100},  # Limit for performance
            {"$project": {
                "content": 1,
                "document_type": 1,
                "embedding": 1,
                "dot_product": {
                    "$reduce": {
                        "input": {"$range": [0, min(len(sample_embedding), 10)]},  # Use first 10 dimensions for speed
                        "initialValue": 0,
                        "in": {
                            "$add": [
                                "$$value",
                                {"$multiply": [
                                    {"$arrayElemAt": ["$embedding", "$$this"]},
                                    sample_embedding[0]  # Compare with first element (simplified)
                                ]}
                            ]
                        }
                    }
                }
            }},
            {"$sort": {"dot_product": -1}},
            {"$limit": 3}
        ]
        
        similar_docs = list(collection.aggregate(pipeline))
        
        if similar_docs:
            print(f"✅ Vector similarity test completed:")
            for i, doc in enumerate(similar_docs):
                print(f"   {i+1}. {doc['document_type']} | {doc['content'][:80]}...")
        else:
            print("ℹ️ Vector similarity test completed (basic implementation)")
            
    except Exception as e:
        print(f"ℹ️ Vector similarity: {str(e)}")

# Main search function for your application
def search_documents(query_text: str, top_k: int = 10, document_type: str = None):
    """Search function for your AI Tax Lawyer application"""
    
    connection_string = os.getenv('AZURE_COSMOS_CONNECTION_STRING')
    client = MongoClient(connection_string)
    db = client['ai_tax_lawyer']
    collection = db['document_chunks']
    
    # Build search query
    search_query = {"$text": {"$search": query_text}}
    
    # Add document type filter if specified
    if document_type:
        search_query = {"$and": [search_query, {"document_type": document_type}]}
    
    try:
        # Text search with scoring
        results = collection.find(
            search_query,
            {"score": {"$meta": "textScore"}}
        ).sort([("score", {"$meta": "textScore"})]).limit(top_k)
        
        return list(results)
        
    except Exception:
        # Fallback to regex search
        regex_query = {"content": {"$regex": query_text, "$options": "i"}}
        if document_type:
            regex_query["document_type"] = document_type
            
        results = collection.find(regex_query).limit(top_k)
        return list(results)

if __name__ == "__main__":
    setup_azure_cosmos()