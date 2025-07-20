#!/usr/bin/env python3
"""
Resume Upload - AI Tax Lawyer Bangladesh
Continue uploading from where it stopped, handling duplicate chunk IDs
"""

import json
import os
import time
from typing import List, Dict, Any, Set
import openai
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ResumeUploader:
    def __init__(self):
        # Initialize clients
        self.openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        # Configuration
        self.embedding_model = "text-embedding-3-small"
        self.embedding_dimensions = 1536
        
        print(f"🔄 Resume Uploader Initialized")
        print(f"   Model: {self.embedding_model}")

    def get_existing_chunk_ids(self) -> Set[str]:
        """Get all existing chunk IDs from database"""
        try:
            result = self.supabase.table('document_chunks').select('chunk_id').execute()
            existing_ids = {row['chunk_id'] for row in result.data}
            print(f"📊 Found {len(existing_ids)} existing chunks in database")
            return existing_ids
        except Exception as e:
            print(f"❌ Error getting existing chunks: {str(e)}")
            return set()

    def get_document_prefix(self, file_path: str) -> str:
        """Get unique prefix for document type"""
        filename = os.path.basename(file_path).lower()
        if 'finance' in filename:
            return 'finance'
        elif 'income-tax' in filename:
            return 'income_tax'
        elif 'vat' in filename:
            return 'vat'
        else:
            return 'unknown'

    def get_document_type(self, file_path: str) -> str:
        """Determine document type from filename"""
        filename = os.path.basename(file_path).lower()
        if 'finance' in filename:
            return 'finance_act'
        elif 'income-tax' in filename:
            return 'income_tax_act'
        elif 'vat' in filename:
            return 'vat_act'
        else:
            return 'unknown'

    def generate_embedding_single(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        try:
            # Conservative text truncation
            max_chars = 15000
            if len(text) > max_chars:
                text = text[:max_chars]
                print(f"   ⚠️ Truncated text: {len(text)} chars -> {max_chars} chars")
            
            response = self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=[text],
                dimensions=self.embedding_dimensions
            )
            
            return response.data[0].embedding
            
        except Exception as e:
            print(f"   ❌ Error generating embedding: {str(e)}")
            return None

    def upload_chunk(self, prepared_chunk: Dict[str, Any]) -> bool:
        """Upload single chunk to Supabase"""
        try:
            result = self.supabase.table('document_chunks').insert([prepared_chunk]).execute()
            return bool(result.data)
        except Exception as e:
            print(f"   ❌ Error uploading: {str(e)}")
            return False

    def process_file(self, file_path: str) -> Dict[str, Any]:
        """Process file with resume capability"""
        print(f"\n🔄 Processing: {os.path.basename(file_path)}")
        print("=" * 60)
        
        # Load file data
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        chunks = data.get('chunks', [])
        doc_info = data.get('document_info', {})
        doc_prefix = self.get_document_prefix(file_path)
        
        print(f"📄 Loaded {len(chunks)} chunks")
        print(f"📋 Document prefix: {doc_prefix}")
        
        # Get existing chunk IDs
        existing_ids = self.get_existing_chunk_ids()
        
        # Filter chunks that need processing
        chunks_to_process = []
        skipped_count = 0
        
        for chunk in chunks:
            # Create unique chunk ID with document prefix
            original_id = chunk['id']
            unique_id = f"{doc_prefix}_{original_id}"
            
            if unique_id in existing_ids:
                skipped_count += 1
                continue
            
            # Add unique ID to chunk
            chunk['unique_id'] = unique_id
            chunks_to_process.append(chunk)
        
        print(f"📊 Chunks to process: {len(chunks_to_process)}")
        print(f"⏭️ Already exists (skipped): {skipped_count}")
        
        if not chunks_to_process:
            print(f"✅ All chunks already uploaded for {os.path.basename(file_path)}")
            return {
                "success": True,
                "total_chunks": len(chunks),
                "uploaded_chunks": 0,
                "skipped_chunks": skipped_count,
                "already_complete": True
            }
        
        # Process remaining chunks
        uploaded_count = 0
        failed_count = 0
        
        for i, chunk in enumerate(chunks_to_process):
            print(f"\n   📦 Processing chunk {i+1}/{len(chunks_to_process)}")
            print(f"   📄 Original ID: {chunk['id']}")
            print(f"   🔗 Unique ID: {chunk['unique_id']}")
            print(f"   📊 Content length: {len(chunk['content'])} chars")
            
            try:
                # Generate embedding
                print(f"   🧠 Generating embedding...")
                embedding = self.generate_embedding_single(chunk['content'])
                
                if embedding is None:
                    print(f"   ⚠️ Skipping - failed to generate embedding")
                    failed_count += 1
                    continue
                
                # Prepare for Supabase with unique ID
                prepared_chunk = {
                    'content': chunk['content'],
                    'embedding': embedding,
                    'source_document': doc_info.get('filename', os.path.basename(file_path)),
                    'document_type': self.get_document_type(file_path),
                    'chunk_index': chunk['metadata']['chunk_index'],
                    'section': chunk['metadata'].get('section'),
                    'language': chunk['metadata']['language'],
                    'character_count': chunk['metadata']['character_count'],
                    'chunk_id': chunk['unique_id'],  # Use unique ID
                    'extraction_method': data.get('metadata', {}).get('extraction_method', 'chrome_extension'),
                    'processing_date': data.get('metadata', {}).get('processing_date', '2025-07-19T00:00:00.000Z')
                }
                
                # Upload to Supabase
                print(f"   📤 Uploading to Supabase...")
                if self.upload_chunk(prepared_chunk):
                    uploaded_count += 1
                    print(f"   ✅ Successfully uploaded {chunk['unique_id']}")
                else:
                    failed_count += 1
                    print(f"   ❌ Failed to upload {chunk['unique_id']}")
                
                # Rate limiting
                time.sleep(0.2)
                
            except Exception as e:
                print(f"   ❌ Error processing {chunk['id']}: {str(e)}")
                failed_count += 1
        
        # Summary
        total_processed = len(chunks_to_process)
        success_rate = (uploaded_count / total_processed * 100) if total_processed > 0 else 0
        
        print(f"\n✅ Processing Complete!")
        print(f"   📊 Total chunks in file: {len(chunks)}")
        print(f"   ⏭️ Already existed: {skipped_count}")
        print(f"   🔄 Needed processing: {total_processed}")
        print(f"   ✅ Successfully uploaded: {uploaded_count}")
        print(f"   ❌ Failed: {failed_count}")
        print(f"   📈 Success rate: {success_rate:.1f}%")
        
        return {
            "success": True,
            "total_chunks": len(chunks),
            "uploaded_chunks": uploaded_count,
            "failed_chunks": failed_count,
            "skipped_chunks": skipped_count,
            "success_rate": success_rate
        }

def main():
    """Resume upload for specific files"""
    print("🔄 AI TAX LAWYER - RESUME UPLOADER")
    print("Handles duplicate chunk IDs and resumes from where stopped")
    print("=" * 60)
    
    # Files to process
    files = [
        'chrome-cleaned-income-tax-act-2023.json',
        'chrome-cleaned-vat-act-2012.json'
        # 'chrome-cleaned-finance-act-2025.json'  # Already completed
    ]
    
    uploader = ResumeUploader()
    
    for file_path in files:
        if os.path.exists(file_path):
            try:
                result = uploader.process_file(file_path)
                
                if result.get("already_complete"):
                    print(f"✅ {file_path}: Already complete")
                else:
                    uploaded = result['uploaded_chunks']
                    total = result['total_chunks']
                    print(f"✅ {file_path}: {uploaded} new chunks uploaded (Total: {total})")
                
            except Exception as e:
                print(f"❌ Error processing {file_path}: {str(e)}")
            
            # Pause between files
            time.sleep(1)
        else:
            print(f"❌ File not found: {file_path}")
    
    print(f"\n🎯 Upload complete! Next steps:")
    print(f"1. Run add-vector-index.sql in Supabase SQL Editor")
    print(f"2. Test vector similarity search")

if __name__ == "__main__":
    main()