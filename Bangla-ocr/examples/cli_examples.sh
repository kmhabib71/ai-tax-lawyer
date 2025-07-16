#!/bin/bash
# CLI usage examples for Bangla PDF OCR

echo "=== Bangla PDF OCR CLI Examples ==="
echo

# Example 1: Basic PDF processing
echo "1. Basic PDF processing:"
echo "   bangla-pdf-ocr document.pdf"
echo "   bangla-pdf-ocr document.pdf > output.txt"
echo

# Example 2: Image processing
echo "2. Image processing:"
echo "   bangla-pdf-ocr image.jpg"
echo "   bangla-pdf-ocr image.png --output result.txt"
echo

# Example 3: Output formats
echo "3. Different output formats:"
echo "   bangla-pdf-ocr document.pdf --format plain"
echo "   bangla-pdf-ocr document.pdf --format markdown"
echo "   bangla-pdf-ocr document.pdf --format json"
echo

# Example 4: Page selection
echo "4. Page selection:"
echo "   bangla-pdf-ocr document.pdf --pages 1-5"
echo "   bangla-pdf-ocr document.pdf --pages 1,3,5"
echo "   bangla-pdf-ocr document.pdf --pages 3"
echo

# Example 5: DPI settings
echo "5. DPI settings:"
echo "   bangla-pdf-ocr document.pdf --dpi 150"
echo "   bangla-pdf-ocr document.pdf --dpi 300"
echo "   bangla-pdf-ocr document.pdf --dpi 600"
echo

# Example 6: Custom Tesseract config
echo "6. Custom Tesseract configuration:"
echo "   bangla-pdf-ocr document.pdf --config '--psm 6'"
echo "   bangla-pdf-ocr document.pdf --config '--psm 8 -c tessedit_char_whitelist=০১২৩৪৫৬৭৮৯'"
echo

# Example 7: Logging levels
echo "7. Logging levels:"
echo "   bangla-pdf-ocr document.pdf --log-level DEBUG"
echo "   bangla-pdf-ocr document.pdf --log-level INFO"
echo "   bangla-pdf-ocr document.pdf --log-level WARNING"
echo

# Example 8: Batch processing
echo "8. Batch processing:"
echo "   for file in *.pdf; do"
echo "     bangla-pdf-ocr \"\$file\" --output \"\${file%.pdf}.txt\""
echo "   done"
echo

# Example 9: Combined options
echo "9. Combined options:"
echo "   bangla-pdf-ocr document.pdf --output result.txt --format markdown --pages 1-10 --dpi 300"
echo

# Example 10: Pipeline usage
echo "10. Pipeline usage:"
echo "    bangla-pdf-ocr document.pdf | grep 'টিআইএন'"
echo "    bangla-pdf-ocr document.pdf | wc -l"
echo

echo "=== Setup Commands ==="
echo "First-time setup:"
echo "  bangla-pdf-ocr-setup"
echo
echo "Check version:"
echo "  bangla-pdf-ocr --version"
echo
echo "Get help:"
echo "  bangla-pdf-ocr --help"
echo

echo "=== Sample Workflow ==="
echo "# 1. Install package"
echo "pip install bangla-pdf-ocr"
echo
echo "# 2. Run setup"
echo "bangla-pdf-ocr-setup"
echo
echo "# 3. Process files"
echo "bangla-pdf-ocr tax_document.pdf --output extracted_text.txt --format markdown"
echo
echo "# 4. Process specific pages"
echo "bangla-pdf-ocr large_document.pdf --pages 1-5 --dpi 300 --output first_5_pages.txt"
echo

echo "=== Troubleshooting ==="
echo "If you encounter issues:"
echo "1. Run setup again: bangla-pdf-ocr-setup"
echo "2. Check Tesseract installation: tesseract --version"
echo "3. Use debug logging: bangla-pdf-ocr file.pdf --log-level DEBUG"
echo "4. Check file permissions and format support"
echo