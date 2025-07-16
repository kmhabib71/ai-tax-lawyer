#!/usr/bin/env python3
"""
Simple test script to run OCR on a PDF file
"""

import os
import sys
import tempfile
from pathlib import Path

# Add the package to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

try:
    import pytesseract
    from PIL import Image
    from pdf2image import convert_from_path
    print("✓ All required libraries imported successfully")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

def simple_ocr_test(pdf_path):
    """
    Simple OCR test on a PDF file
    """
    print(f"\n🔍 Testing OCR on: {pdf_path}")
    
    if not os.path.exists(pdf_path):
        print(f"❌ File not found: {pdf_path}")
        return
    
    try:
        # Convert PDF to images
        print("📄 Converting PDF to images...")
        images = convert_from_path(pdf_path, dpi=300, first_page=1, last_page=1)
        
        if not images:
            print("❌ No images extracted from PDF")
            return
        
        # Get the first page
        image = images[0]
        print(f"✓ Extracted {len(images)} page(s), processing first page...")
        
        # Configure Tesseract for Bengali
        config = '--psm 6 -l ben+eng'
        
        # Extract text
        print("🔤 Extracting text...")
        text = pytesseract.image_to_string(image, config=config)
        
        # Display results
        print("\n" + "="*50)
        print("EXTRACTED TEXT:")
        print("="*50)
        print(text[:500] + "..." if len(text) > 500 else text)
        print("="*50)
        print(f"Total characters extracted: {len(text)}")
        
        # Save to file
        output_file = "ocr_result.txt"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"✓ Full text saved to: {output_file}")
        
    except Exception as e:
        print(f"❌ Error during OCR: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main test function"""
    print("🧪 Simple OCR Test")
    print("=" * 30)
    
    # Test with a sample PDF from downloads
    test_files = [
        "../scraper/downloads/income-tax-acts/ban/আয়কর_আইন-২০২৩.pdf",
        "../scraper/downloads/customs-acts/ban/কাস্টমস_আইন-২০২৩.pdf",
        "../scraper/downloads/customs-acts/ban/Customs_Act-1969_(Amendment)_(Again_Uploaded).pdf"
    ]
    
    for pdf_path in test_files:
        if os.path.exists(pdf_path):
            simple_ocr_test(pdf_path)
            break
    else:
        print("❌ No test files found. Please check the file paths.")

if __name__ == "__main__":
    main() 