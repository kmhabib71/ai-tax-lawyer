#!/usr/bin/env python3
"""
Example usage of the NBR PDF Downloader
Demonstrates how to use the downloader programmatically
"""

from pdf_downloader import NBRPDFDownloader

def main():
    """Example usage of the PDF downloader."""
    
    # Initialize the downloader
    downloader = NBRPDFDownloader(base_dir="example_downloads")
    
    # List of NBR URLs to download from
    urls = [
        "https://nbr.gov.bd/regulations/acts/income-tax-acts/ban",
        "https://nbr.gov.bd/regulations/acts/vat-acts/ban",
        "https://nbr.gov.bd/regulations/acts/customs-acts/ban"
    ]
    
    print("Starting batch download from multiple NBR pages...")
    print("=" * 50)
    
    total_downloads = 0
    
    for i, url in enumerate(urls, 1):
        print(f"\n[{i}/{len(urls)}] Processing URL: {url}")
        print("-" * 50)
        
        # Download PDFs from this URL
        downloads = downloader.download_from_url(url)
        total_downloads += downloads
        
        print(f"Downloaded {downloads} files from this URL")
    
    print("\n" + "=" * 50)
    print(f"Batch download completed!")
    print(f"Total files downloaded: {total_downloads}")
    print(f"Files saved in: {downloader.base_dir}")

if __name__ == "__main__":
    main() 