#!/usr/bin/env python3
import os
import sys
import subprocess

print("🔧 SIMPLE POPPLER FIX")
print("=" * 30)

# Check if poppler directories exist
poppler_paths = [
    r"C:\Program Files\poppler\Library\bin",
    r"C:\Program Files\poppler\library\bin", 
    r"C:\Program Files\poppler\bin"
]

print("Checking poppler directories:")
found_path = None
for path in poppler_paths:
    if os.path.exists(path):
        print(f"✅ Found: {path}")
        found_path = path
        break
    else:
        print(f"❌ Not found: {path}")

if found_path:
    print(f"\n🔧 Adding {found_path} to PATH")
    current_path = os.environ.get('PATH', '')
    os.environ['PATH'] = found_path + os.pathsep + current_path
    print("✅ PATH updated for this session")
    
    # Test poppler command
    print("\n🧪 Testing poppler...")
    try:
        result = subprocess.run(['pdfinfo', '-v'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✅ Poppler working!")
            print(f"Version: {result.stdout.strip()}")
        else:
            print("❌ Poppler test failed")
    except Exception as e:
        print(f"❌ Poppler test error: {e}")
    
    # Test PDF conversion
    print("\n📄 Testing PDF conversion...")
    try:
        from pdf2image import convert_from_path
        
        test_pdf = "../scraper/downloads/customs-acts/ban/কাস্টমস_আইন-২০২৩.pdf"
        if os.path.exists(test_pdf):
            print(f"Converting: {os.path.basename(test_pdf)}")
            images = convert_from_path(test_pdf, dpi=300, first_page=1, last_page=1)
            
            if images:
                image = images[0]
                print(f"✅ Success! Image size: {image.size}")
                
                # Save converted image
                image.save("test_converted.png")
                print("✓ Saved: test_converted.png")
                
                # Test OCR
                import pytesseract
                pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
                
                text = pytesseract.image_to_string(image, config='--psm 6 -l ben+eng')
                if text.strip():
                    print(f"✅ OCR Success: {len(text)} characters")
                    with open("test_ocr.txt", "w", encoding="utf-8") as f:
                        f.write(text)
                    print("✓ Text saved: test_ocr.txt")
                    print(f"Preview: {text[:100]}...")
                else:
                    print("❌ No text extracted")
            else:
                print("❌ No images converted")
        else:
            print("❌ Test PDF not found")
    except Exception as e:
        print(f"❌ PDF conversion error: {e}")
        
else:
    print("\n❌ Poppler not found!")
    print("Please check your poppler installation:")
    print("1. Download from: https://github.com/oschwartz10612/poppler-windows/releases")
    print("2. Extract to C:\\Program Files\\poppler\\")
    print("3. Verify C:\\Program Files\\poppler\\Library\\bin\\ exists")
    print("4. Add to Windows PATH and restart terminal")

print("\n🎯 DONE!") 