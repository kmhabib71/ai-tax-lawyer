#!/usr/bin/env python3
"""
Fix Chunk IDs - AI Tax Lawyer Bangladesh
Renumber chunk IDs to be unique across all files before uploading
"""

import json
import os
import shutil
from typing import Dict, Any

def get_document_prefix(file_path: str) -> str:
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

def fix_chunk_ids_in_file(file_path: str) -> bool:
    """Fix chunk IDs in a single file by adding document prefix"""
    
    print(f"\n🔧 Processing: {os.path.basename(file_path)}")
    
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    # Create backup
    backup_path = file_path.replace('.json', '_backup.json')
    shutil.copy2(file_path, backup_path)
    print(f"💾 Backup created: {os.path.basename(backup_path)}")
    
    # Load the file
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Error reading file: {str(e)}")
        return False
    
    # Get document prefix
    doc_prefix = get_document_prefix(file_path)
    print(f"📋 Document prefix: {doc_prefix}")
    
    # Fix chunk IDs
    chunks = data.get('chunks', [])
    if not chunks:
        print(f"⚠️ No chunks found in file")
        return False
    
    print(f"📦 Found {len(chunks)} chunks to fix")
    
    fixed_count = 0
    for chunk in chunks:
        original_id = chunk['id']
        
        # Create new unique ID: prefix_original_id
        new_id = f"{doc_prefix}_{original_id}"
        chunk['id'] = new_id
        
        fixed_count += 1
        
        # Show first few examples
        if fixed_count <= 3:
            print(f"   🔄 {original_id} → {new_id}")
    
    if fixed_count > 3:
        print(f"   ... and {fixed_count - 3} more chunks")
    
    # Save the fixed file
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Fixed {fixed_count} chunk IDs and saved file")
        return True
        
    except Exception as e:
        print(f"❌ Error saving file: {str(e)}")
        # Restore backup
        shutil.copy2(backup_path, file_path)
        print(f"🔄 Restored from backup")
        return False

def main():
    """Fix chunk IDs in all files"""
    print("🔧 AI TAX LAWYER - CHUNK ID FIXER")
    print("Renumber chunk IDs to be unique across all files")
    print("=" * 60)
    
    # Files to process
    files = [
        'chrome-cleaned-finance-act-2025.json',
        'chrome-cleaned-income-tax-act-2023.json',
        'chrome-cleaned-vat-act-2012.json'
    ]
    
    print("📋 Files to process:")
    for i, file_path in enumerate(files, 1):
        exists = "✅" if os.path.exists(file_path) else "❌"
        print(f"   {i}. {exists} {file_path}")
    
    # Ask for confirmation
    print(f"\n⚠️  This will modify the original files (backups will be created)")
    response = input("Continue? (y/N): ").strip().lower()
    
    if response != 'y':
        print("❌ Operation cancelled")
        return
    
    # Process each file
    success_count = 0
    for file_path in files:
        if os.path.exists(file_path):
            if fix_chunk_ids_in_file(file_path):
                success_count += 1
        else:
            print(f"\n❌ Skipping missing file: {file_path}")
    
    # Summary
    print(f"\n🎯 SUMMARY")
    print("=" * 30)
    print(f"📄 Files processed: {success_count}/{len(files)}")
    
    if success_count == len([f for f in files if os.path.exists(f)]):
        print("✅ All files successfully fixed!")
        print(f"\n📋 NEW CHUNK ID PATTERNS:")
        print(f"   • Finance Act: finance_chrome_chunk_1, finance_chrome_chunk_2, ...")
        print(f"   • Income Tax: income_tax_chrome_chunk_1, income_tax_chrome_chunk_2, ...")
        print(f"   • VAT Act: vat_chrome_chunk_1, vat_chrome_chunk_2, ...")
        print(f"\n🚀 Next steps:")
        print(f"1. Run: python generate-embeddings-single.py")
        print(f"2. All files will upload without conflicts!")
    else:
        print("⚠️ Some files failed to process. Check errors above.")
    
    print(f"\n💾 Backup files created with '_backup.json' suffix")

if __name__ == "__main__":
    main()