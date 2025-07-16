"""
Command-line interface for Bangla PDF OCR
"""

import argparse
import sys
import os
from pathlib import Path
from typing import Optional

from .core import process_pdf, process_image
from .utils import detect_file_type, format_text_output, get_supported_formats
from .config import DEFAULT_CONFIG


def create_parser() -> argparse.ArgumentParser:
    """Create command-line argument parser"""
    parser = argparse.ArgumentParser(
        prog='bangla-pdf-ocr',
        description='One-command Bangla OCR solution with Tesseract',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  bangla-pdf-ocr document.pdf
  bangla-pdf-ocr image.jpg --output result.txt
  bangla-pdf-ocr document.pdf --format markdown
  bangla-pdf-ocr document.pdf --pages 1-5 --dpi 300
  
Supported formats:
  PDF: .pdf
  Images: .jpg, .jpeg, .png, .bmp, .tiff, .tif, .gif, .webp
        """
    )
    
    # Required arguments
    parser.add_argument(
        'input_file',
        help='Input PDF or image file to process'
    )
    
    # Optional arguments
    parser.add_argument(
        '-o', '--output',
        help='Output file path (default: stdout)'
    )
    
    parser.add_argument(
        '-f', '--format',
        choices=['plain', 'markdown', 'json'],
        default='plain',
        help='Output format (default: plain)'
    )
    
    parser.add_argument(
        '--dpi',
        type=int,
        default=300,
        help='DPI for PDF to image conversion (default: 300)'
    )
    
    parser.add_argument(
        '--pages',
        help='Page range for PDF processing (e.g., "1-5", "1,3,5")'
    )
    
    parser.add_argument(
        '--config',
        help='Custom Tesseract configuration string'
    )
    
    parser.add_argument(
        '--log-level',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        default='INFO',
        help='Logging level (default: INFO)'
    )
    
    parser.add_argument(
        '--version',
        action='version',
        version='%(prog)s 1.0.0'
    )
    
    return parser


def parse_page_range(page_range: str) -> tuple[Optional[int], Optional[int]]:
    """
    Parse page range string
    
    Args:
        page_range: Page range string (e.g., "1-5", "1,3,5")
        
    Returns:
        Tuple of (first_page, last_page) or (None, None) for all pages
    """
    if not page_range:
        return None, None
    
    try:
        if '-' in page_range:
            # Range format: "1-5"
            start, end = page_range.split('-')
            return int(start.strip()), int(end.strip())
        elif ',' in page_range:
            # Individual pages: "1,3,5" (not supported in this version)
            print("Warning: Individual page selection not supported. Processing all pages.")
            return None, None
        else:
            # Single page: "3"
            page = int(page_range.strip())
            return page, page
    except ValueError:
        print(f"Warning: Invalid page range '{page_range}'. Processing all pages.")
        return None, None


def main():
    """Main CLI function"""
    parser = create_parser()
    args = parser.parse_args()
    
    try:
        # Validate input file
        if not os.path.exists(args.input_file):
            print(f"Error: Input file '{args.input_file}' not found.", file=sys.stderr)
            sys.exit(1)
        
        # Detect file type
        file_type = detect_file_type(args.input_file)
        if file_type is None:
            supported = get_supported_formats()
            all_formats = supported['pdf'] + supported['image']
            print(f"Error: Unsupported file format. Supported formats: {', '.join(all_formats)}", 
                  file=sys.stderr)
            sys.exit(1)
        
        # Parse page range for PDFs
        first_page, last_page = None, None
        if file_type == 'pdf' and args.pages:
            first_page, last_page = parse_page_range(args.pages)
        
        # Prepare OCR parameters
        ocr_kwargs = {
            'dpi': args.dpi,
            'first_page': first_page,
            'last_page': last_page,
            'log_level': args.log_level
        }
        
        if args.config:
            ocr_kwargs['config'] = args.config
        
        # Process file
        print(f"Processing {file_type.upper()} file: {args.input_file}", file=sys.stderr)
        
        if file_type == 'pdf':
            text = process_pdf(args.input_file, **ocr_kwargs)
        else:
            text = process_image(args.input_file, **ocr_kwargs)
        
        # Format output
        formatted_text = format_text_output(text, args.format)
        
        # Write output
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(formatted_text)
            print(f"Output written to: {args.output}", file=sys.stderr)
        else:
            print(formatted_text)
    
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()