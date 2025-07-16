# NBR PDF Downloader

A simple Python script to download PDF files from NBR (National Board of Revenue) Bangladesh website pages.

## Features

- Downloads only visible PDF files from the webpage
- Automatically extracts PDF links from table structures
- Sanitizes filenames for safe storage
- Creates organized directory structure
- Handles relative and absolute URLs
- Respects server with delays between downloads
- Validates PDF files before saving

## Installation

1. Install Python dependencies:

```bash
pip install -r requirements.txt
```

## Usage

### Command Line Usage

```bash
python pdf_downloader.py <URL>
```

### Examples

Download PDFs from Income Tax Acts page:

```bash
python pdf_downloader.py https://nbr.gov.bd/regulations/acts/income-tax-acts/ban
```

Download PDFs from other NBR pages:

```bash
python pdf_downloader.py https://nbr.gov.bd/regulations/acts/vat-acts/ban
python pdf_downloader.py https://nbr.gov.bd/regulations/acts/customs-acts/ban
```

### Batch Download

**Single Category Download:**

```bash
./download_pdfs.bat
```

**Complete NBR Library Download:**

```bash
# Windows
./download_all_nbr_pdfs.bat

# Linux/Mac
./download_all_nbr_pdfs.sh
```

This will download all PDFs from 18 different NBR categories:

- Acts (Laws): Income Tax, VAT, Customs
- Rules: VAT, Income Tax, Customs, Excise, Other
- SROs: VAT, Income Tax, Customs, Excise, Other
- General Orders: VAT, Income Tax, Customs, Excise
- Policy Documents

## Output Structure

Files are automatically organized by document type and language:

```
downloads/
├── income-tax-acts/
│   └── ban/
│       ├── আয়কর_আইন-২০২৩.pdf
│       ├── দানকর_আইন_-_১৯৯০.pdf
│       └── ভ্রমন_কর_আইন_-_২০০৩.pdf
├── vat-acts/
│   └── ban/
│       └── [VAT related PDFs]
└── customs-acts/
    └── ban/
        └── [Customs related PDFs]
```

## Features

- **Smart PDF Detection**: Only downloads files that are actually visible on the page
- **Filename Sanitization**: Converts Bengali/English titles to safe filenames
- **Duplicate Prevention**: Skips files that already exist
- **Progress Tracking**: Shows download progress with counters
- **Error Handling**: Gracefully handles network errors and invalid files
- **Respectful Scraping**: Adds delays between requests to avoid server overload

## Supported Pages

This script is designed for NBR pages that use table structures with PDF links, such as:

- Income Tax Acts
- VAT Acts
- Customs Acts
- Other regulation pages with similar structure

## Notes

- The script respects the server by adding 1-second delays between downloads
- Files are validated to ensure they are actual PDF files
- Bengali text in filenames is preserved where possible
- The script creates subdirectories based on the URL being scraped
