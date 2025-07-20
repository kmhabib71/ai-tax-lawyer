#!/usr/bin/env python3
"""
Test Embedding Generation - AI Tax Lawyer Bangladesh
Test script to verify OpenAI and Supabase connections before bulk processing
"""

import json
import os
import time
from typing import List, Dict, Any
import openai
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_openai_connection():
    """Test OpenAI API connection and embedding generation"""
    print("🧠 Testing OpenAI Connection...")
    
    try:
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # Test with a simple Bengali tax text
        test_text = "কোমল পানীয়ের উপর ১০০% সম্পূরক শুল্ক প্রযোজ্য।"
        
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=[test_text],
            dimensions=1536
        )
        
        embedding = response.data[0].embedding
        
        print(f"   ✅ OpenAI connection successful")
        print(f"   📊 Embedding dimensions: {len(embedding)}")
        print(f"   📝 Test text: {test_text}")
        print(f"   🔢 First 5 values: {embedding[:5]}")
        
        return True, embedding
        
    except Exception as e:
        print(f"   ❌ OpenAI connection failed: {str(e)}")
        return False, None

def test_supabase_connection():
    """Test Supabase connection and table access"""
    print("\n🗄️ Testing Supabase Connection...")
    
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # Use service role for data operations
        
        if not supabase_url or not supabase_key:
            print("   ❌ Missing Supabase credentials in .env file")
            print("   💡 Make sure SUPABASE_SERVICE_ROLE_KEY is set")
            return False
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Test table access
        result = supabase.table('document_chunks').select('count').execute()
        
        print(f"   ✅ Supabase connection successful")
        print(f"   🗄️ URL: {supabase_url}")
        print(f"   📊 Table access: OK")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Supabase connection failed: {str(e)}")
        print(f"   💡 Make sure to run supabase-setup-simple.sql first")
        return False

def test_sample_chunk_processing():
    """Test processing a sample chunk from chrome-cleaned files"""
    print("\n📄 Testing Sample Chunk Processing...")
    
    # Look for sample file
    sample_files = [
        'chrome-cleaned-vat-act-2012.json',
        'chrome-cleaned-finance-act-2025.json', 
        'chrome-cleaned-income-tax-act-2023.json'
    ]
    
    sample_file = None
    for file_name in sample_files:
        if os.path.exists(file_name):
            sample_file = file_name
            break
    
    if not sample_file:
        print("   ⚠️ No chrome-cleaned files found for testing")
        return False
    
    try:
        with open(sample_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        chunks = data.get('chunks', [])
        if not chunks:
            print(f"   ❌ No chunks found in {sample_file}")
            return False
        
        # Get first chunk
        sample_chunk = chunks[0]
        
        print(f"   ✅ Loaded sample file: {sample_file}")
        print(f"   📦 Total chunks available: {len(chunks)}")
        print(f"   📄 Sample chunk ID: {sample_chunk['id']}")
        print(f"   📊 Sample content length: {len(sample_chunk['content'])} chars")
        print(f"   🌐 Sample language: {sample_chunk['metadata']['language']}")
        print(f"   📝 Sample content preview: {sample_chunk['content'][:100]}...")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Error processing sample: {str(e)}")
        return False

def test_embedding_upload():
    """Test uploading a sample embedding to Supabase"""
    print("\n📤 Testing Embedding Upload...")
    
    try:
        # Get OpenAI client
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # Use service role for data operations
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Create test embedding
        test_content = "পরীক্ষা: ভ্যাট আইন ২০১২ অনুযায়ী নিবন্ধনের নিয়মাবলী"
        
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=[test_content],
            dimensions=1536
        )
        
        embedding = response.data[0].embedding
        
        # Prepare test data
        test_data = {
            'content': test_content,
            'embedding': embedding,
            'source_document': 'test-document.pdf',
            'document_type': 'test',
            'chunk_index': 0,
            'section': 'test_section',
            'language': 'bn',
            'character_count': len(test_content),
            'chunk_id': 'test_chunk_1',
            'extraction_method': 'test',
            'processing_date': '2025-07-19T15:00:00.000Z'
        }
        
        # Upload test data
        result = supabase.table('document_chunks').insert([test_data]).execute()
        
        if result.data:
            print(f"   ✅ Test embedding uploaded successfully")
            print(f"   📄 Test content: {test_content}")
            print(f"   🔢 Embedding dimensions: {len(embedding)}")
            
            # Clean up test data
            supabase.table('document_chunks').delete().eq('chunk_id', 'test_chunk_1').execute()
            print(f"   🗑️ Test data cleaned up")
            
            return True
        else:
            print(f"   ❌ Failed to upload test embedding")
            return False
            
    except Exception as e:
        print(f"   ❌ Error in embedding upload test: {str(e)}")
        return False

def estimate_processing_cost():
    """Estimate cost for processing all documents"""
    print("\n💰 Estimating Processing Cost...")
    
    sample_files = [
        'chrome-cleaned-vat-act-2012.json',
        'chrome-cleaned-finance-act-2025.json', 
        'chrome-cleaned-income-tax-act-2023.json'
    ]
    
    total_chunks = 0
    total_chars = 0
    
    for file_name in sample_files:
        if os.path.exists(file_name):
            try:
                with open(file_name, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                chunks = data.get('chunks', [])
                total_chunks += len(chunks)
                
                for chunk in chunks:
                    total_chars += len(chunk['content'])
                
                print(f"   📄 {file_name}: {len(chunks)} chunks")
                
            except Exception as e:
                print(f"   ⚠️ Error reading {file_name}: {str(e)}")
    
    # Calculate cost (text-embedding-3-small: $0.02 per 1M tokens, roughly 1 token = 1 char)
    cost_per_million_chars = 0.02
    estimated_cost = (total_chars / 1_000_000) * cost_per_million_chars
    
    print(f"\n   📊 Total files: {len([f for f in sample_files if os.path.exists(f)])}")
    print(f"   📦 Total chunks: {total_chunks}")
    print(f"   📝 Total characters: {total_chars:,}")
    print(f"   💰 Estimated cost: ${estimated_cost:.4f}")
    print(f"   ⏱️ Estimated time: {total_chunks * 1.5:.0f} seconds (with rate limiting)")

def main():
    """Run all tests"""
    print("🧪 AI TAX LAWYER - EMBEDDING SYSTEM TEST")
    print("Test OpenAI and Supabase connections before bulk processing")
    print("=" * 70)
    
    # Test environment
    print("📋 Checking Environment Variables...")
    required_vars = ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"   ❌ Missing environment variables: {', '.join(missing_vars)}")
        print("   💡 Update your .env file with required credentials")
        return
    else:
        print("   ✅ All required environment variables found")
    
    # Run tests
    tests_passed = 0
    total_tests = 5
    
    # Test 1: OpenAI
    openai_ok, test_embedding = test_openai_connection()
    if openai_ok:
        tests_passed += 1
    
    # Test 2: Supabase
    if test_supabase_connection():
        tests_passed += 1
    
    # Test 3: Sample processing
    if test_sample_chunk_processing():
        tests_passed += 1
    
    # Test 4: Upload test
    if test_embedding_upload():
        tests_passed += 1
    
    # Test 5: Cost estimation
    estimate_processing_cost()
    tests_passed += 1  # This test always passes
    
    # Summary
    print(f"\n🎯 TEST RESULTS")
    print("=" * 70)
    print(f"✅ Tests passed: {tests_passed}/{total_tests}")
    
    if tests_passed == total_tests:
        print(f"🚀 All tests passed! Ready to run generate-embeddings.py")
        print(f"\n📋 NEXT STEPS:")
        print(f"1. Run: python3 generate-embeddings.py")
        print(f"2. Verify embeddings in Supabase dashboard")
        print(f"3. Test vector similarity search")
    else:
        print(f"❌ Some tests failed. Fix issues before running bulk processing.")
        print(f"\n💡 TROUBLESHOOTING:")
        print(f"- Check .env file has correct credentials (use SUPABASE_SERVICE_ROLE_KEY)")
        print(f"- Run supabase-setup-simple.sql in Supabase SQL editor")
        print(f"- Verify chrome-cleaned-*.json files exist")

if __name__ == "__main__":
    main()