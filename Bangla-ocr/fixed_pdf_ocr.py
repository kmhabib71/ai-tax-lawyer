#!/usr/bin/env python3
"""
Fixed PDF OCR Script - Automatically handles poppler installation
"""

import os
import sys
import subprocess
import urllib.request
import zipfile
import tempfile
from pathlib import Path
import pytesseract
from PIL import Image

# Configure Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def download_and_setup_poppler():
    """Download and setup poppler if not available"""
    print("📥 Setting up poppler for PDF processing...")
    
    # Check if poppler is already available
    poppler_path = os.path.join(os.getcwd(), "poppler-windows", "Library", "bin")
    if os.path.exists(poppler_path):
        print("✓ Poppler already available locally")
        return poppler_path
    
    try:
        # Download poppler
        poppler_url = "https://github.com/oschwartz10612/poppler-windows/releases/download/v23.08.0-0/Release-23.08.0-0.zip"
        zip_path = "poppler-windows.zip"
        
        print("📥 Downloading poppler...")
        urllib.request.urlretrieve(poppler_url, zip_path)
        
        # Extract poppler
        print("📂 Extracting poppler...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall("poppler-windows")
        
        # Clean up
        os.remove(zip_path)
        
        poppler_path = os.path.join(os.getcwd(), "poppler-windows", "Library", "bin")
        if os.path.exists(poppler_path):
            print("✅ Poppler setup successful!")
            return poppler_path
        else:
            print("❌ Poppler setup failed - path not found")
            return None
            
    except Exception as e:
        print(f"❌ Error setting up poppler: {e}")
        return None

def test_pdf_ocr_with_poppler(pdf_path, poppler_path=None):
    """Test PDF OCR with poppler configuration"""
    print(f"\n📄 Testing PDF OCR: {os.path.basename(pdf_path)}")
    
    try:
        # Configure poppler path if provided
        if poppler_path:
            os.environ['PATH'] = poppler_path + os.pathsep + os.environ.get('PATH', '')
        
        from pdf2image import convert_from_path
        
        if not os.path.exists(pdf_path):
            print(f"❌ PDF file not found: {pdf_path}")
            return False
        
        print(f"✓ PDF file found: {os.path.basename(pdf_path)}")
        file_size = os.path.getsize(pdf_path) / (1024 * 1024)  # MB
        print(f"✓ File size: {file_size:.2f} MB")
        
        # Convert first page to image
        print("📄 Converting PDF to image...")
        images = convert_from_path(pdf_path, dpi=300, first_page=1, last_page=1)
        
        if not images:
            print("❌ No pages converted")
            return False
        
        image = images[0]
        print(f"✓ Page converted successfully: {image.size}")
        
        # Save converted image for inspection
        image_path = f"converted_{os.path.basename(pdf_path)}.png"
        image.save(image_path)
        print(f"✓ Converted page saved as: {image_path}")
        
        # Run OCR with Bengali + English
        print("🔤 Running OCR...")
        config = '--psm 6 -l ben+eng'
        text = pytesseract.image_to_string(image, config=config)
        
        # Display results
        print("\n" + "="*60)
        print("EXTRACTED TEXT:")
        print("="*60)
        
        if text.strip():
            # Show first 500 characters
            preview = text[:500] + "..." if len(text) > 500 else text
            print(preview)
            print("="*60)
            print(f"Total characters extracted: {len(text)}")
            
            # Save full text
            output_file = f"ocr_result_{os.path.basename(pdf_path)}.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(text)
            print(f"✓ Full text saved to: {output_file}")
            
            # Analysis
            bengali_chars = sum(1 for c in text if '\u0980' <= c <= '\u09FF')
            english_chars = sum(1 for c in text if c.isalpha() and c.isascii())
            
            print(f"✓ Bengali characters: {bengali_chars}")
            print(f"✓ English characters: {english_chars}")
            print(f"✓ Total words: {len(text.split())}")
            
            return True
        else:
            print("❌ No text extracted")
            return False
            
    except Exception as e:
        print(f"❌ PDF OCR failed: {e}")
        return False

def main():
    """Main function to fix and test PDF OCR"""
    print("🔧 FIXING PDF OCR - Bangladesh Tax Documents")
    print("=" * 60)
    
    # Step 1: Setup poppler
    poppler_path = download_and_setup_poppler()
    
    if not poppler_path:
        print("❌ Could not setup poppler automatically.")
        print("📋 Manual installation needed:")
        print("1. Download: https://github.com/oschwartz10612/poppler-windows/releases")
        print("2. Extract and add bin folder to PATH")
        print("3. Restart terminal")
        return
    
    # Step 2: Test PDF files
    print("\n📄 Testing PDF OCR...")
    
    test_files = [
        "../scraper/downloads/customs-acts/ban/কাস্টমস_আইন-২০২৩.pdf",
        "../scraper/downloads/customs-acts/ban/Customs_Act-1969_(Amendment)_(Again_Uploaded).pdf",
        "../scraper/downloads/income-tax-acts/ban/আয়কর_আইন-২০২৩.pdf"
    ]
    
    success_count = 0
    for pdf_path in test_files:
        if os.path.exists(pdf_path):
            print(f"\n🎯 Testing: {os.path.basename(pdf_path)}")
            if test_pdf_ocr_with_poppler(pdf_path, poppler_path):
                success_count += 1
                print("✅ PDF OCR successful!")
            else:
                print("❌ PDF OCR failed for this file")
    
    # Summary
    print("\n" + "="*60)
    print("🎉 RESULTS:")
    print("="*60)
    
    if success_count > 0:
        print(f"✅ Successfully processed {success_count} PDF files!")
        print("✅ OCR is now working on your PDF documents!")
        print("\n📋 Files generated:")
        print("- converted_*.png (converted images)")
        print("- ocr_result_*.txt (extracted text)")
        print("\n🚀 You can now process all 231 PDF files in your downloads folder!")
    else:
        print("❌ No PDF files processed successfully")
        print("Please check the error messages above")

if __name__ == "__main__":
    main() 