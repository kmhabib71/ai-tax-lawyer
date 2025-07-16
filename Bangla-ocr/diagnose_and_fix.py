#!/usr/bin/env python3
"""
Diagnose and Fix Poppler Issue
"""

import os
import sys
import subprocess
import pytesseract
from PIL import Image

# Configure Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def diagnose_poppler():
    """Diagnose poppler installation and PATH issues"""
    print("🔍 DIAGNOSING POPPLER INSTALLATION...")
    print("=" * 50)
    
    # Check current PATH
    current_path = os.environ.get('PATH', '')
    print(f"Current PATH contains poppler: {'poppler' in current_path.lower()}")
    
    # Check specific poppler paths
    poppler_paths = [
        r"C:\Program Files\poppler\Library\bin",
        r"C:\Program Files\poppler\library\bin",
        r"C:\Program Files\poppler\bin",
        r"C:\poppler\Library\bin",
        r"C:\poppler\library\bin",
        r"C:\poppler\bin"
    ]
    
    found_paths = []
    for path in poppler_paths:
        if os.path.exists(path):
            found_paths.append(path)
            print(f"✅ Found poppler at: {path}")
            
            # Check for key files
            pdftoppm = os.path.join(path, "pdftoppm.exe")
            pdfinfo = os.path.join(path, "pdfinfo.exe")
            
            if os.path.exists(pdftoppm):
                print(f"  ✓ pdftoppm.exe found")
            else:
                print(f"  ❌ pdftoppm.exe missing")
                
            if os.path.exists(pdfinfo):
                print(f"  ✓ pdfinfo.exe found")
            else:
                print(f"  ❌ pdfinfo.exe missing")
        else:
            print(f"❌ Not found: {path}")
    
    return found_paths

def test_poppler_command():
    """Test if poppler commands work"""
    print("\n🧪 TESTING POPPLER COMMANDS...")
    print("=" * 40)
    
    try:
        # Test pdfinfo command
        result = subprocess.run(['pdfinfo', '-v'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ pdfinfo command works")
            print(f"   Output: {result.stdout.strip()}")
            return True
        else:
            print("❌ pdfinfo command failed")
            print(f"   Error: {result.stderr}")
            return False
    except FileNotFoundError:
        print("❌ pdfinfo command not found in PATH")
        return False
    except subprocess.TimeoutExpired:
        print("❌ pdfinfo command timed out")
        return False
    except Exception as e:
        print(f"❌ pdfinfo test error: {e}")
        return False

def fix_poppler_path(found_paths):
    """Fix poppler PATH issue by manually adding to environment"""
    print("\n🔧 FIXING POPPLER PATH...")
    print("=" * 30)
    
    if not found_paths:
        print("❌ No poppler installation found")
        return False
    
    # Use the first found path
    poppler_path = found_paths[0]
    print(f"Using poppler path: {poppler_path}")
    
    # Add to current session PATH
    current_path = os.environ.get('PATH', '')
    if poppler_path not in current_path:
        new_path = poppler_path + os.pathsep + current_path
        os.environ['PATH'] = new_path
        print("✅ Added poppler to current session PATH")
    else:
        print("✅ Poppler already in PATH")
    
    return True

def test_pdf_conversion():
    """Test PDF conversion after fix"""
    print("\n📄 TESTING PDF CONVERSION...")
    print("=" * 35)
    
    try:
        from pdf2image import convert_from_path
        
        # Test files
        test_files = [
            "../scraper/downloads/customs-acts/ban/কাস্টমস_আইন-২০২৩.pdf",
            "../scraper/downloads/customs-acts/ban/Customs_Act-1969_(Amendment)_(Again_Uploaded).pdf"
        ]
        
        for pdf_path in test_files:
            if os.path.exists(pdf_path):
                print(f"\n🎯 Testing: {os.path.basename(pdf_path)}")
                
                try:
                    # Convert first page
                    images = convert_from_path(pdf_path, dpi=300, first_page=1, last_page=1)
                    
                    if images:
                        image = images[0]
                        print(f"✅ PDF converted successfully: {image.size}")
                        
                        # Save converted image
                        image_name = f"test_converted_{os.path.basename(pdf_path)}.png"
                        image.save(image_name)
                        print(f"✓ Saved converted image: {image_name}")
                        
                        # Run OCR
                        config = '--psm 6 -l ben+eng'
                        text = pytesseract.image_to_string(image, config=config)
                        
                        if text.strip():
                            print(f"✅ OCR successful: {len(text)} characters")
                            
                            # Save text
                            text_file = f"test_ocr_{os.path.basename(pdf_path)}.txt"
                            with open(text_file, 'w', encoding='utf-8') as f:
                                f.write(text)
                            print(f"✓ Text saved: {text_file}")
                            
                            # Show preview
                            preview = text[:150] + "..." if len(text) > 150 else text
                            print(f"Preview: {preview}")
                            
                            return True
                        else:
                            print("⚠️ OCR returned empty text")
                    else:
                        print("❌ No images converted")
                        
                except Exception as e:
                    print(f"❌ Conversion error: {e}")
                    continue
        
        print("❌ No successful conversions")
        return False
        
    except Exception as e:
        print(f"❌ Import or setup error: {e}")
        return False

def create_working_script():
    """Create a script with the fixed configuration"""
    print("\n📝 CREATING WORKING SCRIPT...")
    print("=" * 35)
    
    script_content = '''#!/usr/bin/env python3
"""
Working PDF OCR Script with Fixed Poppler Configuration
"""

import os
import sys
import pytesseract
from PIL import Image
from pdf2image import convert_from_path

# Configure Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'

# Configure Poppler path (add this to fix PATH issues)
poppler_paths = [
    r"C:\\Program Files\\poppler\\Library\\bin",
    r"C:\\Program Files\\poppler\\library\\bin",
    r"C:\\Program Files\\poppler\\bin",
    r"C:\\poppler\\Library\\bin"
]

# Add poppler to PATH
for path in poppler_paths:
    if os.path.exists(path):
        os.environ['PATH'] = path + os.pathsep + os.environ.get('PATH', '')
        print(f"✓ Using poppler from: {path}")
        break

def process_pdf_with_ocr(pdf_path):
    """Process a PDF file with OCR"""
    print(f"\\n📄 Processing: {os.path.basename(pdf_path)}")
    
    try:
        # Convert PDF to images
        images = convert_from_path(pdf_path, dpi=300, first_page=1, last_page=3)  # First 3 pages
        
        all_text = []
        for i, image in enumerate(images, 1):
            print(f"  Processing page {i}/{len(images)}")
            
            # OCR with Bengali + English
            config = '--psm 6 -l ben+eng'
            text = pytesseract.image_to_string(image, config=config)
            
            if text.strip():
                all_text.append(f"--- PAGE {i} ---\\n{text}\\n")
        
        # Combine all text
        combined_text = "\\n".join(all_text)
        
        if combined_text.strip():
            # Save results
            output_file = f"extracted_{os.path.basename(pdf_path)}.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(combined_text)
            
            print(f"✅ Success! Extracted {len(combined_text)} characters")
            print(f"✓ Saved to: {output_file}")
            
            # Show preview
            preview = combined_text[:200] + "..." if len(combined_text) > 200 else combined_text
            print(f"Preview: {preview}")
            
            return True
        else:
            print("❌ No text extracted")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    # Test files
    test_files = [
        "../scraper/downloads/customs-acts/ban/কাস্টমস_আইন-২০২৩.pdf",
        "../scraper/downloads/customs-acts/ban/Customs_Act-1969_(Amendment)_(Again_Uploaded).pdf"
    ]
    
    for pdf_path in test_files:
        if os.path.exists(pdf_path):
            process_pdf_with_ocr(pdf_path)
'''
    
    with open("working_pdf_ocr.py", "w", encoding="utf-8") as f:
        f.write(script_content)
    
    print("✅ Created: working_pdf_ocr.py")
    print("   Run with: python working_pdf_ocr.py")

def main():
    """Main diagnostic and fix function"""
    print("🔧 POPPLER DIAGNOSTIC AND FIX TOOL")
    print("=" * 60)
    
    # Step 1: Diagnose poppler installation
    found_paths = diagnose_poppler()
    
    # Step 2: Test poppler commands
    cmd_works = test_poppler_command()
    
    # Step 3: Fix PATH if needed
    if found_paths and not cmd_works:
        print("\n⚠️ Poppler found but not working - fixing PATH...")
        fix_poppler_path(found_paths)
        
        # Test again
        cmd_works = test_poppler_command()
    
    # Step 4: Test PDF conversion
    if found_paths:
        if test_pdf_conversion():
            print("\n🎉 SUCCESS! PDF OCR is now working!")
        else:
            print("\n⚠️ PDF conversion still not working")
    
    # Step 5: Create working script
    create_working_script()
    
    # Final summary
    print("\n" + "=" * 60)
    print("🎯 SUMMARY:")
    print("=" * 60)
    
    if found_paths:
        print(f"✅ Poppler installation found at: {found_paths[0]}")
        if cmd_works:
            print("✅ Poppler commands working")
        else:
            print("⚠️ Poppler commands still not working")
            print("💡 Try: Close ALL terminals, reopen, and run again")
    else:
        print("❌ Poppler not found")
        print("💡 Download from: https://github.com/oschwartz10612/poppler-windows/releases")
    
    print("\n📋 NEXT STEPS:")
    print("1. If poppler is found, run: python working_pdf_ocr.py")
    print("2. If still not working, restart ALL terminals and try again")
    print("3. Check that poppler files are actually in the directory")

if __name__ == "__main__":
    main() 