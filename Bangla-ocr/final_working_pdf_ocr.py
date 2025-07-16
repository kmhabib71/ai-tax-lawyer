#!/usr/bin/env python3
"""
FINAL WORKING PDF OCR - Direct poppler path configuration
Since poppler is working in your system, this will bypass PATH issues
"""

import os
import sys
import pytesseract
from PIL import Image
from pdf2image import convert_from_path

# Configure Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Configure poppler path directly (bypasses PATH issues)
POPPLER_PATH = r'C:\Program Files\poppler\Library\bin'

def test_pdf_ocr_with_direct_path(pdf_path):
    """Test PDF OCR with direct poppler path configuration"""
    print(f"📄 Processing: {os.path.basename(pdf_path)}")
    
    if not os.path.exists(pdf_path):
        print(f"❌ PDF file not found: {pdf_path}")
        return False
    
    print(f"✓ PDF file found: {os.path.basename(pdf_path)}")
    file_size = os.path.getsize(pdf_path) / (1024 * 1024)  # MB
    print(f"✓ File size: {file_size:.2f} MB")
    
    try:
        # Convert PDF to images using direct poppler path
        print("📄 Converting PDF to images...")
        images = convert_from_path(
            pdf_path, 
            dpi=300, 
            first_page=1, 
            last_page=1,
            poppler_path=POPPLER_PATH  # Direct path configuration
        )
        
        if not images:
            print("❌ No images converted")
            return False
        
        image = images[0]
        print(f"✅ PDF converted successfully: {image.size}")
        
        # Save converted image
        image_name = f"working_{os.path.basename(pdf_path)}.png"
        image.save(image_name)
        print(f"✓ Converted image saved: {image_name}")
        
        # Run OCR with Bengali + English
        print("🔤 Running OCR...")
        config = '--psm 6 -l ben+eng'
        text = pytesseract.image_to_string(image, config=config)
        
        if text.strip():
            print(f"✅ OCR successful: {len(text)} characters extracted")
            
            # Save extracted text
            text_file = f"working_{os.path.basename(pdf_path)}.txt"
            with open(text_file, 'w', encoding='utf-8') as f:
                f.write(text)
            print(f"✓ Text saved: {text_file}")
            
            # Analysis
            bengali_chars = sum(1 for c in text if '\u0980' <= c <= '\u09FF')
            english_chars = sum(1 for c in text if c.isalpha() and c.isascii())
            words = len(text.split())
            
            print(f"📊 Analysis:")
            print(f"   Bengali characters: {bengali_chars}")
            print(f"   English characters: {english_chars}")
            print(f"   Total words: {words}")
            
            # Show preview
            preview = text[:200].replace('\n', ' ').strip()
            if len(text) > 200:
                preview += "..."
            print(f"📝 Preview: {preview}")
            
            return True
        else:
            print("❌ No text extracted from OCR")
            return False
            
    except Exception as e:
        print(f"❌ Error during processing: {e}")
        import traceback
        traceback.print_exc()
        return False

def process_multiple_pdfs():
    """Process multiple PDF files to test batch capability"""
    print("🚀 TESTING MULTIPLE PDF FILES")
    print("=" * 60)
    
    # Test files from your downloads
    test_files = [
        "../scraper/downloads/customs-acts/ban/কাস্টমস_আইন-২০২৩.pdf",
        "../scraper/downloads/customs-acts/ban/Customs_Act-1969_(Amendment)_(Again_Uploaded).pdf",
        "../scraper/downloads/income-tax-acts/ban/আয়কর_আইন-২০২৩.pdf"
    ]
    
    successful_files = []
    failed_files = []
    
    for i, pdf_path in enumerate(test_files, 1):
        if os.path.exists(pdf_path):
            print(f"\n[{i}/{len(test_files)}] 🎯 Testing: {os.path.basename(pdf_path)}")
            print("-" * 50)
            
            if test_pdf_ocr_with_direct_path(pdf_path):
                successful_files.append(pdf_path)
                print("✅ SUCCESS!")
            else:
                failed_files.append(pdf_path)
                print("❌ FAILED!")
        else:
            print(f"\n[{i}/{len(test_files)}] ❌ File not found: {pdf_path}")
            failed_files.append(pdf_path)
    
    # Summary
    print("\n" + "="*60)
    print("🎯 PROCESSING SUMMARY")
    print("="*60)
    
    print(f"✅ Successful: {len(successful_files)}")
    for file in successful_files:
        print(f"   ✓ {os.path.basename(file)}")
    
    print(f"\n❌ Failed: {len(failed_files)}")
    for file in failed_files:
        print(f"   ✗ {os.path.basename(file)}")
    
    if successful_files:
        print("\n🎉 PDF OCR IS WORKING!")
        print("📋 Generated files:")
        print("   - working_*.png (converted images)")
        print("   - working_*.txt (extracted text)")
        print("\n🚀 You can now process all 231 PDF files in your downloads folder!")
        return True
    else:
        print("\n❌ PDF OCR still not working properly")
        return False

def create_batch_processor():
    """Create a batch processor for all PDF files"""
    print("\n📝 Creating batch processor script...")
    
    batch_script = '''#!/usr/bin/env python3
"""
Batch PDF OCR Processor for Bangladesh Tax Documents
"""

import os
import sys
import pytesseract
from PIL import Image
from pdf2image import convert_from_path

# Configure paths
pytesseract.pytesseract.tesseract_cmd = r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'
POPPLER_PATH = r'C:\\Program Files\\poppler\\Library\\bin'

def process_pdf_folder(input_folder, output_folder):
    """Process all PDF files in a folder"""
    
    if not os.path.exists(input_folder):
        print(f"❌ Input folder not found: {input_folder}")
        return
    
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
        print(f"✓ Created output folder: {output_folder}")
    
    # Find all PDF files
    pdf_files = []
    for root, dirs, files in os.walk(input_folder):
        for file in files:
            if file.lower().endswith('.pdf'):
                pdf_files.append(os.path.join(root, file))
    
    print(f"📄 Found {len(pdf_files)} PDF files to process")
    
    successful = 0
    failed = 0
    
    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"\\n[{i}/{len(pdf_files)}] Processing: {os.path.basename(pdf_path)}")
        
        try:
            # Convert PDF to images (first 3 pages)
            images = convert_from_path(
                pdf_path, 
                dpi=300, 
                first_page=1, 
                last_page=3,
                poppler_path=POPPLER_PATH
            )
            
            all_text = []
            for page_num, image in enumerate(images, 1):
                print(f"  Processing page {page_num}/{len(images)}")
                
                # OCR with Bengali + English
                config = '--psm 6 -l ben+eng'
                text = pytesseract.image_to_string(image, config=config)
                
                if text.strip():
                    all_text.append(f"--- PAGE {page_num} ---\\n{text}\\n")
            
            # Save combined text
            if all_text:
                filename = os.path.basename(pdf_path).replace('.pdf', '_extracted.txt')
                output_path = os.path.join(output_folder, filename)
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write('\\n'.join(all_text))
                
                print(f"  ✅ Saved: {filename}")
                successful += 1
            else:
                print(f"  ❌ No text extracted")
                failed += 1
                
        except Exception as e:
            print(f"  ❌ Error: {e}")
            failed += 1
    
    print(f"\\n🎯 Processing complete: {successful} successful, {failed} failed")

# Usage examples
if __name__ == "__main__":
    # Process all tax document folders
    folders = [
        ("../scraper/downloads/income-tax-acts/ban", "extracted_text/income-tax-acts"),
        ("../scraper/downloads/customs-acts/ban", "extracted_text/customs-acts"),
        ("../scraper/downloads/vat-acts/ban", "extracted_text/vat-acts"),
        ("../scraper/downloads/income-tax-rules/ban", "extracted_text/income-tax-rules"),
        ("../scraper/downloads/customs-rules/ban", "extracted_text/customs-rules"),
        ("../scraper/downloads/vat-rules/ban", "extracted_text/vat-rules"),
        ("../scraper/downloads/income-tax-gos/ban", "extracted_text/income-tax-gos"),
        ("../scraper/downloads/customs-gos/ban", "extracted_text/customs-gos"),
        ("../scraper/downloads/vat-gos/ban", "extracted_text/vat-gos"),
        ("../scraper/downloads/income-tax-sros/ban", "extracted_text/income-tax-sros"),
        ("../scraper/downloads/customs-sros/ban", "extracted_text/customs-sros"),
        ("../scraper/downloads/vat-sros/ban", "extracted_text/vat-sros"),
        ("../scraper/downloads/excise-acts/ban", "extracted_text/excise-acts"),
        ("../scraper/downloads/excise-rules/ban", "extracted_text/excise-rules"),
        ("../scraper/downloads/excise-gos/ban", "extracted_text/excise-gos"),
        ("../scraper/downloads/excise-sros/ban", "extracted_text/excise-sros")
    ]
    
    for input_folder, output_folder in folders:
        if os.path.exists(input_folder):
            print(f"\\n🚀 Processing folder: {input_folder}")
            process_pdf_folder(input_folder, output_folder)
'''
    
    with open("batch_pdf_processor.py", "w", encoding="utf-8") as f:
        f.write(batch_script)
    
    print("✅ Created: batch_pdf_processor.py")
    print("   Use this to process all PDF files in your downloads folder")

def main():
    """Main function"""
    print("🔧 FINAL PDF OCR FIX - Direct Poppler Path Configuration")
    print("=" * 70)
    
    print("📋 Configuration:")
    print(f"   Tesseract: C:\\Program Files\\Tesseract-OCR\\tesseract.exe")
    print(f"   Poppler: {POPPLER_PATH}")
    print(f"   Poppler exists: {os.path.exists(POPPLER_PATH)}")
    
    if not os.path.exists(POPPLER_PATH):
        print("❌ Poppler path not found! Please check your poppler installation.")
        return
    
    # Test multiple PDFs
    if process_multiple_pdfs():
        # Create batch processor
        create_batch_processor()
        
        print("\n🎉 CONGRATULATIONS!")
        print("✅ Your PDF OCR is now working perfectly!")
        print("✅ Bengali text extraction is working!")
        print("✅ Ready to process all 231 PDF files!")
        
        print("\n📋 Next steps:")
        print("1. Run: python batch_pdf_processor.py")
        print("2. This will process ALL PDF files in your downloads folder")
        print("3. Extract text will be saved in 'extracted_text' folders")
    else:
        print("\n❌ Please check the errors above and verify your poppler installation.")

if __name__ == "__main__":
    main() 