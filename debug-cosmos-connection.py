#!/usr/bin/env python3
"""
Debug Azure Cosmos DB Connection - AI Tax Lawyer Bangladesh
Test different connection methods to identify the issue
"""

import os
from pymongo import MongoClient
from dotenv import load_dotenv
import time

load_dotenv()

def test_connection_variations():
    """Test different connection string variations"""
    
    print("🔍 AZURE COSMOS DB CONNECTION DIAGNOSTIC")
    print("=" * 50)
    
    # Test 1: Current connection string
    print("\n1️⃣ Testing current connection string...")
    connection_string = os.getenv('AZURE_COSMOS_CONNECTION_STRING')
    
    if not connection_string:
        print("❌ AZURE_COSMOS_CONNECTION_STRING not found in .env")
        return
    
    print(f"Connection string: {connection_string[:50]}...")
    test_single_connection(connection_string, "Current .env string")
    
    # Test 2: Global connection string (original)
    print("\n2️⃣ Testing global connection string...")
    global_string = "mongodb+srv://kmhabib:Khurshida71@ai-tax-law.global.mongocluster.cosmos.azure.com/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000"
    test_single_connection(global_string, "Global connection")
    
    # Test 3: Self connection string (current)
    print("\n3️⃣ Testing self connection string...")
    self_string = "mongodb+srv://kmhabib:Khurshida71@ai-tax-law.mongocluster.cosmos.azure.com/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000"
    test_single_connection(self_string, "Self connection")
    
    # Test 4: Without retrywrites
    print("\n4️⃣ Testing without retrywrites...")
    no_retry_string = "mongodb+srv://kmhabib:Khurshida71@ai-tax-law.mongocluster.cosmos.azure.com/?tls=true&authMechanism=SCRAM-SHA-256&maxIdleTimeMS=120000"
    test_single_connection(no_retry_string, "No retrywrites")
    
    # Test 5: Standard MongoDB format
    print("\n5️⃣ Testing standard MongoDB format...")
    standard_string = "mongodb+srv://kmhabib:Khurshida71@ai-tax-law.mongocluster.cosmos.azure.com/ai_tax_lawyer?retryWrites=true&w=majority"
    test_single_connection(standard_string, "Standard MongoDB")
    
    print("\n" + "=" * 50)
    print("🔧 NEXT STEPS:")
    print("1. Check which connection (if any) worked above")
    print("2. If none worked, we'll check Azure Cosmos DB settings")
    print("3. Might need to reset password or recreate cluster")

def test_single_connection(connection_string, test_name):
    """Test a single connection string"""
    try:
        print(f"   🔌 {test_name}...")
        
        # Create client with shorter timeout
        client = MongoClient(connection_string, serverSelectionTimeoutMS=3000)
        
        # Test basic connection
        start_time = time.time()
        result = client.admin.command('ping')
        end_time = time.time()
        
        print(f"   ✅ SUCCESS! Ping response: {result}, Time: {end_time - start_time:.2f}s")
        
        # Test database creation
        db = client['test_db']
        collection = db['test_collection']
        test_doc = {"test": "connection", "timestamp": time.time()}
        
        # Insert test document
        result = collection.insert_one(test_doc)
        print(f"   ✅ Test document inserted: {result.inserted_id}")
        
        # Clean up
        collection.delete_one({"_id": result.inserted_id})
        client.close()
        
        print(f"   🎯 {test_name} - FULLY WORKING!")
        return True
        
    except Exception as e:
        print(f"   ❌ {test_name} failed: {str(e)}")
        return False

def check_environment():
    """Check environment setup"""
    print("\n📋 ENVIRONMENT CHECK:")
    print("-" * 30)
    
    # Check .env file
    connection_string = os.getenv('AZURE_COSMOS_CONNECTION_STRING')
    if connection_string:
        print("✅ AZURE_COSMOS_CONNECTION_STRING found")
        print(f"   Length: {len(connection_string)} characters")
        print(f"   Starts with: {connection_string[:20]}...")
        print(f"   Contains password: {'Khurshida71' in connection_string}")
        print(f"   Contains cluster name: {'ai-tax-law' in connection_string}")
    else:
        print("❌ AZURE_COSMOS_CONNECTION_STRING not found")
    
    # Check other required packages
    try:
        import pymongo
        print(f"✅ pymongo version: {pymongo.version}")
    except ImportError:
        print("❌ pymongo not installed")
    
    try:
        from dotenv import load_dotenv
        print("✅ python-dotenv available")
    except ImportError:
        print("❌ python-dotenv not installed")

if __name__ == "__main__":
    check_environment()
    test_connection_variations()