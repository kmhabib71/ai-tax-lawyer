#!/usr/bin/env python3
"""
BATCH FULL PROCESSOR
Process ALL subfolders in the downloads directory
Handles large PDFs (300-400 pages) with parallel processing and comprehensive logging
"""

import os
import sys
import time
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import argparse
from pathlib import Path
import json
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
from datetime import datetime

# Configure paths
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
POPPLER_PATH = r'C:\Program Files\poppler\Library\bin'

class FullBatchProcessor:
    def __init__(self, downloads_folder, output_base="text", max_workers=2):
        self.downloads_folder = Path(downloads_folder)
        self.output_base = Path(output_base)
        self.max_workers = max_workers
        self.stats = {
            'total_folders': 0,
            'processed_folders': 0,
            'total_files': 0,
            'successful_files': 0,
            'failed_files': 0,
            'total_pages': 0,
            'start_time': None,
            'folder_stats': {},
            'errors': []
        }
        self.setup_logging()
    
    def setup_logging(self):
        """Setup logging for the batch processor"""
        log_folder = Path("logs")
        log_folder.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = log_folder / f"batch_processing_{timestamp}.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        
        self.logger = logging.getLogger(__name__)
        self.logger.info("="*80)
        self.logger.info("BATCH PROCESSING STARTED")
        self.logger.info("="*80)
    
    def get_all_folders(self):
        """Get all subfolders containing ban folders"""
        folders = []
        if self.downloads_folder.exists():
            for folder in self.downloads_folder.iterdir():
                if folder.is_dir():
                    ban_folder = folder / "ban"
                    if ban_folder.exists():
                        pdf_files = list(ban_folder.glob("*.pdf"))
                        if pdf_files:
                            folders.append({
                                'name': folder.name,
                                'path': ban_folder,
                                'pdf_count': len(pdf_files)
                            })
        return sorted(folders, key=lambda x: x['name'])
    
    def create_output_folder(self, folder_name):
        """Create output folder structure"""
        output_folder = self.output_base / folder_name
        output_folder.mkdir(parents=True, exist_ok=True)
        return output_folder
    
    def estimate_pages(self, pdf_path):
        """Estimate number of pages in PDF"""
        try:
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
        
        return 50  # Default estimate
    
    def process_single_pdf(self, pdf_path, output_folder, max_pages_per_batch=10):
        """Process a single PDF file"""
        try:
            self.logger.info(f"Processing: {pdf_path.name}")
            
            # Get file info
            file_size = pdf_path.stat().st_size / (1024 * 1024)  # MB
            estimated_pages = self.estimate_pages(pdf_path)
            
            self.logger.info(f"   File size: {file_size:.2f} MB, Estimated pages: {estimated_pages}")
            
            all_text = []
            processed_pages = 0
            
            # Process in batches
            batch_size = min(max_pages_per_batch, 15)  # Optimize for memory
            
            # Process PDF in chunks
            for start_page in range(1, estimated_pages + 1, batch_size):
                end_page = min(start_page + batch_size - 1, estimated_pages)
                
                self.logger.info(f"   Processing pages {start_page}-{end_page}...")
                
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
                    
                except Exception as e:
                    self.logger.error(f"   Error processing batch {start_page}-{end_page}: {e}")
                    self.stats['errors'].append(f"{pdf_path.name} (pages {start_page}-{end_page}): {e}")
                    continue
            
            # Save extracted text
            if all_text:
                output_file = output_folder / f"{pdf_path.stem}_extracted.txt"
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(all_text))
                
                self.logger.info(f"   Saved: {output_file.name} ({processed_pages} pages)")
                
                # Text analysis
                full_text = '\n'.join(all_text)
                bengali_chars = sum(1 for c in full_text if '\u0980' <= c <= '\u09FF')
                english_chars = sum(1 for c in full_text if c.isalpha() and c.isascii())
                total_words = len(full_text.split())
                
                self.logger.info(f"   Analysis: {bengali_chars} Bengali, {english_chars} English, {total_words} words")
                
                return {
                    'success': True,
                    'pages': processed_pages,
                    'bengali_chars': bengali_chars,
                    'english_chars': english_chars,
                    'total_words': total_words
                }
            else:
                self.logger.warning(f"   No text extracted from {pdf_path.name}")
                return {'success': False, 'pages': 0}
                
        except Exception as e:
            self.logger.error(f"   Error processing {pdf_path.name}: {e}")
            self.stats['errors'].append(f"{pdf_path.name}: {e}")
            return {'success': False, 'pages': 0}
    
    def process_folder(self, folder_info):
        """Process all PDF files in a single folder"""
        folder_name = folder_info['name']
        folder_path = folder_info['path']
        
        self.logger.info(f"Starting folder: {folder_name}")
        
        # Create output folder
        output_folder = self.create_output_folder(folder_name)
        
        # Get PDF files
        pdf_files = list(folder_path.glob("*.pdf"))
        
        folder_stats = {
            'total_files': len(pdf_files),
            'successful': 0,
            'failed': 0,
            'total_pages': 0,
            'start_time': time.time(),
            'files': []
        }
        
        # Process each PDF
        for pdf_path in pdf_files:
            result = self.process_single_pdf(pdf_path, output_folder)
            
            if result['success']:
                folder_stats['successful'] += 1
                folder_stats['total_pages'] += result['pages']
                self.stats['successful_files'] += 1
                self.stats['total_pages'] += result['pages']
            else:
                folder_stats['failed'] += 1
                self.stats['failed_files'] += 1
            
            folder_stats['files'].append({
                'name': pdf_path.name,
                'success': result['success'],
                'pages': result.get('pages', 0)
            })
        
        folder_stats['elapsed_time'] = time.time() - folder_stats['start_time']
        self.stats['folder_stats'][folder_name] = folder_stats
        
        self.logger.info(f"Completed folder: {folder_name} ({folder_stats['successful']}/{folder_stats['total_files']} files)")
        
        return folder_stats
    
    def process_all_folders(self):
        """Process all folders in the downloads directory"""
        self.logger.info("Starting full batch processing...")
        
        # Get all folders
        folders = self.get_all_folders()
        self.stats['total_folders'] = len(folders)
        self.stats['total_files'] = sum(f['pdf_count'] for f in folders)
        
        if not folders:
            self.logger.error("No folders with PDF files found!")
            return False
        
        self.logger.info(f"Found {len(folders)} folders with {self.stats['total_files']} total PDF files")
        
        # Print folder summary
        self.logger.info("Folders to process:")
        for folder in folders:
            self.logger.info(f"  📁 {folder['name']}: {folder['pdf_count']} PDF files")
        
        self.stats['start_time'] = time.time()
        
        # Process folders (can be done in parallel if needed)
        if self.max_workers > 1:
            # Parallel processing
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                future_to_folder = {executor.submit(self.process_folder, folder): folder for folder in folders}
                
                for future in as_completed(future_to_folder):
                    folder = future_to_folder[future]
                    try:
                        result = future.result()
                        self.stats['processed_folders'] += 1
                        self.logger.info(f"Progress: {self.stats['processed_folders']}/{self.stats['total_folders']} folders completed")
                    except Exception as exc:
                        self.logger.error(f"Folder {folder['name']} generated an exception: {exc}")
        else:
            # Sequential processing
            for i, folder in enumerate(folders, 1):
                self.logger.info(f"[{i}/{len(folders)}] Processing folder: {folder['name']}")
                self.process_folder(folder)
                self.stats['processed_folders'] += 1
        
        self.print_final_summary()
        self.save_processing_report()
        
        return self.stats['successful_files'] > 0
    
    def print_final_summary(self):
        """Print comprehensive processing summary"""
        elapsed_time = time.time() - self.stats['start_time']
        
        self.logger.info("\n" + "="*80)
        self.logger.info("🎯 FINAL PROCESSING SUMMARY")
        self.logger.info("="*80)
        
        self.logger.info(f"⏱️  Total time: {elapsed_time:.2f} seconds ({elapsed_time/60:.2f} minutes)")
        self.logger.info(f"📁 Folders processed: {self.stats['processed_folders']}/{self.stats['total_folders']}")
        self.logger.info(f"📄 Files processed: {self.stats['successful_files'] + self.stats['failed_files']}/{self.stats['total_files']}")
        self.logger.info(f"✅ Successful files: {self.stats['successful_files']}")
        self.logger.info(f"❌ Failed files: {self.stats['failed_files']}")
        self.logger.info(f"📑 Total pages processed: {self.stats['total_pages']}")
        
        if self.stats['successful_files'] > 0:
            avg_time = elapsed_time / self.stats['successful_files']
            self.logger.info(f"📊 Average time per file: {avg_time:.2f} seconds")
        
        # Folder breakdown
        self.logger.info("\n📋 Folder breakdown:")
        for folder_name, folder_stats in self.stats['folder_stats'].items():
            success_rate = (folder_stats['successful'] / folder_stats['total_files']) * 100
            self.logger.info(f"  📁 {folder_name}: {folder_stats['successful']}/{folder_stats['total_files']} files ({success_rate:.1f}%)")
        
        # Error summary
        if self.stats['errors']:
            self.logger.error(f"\n❌ {len(self.stats['errors'])} errors encountered")
            for error in self.stats['errors'][:10]:  # Show first 10 errors
                self.logger.error(f"  • {error}")
            if len(self.stats['errors']) > 10:
                self.logger.error(f"  ... and {len(self.stats['errors']) - 10} more errors")
    
    def save_processing_report(self):
        """Save detailed processing report"""
        report_folder = Path("reports")
        report_folder.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = report_folder / f"processing_report_{timestamp}.json"
        
        # Prepare report data
        report_data = {
            'timestamp': timestamp,
            'processing_time': time.time() - self.stats['start_time'],
            'summary': {
                'total_folders': self.stats['total_folders'],
                'processed_folders': self.stats['processed_folders'],
                'total_files': self.stats['total_files'],
                'successful_files': self.stats['successful_files'],
                'failed_files': self.stats['failed_files'],
                'total_pages': self.stats['total_pages']
            },
            'folder_details': self.stats['folder_stats'],
            'errors': self.stats['errors']
        }
        
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        self.logger.info(f"📊 Processing report saved: {report_file}")

def main():
    """Main function with command line interface"""
    parser = argparse.ArgumentParser(description='Process ALL PDF files from downloads directory')
    parser.add_argument('--downloads', '-d', default='../scraper/downloads', help='Downloads directory path')
    parser.add_argument('--output', '-o', default='text', help='Output base directory (default: text)')
    parser.add_argument('--workers', '-w', type=int, default=2, help='Number of parallel workers (default: 2)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be processed without actually processing')
    
    args = parser.parse_args()
    
    # Initialize processor
    processor = FullBatchProcessor(args.downloads, args.output, args.workers)
    
    if args.dry_run:
        # Show what would be processed
        folders = processor.get_all_folders()
        print("🔍 DRY RUN - Files that would be processed:")
        print("="*60)
        total_files = 0
        for folder in folders:
            print(f"📁 {folder['name']}: {folder['pdf_count']} PDF files")
            total_files += folder['pdf_count']
        print(f"\n📊 Total: {len(folders)} folders, {total_files} files")
        return
    
    # Process all folders
    success = processor.process_all_folders()
    
    if success:
        print("\n🎉 BATCH PROCESSING COMPLETED SUCCESSFULLY!")
        print("📋 Check the logs and reports for detailed information")
    else:
        print("\n❌ BATCH PROCESSING FAILED!")
        print("📋 Check the logs for error details")

if __name__ == "__main__":
    # Example usage if run without arguments
    if len(sys.argv) == 1:
        print("🔧 BATCH FULL PROCESSOR")
        print("=" * 50)
        print("This will process ALL PDF files in the downloads directory")
        print()
        print("Usage examples:")
        print("1. Process all folders:")
        print("   python batch_full_processor.py")
        print()
        print("2. Custom downloads path:")
        print("   python batch_full_processor.py --downloads /path/to/downloads")
        print()
        print("3. Custom output folder:")
        print("   python batch_full_processor.py --output extracted_text")
        print()
        print("4. Use more workers for faster processing:")
        print("   python batch_full_processor.py --workers 4")
        print()
        print("5. Dry run (see what would be processed):")
        print("   python batch_full_processor.py --dry-run")
        print()
        print("⚠️  WARNING: This will process ALL PDF files in your downloads folder!")
        print("   Make sure you have enough disk space and time.")
    else:
        main() 