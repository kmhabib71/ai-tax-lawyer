#!/usr/bin/env python3
"""
Azure Cosmos DB Setup Script - FIXED VERSION
AI Tax Lawyer Bangladesh
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
    
    # Get connection string
    connection_string = os.getenv('AZURE_COSMOS_CONNECTION_STRING')
    
    if not connection_string:
        print("❌ AZURE_COSMOS_CONNECTION_STRING not found in .env file")
        print("🔧 Please add your connection string to .env file:")
        print("AZURE_COSMOS_CONNECTION_STRING=mongodb+srv://username:password@cluster.mongocluster.cosmos.azure.com/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000")
        return
    
    # Test connection first
    try:
        print("🔌 Testing connection to Azure Cosmos DB...")
        client = MongoClient(connection_string, serverSelectionTimeoutMS=5000)
        
        # Test the connection
        client.admin.command('ismaster')
        print("✅ Connected to Azure Cosmos DB successfully!")
        
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        print("\n🔧 TROUBLESHOOTING:")
        print("1. Check your connection string in Azure Portal")
        print("2. Go to: Cosmos DB → Connection strings → Primary connection string")
        print("3. Make sure it includes username and password")
        print("4. Update your .env file with the correct string")
        return
    
    # Create database and collection
    try:
        db = client['ai_tax_lawyer']
        collection = db['document_chunks']
        print("✅ Database and collection ready")
    except Exception as e:
        print(f"❌ Database creation failed: {str(e)}")
        return
    
    # Load documents from export file
    try:
        with open('azure-cosmos-export.json', 'r', encoding='utf-8') as f:
            documents = json.load(f)
        print(f"📦 Loaded {len(documents)} documents from export file")
    except Exception as e:
        print(f"❌ Failed to load export file: {str(e)}")
        print("🔧 Make sure azure-cosmos-export.json exists in current directory")
        return
    
    # Upload documents (skip deletion for now to avoid auth issues)
    try:
        print(f"📤 Uploading {len(documents)} documents...")
        
        # Upload in smaller batches
        batch_size = 50
        total_uploaded = 0
        
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            
            # Insert batch with error handling
            try:
                result = collection.insert_many(batch, ordered=False)
                uploaded_count = len(result.inserted_ids)
                total_uploaded += uploaded_count
                print(f"   ✅ Batch {i//batch_size + 1}: {uploaded_count} documents uploaded")
                
            except pymongo.errors.BulkWriteError as e:
                # Handle duplicate key errors gracefully
                inserted_count = e.details.get('nInserted', 0)
                total_uploaded += inserted_count
                print(f"   ⚠️ Batch {i//batch_size + 1}: {inserted_count} new documents, some duplicates skipped")
            
        print(f"🎯 Upload complete! {total_uploaded} documents in Azure Cosmos DB")
        
    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        return
    
    # Create basic search index (simplified)
    try:
        print("📊 Creating search indexes...")
        collection.create_index([("content", "text")])
        collection.create_index([("document_type", 1)])
        collection.create_index([("language", 1)])
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
            {"content": {"$regex": "মূল্য সংযোজন কর", "$options": "i"}}
        ).limit(3)
        
        count = 0
        for doc in search_results:
            count += 1
            print(f"   {count}. {doc['document_type']} | {doc['content'][:100]}...")
        
        print(f"✅ Found {count} documents with text search")
        
        # Test 3: Document type filter
        finance_count = collection.count_documents({"document_type": "finance_act"})
        income_count = collection.count_documents({"document_type": "income_tax_act"})
        vat_count = collection.count_documents({"document_type": "vat_act"})
        
        print(f"📊 Document breakdown:")
        print(f"   • Finance Act: {finance_count} documents")
        print(f"   • Income Tax: {income_count} documents") 
        print(f"   • VAT Act: {vat_count} documents")
        
    except Exception as e:
        print(f"❌ Search test failed: {str(e)}")

def vector_search(query_text: str, top_k: int = 10):
    """Vector search function - for future use when vector search is available"""
    print("ℹ️ Vector search will be implemented when Azure Cosmos DB vector search is fully available")
    print("ℹ️ Currently using text search as fallback")
    
    # For now, use text search
    connection_string = os.getenv('AZURE_COSMOS_CONNECTION_STRING')
    client = MongoClient(connection_string)
    db = client['ai_tax_lawyer']
    collection = db['document_chunks']
    
    # Text search as fallback
    results = collection.find(
        {"content": {"$regex": query_text, "$options": "i"}}
    ).limit(top_k)
    
    return list(results)

if __name__ == "__main__":
    setup_azure_cosmos()