#!/usr/bin/env python3
"""
Single File Embedding Generator - AI Tax Lawyer Bangladesh
Process one document at a time to avoid conflicts and token issues
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

class SingleFileEmbeddingGenerator:
    def __init__(self, file_path: str):
        # Initialize OpenAI
        self.openai_client = openai.OpenAI(
            api_key=os.getenv('OPENAI_API_KEY')
        )
        
        # Initialize Supabase
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("Missing Supabase credentials in .env file - need SUPABASE_SERVICE_ROLE_KEY")
            
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        # Configuration
        self.embedding_model = "text-embedding-3-small"
        self.embedding_dimensions = 1536
        self.batch_size = 1  # Process one chunk at a time to avoid token limits
        self.file_path = file_path
        
        print(f"🚀 Single File Embedding Generator Initialized")
        print(f"   File: {os.path.basename(file_path)}")
        print(f"   Model: {self.embedding_model}")
        print(f"   Batch size: {self.batch_size} (individual processing)")

    def load_document_chunks(self) -> List[Dict[str, Any]]:
        """Load document chunks from chrome-cleaned JSON file"""
        print(f"\n📄 Loading chunks from: {os.path.basename(self.file_path)}")
        
        with open(self.file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        chunks = data.get('chunks', [])
        doc_info = data.get('document_info', {})
        
        # Add source document info to each chunk
        for chunk in chunks:
            chunk['source_document'] = doc_info.get('filename', os.path.basename(self.file_path))
            chunk['document_type'] = self.get_document_type(self.file_path)
            chunk['extraction_method'] = data.get('metadata', {}).get('extraction_method', 'chrome_extension')
            chunk['processing_date'] = data.get('metadata', {}).get('processing_date', '2025-07-19T00:00:00.000Z')
            
        print(f"   📦 Loaded {len(chunks)} chunks from {doc_info.get('filename', 'unknown')}")
        return chunks

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
        """Generate embedding for a single text with robust error handling"""
        try:
            # Conservative text truncation for Bengali text
            max_chars = 15000  # ~5000 tokens conservative estimate
            if len(text) > max_chars:
                text = text[:max_chars]
                print(f"   ⚠️ Truncated long text: {len(text)} chars -> {max_chars} chars")
            
            response = self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=[text],
                dimensions=self.embedding_dimensions
            )
            
            return response.data[0].embedding
            
        except Exception as e:
            print(f"   ❌ Error generating embedding: {str(e)}")
            # Return None to indicate failure
            return None

    def prepare_chunk_for_supabase(self, chunk: Dict[str, Any], embedding: List[float]) -> Dict[str, Any]:
        """Prepare chunk data for Supabase insertion"""
        return {
            'content': chunk['content'],
            'embedding': embedding,
            'source_document': chunk['source_document'],
            'document_type': chunk['document_type'],
            'chunk_index': chunk['metadata']['chunk_index'],
            'section': chunk['metadata'].get('section'),
            'language': chunk['metadata']['language'],
            'character_count': chunk['metadata']['character_count'],
            'chunk_id': chunk['id'],
            'extraction_method': chunk['extraction_method'],
            'processing_date': chunk['processing_date']
        }

    def upload_to_supabase(self, prepared_chunk: Dict[str, Any]) -> bool:
        """Upload single embedded chunk to Supabase"""
        try:
            result = self.supabase.table('document_chunks').insert([prepared_chunk]).execute()
            
            if result.data:
                return True
            else:
                print(f"   ❌ Failed to upload chunk: {result}")
                return False
                
        except Exception as e:
            print(f"   ❌ Error uploading to Supabase: {str(e)}")
            return False

    def process_file(self) -> Dict[str, Any]:
        """Process the entire file"""
        print(f"\n🔄 Processing: {os.path.basename(self.file_path)}")
        print("=" * 60)
        
        # Load chunks
        chunks = self.load_document_chunks()
        if not chunks:
            return {"success": False, "error": "No chunks found"}
        
        # Process each chunk individually
        total_chunks = len(chunks)
        uploaded_chunks = 0
        failed_chunks = 0
        
        for i, chunk in enumerate(chunks):
            print(f"\n   📦 Processing chunk {i+1}/{total_chunks}")
            print(f"   📄 Chunk ID: {chunk['id']}")
            print(f"   📊 Content length: {len(chunk['content'])} chars")
            
            try:
                # Generate embedding
                print(f"   🧠 Generating embedding...")
                embedding = self.generate_embedding_single(chunk['content'])
                
                if embedding is None:
                    print(f"   ⚠️ Skipping chunk {chunk['id']} - failed to generate embedding")
                    failed_chunks += 1
                    continue
                
                # Prepare for Supabase
                prepared_chunk = self.prepare_chunk_for_supabase(chunk, embedding)
                
                # Upload to Supabase
                print(f"   📤 Uploading to Supabase...")
                if self.upload_to_supabase(prepared_chunk):
                    uploaded_chunks += 1
                    print(f"   ✅ Successfully uploaded chunk {chunk['id']}")
                else:
                    failed_chunks += 1
                    print(f"   ❌ Failed to upload chunk {chunk['id']}")
                
                # Small delay to respect rate limits
                time.sleep(0.2)
                
            except Exception as e:
                print(f"   ❌ Error processing chunk {chunk['id']}: {str(e)}")
                failed_chunks += 1
                continue
        
        # Summary
        success_rate = (uploaded_chunks / total_chunks) * 100 if total_chunks > 0 else 0
        
        print(f"\n✅ Processing Complete!")
        print(f"   📊 Total chunks: {total_chunks}")
        print(f"   ✅ Uploaded: {uploaded_chunks}")
        print(f"   ❌ Failed: {failed_chunks}")
        print(f"   📈 Success rate: {success_rate:.1f}%")
        
        return {
            "success": True,
            "total_chunks": total_chunks,
            "uploaded_chunks": uploaded_chunks,
            "failed_chunks": failed_chunks,
            "success_rate": success_rate
        }

def main():
    """Process one file at a time"""
    print("🚀 AI TAX LAWYER - SINGLE FILE EMBEDDING GENERATOR")
    print("=" * 60)
    
    # Available files
    files = [
        'chrome-cleaned-finance-act-2025.json',
        'chrome-cleaned-income-tax-act-2023.json', 
        'chrome-cleaned-vat-act-2012.json'
    ]
    
    # Check which files exist
    available_files = [f for f in files if os.path.exists(f)]
    
    if not available_files:
        print("❌ No chrome-cleaned files found!")
        return
    
    print(f"📄 Available files:")
    for i, file in enumerate(available_files, 1):
        print(f"   {i}. {file}")
    
    # Process files one by one or let user choose
    print(f"\n🔄 Processing all files sequentially...")
    
    for file_path in available_files:
        try:
            generator = SingleFileEmbeddingGenerator(file_path)
            result = generator.process_file()
            
            if result["success"]:
                print(f"✅ {file_path}: {result['uploaded_chunks']}/{result['total_chunks']} chunks uploaded")
            else:
                print(f"❌ {file_path}: Processing failed")
                
        except Exception as e:
            print(f"❌ Error processing {file_path}: {str(e)}")
        
        # Pause between files
        time.sleep(1)
    
    print(f"\n🎯 All files processed! You can now:")
    print(f"1. Run add-vector-index.sql in Supabase SQL Editor")
    print(f"2. Test vector similarity search")

if __name__ == "__main__":
    main()