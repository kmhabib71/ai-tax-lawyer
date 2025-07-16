#!/usr/bin/env python3
"""
Working OCR Test Script for Bangladesh Tax Documents
Fixes Tesseract path and tests OCR functionality
"""

import os
import sys
import pytesseract
from PIL import Image, ImageDraw, ImageFont
from pdf2image import convert_from_path

# Configure Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def test_tesseract_setup():
    """Test Tesseract configuration"""
    print("🔧 Testing Tesseract setup...")
    
    try:
        # Test version
        version = pytesseract.get_tesseract_version()
        print(f"✓ Tesseract version: {version}")
        
        # Test languages
        languages = pytesseract.get_languages()
        print(f"✓ Available languages: {languages}")
        
        if 'ben' in languages:
            print("✅ Bengali language pack available")
        else:
            print("❌ Bengali language pack missing")
            
        if 'eng' in languages:
            print("✅ English language pack available")
        else:
            print("⚠️ English language pack missing")
            
        return 'ben' in languages
        
    except Exception as e:
        print(f"❌ Tesseract test failed: {e}")
        return False

def create_test_image():
    """Create a test image with Bengali text"""
    print("\n📄 Creating test image...")
    
    try:
        # Create image
        img = Image.new('RGB', (600, 200), color='white')
        draw = ImageDraw.Draw(img)
        
        # Add Bengali and English text
        text = "আয়কর আইন ২০২৩\nIncome Tax Act 2023\nকাস্টমস আইন"
        
        try:
            font = ImageFont.truetype("arial.ttf", 24)
        except:
            font = ImageFont.load_default()
        
        draw.text((20, 30), text, fill='black', font=font)
        
        # Save image
        img.save("test_bengali.png")
        print("✓ Test image created: test_bengali.png")
        
        return img
        
    except Exception as e:
        print(f"❌ Error creating test image: {e}")
        return None

def test_ocr_on_image(image):
    """Test OCR on the created image"""
    print("\n🔤 Testing OCR on image...")
    
    try:
        # Test different configurations
        configs = [
            ('Bengali + English', '--psm 6 -l ben+eng'),
            ('Bengali only', '--psm 6 -l ben'),
            ('English only', '--psm 6 -l eng')
        ]
        
        best_result = ""
        best_config = ""
        
        for config_name, config_string in configs:
            try:
                text = pytesseract.image_to_string(image, config=config_string)
                print(f"\n--- {config_name} ---")
                print(f"Result: {text.strip()}")
                print(f"Length: {len(text.strip())}")
                
                if len(text.strip()) > len(best_result):
                    best_result = text.strip()
                    best_config = config_name
                    
            except Exception as e:
                print(f"❌ {config_name} failed: {e}")
        
        print(f"\n✅ Best result from {best_config}: {best_result}")
        return len(best_result) > 0
        
    except Exception as e:
        print(f"❌ OCR test failed: {e}")
        return False

def test_pdf_ocr(pdf_path):
    """Test OCR on a PDF file"""
    print(f"\n📄 Testing PDF OCR: {pdf_path}")
    
    try:
        # Check if file exists
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
        image.save("converted_page.png")
        print("✓ Converted page saved as: converted_page.png")
        
        # Run OCR with Bengali + English
        print("🔤 Running OCR...")
        config = '--psm 6 -l ben+eng'
        text = pytesseract.image_to_string(image, config=config)
        
        # Display results
        print("\n" + "="*60)
        print("EXTRACTED TEXT:")
        print("="*60)
        
        if text.strip():
            # Show first 300 characters
            preview = text[:300] + "..." if len(text) > 300 else text
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
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main test function"""
    print("🚀 Bangladesh Tax Document OCR - Working Test")
    print("=" * 60)
    
    # Step 1: Test Tesseract setup
    if not test_tesseract_setup():
        print("❌ Tesseract setup failed. Please check installation.")
        return
    
    # Step 2: Test image OCR
    print("\n" + "="*60)
    print("STEP 1: Testing Image OCR")
    print("="*60)
    
    test_image = create_test_image()
    if test_image and test_ocr_on_image(test_image):
        print("✅ Image OCR working!")
    else:
        print("❌ Image OCR failed")
    
    # Step 3: Test PDF OCR
    print("\n" + "="*60)
    print("STEP 2: Testing PDF OCR")
    print("="*60)
    
    # Test files to try
    test_files = [
        "../scraper/downloads/income-tax-acts/ban/আয়কর_আইন-২০২৩.pdf",
        "../scraper/downloads/customs-acts/ban/কাস্টমস_আইন-২০২৩.pdf",
        "../scraper/downloads/customs-acts/ban/Customs_Act-1969_(Amendment)_(Again_Uploaded).pdf"
    ]
    
    pdf_success = False
    for pdf_path in test_files:
        if os.path.exists(pdf_path):
            print(f"\n🎯 Testing: {os.path.basename(pdf_path)}")
            if test_pdf_ocr(pdf_path):
                pdf_success = True
                print("✅ PDF OCR successful!")
                break
            else:
                print("❌ PDF OCR failed for this file")
    
    if not pdf_success:
        print("\n⚠️ No PDF files found or all failed.")
        print("Available files:")
        for pdf_path in test_files:
            exists = "✅" if os.path.exists(pdf_path) else "❌"
            print(f"  {exists} {pdf_path}")
    
    # Final summary
    print("\n" + "="*60)
    print("🎉 TEST COMPLETED!")
    print("="*60)
    
    if pdf_success:
        print("✅ OCR is working on your PDF files!")
        print("\n📋 Next steps:")
        print("1. Check the generated files:")
        print("   - converted_page.png (to see the converted image)")
        print("   - ocr_result_*.txt (extracted text)")
        print("2. Use this setup for batch processing your documents")
        print("3. Adjust OCR settings as needed for better accuracy")
    else:
        print("❌ OCR setup needs attention")

if __name__ == "__main__":
    main() 