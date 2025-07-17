#!/usr/bin/env python3
"""
Test script for single PDF file processing
Tests with the specific Customs Act file
"""

import os
import sys
import re
import json
from pathlib import Path
from pdf2image import convert_from_path
import pytesseract
from datetime import datetime

# Configure Tesseract path for Linux
pytesseract.pytesseract.tesseract_cmd = 'tesseract'  # Linux default

# Test configuration
TEST_FILE = Path("D:/Projects/Ai_TAX_LAWER_BANGLADESH/ai-tax-lawyer/scraper/downloads/customs-acts/ban/Customs_Act-1969_Amendment_Again_Uploaded.pdf")
POPPLER_PATH = None  # Use system default for Linux
DPI_FAST = 300
DPI_TABLE = 600
LANG = "ben+eng"
TESS_FAST = "--psm 6 --oem 3"
TESS_TABLE = "--psm 4 --oem 3"

# Table detection patterns
TABLE_PATTERNS = [
    re.compile(r"^\s*\d+\.\d+\.\d+", re.MULTILINE),  # H.S. codes
    re.compile(r"^\s*\d+[A-Z]?\s*[|│]\s*", re.MULTILINE),  # Numbered rows
    re.compile(r"^\s*\d+\s+.*\d+\s*%", re.MULTILINE),  # Tax rates
    re.compile(r"(শিরনামা|Heading|কোড|Code|হার|Rate|শুল্ক|Duty)", re.MULTILINE),  # Headers
    re.compile(r"^\s*\S+\s+\S+\s+\S+\s+\S+", re.MULTILINE),  # Multi-column
]

def detect_table_in_text(text):
    """Check if text contains table patterns"""
    for pattern in TABLE_PATTERNS:
        if pattern.search(text):
            return True
    return False

def analyze_text_structure(text):
    """Analyze text structure and patterns"""
    lines = text.split('\n')
    
    analysis = {
        'total_lines': len(lines),
        'non_empty_lines': len([l for l in lines if l.strip()]),
        'has_bengali': bool(re.search(r'[\u0980-\u09FF]', text)),
        'has_english': bool(re.search(r'[a-zA-Z]', text)),
        'has_numbers': bool(re.search(r'\d', text)),
        'has_percentages': bool(re.search(r'\d+\s*%', text)),
        'has_hs_codes': bool(re.search(r'\d+\.\d+\.\d+', text)),
        'table_detected': detect_table_in_text(text),
        'potential_table_lines': []
    }
    
    # Find potential table lines
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
            
        # Check for table-like patterns
        if (re.search(r'^\d+\.\d+\.\d+', line) or 
            re.search(r'^\d+\s+\S+.*\d+', line) or
            re.search(r'.*\|\s*.*\|\s*.*', line) or
            re.search(r'.*\d+\s*%\s*$', line)):
            analysis['potential_table_lines'].append({
                'line_number': i + 1,
                'content': line[:100] + ('...' if len(line) > 100 else '')
            })
    
    return analysis

def test_ocr_page(img, page_num):
    """Test OCR on a single page"""
    print(f"\n📄 Processing page {page_num}")
    
    # Quick OCR test
    print("   🔍 Quick OCR scan...")
    quick = pytesseract.image_to_string(
        img.resize((img.width // 2, img.height // 2)),
        lang=LANG,
        config=TESS_FAST,
    )
    
    print(f"   ✓ Quick OCR: {len(quick)} characters")
    
    # Check for tables
    has_tables = detect_table_in_text(quick)
    print(f"   📊 Tables detected: {has_tables}")
    
    if not has_tables:
        analysis = analyze_text_structure(quick)
        return quick, analysis, None
    
    # High-resolution OCR for tables
    print("   🔍 High-res table OCR...")
    hi_res = img.resize((img.width * 2, img.height * 2))
    table_text = pytesseract.image_to_string(hi_res, lang=LANG, config=TESS_TABLE)
    
    print(f"   ✓ Table OCR: {len(table_text)} characters")
    
    # Analyze both texts
    quick_analysis = analyze_text_structure(quick)
    table_analysis = analyze_text_structure(table_text)
    
    # Create pipe-delimited format
    lines = table_text.split('\n')
    pipe_rows = []
    buf = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if re.match(r"^\d+[A-Z]?\s", line):  # New numbered row
            if buf:
                pipe_rows.append(" | ".join(buf))
                buf.clear()
        buf.append(line)
    
    if buf:
        pipe_rows.append(" | ".join(buf))
    
    formatted_text = "\n".join(pipe_rows)
    
    return formatted_text, quick_analysis, table_analysis

def main():
    """Test the PDF processor with a single file"""
    print("🧪 Testing PDF Processor with Single File")
    print("=" * 60)
    print(f"📁 Test file: {TEST_FILE.name}")
    print(f"📍 Path: {TEST_FILE}")
    print("=" * 60)
    
    # Check if file exists
    if not TEST_FILE.exists():
        print(f"❌ File not found: {TEST_FILE}")
        return
    
    print(f"✅ File found: {TEST_FILE.stat().st_size / 1024 / 1024:.1f} MB")
    
    try:
        # Convert PDF to images
        print(f"\n🖼️  Converting PDF to images...")
        # Try to convert PDF to images
        try:
            images = convert_from_path(
                TEST_FILE, 
                dpi=DPI_FAST, 
                fmt="png", 
                use_pdftocairo=True
            )
        except Exception as e:
            print(f"❌ Error with pdf2image: {e}")
            print("💡 This might be due to missing poppler or tesseract")
            print("📋 For Linux, install: sudo apt-get install poppler-utils tesseract-ocr tesseract-ocr-ben")
            return
        
        print(f"✅ Converted: {len(images)} pages")
        
        # Process first few pages
        max_pages = min(3, len(images))
        all_text = []
        all_analyses = []
        
        for page_num in range(max_pages):
            img = images[page_num]
            text, quick_analysis, table_analysis = test_ocr_page(img, page_num + 1)
            
            all_text.append(text)
            all_analyses.append({
                'page': page_num + 1,
                'quick_analysis': quick_analysis,
                'table_analysis': table_analysis
            })
            
            # Show preview
            preview = text[:300].replace('\n', ' ').strip()
            if len(text) > 300:
                preview += "..."
            print(f"   📝 Preview: {preview}")
        
        # Save results
        output_dir = Path("test_output")
        output_dir.mkdir(exist_ok=True)
        
        # Save text file
        text_file = output_dir / f"{TEST_FILE.stem}_test.txt"
        with open(text_file, 'w', encoding='utf-8') as f:
            f.write('\n\n--- PAGE SEPARATOR ---\n\n'.join(all_text))
        
        # Save analysis report
        report = {
            'test_file': str(TEST_FILE),
            'timestamp': datetime.now().isoformat(),
            'pages_processed': max_pages,
            'total_pages': len(images),
            'config': {
                'dpi_fast': DPI_FAST,
                'dpi_table': DPI_TABLE,
                'lang': LANG,
                'tess_fast': TESS_FAST,
                'tess_table': TESS_TABLE
            },
            'page_analyses': all_analyses
        }
        
        report_file = output_dir / f"{TEST_FILE.stem}_analysis.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tables = sum(1 for analysis in all_analyses if analysis['quick_analysis']['table_detected'])
        total_text = sum(len(text) for text in all_text)
        
        print(f"📄 Pages processed: {max_pages}/{len(images)}")
        print(f"📊 Tables detected: {total_tables}")
        print(f"📝 Total text extracted: {total_text:,} characters")
        print(f"💾 Text file: {text_file}")
        print(f"📋 Analysis report: {report_file}")
        
        # Language analysis
        has_bengali = any(analysis['quick_analysis']['has_bengali'] for analysis in all_analyses)
        has_english = any(analysis['quick_analysis']['has_english'] for analysis in all_analyses)
        
        print(f"🇧🇩 Bengali content: {'✅' if has_bengali else '❌'}")
        print(f"🇺🇸 English content: {'✅' if has_english else '❌'}")
        
        # Table analysis
        if total_tables > 0:
            print(f"\n📊 Table Analysis:")
            for analysis in all_analyses:
                if analysis['quick_analysis']['table_detected']:
                    page = analysis['page']
                    table_lines = len(analysis['quick_analysis']['potential_table_lines'])
                    print(f"   Page {page}: {table_lines} potential table lines")
        
        print(f"\n🎉 Test completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error during processing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()