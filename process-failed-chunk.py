#!/usr/bin/env python3
"""
Process Failed Chunk - AI Tax Lawyer Bangladesh
Handle specific chunks that are too large for normal processing
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

def process_oversized_chunk(chunk_id: str, file_path: str):
    """Process a specific oversized chunk by splitting it further"""
    
    # Initialize clients
    openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    supabase: Client = create_client(supabase_url, supabase_key)
    
    print(f"🔧 Processing oversized chunk: {chunk_id}")
    print(f"📄 From file: {os.path.basename(file_path)}")
    
    # Load the specific chunk
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    chunks = data.get('chunks', [])
    target_chunk = None
    
    for chunk in chunks:
        if chunk['id'] == chunk_id:
            target_chunk = chunk
            break
    
    if not target_chunk:
        print(f"❌ Chunk {chunk_id} not found!")
        return
    
    print(f"📊 Original chunk size: {len(target_chunk['content'])} chars")
    
    # Split the chunk into smaller parts
    content = target_chunk['content']
    max_size = 8000  # Conservative size for Bengali text ~2500 tokens
    
    # Split by sentences (periods) to maintain meaning
    sentences = content.split('।')  # Bengali period
    
    sub_chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        sentence = sentence.strip() + '।'
        
        if len(current_chunk + sentence) > max_size and current_chunk:
            # Save current chunk and start new one
            sub_chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            current_chunk += " " + sentence if current_chunk else sentence
    
    # Add the last chunk
    if current_chunk.strip():
        sub_chunks.append(current_chunk.strip())
    
    print(f"📦 Split into {len(sub_chunks)} sub-chunks")
    
    # Process each sub-chunk
    uploaded_count = 0
    doc_info = data.get('document_info', {})
    
    for i, sub_content in enumerate(sub_chunks):
        sub_chunk_id = f"{chunk_id}_part_{i+1}"
        
        print(f"\n   📄 Processing {sub_chunk_id}")
        print(f"   📊 Size: {len(sub_content)} chars")
        
        try:
            # Generate embedding
            response = openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=[sub_content],
                dimensions=1536
            )
            
            embedding = response.data[0].embedding
            
            # Prepare for Supabase
            prepared_chunk = {
                'content': sub_content,
                'embedding': embedding,
                'source_document': doc_info.get('filename', os.path.basename(file_path)),
                'document_type': get_document_type(file_path),
                'chunk_index': target_chunk['metadata']['chunk_index'] + (i * 0.1),  # 7.1, 7.2, 7.3
                'section': target_chunk['metadata'].get('section'),
                'language': target_chunk['metadata']['language'],
                'character_count': len(sub_content),
                'chunk_id': sub_chunk_id,
                'extraction_method': data.get('metadata', {}).get('extraction_method', 'chrome_extension_split'),
                'processing_date': data.get('metadata', {}).get('processing_date', '2025-07-19T00:00:00.000Z')
            }
            
            # Upload to Supabase
            result = supabase.table('document_chunks').insert([prepared_chunk]).execute()
            
            if result.data:
                uploaded_count += 1
                print(f"   ✅ Successfully uploaded {sub_chunk_id}")
            else:
                print(f"   ❌ Failed to upload {sub_chunk_id}")
            
            # Small delay
            time.sleep(0.3)
            
        except Exception as e:
            print(f"   ❌ Error processing {sub_chunk_id}: {str(e)}")
    
    print(f"\n🎯 Summary for {chunk_id}:")
    print(f"   📦 Sub-chunks created: {len(sub_chunks)}")
    print(f"   ✅ Successfully uploaded: {uploaded_count}")
    print(f"   📈 Success rate: {(uploaded_count/len(sub_chunks)*100):.1f}%")

def get_document_type(file_path: str) -> str:
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

def main():
    """Process the failed chunk"""
    
    # Known failed chunks
    failed_chunks = [
        {
            'chunk_id': 'chrome_chunk_7',
            'file_path': 'chrome-cleaned-finance-act-2025.json'
        }
        # Add more failed chunks here as needed
    ]
    
    print("🔧 AI TAX LAWYER - FAILED CHUNK PROCESSOR")
    print("=" * 50)
    
    for failed_chunk in failed_chunks:
        if os.path.exists(failed_chunk['file_path']):
            process_oversized_chunk(failed_chunk['chunk_id'], failed_chunk['file_path'])
        else:
            print(f"❌ File not found: {failed_chunk['file_path']}")

if __name__ == "__main__":
    main()