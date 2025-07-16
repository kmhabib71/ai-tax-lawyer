#!/usr/bin/env python3
"""
BATCH PROCESSING DEMONSTRATION
Example script showing how to use both batch processors
"""

import os
import sys
from pathlib import Path

def show_available_folders():
    """Show all available folders for processing"""
    print("🔍 AVAILABLE FOLDERS FOR PROCESSING")
    print("=" * 60)
    
    downloads_path = Path("../scraper/downloads")
    if not downloads_path.exists():
        print("❌ Downloads folder not found!")
        return []
    
    folders = []
    for folder in sorted(downloads_path.iterdir()):
        if folder.is_dir():
            ban_folder = folder / "ban"
            if ban_folder.exists():
                pdf_files = list(ban_folder.glob("*.pdf"))
                if pdf_files:
                    folders.append({
                        'name': folder.name,
                        'path': ban_folder,
                        'count': len(pdf_files)
                    })
                    print(f"📁 {folder.name}/ban: {len(pdf_files)} PDF files")
    
    print(f"\n📊 Total: {len(folders)} folders, {sum(f['count'] for f in folders)} PDF files")
    return folders

def run_single_folder_example():
    """Example of running single folder processor"""
    print("\n" + "="*60)
    print("🎯 SINGLE FOLDER PROCESSING EXAMPLE")
    print("="*60)
    
    # Show example commands
    print("To process a single folder, use:")
    print("1. Process customs acts:")
    print("   python batch_single_folder_processor.py ../scraper/downloads/customs-acts/ban")
    print()
    print("2. Process income tax rules:")
    print("   python batch_single_folder_processor.py ../scraper/downloads/income-tax-rules/ban")
    print()
    print("3. Process with custom output folder:")
    print("   python batch_single_folder_processor.py ../scraper/downloads/vat-acts/ban --output extracted_text")
    print()
    print("✅ Start with a small folder (like customs-acts) to test the system")

def run_full_batch_example():
    """Example of running full batch processor"""
    print("\n" + "="*60)
    print("🚀 FULL BATCH PROCESSING EXAMPLE")
    print("="*60)
    
    print("To process ALL folders at once, use:")
    print("1. Process all folders:")
    print("   python batch_full_processor.py")
    print()
    print("2. Dry run (see what would be processed):")
    print("   python batch_full_processor.py --dry-run")
    print()
    print("3. Use multiple workers for faster processing:")
    print("   python batch_full_processor.py --workers 4")
    print()
    print("4. Custom output folder:")
    print("   python batch_full_processor.py --output extracted_text")
    print()
    print("⚠️  WARNING: This will process ALL PDF files - make sure you have enough disk space!")

def main():
    """Main demonstration function"""
    print("🔧 BATCH PROCESSING DEMONSTRATION")
    print("=" * 60)
    
    # Show available folders
    folders = show_available_folders()
    
    if not folders:
        print("❌ No folders available for processing!")
        return
    
    # Show single folder example
    run_single_folder_example()
    
    # Show full batch example
    run_full_batch_example()
    
    print("\n" + "="*60)
    print("📋 RECOMMENDED WORKFLOW:")
    print("="*60)
    print("1. First, test with a single small folder:")
    print("   python batch_single_folder_processor.py ../scraper/downloads/customs-acts/ban")
    print()
    print("2. Check the output quality in the 'text' folder")
    print()
    print("3. If satisfied, run the full batch processor:")
    print("   python batch_full_processor.py")
    print()
    print("4. Monitor the logs in the 'logs' folder for progress")
    print()
    print("5. Check the processing report in the 'reports' folder")

if __name__ == "__main__":
    main() 