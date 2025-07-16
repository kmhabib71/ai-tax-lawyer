#!/usr/bin/env python3
"""
Direct Fix for PDF OCR - Manual poppler path configuration
"""

import os
import sys
import pytesseract
from PIL import Image

# Configure Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def fix_poppler_path():
    """Configure poppler path manually"""
    print("🔧 Configuring poppler path...")
    
    # Common poppler installation paths
    possible_paths = [
        r"C:\Program Files\poppler\bin",
        r"C:\Program Files (x86)\poppler\bin",
        r"C:\poppler\bin",
        r"C:\tools\poppler\bin"
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            print(f"✓ Found poppler at: {path}")
            os.environ['PATH'] = path + os.pathsep + os.environ.get('PATH', '')
            return True
    
    print("❌ Poppler not found in common locations")
    return False

def test_pdf_to_image_simple(pdf_path):
    """Simple test to convert PDF to image"""
    print(f"\n📄 Testing PDF conversion: {os.path.basename(pdf_path)}")
    
    try:
        # Try to import pdf2image
        from pdf2image import convert_from_path
        
        # Convert first page
        images = convert_from_path(pdf_path, dpi=300, first_page=1, last_page=1)
        
        if images:
            image = images[0]
            print(f"✅ PDF converted successfully: {image.size}")
            
            # Save converted image
            image_name = f"converted_{os.path.basename(pdf_path)}.png"
            image.save(image_name)
            print(f"✓ Saved: {image_name}")
            
            # Run OCR
            config = '--psm 6 -l ben+eng'
            text = pytesseract.image_to_string(image, config=config)
            
            if text.strip():
                print(f"✅ OCR successful: {len(text)} characters extracted")
                
                # Save text
                text_file = f"ocr_{os.path.basename(pdf_path)}.txt"
                with open(text_file, 'w', encoding='utf-8') as f:
                    f.write(text)
                print(f"✓ Text saved: {text_file}")
                
                # Show preview
                preview = text[:200] + "..." if len(text) > 200 else text
                print(f"Preview: {preview}")
                
                return True
            else:
                print("❌ No text extracted")
                return False
        else:
            print("❌ No images converted")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Main fix function"""
    print("🚀 DIRECT FIX for PDF OCR Error")
    print("=" * 50)
    
    # Test basic setup
    print("🔧 Testing basic setup...")
    
    try:
        # Test Tesseract
        version = pytesseract.get_tesseract_version()
        print(f"✅ Tesseract: {version}")
        
        langs = pytesseract.get_languages()
        print(f"✅ Languages: {langs}")
        
    except Exception as e:
        print(f"❌ Tesseract error: {e}")
        return
    
    # Try to fix poppler
    if fix_poppler_path():
        print("✅ Poppler configured")
    else:
        print("⚠️ Poppler not found - downloading manually...")
        
        # Manual download instructions
        print("\n📋 MANUAL FIX INSTRUCTIONS:")
        print("1. Download poppler from:")
        print("   https://github.com/oschwartz10612/poppler-windows/releases/latest")
        print("2. Extract to C:\\poppler\\")
        print("3. Add C:\\poppler\\bin to Windows PATH")
        print("4. Restart terminal")
        print("5. Run this script again")
        
        # Try to continue anyway
        print("\n🔄 Attempting to continue without poppler fix...")
    
    # Test PDF files
    test_files = [
        "../scraper/downloads/customs-acts/ban/কাস্টমস_আইন-২০২৩.pdf",
        "../scraper/downloads/customs-acts/ban/Customs_Act-1969_(Amendment)_(Again_Uploaded).pdf"
    ]
    
    success = False
    for pdf_path in test_files:
        if os.path.exists(pdf_path):
            if test_pdf_to_image_simple(pdf_path):
                success = True
                break
    
    if success:
        print("\n🎉 SUCCESS! PDF OCR is now working!")
    else:
        print("\n❌ PDF OCR still not working. Please install poppler manually.")

if __name__ == "__main__":
    main() 