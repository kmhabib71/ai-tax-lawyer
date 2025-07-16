#!/usr/bin/env python3
"""
Batch PDF OCR Processor for Bangladesh Tax Documents
"""

import os
import sys
import pytesseract
from PIL import Image
from pdf2image import convert_from_path

# Configure paths
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
POPPLER_PATH = r'C:\Program Files\poppler\Library\bin'

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
        print(f"\n[{i}/{len(pdf_files)}] Processing: {os.path.basename(pdf_path)}")
        
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
                    all_text.append(f"--- PAGE {page_num} ---\n{text}\n")
            
            # Save combined text
            if all_text:
                filename = os.path.basename(pdf_path).replace('.pdf', '_extracted.txt')
                output_path = os.path.join(output_folder, filename)
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(all_text))
                
                print(f"  ✅ Saved: {filename}")
                successful += 1
            else:
                print(f"  ❌ No text extracted")
                failed += 1
                
        except Exception as e:
            print(f"  ❌ Error: {e}")
            failed += 1
    
    print(f"\n🎯 Processing complete: {successful} successful, {failed} failed")

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
            print(f"\n🚀 Processing folder: {input_folder}")
            process_pdf_folder(input_folder, output_folder)
