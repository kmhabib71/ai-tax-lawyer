#!/usr/bin/env python3
"""
BATCH SINGLE FOLDER PROCESSOR
Process one subfolder at a time from the downloads directory
Handles large PDFs (300-400 pages) with progress tracking
"""

import os
import sys
import time
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import argparse
from pathlib import Path

# Configure paths
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
POPPLER_PATH = r'C:\Program Files\poppler\Library\bin'

class SingleFolderProcessor:
    def __init__(self, input_folder, output_base="text"):
        self.input_folder = Path(input_folder)
        self.output_base = Path(output_base)
        self.stats = {
            'total_files': 0,
            'successful': 0,
            'failed': 0,
            'total_pages': 0,
            'start_time': None,
            'errors': []
        }
    
    def create_output_folder(self):
        """Create output folder structure"""
        folder_name = self.input_folder.name
        output_folder = self.output_base / folder_name
        output_folder.mkdir(parents=True, exist_ok=True)
        return output_folder
    
    def get_pdf_files(self):
        """Get all PDF files from the input folder"""
        pdf_files = []
        if self.input_folder.exists():
            for file in self.input_folder.glob('*.pdf'):
                pdf_files.append(file)
        return sorted(pdf_files)
    
    def estimate_pages(self, pdf_path):
        """Estimate number of pages in PDF"""
        try:
            from pdf2image.exceptions import PDFInfoNotInstalledError
            # Try to get page count using pdfinfo
            import subprocess
            result = subprocess.run([
                os.path.join(POPPLER_PATH, 'pdfinfo.exe'),
                str(pdf_path)
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if line.startswith('Pages:'):
                        return int(line.split(':')[1].strip())
        except:
            pass
        
        # Fallback: assume average of 50 pages for estimation
        return 50
    
    def process_large_pdf(self, pdf_path, output_folder, max_pages_per_batch=10):
        """Process large PDF in batches to handle memory constraints"""
        print(f"📄 Processing: {pdf_path.name}")
        
        # Get file info
        file_size = pdf_path.stat().st_size / (1024 * 1024)  # MB
        estimated_pages = self.estimate_pages(pdf_path)
        
        print(f"   📊 File size: {file_size:.2f} MB")
        print(f"   📊 Estimated pages: {estimated_pages}")
        
        all_text = []
        processed_pages = 0
        
        # Process in batches
        batch_size = min(max_pages_per_batch, 20)  # Limit batch size for memory
        
        try:
            # Process PDF in chunks
            for start_page in range(1, estimated_pages + 1, batch_size):
                end_page = min(start_page + batch_size - 1, estimated_pages)
                
                print(f"   📑 Processing pages {start_page}-{end_page}...")
                
                try:
                    # Convert batch of pages
                    images = convert_from_path(
                        pdf_path,
                        dpi=300,
                        first_page=start_page,
                        last_page=end_page,
                        poppler_path=POPPLER_PATH
                    )
                    
                    # OCR each page in the batch
                    for i, image in enumerate(images):
                        page_num = start_page + i
                        print(f"      🔤 OCR Page {page_num}...")
                        
                        # Run OCR
                        config = '--psm 6 -l ben+eng'
                        text = pytesseract.image_to_string(image, config=config)
                        
                        if text.strip():
                            all_text.append(f"--- PAGE {page_num} ---\n{text}\n")
                        
                        processed_pages += 1
                        
                        # Memory cleanup
                        image.close()
                        del image
                    
                    # Clear images from memory
                    del images
                    
                    print(f"   ✅ Batch {start_page}-{end_page} completed")
                    
                except Exception as e:
                    print(f"   ❌ Error processing batch {start_page}-{end_page}: {e}")
                    self.stats['errors'].append(f"{pdf_path.name} (pages {start_page}-{end_page}): {e}")
                    continue
            
            # Save extracted text
            if all_text:
                output_file = output_folder / f"{pdf_path.stem}_extracted.txt"
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(all_text))
                
                print(f"   ✅ Saved: {output_file.name}")
                print(f"   📊 Total pages processed: {processed_pages}")
                
                # Text analysis
                full_text = '\n'.join(all_text)
                bengali_chars = sum(1 for c in full_text if '\u0980' <= c <= '\u09FF')
                english_chars = sum(1 for c in full_text if c.isalpha() and c.isascii())
                total_words = len(full_text.split())
                
                print(f"   📈 Analysis: {bengali_chars} Bengali chars, {english_chars} English chars, {total_words} words")
                
                self.stats['total_pages'] += processed_pages
                return True
            else:
                print(f"   ❌ No text extracted from {pdf_path.name}")
                return False
                
        except Exception as e:
            print(f"   ❌ Error processing {pdf_path.name}: {e}")
            self.stats['errors'].append(f"{pdf_path.name}: {e}")
            return False
    
    def process_folder(self):
        """Process all PDF files in the folder"""
        print(f"🚀 PROCESSING FOLDER: {self.input_folder.name}")
        print("=" * 80)
        
        # Check if folder exists
        if not self.input_folder.exists():
            print(f"❌ Folder not found: {self.input_folder}")
            return False
        
        # Create output folder
        output_folder = self.create_output_folder()
        print(f"📁 Output folder: {output_folder}")
        
        # Get PDF files
        pdf_files = self.get_pdf_files()
        self.stats['total_files'] = len(pdf_files)
        
        if not pdf_files:
            print("❌ No PDF files found in the folder")
            return False
        
        print(f"📄 Found {len(pdf_files)} PDF files to process")
        
        # Start processing
        self.stats['start_time'] = time.time()
        
        for i, pdf_path in enumerate(pdf_files, 1):
            print(f"\n[{i}/{len(pdf_files)}] 🎯 Processing: {pdf_path.name}")
            print("-" * 60)
            
            if self.process_large_pdf(pdf_path, output_folder):
                self.stats['successful'] += 1
                print("✅ SUCCESS!")
            else:
                self.stats['failed'] += 1
                print("❌ FAILED!")
        
        # Print summary
        self.print_summary()
        return self.stats['successful'] > 0
    
    def print_summary(self):
        """Print processing summary"""
        elapsed_time = time.time() - self.stats['start_time']
        
        print("\n" + "=" * 80)
        print("🎯 PROCESSING SUMMARY")
        print("=" * 80)
        
        print(f"📁 Folder: {self.input_folder.name}")
        print(f"⏱️  Time elapsed: {elapsed_time:.2f} seconds")
        print(f"📄 Total files: {self.stats['total_files']}")
        print(f"✅ Successful: {self.stats['successful']}")
        print(f"❌ Failed: {self.stats['failed']}")
        print(f"📑 Total pages processed: {self.stats['total_pages']}")
        
        if self.stats['successful'] > 0:
            avg_time = elapsed_time / self.stats['successful']
            print(f"📊 Average time per file: {avg_time:.2f} seconds")
        
        if self.stats['errors']:
            print(f"\n❌ Errors encountered:")
            for error in self.stats['errors'][:5]:  # Show first 5 errors
                print(f"   • {error}")
            if len(self.stats['errors']) > 5:
                print(f"   ... and {len(self.stats['errors']) - 5} more errors")

def main():
    """Main function with command line interface"""
    parser = argparse.ArgumentParser(description='Process PDF files from a single folder')
    parser.add_argument('folder', help='Path to the folder containing PDF files')
    parser.add_argument('--output', '-o', default='text', help='Output base directory (default: text)')
    
    args = parser.parse_args()
    
    # Initialize processor
    processor = SingleFolderProcessor(args.folder, args.output)
    
    # Process the folder
    success = processor.process_folder()
    
    if success:
        print("\n🎉 PROCESSING COMPLETED SUCCESSFULLY!")
        print("📋 Next steps:")
        print("1. Check the extracted text files in the output folder")
        print("2. If quality is good, run the full batch processor")
    else:
        print("\n❌ PROCESSING FAILED!")
        print("📋 Please check the errors above and try again")

if __name__ == "__main__":
    # Example usage if run without arguments
    if len(sys.argv) == 1:
        print("🔧 BATCH SINGLE FOLDER PROCESSOR")
        print("=" * 50)
        print("Usage examples:")
        print("1. Process customs acts:")
        print("   python batch_single_folder_processor.py ../scraper/downloads/customs-acts/ban")
        print()
        print("2. Process income tax rules:")
        print("   python batch_single_folder_processor.py ../scraper/downloads/income-tax-rules/ban")
        print()
        print("3. Process with custom output folder:")
        print("   python batch_single_folder_processor.py ../scraper/downloads/vat-acts/ban --output extracted_text")
        print()
        print("Available folders:")
        downloads_path = Path("../scraper/downloads")
        if downloads_path.exists():
            for folder in sorted(downloads_path.iterdir()):
                if folder.is_dir():
                    ban_folder = folder / "ban"
                    if ban_folder.exists():
                        pdf_count = len(list(ban_folder.glob("*.pdf")))
                        print(f"   📁 {folder.name}/ban ({pdf_count} PDF files)")
    else:
        main() 