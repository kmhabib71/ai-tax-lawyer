#!/usr/bin/env python3
"""
Test script for Customs Act PDF processing
Tests the complete workflow from PDF to structured table data
"""

import os
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from improved_table_parser import ImprovedTableParser

def test_customs_act_file():
    """Test with the specific Customs Act file"""
    print("🧪 Testing Customs Act PDF Processing")
    print("=" * 60)
    
    # Target file (as requested by user)
    target_file = Path("/mnt/d/Projects/Ai_TAX_LAWER_BANGLADESH/ai-tax-lawyer/scraper/downloads/customs-acts/ban/Customs_Act-1969_Amendment_Again_Uploaded.pdf")
    
    print(f"📁 Target PDF: {target_file.name}")
    print(f"📍 Path: {target_file}")
    
    # Check if file exists
    if not target_file.exists():
        print(f"❌ PDF file not found: {target_file}")
        return False
    
    print(f"✅ PDF file found: {target_file.stat().st_size / 1024:.1f} KB")
    
    # Look for extracted text file
    text_file = target_file.with_suffix('.txt')
    
    if not text_file.exists():
        print(f"❌ Extracted text file not found: {text_file}")
        print("💡 You need to run OCR first to extract text from PDF")
        print("📋 Steps to extract text:")
        print("   1. Install tesseract-ocr and poppler-utils")
        print("   2. Use your original script to extract text")
        print("   3. Then run this table parser")
        return False
    
    print(f"✅ Text file found: {text_file.stat().st_size / 1024:.1f} KB")
    
    # Parse the text file
    print(f"\n🔄 Parsing table data...")
    parser = ImprovedTableParser()
    entries = parser.parse_text_file(text_file)
    
    # Analyze results
    analysis = parser.analyze_entries(entries)
    
    print(f"\n📊 Analysis Results:")
    print(f"   📋 Total entries: {analysis['total_entries']}")
    print(f"   🏷️  With H.S. Code: {analysis['with_hs_code']}")
    print(f"   💯 With Rate: {analysis['with_rate']}")
    print(f"   🇧🇩 With Bengali: {analysis['with_bengali']}")
    print(f"   🇺🇸 With English: {analysis['with_english']}")
    print(f"   🌐 Mixed Language: {analysis['mixed_language']}")
    print(f"   📈 Avg Confidence: {analysis['avg_confidence']:.2f}")
    print(f"   ⭐ High Confidence: {analysis['high_confidence']}")
    
    if analysis['total_entries'] > 0:
        print(f"\n📋 Sample Entries:")
        for i, entry in enumerate(entries[:5], 1):
            preview = f"{entry.hs_code} | {entry.rate} | {entry.description[:50]}..."
            print(f"   {i}. {preview}")
        
        # Save results
        output_dir = Path("customs_act_output")
        output_dir.mkdir(exist_ok=True)
        
        base_name = target_file.stem
        
        # Save as CSV
        csv_path = output_dir / f"{base_name}_tables.csv"
        parser.save_as_csv(entries, csv_path)
        
        # Save as JSON
        json_path = output_dir / f"{base_name}_tables.json"
        parser.save_as_json(entries, json_path, str(target_file))
        
        print(f"\n💾 Output Files:")
        print(f"   📄 CSV: {csv_path}")
        print(f"   📄 JSON: {json_path}")
        
        print(f"\n🎉 Customs Act processing completed successfully!")
        print(f"✅ Extracted {analysis['total_entries']} structured table entries")
        print(f"✅ Ready for use in AI Tax Lawyer system")
        
        return True
    else:
        print(f"\n⚠️  No structured table data found in the text file")
        print("💡 This might be because:")
        print("   - The PDF doesn't contain H.S. code tables")
        print("   - OCR quality is poor")
        print("   - Text extraction needs improvement")
        return False

def main():
    """Main function"""
    success = test_customs_act_file()
    
    if success:
        print(f"\n🚀 Next Steps:")
        print("   1. ✅ Table extraction is working")
        print("   2. 🔄 Run OCR on all NBR PDFs")
        print("   3. 📊 Extract structured data from all files")
        print("   4. 🧠 Feed structured data to AI Tax Lawyer")
        print("   5. 🎯 Build tax calculation and advice system")
    else:
        print(f"\n🔧 Troubleshooting:")
        print("   1. Make sure tesseract-ocr is installed")
        print("   2. Extract text from PDF first")
        print("   3. Check if PDF contains table data")
        print("   4. Verify OCR quality")

if __name__ == "__main__":
    main()