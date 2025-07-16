#!/usr/bin/env python3
"""
Script to extract text from Bangla PDF using OCR
"""

import os
import sys
import pytesseract
from pdf2image import convert_from_path

# Configure Tesseract path (adjust if needed)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Configure Poppler path - adjust the subpath if the structure is different (e.g., add Release-xxx/poppler-xxx if present)
poppler_path = os.path.join(os.path.dirname(__file__), 'poppler', 'Library', 'bin')

# PDF file to process (relative to Bangla-ocr directory)
pdf_path = '../scraper/downloads/vat-sros/ban/এসআরও_নং-১৭০-আইন_২০২৫_২৯৮-মূসক.pdf'

# Output file
output_path = 'extracted_text.txt'

def main():
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        sys.exit(1)

    print(f"Processing PDF: {pdf_path}")

    try:
        # Convert PDF to images using local poppler
        images = convert_from_path(
            pdf_path,
            dpi=300,
            poppler_path=poppler_path
        )

        all_text = []

        for page_num, image in enumerate(images, 1):
            print(f"Processing page {page_num}/{len(images)}")

            # Perform OCR with Bengali + English
            config = '--psm 6 -l ben+eng'
            text = pytesseract.image_to_string(image, config=config)

            all_text.append(f"--- PAGE {page_num} ---\n{text}\n")

        # Save extracted text
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(all_text))

        print(f"Extraction complete. Text saved to: {output_path}")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 