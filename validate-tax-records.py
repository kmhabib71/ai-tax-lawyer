#!/usr/bin/env python3
"""
Tax Record Validator - AI Tax Lawyer Bangladesh
Clean and validate extracted tax records, removing noise and invalid data
"""

import json
import re
import pathlib
from typing import List, Dict, Any

class TaxRecordValidator:
    def __init__(self):
        # Valid HS code patterns
        self.valid_hs_patterns = [
            r'^\d{4}\.\d{2}\.\d{2}$',  # Standard 4.2.2 format
            r'^\d{4}\.\d{1}\.\d{2}$',  # Some 4.1.2 variants
            r'^\d{4}\.\d{2}\.\d{1}$',  # Some 4.2.1 variants
            r'^\d{2}\.\d{2}$',         # Chapter headings
        ]
        
        # Invalid patterns (gazette pages, etc.)
        self.invalid_patterns = [
            r'^19790\d$',     # Gazette page numbers
            r'^19791\d$',     # More gazette pages
            r'^\d{6}$',       # 6-digit numbers (likely page numbers)
            r'^0+$',          # All zeros
            r'^\d{1,3}$',     # Single to 3 digits (not HS codes)
        ]
        
        # Description quality filters
        self.description_filters = {
            'min_length': 10,
            'max_length': 500,
            'exclude_patterns': [
                r'বাংলাদেশ গেজেট',
                r'Bangladesh Gazette',
                r'অতিরিক্ত.*ডিসেম্বর',
                r'Additional.*December',
                r'সনের.*নং আইন',
                r'Act.*of.*\d{4}',
                r'^[।\-\s]*$',  # Only punctuation
            ]
        }
        
        # Valid duty rate ranges
        self.duty_rate_limits = {
            'min': 0.0,
            'max': 1000.0  # Some luxury items have very high rates
        }

    def is_valid_hs_code(self, hs_code: str) -> bool:
        """Check if HS code follows valid patterns"""
        if not hs_code or not isinstance(hs_code, str):
            return False
        
        hs_code = hs_code.strip()
        
        # Check for invalid patterns first
        for pattern in self.invalid_patterns:
            if re.match(pattern, hs_code):
                return False
        
        # Check for valid patterns
        for pattern in self.valid_hs_patterns:
            if re.match(pattern, hs_code):
                return True
        
        return False

    def is_valid_description(self, description: str) -> bool:
        """Check if description is meaningful"""
        if not description or not isinstance(description, str):
            return False
        
        desc = description.strip()
        
        # Length checks
        if len(desc) < self.description_filters['min_length']:
            return False
        if len(desc) > self.description_filters['max_length']:
            return False
        
        # Pattern exclusions
        for pattern in self.description_filters['exclude_patterns']:
            if re.search(pattern, desc, re.IGNORECASE):
                return False
        
        return True

    def is_valid_duty_rate(self, duty_rate: float) -> bool:
        """Check if duty rate is reasonable"""
        if not isinstance(duty_rate, (int, float)):
            return False
        
        return (self.duty_rate_limits['min'] <= duty_rate <= self.duty_rate_limits['max'])

    def clean_description(self, description: str) -> str:
        """Clean and normalize description text"""
        if not description:
            return ""
        
        # Basic cleaning
        cleaned = description.strip()
        
        # Remove excessive whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        # Remove leading/trailing punctuation
        cleaned = re.sub(r'^[।\-\s]+', '', cleaned)
        cleaned = re.sub(r'[।\-\s]+$', '', cleaned)
        
        # Fix common OCR issues
        cleaned = re.sub(r'\bSo\b', '৫০০', cleaned)
        cleaned = re.sub(r'\bSoo\b', '৫০০', cleaned)
        cleaned = re.sub(r'\bSo0\b', '৫০০', cleaned)
        
        return cleaned.strip()

    def validate_record(self, record: Dict[str, Any]) -> tuple[bool, str]:
        """Validate a single tax record"""
        if not isinstance(record, dict):
            return False, "Not a dictionary"
        
        # Check required fields
        required_fields = ['HS_Code', 'Description', 'Duty_%']
        for field in required_fields:
            if field not in record:
                return False, f"Missing field: {field}"
        
        # Validate HS code
        if not self.is_valid_hs_code(record['HS_Code']):
            return False, f"Invalid HS code: {record['HS_Code']}"
        
        # Clean and validate description
        cleaned_desc = self.clean_description(record['Description'])
        if not self.is_valid_description(cleaned_desc):
            return False, f"Invalid description: {record['Description'][:50]}..."
        
        # Validate duty rate
        if not self.is_valid_duty_rate(record['Duty_%']):
            return False, f"Invalid duty rate: {record['Duty_%']}"
        
        return True, "Valid"

    def validate_file(self, input_file: str, output_file: str) -> Dict[str, Any]:
        """Validate and clean a tax records file"""
        print(f"\n🔍 VALIDATING: {pathlib.Path(input_file).name}")
        print("=" * 70)
        
        if not pathlib.Path(input_file).exists():
            print(f"❌ File not found: {input_file}")
            return {"success": False, "error": "File not found"}
        
        # Load data
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"❌ Error loading JSON: {e}")
            return {"success": False, "error": str(e)}
        
        if 'tax_records' not in data:
            print("❌ No 'tax_records' field found")
            return {"success": False, "error": "No tax_records field"}
        
        original_records = data['tax_records']
        print(f"📄 Original records: {len(original_records)}")
        
        # Validate and clean records
        valid_records = []
        validation_stats = {
            'total': len(original_records),
            'valid': 0,
            'invalid_hs_code': 0,
            'invalid_description': 0,
            'invalid_duty_rate': 0,
            'other_invalid': 0
        }
        
        for i, record in enumerate(original_records):
            is_valid, reason = self.validate_record(record)
            
            if is_valid:
                # Clean the record
                cleaned_record = {
                    'HS_Code': record['HS_Code'].strip(),
                    'Description': self.clean_description(record['Description']),
                    'Duty_%': float(record['Duty_%']),
                    'Source_Pattern': record.get('Source_Pattern', 'unknown')
                }
                valid_records.append(cleaned_record)
                validation_stats['valid'] += 1
            else:
                # Categorize the error
                if 'HS code' in reason:
                    validation_stats['invalid_hs_code'] += 1
                elif 'description' in reason:
                    validation_stats['invalid_description'] += 1
                elif 'duty rate' in reason:
                    validation_stats['invalid_duty_rate'] += 1
                else:
                    validation_stats['other_invalid'] += 1
                
                # Show first few invalid records for debugging
                if validation_stats['valid'] + sum([
                    validation_stats['invalid_hs_code'],
                    validation_stats['invalid_description'], 
                    validation_stats['invalid_duty_rate'],
                    validation_stats['other_invalid']
                ]) <= 5:
                    print(f"   ❌ Record {i+1}: {reason}")
        
        # Update statistics
        if valid_records:
            unique_hs_codes = len(set(r['HS_Code'] for r in valid_records))
            duty_rates = [r['Duty_%'] for r in valid_records]
            
            updated_data = {
                **data,
                'tax_records': valid_records,
                'validation_metadata': {
                    'validated_date': '2025-07-19T15:35:00.000Z',
                    'validation_stats': validation_stats,
                    'original_count': len(original_records),
                    'valid_count': len(valid_records),
                    'cleaned_count': len(valid_records)
                },
                'statistics': {
                    **data.get('statistics', {}),
                    'total_records': len(valid_records),
                    'unique_hs_codes': unique_hs_codes,
                    'duty_rate_range': {
                        'min': min(duty_rates),
                        'max': max(duty_rates),
                        'avg': sum(duty_rates) / len(duty_rates)
                    }
                }
            }
            
            # Save cleaned data
            try:
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(updated_data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"❌ Error saving output: {e}")
                return {"success": False, "error": str(e)}
            
            # Display results
            print(f"\n✅ VALIDATION COMPLETED!")
            print("=" * 70)
            print(f"📊 Valid records: {len(valid_records)} ({validation_stats['valid']}/{validation_stats['total']})")
            print(f"🔢 Unique HS codes: {unique_hs_codes}")
            print(f"💰 Duty rate range: {min(duty_rates):.1f}% - {max(duty_rates):.1f}%")
            print(f"📁 Saved: {pathlib.Path(output_file).name}")
            
            # Validation breakdown
            print(f"\n📋 VALIDATION BREAKDOWN:")
            print(f"   ✅ Valid: {validation_stats['valid']}")
            print(f"   ❌ Invalid HS codes: {validation_stats['invalid_hs_code']}")
            print(f"   ❌ Invalid descriptions: {validation_stats['invalid_description']}")
            print(f"   ❌ Invalid duty rates: {validation_stats['invalid_duty_rate']}")
            print(f"   ❌ Other issues: {validation_stats['other_invalid']}")
            
            # Show sample cleaned records
            print(f"\n📋 SAMPLE CLEANED RECORDS:")
            for i, record in enumerate(valid_records[:5]):
                desc_preview = record['Description'][:50] + "..." if len(record['Description']) > 50 else record['Description']
                print(f"   {i+1}. HS: {record['HS_Code']} | {desc_preview} | {record['Duty_%']}%")
            
            if len(valid_records) > 5:
                print(f"   ... and {len(valid_records) - 5} more valid records")
            
            return {
                "success": True,
                "input_file": input_file,
                "output_file": output_file,
                "validation_stats": validation_stats,
                "valid_records": len(valid_records),
                "statistics": updated_data['statistics']
            }
        else:
            print("❌ No valid records found")
            return {"success": False, "error": "No valid records"}

def validate_all_tax_files():
    """Validate all extracted tax files"""
    print("🔍 AI TAX LAWYER - TAX RECORD VALIDATOR")
    print("Clean and validate extracted tax records")
    print("=" * 80)
    
    validator = TaxRecordValidator()
    
    # Files to validate
    files_to_validate = [
        {
            "input": "structured-tax-vat-act-2012.json",
            "output": "clean-tax-vat-act-2012.json"
        },
        {
            "input": "structured-tax-finance-act-2025.json",
            "output": "clean-tax-finance-act-2025.json"
        }
    ]
    
    # Filter existing files
    existing_files = [f for f in files_to_validate if pathlib.Path(f["input"]).exists()]
    
    if not existing_files:
        print("❌ No structured tax files found to validate")
        return
    
    print(f"📄 Found {len(existing_files)} files to validate")
    
    results = []
    total_valid = 0
    
    # Process each file
    for file_info in existing_files:
        result = validator.validate_file(file_info["input"], file_info["output"])
        if result["success"]:
            results.append(result)
            total_valid += result["valid_records"]
    
    # Summary
    print(f"\n📊 VALIDATION SUMMARY")
    print("=" * 80)
    print(f"✅ Successfully validated: {len(results)} files")
    print(f"📋 Total valid tax records: {total_valid}")
    
    if results:
        print(f"\n📄 Cleaned Files:")
        for result in results:
            filename = pathlib.Path(result["output_file"]).name
            valid_count = result["valid_records"]
            stats = result["statistics"]
            print(f"   - {filename} ({valid_count} valid records, {stats['unique_hs_codes']} unique HS codes)")
        
        print(f"\n🎯 NEXT STEPS:")
        print("1. Review cleaned records for final accuracy")
        print("2. Generate embeddings from clean-tax-*.json files")
        print("3. Store in Supabase vector database")
        print("4. Test RAG queries for precise tax calculations")
        print("5. Validate HS code lookup accuracy with real examples")
    
    return results

if __name__ == "__main__":
    validate_all_tax_files()