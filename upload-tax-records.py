#!/usr/bin/env python3
"""
Upload Tax Records - AI Tax Lawyer Bangladesh
Upload structured tax records to MongoDB for precise duty calculations
"""

import json
import os
from typing import List, Dict, Any
from datetime import datetime
import pymongo
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class TaxRecordUploader:
    def __init__(self):
        # Initialize MongoDB connection
        mongodb_uri = os.getenv('MONGODB_URI')
        if not mongodb_uri:
            raise ValueError("Missing MONGODB_URI in .env file")
        
        self.client = MongoClient(mongodb_uri)
        self.db = self.client['ai_tax_lawyer']
        self.collection = self.db['tax_records']
        
        print(f"🗄️ MongoDB Connection Initialized")
        print(f"   Database: ai_tax_lawyer")
        print(f"   Collection: tax_records")

    def load_tax_records(self, file_path: str) -> List[Dict[str, Any]]:
        """Load tax records from clean JSON files"""
        print(f"\n📄 Loading records from: {os.path.basename(file_path)}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            records = json.load(f)
        
        print(f"   📦 Loaded {len(records)} tax records")
        return records

    def prepare_record_for_mongodb(self, record: Dict[str, Any], source_info: Dict[str, str]) -> Dict[str, Any]:
        """Prepare tax record for MongoDB insertion"""
        
        # Extract source filename and determine act type
        source_file = source_info['filename']
        
        if 'finance' in source_file.lower():
            source_act = "Finance Act 2025"
            document_type = "finance_act"
        elif 'vat' in source_file.lower():
            source_act = "VAT Act 2012" 
            document_type = "vat_act"
        elif 'income' in source_file.lower():
            source_act = "Income Tax Act 2023"
            document_type = "income_tax_act"
        else:
            source_act = "Unknown Act"
            document_type = "unknown"
        
        # Prepare MongoDB document
        mongo_record = {
            'hs_code': record.get('HS_Code', ''),
            'description': record.get('Description', ''),
            'duty_percent': float(record.get('Duty_%', 0.0)),
            'source_act': source_act,
            'source_pattern': record.get('Source_Pattern', 'unknown'),
            'metadata': {
                'document_type': document_type,
                'source_file': source_file,
                'extraction_date': datetime.now().isoformat(),
                'validation_status': 'clean',
                'extraction_method': 'regex_based'
            },
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        return mongo_record

    def create_indexes(self):
        """Create MongoDB indexes for fast searching"""
        print("\n🔧 Creating MongoDB indexes...")
        
        try:
            # Create indexes
            self.collection.create_index('hs_code', unique=True)
            self.collection.create_index([('description', 'text')])
            self.collection.create_index('source_act')
            self.collection.create_index('duty_percent')
            self.collection.create_index('metadata.document_type')
            
            print("   ✅ Indexes created successfully")
            
            # List created indexes
            indexes = list(self.collection.list_indexes())
            print(f"   📋 Total indexes: {len(indexes)}")
            for idx in indexes:
                print(f"      - {idx.get('name', 'unnamed')}")
                
        except Exception as e:
            print(f"   ⚠️ Index creation warning: {str(e)}")

    def upload_records(self, records: List[Dict[str, Any]], source_info: Dict[str, str]) -> Dict[str, Any]:
        """Upload tax records to MongoDB"""
        print(f"\n📤 Uploading {len(records)} records to MongoDB...")
        
        # Prepare records
        mongo_records = []
        for record in records:
            mongo_record = self.prepare_record_for_mongodb(record, source_info)
            mongo_records.append(mongo_record)
        
        try:
            # Use upsert to handle duplicates
            uploaded_count = 0
            updated_count = 0
            errors = []
            
            for record in mongo_records:
                try:
                    result = self.collection.replace_one(
                        {'hs_code': record['hs_code']},
                        record,
                        upsert=True
                    )
                    
                    if result.upserted_id:
                        uploaded_count += 1
                    else:
                        updated_count += 1
                        
                except Exception as e:
                    errors.append(f"HS Code {record['hs_code']}: {str(e)}")
            
            print(f"   ✅ Upload complete!")
            print(f"   📦 New records: {uploaded_count}")
            print(f"   🔄 Updated records: {updated_count}")
            
            if errors:
                print(f"   ⚠️ Errors: {len(errors)}")
                for error in errors[:5]:  # Show first 5 errors
                    print(f"      - {error}")
            
            return {
                'success': True,
                'uploaded': uploaded_count,
                'updated': updated_count,
                'errors': len(errors),
                'total_processed': len(records)
            }
            
        except Exception as e:
            print(f"   ❌ Upload failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'total_processed': 0
            }

    def process_file(self, file_path: str) -> Dict[str, Any]:
        """Process a single tax records file"""
        print(f"\n🔄 Processing: {os.path.basename(file_path)}")
        print("=" * 60)
        
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            return {"success": False, "error": "File not found"}
        
        # Load records
        records = self.load_tax_records(file_path)
        
        if not records:
            print("   ⚠️ No records found in file")
            return {"success": False, "error": "No records found"}
        
        # Source info
        source_info = {
            'filename': os.path.basename(file_path),
            'filepath': file_path
        }
        
        # Upload to MongoDB
        result = self.upload_records(records, source_info)
        result['source_file'] = os.path.basename(file_path)
        
        return result

    def verify_upload(self):
        """Verify uploaded data in MongoDB"""
        print(f"\n🔍 Verifying uploaded data...")
        
        try:
            # Get collection stats
            total_records = self.collection.count_documents({})
            
            # Get by source act
            finance_count = self.collection.count_documents({'source_act': 'Finance Act 2025'})
            vat_count = self.collection.count_documents({'source_act': 'VAT Act 2012'})
            
            # Sample records
            sample_records = list(self.collection.find().limit(3))
            
            print(f"   ✅ Verification complete")
            print(f"   📊 Total records: {total_records}")
            print(f"   📄 Finance Act 2025: {finance_count}")
            print(f"   📄 VAT Act 2012: {vat_count}")
            
            if sample_records:
                print(f"\n   📋 Sample records:")
                for i, record in enumerate(sample_records, 1):
                    print(f"      {i}. HS {record['hs_code']}: {record['description'][:50]}... ({record['duty_percent']}%)")
            
            return {
                'total': total_records,
                'finance_act': finance_count,
                'vat_act': vat_count
            }
            
        except Exception as e:
            print(f"   ❌ Verification failed: {str(e)}")
            return None

    def test_search_functionality(self):
        """Test search functionality"""
        print(f"\n🔍 Testing search functionality...")
        
        try:
            # Test 1: HS Code exact match
            test_hs = "2202.10.00"
            hs_result = self.collection.find_one({'hs_code': test_hs})
            
            if hs_result:
                print(f"   ✅ HS Code search: Found {test_hs}")
                print(f"      📄 Description: {hs_result['description']}")
                print(f"      💰 Duty: {hs_result['duty_percent']}%")
            else:
                print(f"   ⚠️ HS Code search: {test_hs} not found")
            
            # Test 2: Text search
            text_query = "পানীয়"
            text_results = list(self.collection.find(
                {'$text': {'$search': text_query}}
            ).limit(3))
            
            print(f"   🔍 Text search for '{text_query}': {len(text_results)} results")
            for result in text_results:
                print(f"      - HS {result['hs_code']}: {result['description'][:40]}...")
            
            # Test 3: Duty range search
            high_duty_count = self.collection.count_documents({'duty_percent': {'$gte': 100}})
            print(f"   📊 High duty items (≥100%): {high_duty_count}")
            
        except Exception as e:
            print(f"   ❌ Search test failed: {str(e)}")

def main():
    """Main function to upload all tax record files"""
    print("🚀 AI TAX LAWYER - TAX RECORDS UPLOADER")
    print("Upload structured tax records to MongoDB")
    print("=" * 80)
    
    # Initialize uploader
    try:
        uploader = TaxRecordUploader()
    except Exception as e:
        print(f"❌ Failed to initialize: {str(e)}")
        print("   Check your MONGODB_URI in .env file")
        return
    
    # Create indexes
    uploader.create_indexes()
    
    # Files to upload
    files_to_upload = [
        'clean-tax-finance-act-2025.json',
        'clean-tax-vat-act-2012.json'
    ]
    
    # Check which files exist
    existing_files = []
    for file_name in files_to_upload:
        if os.path.exists(file_name):
            existing_files.append(file_name)
        else:
            print(f"⚠️ File not found: {file_name}")
    
    if not existing_files:
        print("❌ No clean tax record files found!")
        print("   Run validate-tax-records.py first")
        return
    
    print(f"\n📄 Found {len(existing_files)} files to upload:")
    for file_name in existing_files:
        print(f"   - {file_name}")
    
    # Process each file
    results = []
    
    for file_path in existing_files:
        result = uploader.process_file(file_path)
        results.append(result)
    
    # Summary
    successful_uploads = [r for r in results if r.get('success', False)]
    total_uploaded = sum(r.get('uploaded', 0) for r in results)
    total_updated = sum(r.get('updated', 0) for r in results)
    total_errors = sum(r.get('errors', 0) for r in results)
    
    print(f"\n📊 UPLOAD SUMMARY")
    print("=" * 80)
    print(f"✅ Files processed: {len(successful_uploads)}/{len(existing_files)}")
    print(f"📦 New records uploaded: {total_uploaded}")
    print(f"🔄 Records updated: {total_updated}")
    print(f"❌ Total errors: {total_errors}")
    
    if successful_uploads:
        # Verify upload
        stats = uploader.verify_upload()
        
        # Test functionality
        uploader.test_search_functionality()
        
        print(f"\n🎯 NEXT STEPS:")
        print(f"1. Verify data in MongoDB dashboard")
        print(f"2. Test search APIs")
        print(f"3. Implement RAG query system")
        print(f"4. Connect with frontend")
    
    # Calculate storage used
    if stats:
        avg_record_size = 500  # bytes (estimated)
        total_storage = stats['total'] * avg_record_size
        print(f"\n📊 Storage used: ~{total_storage/1024:.1f} KB for {stats['total']} records")

if __name__ == "__main__":
    main()