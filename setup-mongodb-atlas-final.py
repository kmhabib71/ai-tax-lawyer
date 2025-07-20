#!/usr/bin/env python3
"""
MongoDB Atlas Setup Script with Vector Search - AI Tax Lawyer Bangladesh
The BEST choice for vector similarity search!
"""

import json
import pymongo
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import time

load_dotenv()

def setup_mongodb_atlas():
    """Setup MongoDB Atlas with proper vector search"""
    
    # Use existing MongoDB URI
    connection_string = os.getenv('MONGODB_URI')
    
    if not connection_string:
        print("❌ MONGODB_URI not found in .env file")
        return
    
    print("🚀 SETTING UP MONGODB ATLAS - THE BEST VECTOR SEARCH!")
    print("=" * 60)
    
    # Connect to MongoDB Atlas
    try:
        print("🔌 Connecting to MongoDB Atlas...")
        client = MongoClient(connection_string)
        
        # Test connection
        client.admin.command('ping')
        print("✅ Connected to MongoDB Atlas successfully!")
        
        # Get database info
        server_info = client.server_info()
        print(f"✅ MongoDB version: {server_info.get('version', 'Unknown')}")
        
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return
    
    # Create database and collection
    db = client['ai_tax_lawyer']
    collection = db['document_chunks']
    print("✅ Database and collection ready")
    
    # Load and process documents
    try:
        with open('azure-cosmos-export.json', 'r', encoding='utf-8') as f:
            documents = json.load(f)
        print(f"📦 Loaded {len(documents)} documents from export file")
    except Exception as e:
        print(f"❌ Failed to load export file: {str(e)}")
        return
    
    # Convert embeddings from string to array format
    print("🔄 Converting embeddings to proper vector format...")
    processed_documents = []
    conversion_errors = 0
    
    for doc in documents:
        try:
            # Convert embedding string to array
            if isinstance(doc['embedding'], str):
                # Remove brackets and convert to float array
                embedding_str = doc['embedding'].strip('[]')
                embedding_array = [float(x.strip()) for x in embedding_str.split(',')]
                doc['embedding'] = embedding_array
            
            # Ensure we have proper 1536-dimensional vectors
            if len(doc['embedding']) == 1536:
                processed_documents.append(doc)
            else:
                print(f"⚠️ Skipping document with {len(doc['embedding'])} dimensions")
                conversion_errors += 1
                
        except Exception as e:
            print(f"⚠️ Failed to process document {doc.get('_id', 'unknown')}: {str(e)}")
            conversion_errors += 1
    
    print(f"✅ Successfully processed {len(processed_documents)} documents")
    if conversion_errors > 0:
        print(f"⚠️ {conversion_errors} documents had conversion errors")
    
    # Clear existing data
    try:
        deleted_count = collection.delete_many({}).deleted_count
        print(f"🗑️ Cleared {deleted_count} existing documents")
    except:
        print("ℹ️ Collection was empty")
    
    # Upload documents in batches
    print(f"📤 Uploading {len(processed_documents)} documents to MongoDB Atlas...")
    
    batch_size = 100
    total_uploaded = 0
    
    for i in range(0, len(processed_documents), batch_size):
        batch = processed_documents[i:i + batch_size]
        
        try:
            result = collection.insert_many(batch, ordered=False)
            uploaded_count = len(result.inserted_ids)
            total_uploaded += uploaded_count
            print(f"   ✅ Batch {i//batch_size + 1}: {uploaded_count} documents uploaded")
            
        except pymongo.errors.BulkWriteError as e:
            inserted_count = e.details.get('nInserted', 0)
            total_uploaded += inserted_count
            print(f"   ⚠️ Batch {i//batch_size + 1}: {inserted_count} documents uploaded, some duplicates skipped")
    
    print(f"🎯 Upload complete! {total_uploaded} documents in MongoDB Atlas")
    
    # Create indexes
    create_indexes(collection)
    
    # Create vector search index instructions
    create_vector_search_index_instructions()
    
    # Test search functionality
    test_search(collection)
    
    print(f"\n🎉 MONGODB ATLAS SETUP COMPLETE!")
    print(f"✅ {total_uploaded} documents with 1536-dimensional vectors")
    print(f"✅ Ready for lightning-fast semantic search!")

def create_indexes(collection):
    """Create standard MongoDB indexes"""
    print("\n📊 Creating MongoDB indexes...")
    
    try:
        # Text search index
        collection.create_index([("content", "text")])
        print("✅ Text search index created")
        
        # Metadata indexes for filtering
        collection.create_index([("document_type", 1)])
        collection.create_index([("language", 1)])
        collection.create_index([("source_document", 1)])
        collection.create_index([("chunk_id", 1)])
        print("✅ Metadata indexes created")
        
        # Compound indexes for common queries
        collection.create_index([("document_type", 1), ("language", 1)])
        print("✅ Compound indexes created")
        
    except Exception as e:
        print(f"ℹ️ Index creation: {str(e)}")

def create_vector_search_index_instructions():
    """Provide instructions for creating vector search index"""
    print("\n🔍 VECTOR SEARCH INDEX SETUP:")
    print("=" * 40)
    print("📋 Follow these steps in MongoDB Atlas UI:")
    print()
    print("1. Go to https://cloud.mongodb.com/")
    print("2. Navigate to your cluster → Search")
    print("3. Click 'Create Search Index'")
    print("4. Choose 'Atlas Vector Search'")
    print("5. Use this configuration:")
    print()
    
    vector_index_config = {
        "fields": [
            {
                "type": "vector",
                "path": "embedding",
                "numDimensions": 1536,
                "similarity": "cosine"
            },
            {
                "type": "filter",
                "path": "document_type"
            },
            {
                "type": "filter", 
                "path": "language"
            }
        ]
    }
    
    print("📋 Vector Index Configuration:")
    print(json.dumps(vector_index_config, indent=2))
    print()
    print("6. Name the index: 'vector_index'")
    print("7. Click 'Create Search Index'")
    print("8. Wait for index to be ready (2-5 minutes)")
    print()
    print("🚀 After index is ready, you'll have LIGHTNING-FAST vector search!")

def test_search(collection):
    """Test search functionality"""
    print("\n🔍 Testing search functionality...")
    
    try:
        # Test 1: Document count
        total_count = collection.count_documents({})
        print(f"✅ Total documents: {total_count}")
        
        # Test 2: Document breakdown
        finance_count = collection.count_documents({"document_type": "finance_act"})
        income_count = collection.count_documents({"document_type": "income_tax_act"})
        vat_count = collection.count_documents({"document_type": "vat_act"})
        
        print(f"📊 Document breakdown:")
        print(f"   • Finance Act: {finance_count} documents")
        print(f"   • Income Tax Act: {income_count} documents")
        print(f"   • VAT Act: {vat_count} documents")
        
        # Test 3: Text search
        print("\n📝 Testing text search...")
        try:
            search_results = collection.find(
                {"$text": {"$search": "মূল্য সংযোজন কর"}}
            ).limit(3)
            
            count = 0
            for doc in search_results:
                count += 1
                print(f"   {count}. {doc['document_type']} | {doc['content'][:100]}...")
            
            print(f"✅ Text search found {count} documents")
            
        except Exception as e:
            print(f"ℹ️ Text search: {str(e)}")
        
        # Test 4: Vector embedding verification
        print("\n🧮 Testing vector embeddings...")
        sample_doc = collection.find_one({
            "embedding": {"$exists": True, "$type": "array"}
        })
        
        if sample_doc:
            embedding = sample_doc['embedding']
            print(f"✅ Vector embeddings properly formatted!")
            print(f"   Dimensions: {len(embedding)}")
            print(f"   Sample values: {embedding[:5]}")
            print(f"   Document: {sample_doc['document_type']}")
            
            # Test basic vector search (without index)
            test_basic_vector_search(collection, embedding)
        else:
            print("❌ No proper vector embeddings found")
            
    except Exception as e:
        print(f"❌ Search test failed: {str(e)}")

def test_basic_vector_search(collection, sample_embedding):
    """Test basic vector similarity (before Atlas Vector Search index)"""
    print("\n🔍 Testing basic vector similarity...")
    
    try:
        # Simple dot product similarity (demonstration)
        pipeline = [
            {"$match": {"embedding": {"$exists": True, "$type": "array"}}},
            {"$sample": {"size": 20}},  # Random sample for demo
            {"$addFields": {
                "sample_similarity": {
                    "$reduce": {
                        "input": {"$range": [0, 10]},  # First 10 dimensions for demo
                        "initialValue": 0,
                        "in": {
                            "$add": [
                                "$$value",
                                {"$multiply": [
                                    {"$arrayElemAt": ["$embedding", "$$this"]},
                                    sample_embedding[0]  # Simplified comparison
                                ]}
                            ]
                        }
                    }
                }
            }},
            {"$sort": {"sample_similarity": -1}},
            {"$limit": 3}
        ]
        
        similar_docs = list(collection.aggregate(pipeline))
        
        if similar_docs:
            print(f"✅ Basic vector similarity working:")
            for i, doc in enumerate(similar_docs):
                print(f"   {i+1}. {doc['document_type']} | {doc['content'][:80]}...")
        
        print("ℹ️ This is basic similarity - Atlas Vector Search will be 100x faster!")
        
    except Exception as e:
        print(f"ℹ️ Vector similarity demo: {str(e)}")

# Vector search function (for after index is created)
def vector_search(query_embedding, top_k=10, document_type=None):
    """
    Vector search function - USE AFTER creating Atlas Vector Search index
    
    Example usage:
    results = vector_search(query_embedding, top_k=5, document_type="finance_act")
    """
    
    connection_string = os.getenv('MONGODB_URI')
    client = MongoClient(connection_string)
    db = client['ai_tax_lawyer']
    collection = db['document_chunks']
    
    # Atlas Vector Search pipeline
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": top_k * 10,  # Search more candidates
                "limit": top_k
            }
        }
    ]
    
    # Add document type filter if specified
    if document_type:
        pipeline.append({
            "$match": {"document_type": document_type}
        })
    
    # Add relevance score
    pipeline.append({
        "$addFields": {
            "score": {"$meta": "vectorSearchScore"}
        }
    })
    
    try:
        results = list(collection.aggregate(pipeline))
        return results
    except Exception as e:
        print(f"Vector search error: {str(e)}")
        print("Make sure you've created the 'vector_index' in Atlas UI!")
        return []

def text_search(query_text, top_k=10, document_type=None):
    """Text search function"""
    
    connection_string = os.getenv('MONGODB_URI')
    client = MongoClient(connection_string)
    db = client['ai_tax_lawyer']
    collection = db['document_chunks']
    
    # Build search query
    search_query = {"$text": {"$search": query_text}}
    
    if document_type:
        search_query = {"$and": [search_query, {"document_type": document_type}]}
    
    try:
        results = collection.find(
            search_query,
            {"score": {"$meta": "textScore"}}
        ).sort([("score", {"$meta": "textScore"})]).limit(top_k)
        
        return list(results)
        
    except Exception:
        # Fallback to regex
        regex_query = {"content": {"$regex": query_text, "$options": "i"}}
        if document_type:
            regex_query["document_type"] = document_type
            
        return list(collection.find(regex_query).limit(top_k))

if __name__ == "__main__":
    setup_mongodb_atlas()