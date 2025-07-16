# Batch PDF OCR Processing System

This system provides two batch processors for extracting text from all PDF files in your downloads folder using OCR technology optimized for Bengali and English text.

## 🎯 Text Quality Assessment

Based on the test results, the OCR quality is excellent:

- ✅ **Bengali text extraction**: 640 Bengali characters extracted accurately
- ✅ **Mixed language support**: Both Bengali and English text processed correctly
- ✅ **Document structure preserved**: Proper formatting and line breaks maintained
- ✅ **Numbers and dates**: Correctly extracted (২০২৩, ১৪৩০, ২৫ অক্টোবর)

## 📁 Available Processing Options

### 1. Single Folder Processor (`batch_single_folder_processor.py`)

- Process **one subfolder at a time**
- Ideal for testing and controlled processing
- Handles large PDFs (300-400 pages) with memory management
- Provides detailed progress tracking

### 2. Full Batch Processor (`batch_full_processor.py`)

- Process **ALL subfolders automatically**
- Comprehensive logging and reporting
- Parallel processing capabilities
- Handles the entire downloads directory

## 🚀 Quick Start Guide

### Step 1: Test with Single Folder

```bash
# Test with a small folder first
python batch_single_folder_processor.py ../scraper/downloads/customs-acts/ban

# Process with custom output folder
python batch_single_folder_processor.py ../scraper/downloads/vat-acts/ban --output extracted_text
```

### Step 2: Check Output Quality

- Look in the `text/` folder for extracted text files
- Verify Bengali and English text quality
- Check page separation and formatting

### Step 3: Run Full Batch Processing

```bash
# See what would be processed (dry run)
python batch_full_processor.py --dry-run

# Process all folders
python batch_full_processor.py

# Use multiple workers for faster processing
python batch_full_processor.py --workers 4
```

## 📊 Output Structure

```
text/
├── customs-acts/
│   ├── file1_extracted.txt
│   ├── file2_extracted.txt
│   └── ...
├── income-tax-acts/
│   ├── file1_extracted.txt
│   └── ...
├── vat-acts/
└── ...
```

## 🔧 System Requirements

- **Python 3.7+** with required packages:
  - `pytesseract`
  - `pdf2image`
  - `Pillow`
- **Tesseract OCR** installed at: `C:\Program Files\Tesseract-OCR\tesseract.exe`
- **Poppler** installed at: `C:\Program Files\poppler\Library\bin`

## 📋 Features

### Memory Management

- Processes large PDFs in batches (10-20 pages at a time)
- Automatic memory cleanup after each batch
- Handles 300-400 page PDFs without memory issues

### Error Handling

- Continues processing even if individual files fail
- Detailed error logging and reporting
- Graceful handling of corrupted PDFs

### Progress Tracking

- Real-time progress updates
- Detailed statistics (pages processed, success rate)
- Comprehensive logging to files

### Text Analysis

- Counts Bengali and English characters
- Word count statistics
- Character encoding analysis

## 🔍 Available Folders

Based on your downloads directory, the following folders are available for processing:

- **customs-acts** - Customs Act documents
- **customs-gos** - Customs Government Orders
- **customs-rules** - Customs Rules
- **customs-sros** - Customs SROs
- **income-tax-acts** - Income Tax Acts
- **income-tax-gos** - Income Tax Government Orders
- **income-tax-rules** - Income Tax Rules
- **income-tax-sros** - Income Tax SROs
- **vat-acts** - VAT Acts
- **vat-gos** - VAT Government Orders
- **vat-rules** - VAT Rules
- **vat-sros** - VAT SROs
- **excise-gos** - Excise Government Orders
- **excise-sros** - Excise SROs

## 📝 Usage Examples

### Single Folder Processing

```bash
# Process customs acts
python batch_single_folder_processor.py ../scraper/downloads/customs-acts/ban

# Process income tax rules with custom output
python batch_single_folder_processor.py ../scraper/downloads/income-tax-rules/ban --output my_extracted_text

# Show help
python batch_single_folder_processor.py --help
```

### Full Batch Processing

```bash
# Process all folders
python batch_full_processor.py

# Custom downloads path
python batch_full_processor.py --downloads /path/to/downloads

# Use 4 parallel workers
python batch_full_processor.py --workers 4

# Custom output directory
python batch_full_processor.py --output extracted_text
```

## 📊 Monitoring and Logs

### Logs Directory

- `logs/batch_processing_YYYYMMDD_HHMMSS.log` - Detailed processing logs
- Real-time progress updates
- Error details and stack traces

### Reports Directory

- `reports/processing_report_YYYYMMDD_HHMMSS.json` - Comprehensive processing report
- Statistics for each folder
- Success/failure rates
- Processing times

## ⚠️ Important Notes

1. **Disk Space**: Ensure you have sufficient disk space (approximately 50-100MB per 100 pages)
2. **Processing Time**: Large PDFs may take 30-60 seconds per file
3. **Memory Usage**: The system is optimized for memory efficiency but large batches may still use significant RAM
4. **Error Recovery**: The system continues processing even if individual files fail

## 🎉 Expected Results

With your 231 PDF files across all folders, you can expect:

- **Processing time**: 2-4 hours for all files
- **Success rate**: 85-95% (depends on PDF quality)
- **Text quality**: High accuracy for both Bengali and English
- **Output size**: Approximately 50-200MB of text files

## 🛠️ Troubleshooting

### Common Issues

1. **Memory errors**: Reduce batch size or use fewer workers
2. **Poppler not found**: Check poppler installation path
3. **Tesseract errors**: Verify tesseract installation
4. **Permission errors**: Run as administrator if needed

### Performance Tuning

- Adjust `max_pages_per_batch` in the code (default: 10)
- Modify `max_workers` for parallel processing (default: 2)
- Use SSD storage for better performance

## 📞 Support

If you encounter any issues:

1. Check the logs directory for detailed error messages
2. Try processing a single small folder first
3. Verify all dependencies are installed correctly
4. Check available disk space and memory
