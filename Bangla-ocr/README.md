# Bangla PDF OCR

**One-command Bangla OCR solution** - A brand-new pip package that wraps Tesseract + layout analysis for Bangla text extraction from PDFs and images.

Works on **Windows, macOS, Linux** without manual Tesseract installations.

## 🚀 Quick Start

### Installation

```bash
pip install bangla-pdf-ocr
```

### Setup (One-time)

```bash
bangla-pdf-ocr-setup  # Auto-downloads traineddata & sets PATH
```

### Usage

#### Command Line
```bash
# Process a PDF file
bangla-pdf-ocr input.pdf > output.txt

# Process an image
bangla-pdf-ocr image.jpg --output result.txt

# Advanced options
bangla-pdf-ocr document.pdf --format markdown --pages 1-5 --dpi 300
```

#### Python API
```python
from bangla_pdf_ocr import process_pdf, process_image

# Process PDF
text = process_pdf("input.pdf")
print(text)

# Process image
text = process_image("image.jpg")
print(text)

# Advanced usage with custom config
from bangla_pdf_ocr import BanglaOCR

ocr = BanglaOCR(config={'dpi': 300})
text = ocr.process_pdf("document.pdf", first_page=1, last_page=5)
```

## 🔧 Features

- **Zero Configuration**: Auto-downloads and configures Tesseract + Bengali trained data
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Multiple Input Formats**: PDF, JPG, PNG, BMP, TIFF, GIF, WebP
- **Multiple Output Formats**: Plain text, Markdown, JSON
- **Page Selection**: Process specific pages from PDF files
- **Image Preprocessing**: Automatic image enhancement for better OCR accuracy
- **CLI and Python API**: Use from command line or integrate into your Python applications
- **Bengali + English Support**: Handles mixed Bengali and English text

## 📖 Documentation

### Command Line Interface

```bash
usage: bangla-pdf-ocr [-h] [-o OUTPUT] [-f {plain,markdown,json}] [--dpi DPI] 
                      [--pages PAGES] [--config CONFIG] [--log-level {DEBUG,INFO,WARNING,ERROR}] 
                      [--version] input_file

positional arguments:
  input_file            Input PDF or image file to process

optional arguments:
  -h, --help            show this help message and exit
  -o OUTPUT, --output OUTPUT
                        Output file path (default: stdout)
  -f {plain,markdown,json}, --format {plain,markdown,json}
                        Output format (default: plain)
  --dpi DPI             DPI for PDF to image conversion (default: 300)
  --pages PAGES         Page range for PDF processing (e.g., "1-5", "1,3,5")
  --config CONFIG       Custom Tesseract configuration string
  --log-level {DEBUG,INFO,WARNING,ERROR}
                        Logging level (default: INFO)
  --version             show program's version number and exit
```

### Python API Reference

#### `process_pdf(pdf_path, **kwargs)`
Process a PDF file and extract text.

**Parameters:**
- `pdf_path` (str): Path to the PDF file
- `dpi` (int): DPI for PDF to image conversion (default: 300)
- `first_page` (int): First page to process (optional)
- `last_page` (int): Last page to process (optional)

**Returns:** Extracted text as string

#### `process_image(image_path, **kwargs)`
Process an image file and extract text.

**Parameters:**
- `image_path` (str): Path to the image file
- `config` (str): Custom Tesseract configuration (optional)

**Returns:** Extracted text as string

#### `BanglaOCR` Class
Main OCR class for advanced usage.

```python
from bangla_pdf_ocr import BanglaOCR

# Initialize with custom config
ocr = BanglaOCR(config={
    'dpi': 300,
    'preprocessing': {
        'enhance_contrast': True,
        'denoise': True,
        'resize_factor': 2.0
    }
})

# Process files
text = ocr.process_pdf("document.pdf")
text = ocr.process_image("image.jpg")
```

## 🛠️ Configuration

### Image Preprocessing Options

```python
config = {
    'preprocessing': {
        'enhance_contrast': True,    # Enhance image contrast
        'denoise': True,            # Apply denoising filter
        'resize_factor': 2.0,       # Resize image for better OCR
        'grayscale': True,          # Convert to grayscale
    }
}
```

### Tesseract Configuration

```python
# Custom Tesseract configuration
ocr_config = '--psm 6 -c tessedit_char_whitelist=০১২৩৪৫৬৭৮৯অআই...'
text = process_image("image.jpg", config=ocr_config)
```

## 📋 Examples

### Basic Usage

```python
from bangla_pdf_ocr import process_pdf

# Simple PDF processing
text = process_pdf("tax_document.pdf")
print(text)
```

### Processing Specific Pages

```python
from bangla_pdf_ocr import BanglaOCR

ocr = BanglaOCR()
text = ocr.process_pdf("document.pdf", first_page=1, last_page=3)
```

### Batch Processing

```python
import os
from bangla_pdf_ocr import process_pdf

# Process all PDFs in a directory
pdf_dir = "documents/"
for filename in os.listdir(pdf_dir):
    if filename.endswith('.pdf'):
        pdf_path = os.path.join(pdf_dir, filename)
        text = process_pdf(pdf_path)
        
        # Save extracted text
        output_path = f"extracted/{filename}.txt"
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(text)
```

### Integration with Tax Document Processing

```python
from bangla_pdf_ocr import process_pdf

def extract_tax_info(pdf_path):
    """Extract tax information from Bengali tax documents"""
    text = process_pdf(pdf_path)
    
    # Process extracted text for tax information
    lines = text.split('\n')
    tax_info = {}
    
    for line in lines:
        if 'নাম' in line or 'Name' in line:
            tax_info['name'] = line.strip()
        elif 'টিআইএন' in line or 'TIN' in line:
            tax_info['tin'] = line.strip()
        elif 'আয়' in line or 'Income' in line:
            tax_info['income'] = line.strip()
    
    return tax_info

# Usage
tax_data = extract_tax_info("tax_certificate.pdf")
print(tax_data)
```

## 🔧 Development

### Setting up Development Environment

```bash
# Clone the repository
git clone https://github.com/aitaxlawyer/bangla-pdf-ocr.git
cd bangla-pdf-ocr

# Install development dependencies
pip install -e .[dev]

# Run setup
bangla-pdf-ocr-setup
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=bangla_pdf_ocr
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

- **Bug Reports**: [GitHub Issues](https://github.com/aitaxlawyer/bangla-pdf-ocr/issues)
- **Feature Requests**: [GitHub Issues](https://github.com/aitaxlawyer/bangla-pdf-ocr/issues)
- **Questions**: [GitHub Discussions](https://github.com/aitaxlawyer/bangla-pdf-ocr/discussions)

## 📊 Supported Formats

### Input Formats
- **PDF**: .pdf
- **Images**: .jpg, .jpeg, .png, .bmp, .tiff, .tif, .gif, .webp

### Output Formats
- **Plain Text**: Raw extracted text
- **Markdown**: Formatted text with headers
- **JSON**: Structured output with metadata

## 🌟 Credits

- Built on top of [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)
- Uses [pytesseract](https://github.com/madmaze/pytesseract) Python wrapper
- PDF processing with [pdf2image](https://github.com/Belval/pdf2image)
- Image processing with [Pillow](https://github.com/python-pillow/Pillow) and [OpenCV](https://github.com/opencv/opencv)

---

**Made with ❤️ for the Bangladesh tech community**