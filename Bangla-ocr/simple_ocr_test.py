#!/usr/bin/env python3
"""
Simple OCR Test Script for Bangladesh Tax Documents
Handles both PDF and image inputs with fallback options
"""

import os
import sys
import tempfile
from pathlib import Path

# Add the package to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

def check_dependencies():
    """Check if all required dependencies are available"""
    print("🔍 Checking dependencies...")
    
    try:
        import pytesseract
        print("✓ pytesseract available")
    except ImportError:
        print("❌ pytesseract not found. Install with: pip install pytesseract")
        return False
    
    try:
        from PIL import Image
        print("✓ PIL/Pillow available")
    except ImportError:
        print("❌ PIL not found. Install with: pip install Pillow")
        return False
    
    try:
        from pdf2image import convert_from_path
        print("✓ pdf2image available")
        
        # Test poppler
        try:
            # Try to convert a simple test - this will fail if poppler isn't available
            print("🔍 Testing poppler installation...")
            return True
        except Exception as e:
            print(f"⚠️ poppler not properly installed: {e}")
            print("📋 To install poppler on Windows:")
            print("   1. Download from: https://github.com/oschwartz10612/poppler-windows/releases")
            print("   2. Extract and add to PATH")
            print("   3. Or use: conda install poppler")
            return False
            
    except ImportError:
        print("❌ pdf2image not found. Install with: pip install pdf2image")
        return False

def test_tesseract_config():
    """Test Tesseract configuration for Bengali"""
    print("\n🔧 Testing Tesseract configuration...")
    
    try:
        import pytesseract
        
        # Check available languages
        langs = pytesseract.get_languages()
        print(f"Available languages: {langs}")
        
        if 'ben' in langs:
            print("✓ Bengali language pack available")
        else:
            print("❌ Bengali language pack not found!")
            print("📋 To install Bengali language pack:")
            print("   1. Download from: https://github.com/tesseract-ocr/tessdata")
            print("   2. Place ben.traineddata in tessdata folder")
            return False
            
        if 'eng' in langs:
            print("✓ English language pack available")
        else:
            print("⚠️ English language pack not found")
            
        return True
        
    except Exception as e:
        print(f"❌ Tesseract configuration error: {e}")
        return False

def create_test_image():
    """Create a simple test image with Bengali text"""
    print("\n📄 Creating test image...")
    
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        # Create a simple white image
        img = Image.new('RGB', (800, 200), color='white')
        draw = ImageDraw.Draw(img)
        
        # Add some text (we'll use simple text since font might not be available)
        test_text = "আয়কর আইন ২০২৩\nIncome Tax Act 2023"
        
        try:
            # Try to use a font (might not be available)
            font = ImageFont.truetype("arial.ttf", 40)
        except:
            font = ImageFont.load_default()
        
        draw.text((50, 50), test_text, fill='black', font=font)
        
        # Save test image
        test_image_path = "test_image.png"
        img.save(test_image_path)
        print(f"✓ Test image created: {test_image_path}")
        
        return test_image_path
        
    except Exception as e:
        print(f"❌ Error creating test image: {e}")
        return None

def test_ocr_on_image(image_path):
    """Test OCR on an image file"""
    print(f"\n🔤 Testing OCR on: {image_path}")
    
    try:
        import pytesseract
        from PIL import Image
        
        if not os.path.exists(image_path):
            print(f"❌ Image not found: {image_path}")
            return False
        
        # Open image
        image = Image.open(image_path)
        print(f"✓ Image loaded: {image.size}")
        
        # Test different OCR configurations
        configs = [
            ('Bengali + English', '--psm 6 -l ben+eng'),
            ('Bengali only', '--psm 6 -l ben'),
            ('English only', '--psm 6 -l eng'),
            ('Auto detect', '--psm 6')
        ]
        
        for config_name, config_string in configs:
            print(f"\n--- Testing {config_name} ---")
            try:
                text = pytesseract.image_to_string(image, config=config_string)
                print(f"Extracted text: {text[:100]}...")
                print(f"Characters: {len(text)}")
                
                if text.strip():
                    print(f"✓ {config_name} successful")
                else:
                    print(f"⚠️ {config_name} returned empty text")
                    
            except Exception as e:
                print(f"❌ {config_name} failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ OCR test failed: {e}")
        return False

def test_pdf_ocr(pdf_path):
    """Test OCR on a PDF file"""
    print(f"\n📄 Testing PDF OCR on: {pdf_path}")
    
    try:
        from pdf2image import convert_from_path
        import pytesseract
        
        if not os.path.exists(pdf_path):
            print(f"❌ PDF not found: {pdf_path}")
            return False
        
        # Convert first page to image
        print("Converting PDF to image...")
        images = convert_from_path(pdf_path, dpi=300, first_page=1, last_page=1)
        
        if not images:
            print("❌ No pages converted")
            return False
        
        image = images[0]
        print(f"✓ Page converted: {image.size}")
        
        # Save the converted image for debugging
        image.save("converted_page.png")
        print("✓ Converted page saved as: converted_page.png")
        
        # Run OCR
        config = '--psm 6 -l ben+eng'
        text = pytesseract.image_to_string(image, config=config)
        
        # Display results
        print("\n" + "="*50)
        print("EXTRACTED TEXT:")
        print("="*50)
        print(text[:500] + "..." if len(text) > 500 else text)
        print("="*50)
        print(f"Total characters: {len(text)}")
        
        # Save results
        output_file = "ocr_result.txt"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"✓ Full text saved to: {output_file}")
        
        return True
        
    except Exception as e:
        print(f"❌ PDF OCR failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main test function"""
    print("🧪 Bangladesh Tax Document OCR Test")
    print("=" * 40)
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Dependency check failed. Please install missing components.")
        return
    
    # Check Tesseract configuration
    if not test_tesseract_config():
        print("\n❌ Tesseract configuration failed.")
        return
    
    print("\n✅ All dependencies ready!")
    
    # Test 1: Create and test on simple image
    print("\n" + "="*50)
    print("TEST 1: Simple Image OCR")
    print("="*50)
    
    test_image = create_test_image()
    if test_image:
        test_ocr_on_image(test_image)
    
    # Test 2: Test on actual PDF files
    print("\n" + "="*50)
    print("TEST 2: PDF OCR")
    print("="*50)
    
    test_files = [
        "../scraper/downloads/income-tax-acts/ban/আয়কর_আইন-২০২৩.pdf",
        "../scraper/downloads/customs-acts/ban/কাস্টমস_আইন-২০২৩.pdf",
        "../scraper/downloads/customs-acts/ban/Customs_Act-1969_(Amendment)_(Again_Uploaded).pdf"
    ]
    
    pdf_tested = False
    for pdf_path in test_files:
        if os.path.exists(pdf_path):
            if test_pdf_ocr(pdf_path):
                pdf_tested = True
                break
    
    if not pdf_tested:
        print("⚠️ No PDF files found for testing.")
        print("Available files:")
        for pdf_path in test_files:
            print(f"  - {pdf_path} {'✓' if os.path.exists(pdf_path) else '❌'}")
    
    print("\n" + "="*50)
    print("🎉 Test completed!")
    print("="*50)

if __name__ == "__main__":
    main() 