#!/usr/bin/env python3
"""
PDF Downloader for NBR (National Board of Revenue) Bangladesh
Downloads PDF files from NBR website pages that are visible in the page content.
"""

import os
import re
import sys
import time
import urllib.parse
from pathlib import Path
from typing import List, Tuple

import requests
from bs4 import BeautifulSoup


class NBRPDFDownloader:
    def __init__(self, base_dir: str = "downloads"):
        """
        Initialize the PDF downloader.
        
        Args:
            base_dir: Directory to save downloaded PDFs
        """
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def extract_pdf_links(self, url: str) -> List[Tuple[str, str, str]]:
        """
        Extract PDF links from the given NBR page.
        
        Args:
            url: The URL to scrape
            
        Returns:
            List of tuples containing (pdf_url, title, date)
        """
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            pdf_links = []
            
            # Find the table with PDF links
            tbody = soup.find('tbody')
            if not tbody:
                print("No table body found on the page")
                return []
            
            # Extract PDF links from table rows
            for row in tbody.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) >= 3:
                    # Look for PDF links in the row
                    pdf_link = None
                    title = ""
                    date = ""
                    
                    # Check second cell for title and link
                    if len(cells) > 1:
                        title_cell = cells[1]
                        title_link = title_cell.find('a')
                        if title_link and title_link.get('href', '').endswith('.pdf'):
                            pdf_link = title_link.get('href')
                            title = title_link.get_text(strip=True)
                    
                    # Check third cell for date
                    if len(cells) > 2:
                        date = cells[2].get_text(strip=True)
                    
                    # Check last cell for PDF icon link as backup
                    if not pdf_link and len(cells) > 3:
                        last_cell = cells[-1]
                        icon_link = last_cell.find('a')
                        if icon_link and icon_link.get('href', '').endswith('.pdf'):
                            pdf_link = icon_link.get('href')
                            if not title:
                                title = f"Document {len(pdf_links) + 1}"
                    
                    if pdf_link:
                        # Convert relative URLs to absolute URLs
                        if pdf_link.startswith('/'):
                            base_url = urllib.parse.urljoin(url, '/')
                            pdf_link = urllib.parse.urljoin(base_url, pdf_link)
                        elif not pdf_link.startswith('http'):
                            pdf_link = urllib.parse.urljoin(url, pdf_link)
                        
                        pdf_links.append((pdf_link, title, date))
                        print(f"Found PDF: {title} - {pdf_link}")
            
            return pdf_links
            
        except requests.RequestException as e:
            print(f"Error fetching URL {url}: {e}")
            return []
        except Exception as e:
            print(f"Error parsing page: {e}")
            return []
    
    def sanitize_filename(self, title: str) -> str:
        """
        Sanitize filename by removing invalid characters.
        
        Args:
            title: Original title
            
        Returns:
            Sanitized filename
        """
        # Remove or replace invalid characters
        sanitized = re.sub(r'[<>:"/\\|?*]', '_', title)
        sanitized = re.sub(r'\s+', '_', sanitized)
        sanitized = sanitized.strip('_')
        
        # Limit length
        if len(sanitized) > 100:
            sanitized = sanitized[:100]
        
        return sanitized or "document"
    
    def download_pdf(self, pdf_url: str, title: str, date: str) -> bool:
        """
        Download a single PDF file.
        
        Args:
            pdf_url: URL of the PDF file
            title: Title of the document
            date: Date of the document
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Create filename
            sanitized_title = self.sanitize_filename(title)
            filename = f"{sanitized_title}.pdf"
            filepath = self.base_dir / filename
            
            # Check if file already exists
            if filepath.exists():
                print(f"File already exists: {filename}")
                return True
            
            # Download the PDF
            print(f"Downloading: {title}...")
            response = self.session.get(pdf_url, timeout=60)
            response.raise_for_status()
            
            # Verify it's a PDF
            if not response.headers.get('content-type', '').startswith('application/pdf'):
                content_start = response.content[:20]
                if not content_start.startswith(b'%PDF'):
                    print(f"Warning: {filename} might not be a valid PDF")
            
            # Save the file
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            print(f"Successfully downloaded: {filename} ({len(response.content)} bytes)")
            return True
            
        except requests.RequestException as e:
            print(f"Error downloading {pdf_url}: {e}")
            return False
        except Exception as e:
            print(f"Error saving {title}: {e}")
            return False
    
    def create_folder_structure(self, url: str) -> Path:
        """
        Create a meaningful folder structure based on the URL path.
        
        Args:
            url: The URL to extract folder structure from
            
        Returns:
            Path object for the created directory
        """
        # Parse the URL to extract meaningful parts
        parsed_url = urllib.parse.urlparse(url)
        path_parts = [part for part in parsed_url.path.split('/') if part]
        
        # Create folder structure based on URL path
        folder_parts = []
        
        # Handle NBR regulations URL pattern: /regulations/{category}/{specific-type}/{language}
        if 'regulations' in path_parts and len(path_parts) >= 3:
            try:
                regulations_index = path_parts.index('regulations')
                
                # Check if we have enough parts after 'regulations'
                if regulations_index + 1 < len(path_parts):
                    category = path_parts[regulations_index + 1]  # acts, rules, sros, gos, policy
                    
                    # For policy, structure is: /regulations/policy/ban
                    if category == 'policy':
                        folder_parts.append('policy')
                        if regulations_index + 2 < len(path_parts):
                            language = path_parts[regulations_index + 2]
                            folder_parts.append(language)
                    
                    # For other categories, structure is: /regulations/{category}/{specific-type}/{language}
                    elif regulations_index + 2 < len(path_parts):
                        specific_type = path_parts[regulations_index + 2]  # income-tax-acts, vat-rules, etc.
                        
                        # Use the specific type as the main folder
                        folder_parts.append(specific_type)
                        
                        # Add language if it exists
                        if regulations_index + 3 < len(path_parts):
                            language = path_parts[regulations_index + 3]
                            folder_parts.append(language)
                    

                    
            except (ValueError, IndexError) as e:
                # Fallback to simple structure
                folder_parts = [path_parts[-2], path_parts[-1]] if len(path_parts) >= 2 else [path_parts[-1]]
        
        # If no specific structure found, use the last two parts or fallback
        if not folder_parts:
            if len(path_parts) >= 2:
                folder_parts = [path_parts[-2], path_parts[-1]]
            elif len(path_parts) >= 1:
                folder_parts = [path_parts[-1]]
            else:
                folder_parts = ['downloads']
        
        # Create the folder path
        folder_path = self.base_dir
        for part in folder_parts:
            folder_path = folder_path / self.sanitize_filename(part)
        
        # Create the directory
        folder_path.mkdir(parents=True, exist_ok=True)
        
        return folder_path
    
    def download_from_url(self, url: str) -> int:
        """
        Download all visible PDFs from the given URL.
        
        Args:
            url: The URL to scrape and download from
            
        Returns:
            Number of successfully downloaded files
        """
        print(f"Scraping PDF links from: {url}")
        pdf_links = self.extract_pdf_links(url)
        
        if not pdf_links:
            print("No PDF links found on the page")
            return 0
        
        print(f"Found {len(pdf_links)} PDF links")
        
        # Create structured subdirectory for this URL
        url_dir = self.create_folder_structure(url)
        original_base_dir = self.base_dir
        self.base_dir = url_dir
        
        successful_downloads = 0
        
        for i, (pdf_url, title, date) in enumerate(pdf_links, 1):
            print(f"\n[{i}/{len(pdf_links)}] Processing: {title}")
            if self.download_pdf(pdf_url, title, date):
                successful_downloads += 1
            
            # Add small delay to be respectful to the server
            time.sleep(1)
        
        # Restore original base directory
        self.base_dir = original_base_dir
        
        print(f"\nDownload complete! {successful_downloads}/{len(pdf_links)} files downloaded successfully")
        print(f"Files saved to: {url_dir}")
        
        return successful_downloads


def main():
    """Main function to run the PDF downloader."""
    if len(sys.argv) != 2:
        print("Usage: python pdf_downloader.py <URL>")
        print("Example: python pdf_downloader.py https://nbr.gov.bd/regulations/acts/income-tax-acts/ban")
        sys.exit(1)
    
    url = sys.argv[1]
    
    # Validate URL
    if not url.startswith('http'):
        print("Error: Please provide a valid HTTP/HTTPS URL")
        sys.exit(1)
    
    # Create downloader and start downloading
    downloader = NBRPDFDownloader()
    downloader.download_from_url(url)


if __name__ == "__main__":
    main() 