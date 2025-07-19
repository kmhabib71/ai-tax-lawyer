#!/usr/bin/env python3
"""
Tax Table Extractor - AI Tax Lawyer Bangladesh
Extract structured HS code, description, and duty rate data from messy tax documents
Based on regex pattern matching for reliable table data extraction
"""

import re
import json
import pathlib
import unicodedata
import sys
from typing import List, Dict, Any

class TaxTableExtractor:
    def __init__(self):
        # Bengali to Latin digit translation
        self.b2l = str.maketrans('০১২৩৪৫৬৭৮৯', '0123456789')
        
        # Comprehensive regex pattern for HS code + description + duty rate
        self.row_pattern = re.compile(r"""
            (?P<code>\d{4}(?:[0-9A-Z.]+\d)(?:\.00)?)\s+   # HS code (4+ digits with dots)
            (?P<desc>.*?)                                 # description (non-greedy)
            (?<!\d)\s*                                    # not preceded by digit
            (?P<duty>\d{1,3}(?:\.\d{1,2})?)               # duty rate (1-3 digits, optional decimal)
            \s*%?                                         # optional % symbol
            (?=\s+\d{4}|$)                                # next code or end of text
        """, re.VERBOSE | re.MULTILINE)
        
        # Alternative pattern for Bengali HS codes
        self.bengali_pattern = re.compile(r"""
            (?P<code>[০-৯]{4}(?:[০-৯A-Z.]+[০-৯])(?:\.০০)?)\s+   # Bengali HS code
            (?P<desc>.*?)                                         # description
            (?<![০-৯])\s*                                        # not preceded by Bengali digit
            (?P<duty>[০-৯]{1,3}(?:\.[০-৯]{1,2})?)                # Bengali duty rate
            \s*%?                                                 # optional %
            (?=\s+[০-৯]{4}|$)                                    # next code or end
        """, re.VERBOSE | re.MULTILINE)

    def normalize_text(self, text: str) -> str:
        """Normalize text for better extraction"""
        print("🔧 Normalizing text...")
        
        # Bengali -> Latin digits
        text = text.translate(self.b2l)
        
        # Collapse all whitespace to single space
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove common OCR artifacts
        text = re.sub(r'\bSo\b', '500', text)
        text = re.sub(r'\bSoo\b', '500', text)
        text = re.sub(r'\bSo0\b', '500', text)
        text = re.sub(r'\bS00\b', '500', text)
        
        # Fix broken HS codes
        text = re.sub(r'b0\.80', '80.80', text)
        text = re.sub(r'b088', '8544', text)
        text = re.sub(r'b\.88', '85.44', text)
        
        # Drop everything before first 4-digit HS code to remove headers
        parts = re.split(r'\b\d{4}', text, 1)
        if len(parts) > 1:
            text = ' ' + parts[1]  # Restore the space lost in split
            # Add back the first HS code
            first_code_match = re.search(r'\b\d{4}', text)
            if first_code_match:
                text = parts[0][-4:] + text
        
        print(f"   ✅ Normalized: {len(text)} characters")
        return text

    def extract_tax_records(self, text: str) -> List[Dict[str, Any]]:
        """Extract structured tax records from normalized text"""
        print("📊 Extracting tax records...")
        
        records = []
        
        # Try Latin pattern first
        for match in self.row_pattern.finditer(text):
            code = match.group('code').replace(' ', '')
            duty = float(match.group('duty'))
            desc = match.group('desc').strip()
            
            # Clean description
            desc = re.sub(r'^[|\-\s]+', '', desc)  # Remove leading separators
            desc = re.sub(r'[|\-\s]+$', '', desc)  # Remove trailing separators
            desc = re.sub(r'\s+', ' ', desc)       # Normalize spaces
            
            if desc and len(desc) > 3:  # Only include meaningful descriptions
                records.append({
                    'HS_Code': code,
                    'Description': desc,
                    'Duty_%': duty,
                    'Source_Pattern': 'latin'
                })
        
        # Try Bengali pattern for additional matches
        for match in self.bengali_pattern.finditer(text):
            code = match.group('code').replace(' ', '').translate(self.b2l)
            duty_str = match.group('duty').translate(self.b2l)
            duty = float(duty_str)
            desc = match.group('desc').strip()
            
            # Clean description
            desc = re.sub(r'^[|\-\s]+', '', desc)
            desc = re.sub(r'[|\-\s]+$', '', desc)
            desc = re.sub(r'\s+', ' ', desc)
            
            # Avoid duplicates by checking if code already exists
            existing_codes = {r['HS_Code'] for r in records}
            if code not in existing_codes and desc and len(desc) > 3:
                records.append({
                    'HS_Code': code,
                    'Description': desc,
                    'Duty_%': duty,
                    'Source_Pattern': 'bengali'
                })
        
        print(f"   ✅ Extracted: {len(records)} tax records")
        return records

    def process_json_file(self, input_file: str, output_file: str) -> Dict[str, Any]:
        """Process a JSON file and extract tax tables"""
        print(f"\n🗂️  PROCESSING: {pathlib.Path(input_file).name}")
        print("=" * 70)
        
        if not pathlib.Path(input_file).exists():
            print(f"❌ File not found: {input_file}")
            return {"success": False, "error": "File not found"}
        
        # Load JSON data
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"❌ Error loading JSON: {e}")
            return {"success": False, "error": str(e)}
        
        # Extract text
        if 'full_text' not in data:
            print("❌ No 'full_text' field found in JSON")
            return {"success": False, "error": "No full_text field"}
        
        original_text = data['full_text']
        print(f"📄 Original text: {len(original_text)} characters")
        
        # Normalize and extract
        normalized_text = self.normalize_text(original_text)
        tax_records = self.extract_tax_records(normalized_text)
        
        if not tax_records:
            print("⚠️  No tax records found")
            return {"success": False, "error": "No tax records extracted"}
        
        # Create structured output
        output_data = {
            "document_info": data.get("document_info", {}),
            "extraction_metadata": {
                "method": "regex_based_extraction",
                "extraction_date": "2025-07-19T15:30:00.000Z",
                "original_characters": len(original_text),
                "normalized_characters": len(normalized_text),
                "records_extracted": len(tax_records),
                "extraction_patterns": ["latin", "bengali"]
            },
            "tax_records": tax_records,
            "statistics": {
                "total_records": len(tax_records),
                "latin_pattern_matches": len([r for r in tax_records if r['Source_Pattern'] == 'latin']),
                "bengali_pattern_matches": len([r for r in tax_records if r['Source_Pattern'] == 'bengali']),
                "unique_hs_codes": len(set(r['HS_Code'] for r in tax_records)),
                "duty_rate_range": {
                    "min": min(r['Duty_%'] for r in tax_records),
                    "max": max(r['Duty_%'] for r in tax_records),
                    "avg": sum(r['Duty_%'] for r in tax_records) / len(tax_records)
                }
            }
        }
        
        # Save structured JSON
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"❌ Error saving output: {e}")
            return {"success": False, "error": str(e)}
        
        # Display results
        print(f"\n✅ EXTRACTION COMPLETED!")
        print("=" * 70)
        print(f"📊 Records extracted: {len(tax_records)}")
        print(f"🔢 Unique HS codes: {output_data['statistics']['unique_hs_codes']}")
        print(f"💰 Duty rate range: {output_data['statistics']['duty_rate_range']['min']}% - {output_data['statistics']['duty_rate_range']['max']}%")
        print(f"📁 Saved: {pathlib.Path(output_file).name}")
        
        # Show sample records
        print(f"\n📋 SAMPLE EXTRACTED RECORDS:")
        for i, record in enumerate(tax_records[:5]):
            desc_preview = record['Description'][:50] + "..." if len(record['Description']) > 50 else record['Description']
            print(f"   {i+1}. HS: {record['HS_Code']} | {desc_preview} | {record['Duty_%']}%")
        
        if len(tax_records) > 5:
            print(f"   ... and {len(tax_records) - 5} more records")
        
        return {
            "success": True,
            "input_file": input_file,
            "output_file": output_file,
            "records_extracted": len(tax_records),
            "statistics": output_data['statistics']
        }

    def process_text_file(self, input_file: str, output_file: str) -> Dict[str, Any]:
        """Process a plain text file and extract tax tables"""
        print(f"\n📄 PROCESSING TEXT FILE: {pathlib.Path(input_file).name}")
        print("=" * 70)
        
        if not pathlib.Path(input_file).exists():
            print(f"❌ File not found: {input_file}")
            return {"success": False, "error": "File not found"}
        
        # Load text
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                original_text = f.read()
        except Exception as e:
            print(f"❌ Error loading text: {e}")
            return {"success": False, "error": str(e)}
        
        print(f"📄 Original text: {len(original_text)} characters")
        
        # Normalize and extract
        normalized_text = self.normalize_text(original_text)
        tax_records = self.extract_tax_records(normalized_text)
        
        if not tax_records:
            print("⚠️  No tax records found")
            return {"success": False, "error": "No tax records extracted"}
        
        # Save as JSON
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(tax_records, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"❌ Error saving output: {e}")
            return {"success": False, "error": str(e)}
        
        print(f"✅ Extracted {len(tax_records)} records to {output_file}")
        return {"success": True, "records": len(tax_records)}

def extract_all_tax_tables():
    """Extract tax tables from all Chrome-cleaned files"""
    print("🏗️  AI TAX LAWYER - REGEX-BASED TAX TABLE EXTRACTOR")
    print("Extract structured HS code, description, and duty rate data")
    print("=" * 80)
    
    extractor = TaxTableExtractor()
    
    # Files to process
    files_to_process = [
        {
            "input": "chrome-cleaned-vat-act-2012.json",
            "output": "structured-tax-vat-act-2012.json"
        },
        {
            "input": "chrome-cleaned-income-tax-act-2023.json",
            "output": "structured-tax-income-tax-act-2023.json"
        },
        {
            "input": "chrome-cleaned-finance-act-2025.json",
            "output": "structured-tax-finance-act-2025.json"
        }
    ]
    
    # Filter existing files
    existing_files = [f for f in files_to_process if pathlib.Path(f["input"]).exists()]
    
    if not existing_files:
        print("❌ No chrome-cleaned files found to process")
        return
    
    print(f"📄 Found {len(existing_files)} files to process")
    
    results = []
    total_records = 0
    
    # Process each file
    for file_info in existing_files:
        result = extractor.process_json_file(file_info["input"], file_info["output"])
        if result["success"]:
            results.append(result)
            total_records += result["records_extracted"]
    
    # Summary
    print(f"\n📊 EXTRACTION SUMMARY")
    print("=" * 80)
    print(f"✅ Successfully processed: {len(results)} files")
    print(f"📋 Total tax records extracted: {total_records}")
    
    if results:
        print(f"\n📄 Extracted Files:")
        for result in results:
            filename = pathlib.Path(result["output_file"]).name
            records = result["records_extracted"]
            stats = result["statistics"]
            print(f"   - {filename} ({records} records, {stats['unique_hs_codes']} unique HS codes)")
        
        print(f"\n🎯 NEXT STEPS:")
        print("1. Review extracted records for accuracy")
        print("2. Generate embeddings from structured JSON files") 
        print("3. Store in Supabase vector database")
        print("4. Test RAG queries for precise tax calculations")
        print("5. Validate HS code lookup accuracy")
    
    return results

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Process specific file
        input_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else f"structured-{input_file}"
        
        extractor = TaxTableExtractor()
        if input_file.endswith('.json'):
            result = extractor.process_json_file(input_file, output_file)
        else:
            result = extractor.process_text_file(input_file, output_file)
        
        print(f"\nResult: {result}")
    else:
        # Process all files
        extract_all_tax_tables()