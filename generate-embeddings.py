#!/usr/bin/env python3
"""
Generate Embeddings - AI Tax Lawyer Bangladesh
Creates OpenAI embeddings for all document chunks and uploads to Supabase Vector DB
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

class EmbeddingGenerator:
    def __init__(self):
        # Initialize OpenAI
        self.openai_client = openai.OpenAI(
            api_key=os.getenv('OPENAI_API_KEY')
        )
        
        # Initialize Supabase
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("Missing Supabase credentials in .env file")
            
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        # Embedding configuration
        self.embedding_model = "text-embedding-3-small"
        self.embedding_dimensions = 1536
        self.batch_size = 50  # Process in batches to avoid rate limits
        
        print(f"🚀 Embedding Generator Initialized")
        print(f"   Model: {self.embedding_model}")
        print(f"   Dimensions: {self.embedding_dimensions}")
        print(f"   Batch size: {self.batch_size}")

    def load_document_chunks(self, file_path: str) -> List[Dict[str, Any]]:
        """Load document chunks from chrome-cleaned JSON files"""
        print(f"\n📄 Loading chunks from: {os.path.basename(file_path)}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        chunks = data.get('chunks', [])
        doc_info = data.get('document_info', {})
        
        # Add source document info to each chunk
        for chunk in chunks:
            chunk['source_document'] = doc_info.get('filename', 'unknown')
            chunk['document_type'] = doc_info.get('document_type', 'unknown')
            chunk['extraction_method'] = doc_info.get('extraction_method', 'unknown')
            chunk['processing_date'] = doc_info.get('processing_date', 'unknown')
            
        print(f"   📦 Loaded {len(chunks)} chunks from {doc_info.get('filename', 'unknown')}")
        return chunks

    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a batch of texts"""
        try:
            response = self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=texts,
                dimensions=self.embedding_dimensions
            )
            
            embeddings = [data.embedding for data in response.data]
            return embeddings
            
        except Exception as e:
            print(f"❌ Error generating embeddings: {str(e)}")
            raise

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

    def upload_to_supabase(self, prepared_chunks: List[Dict[str, Any]]) -> bool:
        """Upload embedded chunks to Supabase"""
        try:
            result = self.supabase.table('document_chunks').insert(prepared_chunks).execute()
            
            if result.data:
                print(f"   ✅ Successfully uploaded {len(prepared_chunks)} chunks to Supabase")
                return True
            else:
                print(f"   ❌ Failed to upload chunks: {result}")
                return False
                
        except Exception as e:
            print(f"   ❌ Error uploading to Supabase: {str(e)}")
            return False

    def process_document_file(self, file_path: str) -> Dict[str, Any]:
        """Process a single document file: load → embed → upload"""
        print(f"\n🔄 Processing: {os.path.basename(file_path)}")
        print("=" * 60)
        
        start_time = time.time()
        
        # Load chunks
        chunks = self.load_document_chunks(file_path)
        if not chunks:
            print("   ⚠️ No chunks found in file")
            return {"success": False, "error": "No chunks found"}
        
        # Process in batches
        total_chunks = len(chunks)
        processed_chunks = 0
        uploaded_chunks = 0
        
        for i in range(0, total_chunks, self.batch_size):
            batch_chunks = chunks[i:i + self.batch_size]
            batch_texts = [chunk['content'] for chunk in batch_chunks]
            
            print(f"\n   📦 Processing batch {i//self.batch_size + 1}/{(total_chunks-1)//self.batch_size + 1}")
            print(f"   📊 Chunks {i+1}-{min(i+self.batch_size, total_chunks)} of {total_chunks}")
            
            try:
                # Generate embeddings
                print(f"   🧠 Generating embeddings for {len(batch_texts)} chunks...")
                embeddings = self.generate_embeddings_batch(batch_texts)
                
                # Prepare for Supabase
                prepared_batch = []
                for chunk, embedding in zip(batch_chunks, embeddings):
                    prepared_chunk = self.prepare_chunk_for_supabase(chunk, embedding)
                    prepared_batch.append(prepared_chunk)
                
                # Upload to Supabase
                print(f"   📤 Uploading batch to Supabase...")
                if self.upload_to_supabase(prepared_batch):
                    uploaded_chunks += len(prepared_batch)
                    processed_chunks += len(batch_chunks)
                else:
                    print(f"   ❌ Failed to upload batch {i//self.batch_size + 1}")
                
                # Rate limiting - be gentle with APIs
                time.sleep(1)
                
            except Exception as e:
                print(f"   ❌ Error processing batch {i//self.batch_size + 1}: {str(e)}")
                continue
        
        # Calculate results
        processing_time = time.time() - start_time
        success_rate = (uploaded_chunks / total_chunks) * 100 if total_chunks > 0 else 0
        
        print(f"\n✅ Processing Complete!")
        print(f"   📊 Total chunks: {total_chunks}")
        print(f"   ✅ Uploaded: {uploaded_chunks}")
        print(f"   📈 Success rate: {success_rate:.1f}%")
        print(f"   ⏱️ Time: {processing_time:.1f} seconds")
        
        return {
            "success": True,
            "file": os.path.basename(file_path),
            "total_chunks": total_chunks,
            "uploaded_chunks": uploaded_chunks,
            "success_rate": success_rate,
            "processing_time": processing_time
        }

    def create_supabase_table(self):
        """Create the document_chunks table in Supabase if it doesn't exist"""
        print("\n🔧 Setting up Supabase table...")
        
        # SQL to create table with vector extension
        create_table_sql = """
        -- Enable vector extension if not enabled
        CREATE EXTENSION IF NOT EXISTS vector;
        
        -- Create document_chunks table
        CREATE TABLE IF NOT EXISTS document_chunks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            content TEXT NOT NULL,
            embedding VECTOR(1536),
            source_document TEXT,
            document_type TEXT,
            chunk_index INTEGER,
            section TEXT,
            language TEXT,
            character_count INTEGER,
            chunk_id TEXT,
            extraction_method TEXT,
            processing_date TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Create index for vector similarity search
        CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
        ON document_chunks USING ivfflat (embedding vector_cosine_ops);
        
        -- Create other useful indexes
        CREATE INDEX IF NOT EXISTS document_chunks_source_idx ON document_chunks(source_document);
        CREATE INDEX IF NOT EXISTS document_chunks_type_idx ON document_chunks(document_type);
        CREATE INDEX IF NOT EXISTS document_chunks_language_idx ON document_chunks(language);
        """
        
        try:
            # Note: Supabase Python client doesn't support raw SQL execution
            # This SQL should be run manually in Supabase SQL editor
            print("   ⚠️ Table creation SQL generated - run manually in Supabase:")
            print("   📋 Copy the SQL from the docstring above and run in Supabase SQL editor")
            return True
            
        except Exception as e:
            print(f"   ❌ Error with table setup: {str(e)}")
            return False

def main():
    """Main function to process all chrome-cleaned files"""
    print("🚀 AI TAX LAWYER - EMBEDDING GENERATOR")
    print("Generate embeddings for all document chunks and upload to Supabase")
    print("=" * 80)
    
    # Initialize generator
    try:
        generator = EmbeddingGenerator()
    except Exception as e:
        print(f"❌ Failed to initialize: {str(e)}")
        print("   Check your .env file has OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY")
        return
    
    # Setup Supabase table
    generator.create_supabase_table()
    
    # Files to process
    files_to_process = [
        'chrome-cleaned-finance-act-2025.json',
        'chrome-cleaned-income-tax-act-2023.json',
        'chrome-cleaned-vat-act-2012.json'
    ]
    
    # Check which files exist
    existing_files = []
    for file_name in files_to_process:
        if os.path.exists(file_name):
            existing_files.append(file_name)
        else:
            print(f"⚠️ File not found: {file_name}")
    
    if not existing_files:
        print("❌ No chrome-cleaned files found!")
        print("   Run clean-chrome-extracted-text.js first")
        return
    
    print(f"\n📄 Found {len(existing_files)} files to process:")
    for file_name in existing_files:
        print(f"   - {file_name}")
    
    # Process each file
    results = []
    total_start_time = time.time()
    
    for file_path in existing_files:
        result = generator.process_document_file(file_path)
        results.append(result)
    
    # Final summary
    total_time = time.time() - total_start_time
    successful_files = [r for r in results if r.get('success', False)]
    total_chunks = sum(r.get('total_chunks', 0) for r in results)
    total_uploaded = sum(r.get('uploaded_chunks', 0) for r in results)
    
    print(f"\n📊 FINAL SUMMARY")
    print("=" * 80)
    print(f"✅ Files processed: {len(successful_files)}/{len(existing_files)}")
    print(f"📦 Total chunks: {total_chunks}")
    print(f"📤 Total uploaded: {total_uploaded}")
    print(f"📈 Overall success rate: {(total_uploaded/total_chunks)*100:.1f}%")
    print(f"⏱️ Total time: {total_time:.1f} seconds")
    
    if successful_files:
        print(f"\n🎯 NEXT STEPS:")
        print(f"1. Verify embeddings in Supabase dashboard")
        print(f"2. Test vector similarity search")
        print(f"3. Implement RAG query endpoints")
        print(f"4. Upload structured tax records to MongoDB")
    
    # Calculate estimated cost
    avg_chars_per_chunk = 250  # From analysis
    total_chars = total_uploaded * avg_chars_per_chunk
    estimated_cost = (total_chars / 1_000_000) * 0.02  # $0.02 per 1M chars for text-embedding-3-small
    
    print(f"\n💰 Estimated OpenAI cost: ${estimated_cost:.4f}")

if __name__ == "__main__":
    main()