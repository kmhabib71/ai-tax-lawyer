# NBR PDF Downloader - Usage Guide

## Quick Start

### Option 1: Using the Command Line Script

```bash
python pdf_downloader.py https://nbr.gov.bd/regulations/acts/income-tax-acts/ban
```

### Option 2: Using the Batch Script (Windows)

```bash
# Single category download
download_pdfs.bat

# Complete NBR library download (18 categories)
download_all_nbr_pdfs.bat
```

### Option 3: Using the Shell Script (Linux/Mac)

```bash
# Single category download
./download_pdfs.sh

# Complete NBR library download (18 categories)
./download_all_nbr_pdfs.sh
```

### Option 4: Using the Python API

```python
from pdf_downloader import NBRPDFDownloader
downloader = NBRPDFDownloader()
downloader.download_from_url("https://nbr.gov.bd/regulations/acts/income-tax-acts/ban")
```

## Tested URLs

The following NBR URLs have been tested and work correctly:

1. **Income Tax Acts**: `https://nbr.gov.bd/regulations/acts/income-tax-acts/ban`
   - Successfully downloads 4 PDFs including আয়কর আইন-২০২৩
2. **VAT Acts**: `https://nbr.gov.bd/regulations/acts/vat-acts/ban`
   - Downloads VAT-related PDF documents
3. **Customs Acts**: `https://nbr.gov.bd/regulations/acts/customs-acts/ban`
   - Downloads customs-related PDF documents

## File Organization

Files are automatically organized by document type and language:

```
downloads/
├── income-tax-acts/
│   └── ban/
│       ├── আয়কর_আইন-২০২৩.pdf
│       ├── দানকর_আইন_-_১৯৯০.pdf
│       ├── ভ্রমন_কর_আইন_-_২০০৩.pdf
│       └── আয়কর_অধ্যাদেশ,_১৯৮৪_জুলাই_২০১৫_পর্যন্ত.pdf
├── vat-acts/
│   └── ban/
│       └── [VAT related PDFs]
└── customs-acts/
    └── ban/
        └── [Customs related PDFs]
```

## Features

✅ **Smart PDF Detection**: Only downloads visible PDFs from the page  
✅ **Bengali Filename Support**: Preserves Bengali text in filenames  
✅ **Duplicate Prevention**: Skips files that already exist  
✅ **Progress Tracking**: Shows download progress with counters  
✅ **Error Handling**: Gracefully handles network errors  
✅ **Respectful Scraping**: Adds delays between requests  
✅ **File Validation**: Verifies downloaded files are valid PDFs

## Installation

1. Install Python 3.7+ from https://python.org
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Troubleshooting

### Common Issues

**Error: "No PDF links found"**

- Check if the URL is correct and accessible
- Verify the page has a table structure with PDF links

**Error: "Connection timeout"**

- Check your internet connection
- The NBR website might be temporarily unavailable

**Error: "Permission denied"**

- Run as administrator (Windows) or with sudo (Linux/Mac)
- Check if the downloads directory is writable

**Files not downloading**

- Ensure Python and pip are installed correctly
- Check if all dependencies are installed: `pip list`

### Performance Tips

- Use the batch script for multiple URLs
- Files are automatically skipped if they already exist
- The script adds 1-second delays between downloads to be respectful

## Advanced Usage

### Custom Download Directory

```python
downloader = NBRPDFDownloader(base_dir="custom_downloads")
```

### Batch Processing Multiple URLs

```python
urls = [
    "https://nbr.gov.bd/regulations/acts/income-tax-acts/ban",
    "https://nbr.gov.bd/regulations/acts/vat-acts/ban"
]
for url in urls:
    downloader.download_from_url(url)
```

## Support

For issues or questions:

1. Check this usage guide
2. Verify your Python installation
3. Ensure all dependencies are installed
4. Test with a simple URL first

## Success Story

**Test Result**: Successfully downloaded 4 PDFs from the Income Tax Acts page:

- আয়কর আইন-২০২৩ (1.7MB)
- দানকর আইন - ১৯৯০ (86KB)
- ভ্রমন কর আইন - ২০০৩ (85KB)
- আয়কর অধ্যাদেশ, ১৯৮৪ জুলাই ২০১৫ পর্যন্ত (1.6MB)

The downloader is ready for production use!
