#!/usr/bin/env python3
"""
MongoDB Atlas Setup Script - AI Tax Lawyer Bangladesh
Reliable alternative to Azure Cosmos DB
"""

import json
import pymongo
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import numpy as np

load_dotenv()

def setup_mongodb_atlas():
    """Setup MongoDB Atlas and upload documents"""
    
    # Get connection string
    connection_string = os.getenv('MONGODB_ATLAS_CONNECTION_STRING')
    
    if not connection_string or 'xxxxx' in connection_string:
        print("❌ MONGODB_ATLAS_CONNECTION_STRING not found or not updated in .env file")
        print("🔧 Please:")
        print("1. Create MongoDB Atlas cluster at: https://cloud.mongodb.com/")
        print("2. Get your connection string")
        print("3. Update .env file with: MONGODB_ATLAS_CONNECTION_STRING=your-connection-string")
        return
    
    # Test connection
    try:
        print("🔌 Testing connection to MongoDB Atlas...")
        client = MongoClient(connection_string, serverSelectionTimeoutMS=5000)
        
        # Test the connection
        client.admin.command('ping')
        print("✅ Connected to MongoDB Atlas successfully!")
        
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        print("\n🔧 TROUBLESHOOTING:")
        print("1. Check your connection string from MongoDB Atlas")
        print("2. Make sure IP address is whitelisted (Network Access)")
        print("3. Verify database user has correct permissions")
        return
    
    # Create database and collection
    db = client['ai_tax_lawyer']
    collection = db['document_chunks']
    print("✅ Database and collection ready")
    
    # Load documents from export file
    try:
        with open('azure-cosmos-export.json', 'r', encoding='utf-8') as f:
            documents = json.load(f)
        print(f"📦 Loaded {len(documents)} documents from export file")
    except Exception as e:
        print(f"❌ Failed to load export file: {str(e)}")
        print("🔧 Make sure azure-cosmos-export.json exists in current directory")
        return
    
    # Convert embeddings from string to array
    print("🔄 Converting embeddings format...")
    converted_docs = []
    
    for doc in documents:
        try:
            # Convert embedding string to numpy array
            if isinstance(doc['embedding'], str):
                # Remove brackets and split by comma
                embedding_str = doc['embedding'].strip('[]')
                embedding_list = [float(x.strip()) for x in embedding_str.split(',')]
                doc['embedding'] = embedding_list
            
            converted_docs.append(doc)
            
        except Exception as e:
            print(f"⚠️ Skipping document {doc.get('_id', 'unknown')}: embedding conversion failed")
    
    print(f"✅ Converted {len(converted_docs)} documents")
    
    # Clear existing data
    try:
        deleted_count = collection.delete_many({}).deleted_count
        print(f"🗑️ Cleared {deleted_count} existing documents")
    except:
        print("ℹ️ Collection was empty")
    
    # Upload documents in batches
    try:
        print(f"📤 Uploading {len(converted_docs)} documents...")
        
        batch_size = 100
        total_uploaded = 0
        
        for i in range(0, len(converted_docs), batch_size):
            batch = converted_docs[i:i + batch_size]
            
            try:
                result = collection.insert_many(batch, ordered=False)
                uploaded_count = len(result.inserted_ids)
                total_uploaded += uploaded_count
                print(f"   ✅ Batch {i//batch_size + 1}: {uploaded_count} documents uploaded")
                
            except pymongo.errors.BulkWriteError as e:
                inserted_count = e.details.get('nInserted', 0)
                total_uploaded += inserted_count
                print(f"   ⚠️ Batch {i//batch_size + 1}: {inserted_count} new documents, some duplicates skipped")
            
        print(f"🎯 Upload complete! {total_uploaded} documents in MongoDB Atlas")
        
    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        return
    
    # Create indexes
    try:
        print("📊 Creating search indexes...")
        
        # Text search index
        collection.create_index([("content", "text")])
        
        # Metadata indexes
        collection.create_index([("document_type", 1)])
        collection.create_index([("language", 1)])
        collection.create_index([("source_document", 1)])
        
        # Vector search index (for future use)
        try:
            collection.create_index([("embedding", "2dsphere")])
            print("✅ Vector search index created")
        except:
            print("ℹ️ Vector search index not supported, using fallback")
        
        print("✅ Search indexes created")
        
    except Exception as e:
        print(f"ℹ️ Index creation: {str(e)}")
    
    # Test search functionality
    test_search(collection)

def test_search(collection):
    """Test document search"""
    print("\n🔍 Testing document search...")
    
    try:
        # Test 1: Count total documents
        total_count = collection.count_documents({})
        print(f"✅ Total documents: {total_count}")
        
        # Test 2: Text search
        search_results = collection.find(
            {"$text": {"$search": "মূল্য সংযোজন কর"}}
        ).limit(3)
        
        count = 0
        for doc in search_results:
            count += 1
            print(f"   {count}. {doc['document_type']} | {doc['content'][:100]}...")
        
        if count == 0:
            # Fallback to regex search
            search_results = collection.find(
                {"content": {"$regex": "মূল্য সংযোজন কর", "$options": "i"}}
            ).limit(3)
            
            for doc in search_results:
                count += 1
                print(f"   {count}. {doc['document_type']} | {doc['content'][:100]}...")
        
        print(f"✅ Found {count} documents with text search")
        
        # Test 3: Document type breakdown
        finance_count = collection.count_documents({"document_type": "finance_act"})
        income_count = collection.count_documents({"document_type": "income_tax_act"})
        vat_count = collection.count_documents({"document_type": "vat_act"})
        
        print(f"📊 Document breakdown:")
        print(f"   • Finance Act: {finance_count} documents")
        print(f"   • Income Tax: {income_count} documents") 
        print(f"   • VAT Act: {vat_count} documents")
        
        # Test 4: Vector similarity (basic)
        test_vector_similarity(collection)
        
    except Exception as e:
        print(f"❌ Search test failed: {str(e)}")

def test_vector_similarity(collection):
    """Test basic vector similarity search"""
    print("\n🧮 Testing vector similarity search...")
    
    try:
        # Get a sample document with embedding
        sample_doc = collection.find_one({"embedding": {"$exists": True, "$ne": None}})
        
        if not sample_doc:
            print("❌ No documents with embeddings found")
            return
        
        sample_embedding = sample_doc['embedding']
        print(f"✅ Using sample embedding from: {sample_doc['document_type']}")
        
        # Find similar documents using basic cosine similarity
        # Note: This is a simplified approach - full vector search would be more efficient
        pipeline = [
            {"$match": {"embedding": {"$exists": True, "$ne": None}}},
            {"$limit": 50},  # Limit for performance
            {"$addFields": {
                "similarity": {
                    "$let": {
                        "vars": {
                            "dot_product": {
                                "$reduce": {
                                    "input": {"$range": [0, {"$size": "$embedding"}]},
                                    "initialValue": 0,
                                    "in": {
                                        "$add": [
                                            "$$value",
                                            {"$multiply": [
                                                {"$arrayElemAt": ["$embedding", "$$this"]},
                                                {"$arrayElemAt": [sample_embedding, "$$this"]}
                                            ]}
                                        ]
                                    }
                                }
                            }
                        },
                        "in": "$$dot_product"
                    }
                }
            }},
            {"$sort": {"similarity": -1}},
            {"$limit": 3}
        ]
        
        similar_docs = list(collection.aggregate(pipeline))
        
        if similar_docs:
            print(f"✅ Found {len(similar_docs)} similar documents:")
            for i, doc in enumerate(similar_docs):
                similarity = doc.get('similarity', 0)
                print(f"   {i+1}. {doc['document_type']} | Similarity: {similarity:.3f} | {doc['content'][:80]}...")
        else:
            print("ℹ️ Vector similarity search completed (basic implementation)")
            
    except Exception as e:
        print(f"ℹ️ Vector similarity test: {str(e)}")

def search_documents(query_text: str, top_k: int = 10):
    """Search function for your application"""
    connection_string = os.getenv('MONGODB_ATLAS_CONNECTION_STRING')
    client = MongoClient(connection_string)
    db = client['ai_tax_lawyer']
    collection = db['document_chunks']
    
    # Text search
    try:
        results = collection.find(
            {"$text": {"$search": query_text}}
        ).limit(top_k)
        return list(results)
    except:
        # Fallback to regex search
        results = collection.find(
            {"content": {"$regex": query_text, "$options": "i"}}
        ).limit(top_k)
        return list(results)

if __name__ == "__main__":
    setup_mongodb_atlas()