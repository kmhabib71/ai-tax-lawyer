#!/usr/bin/env python3
"""
Batch OCR Processor for Bangladesh Tax Documents
Use this after poppler is installed
"""

import os
import sys
import pytesseract
from PIL import Image
from pdf2image import convert_from_path

# Configure Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def process_pdf_batch(input_folder, output_folder):
    """Process all PDFs in a folder"""
    
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    pdf_files = [f for f in os.listdir(input_folder) if f.endswith('.pdf')]
    
    print(f"Found {len(pdf_files)} PDF files to process")
    
    for i, pdf_file in enumerate(pdf_files, 1):
        print(f"\n[{i}/{len(pdf_files)}] Processing: {pdf_file}")
        
        pdf_path = os.path.join(input_folder, pdf_file)
        output_path = os.path.join(output_folder, pdf_file.replace('.pdf', '_extracted.txt'))
        
        try:
            # Convert PDF to images
            images = convert_from_path(pdf_path, dpi=300)
            
            all_text = []
            for page_num, image in enumerate(images, 1):
                print(f"  Processing page {page_num}/{len(images)}")
                
                # OCR with Bengali + English
                config = '--psm 6 -l ben+eng'
                text = pytesseract.image_to_string(image, config=config)
                
                all_text.append(f"--- PAGE {page_num} ---\n{text}\n")
            
            # Save combined text
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(all_text))
            
            print(f"  ✓ Saved to: {output_path}")
            
        except Exception as e:
            print(f"  ❌ Error: {e}")

# Usage examples:
if __name__ == "__main__":
    # Process income tax documents
    process_pdf_batch("../scraper/downloads/income-tax-acts/ban", "extracted_text/income-tax-acts")
    
    # Process customs documents  
    process_pdf_batch("../scraper/downloads/customs-acts/ban", "extracted_text/customs-acts")
    
    # Process VAT documents
    process_pdf_batch("../scraper/downloads/vat-acts/ban", "extracted_text/vat-acts")
