#!/usr/bin/env python3
"""
Enhanced PDF Processor for NBR Documents
OCR all PDFs with intelligent table detection and structured output
Supports Bengali + English mixed content with structured table extraction
"""

import re
import json
import csv
from pathlib import Path
from pdf2image import convert_from_path
import pytesseract
from tqdm import tqdm
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

# ---------- USER CONFIG ----------
ROOT = Path(r"../scraper/downloads")  # Change to your downloads folder
DPI_FAST = 300
DPI_TABLE = 600
LANG = "ben+eng"
TESS_FAST = f"--psm 6 --oem 3"
TESS_TABLE = f"--psm 4 --oem 3"
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
# ---------------------------------

# Enhanced table detection patterns
TABLE_PATTERNS = [
    # H.S. Code patterns (like 7306.29.20)
    re.compile(r"^\s*\d+\.\d+\.\d+", re.MULTILINE),
    # Numbered rows with pipe or vertical bar
    re.compile(r"^\s*\d+[A-Z]?\s*[|│]\s*", re.MULTILINE),
    # Tax rates with percentages
    re.compile(r"^\s*\d+\s+.*\d+\s*%", re.MULTILINE),
    # Bengali/English mixed table headers
    re.compile(r"(শিরনামা|Heading|কোড|Code|হার|Rate|শুল্ক|Duty)", re.MULTILINE),
    # Multiple columns with spacing
    re.compile(r"^\s*\S+\s+\S+\s+\S+\s+\S+", re.MULTILINE),
]

@dataclass
class TableRow:
    """Represents a structured table row"""
    columns: List[str]
    row_number: int
    confidence: float
    has_bengali: bool
    has_english: bool

@dataclass
class ExtractedTable:
    """Represents an extracted table with metadata"""
    rows: List[TableRow]
    page_number: int
    table_type: str
    headers: List[str]
    extraction_method: str

class EnhancedPDFProcessor:
    """Enhanced PDF processor with table structure detection"""
    
    def __init__(self, root_dir: Path = ROOT):
        self.root_dir = Path(root_dir)
        self.bengali_pattern = re.compile(r'[\u0980-\u09FF]')
        self.english_pattern = re.compile(r'[a-zA-Z]')
        
        # Common table headers in both languages
        self.table_headers = {
            'code': ['কোড', 'Code', 'H.S.', 'HS', 'সংখ্যা'],
            'description': ['বিবরণ', 'Description', 'পণ্য', 'goods'],
            'rate': ['হার', 'Rate', 'শুল্ক', 'Duty', '%'],
            'amount': ['টাকা', 'Taka', 'মূল্য', 'Value', 'Amount']
        }
    
    def detect_table_in_text(self, text: str) -> bool:
        """Enhanced table detection using multiple patterns"""
        for pattern in TABLE_PATTERNS:
            if pattern.search(text):
                return True
        return False
    
    def classify_table_type(self, text: str) -> str:
        """Classify the type of table based on content"""
        if re.search(r'\d+\.\d+\.\d+', text):
            return 'hs_code_table'
        elif re.search(r'(শুল্ক|Duty|কর|Tax)', text):
            return 'tax_table'
        elif re.search(r'(হার|Rate|%)', text):
            return 'rate_table'
        elif re.search(r'(আইন|Act|ধারা|Section)', text):
            return 'law_table'
        else:
            return 'general_table'
    
    def extract_table_headers(self, text: str) -> List[str]:
        """Extract potential table headers"""
        lines = text.split('\n')[:5]  # Check first 5 lines
        headers = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check for header patterns
            for category, keywords in self.table_headers.items():
                for keyword in keywords:
                    if keyword in line:
                        headers.append(line)
                        break
        
        return headers
    
    def parse_table_rows(self, text: str) -> List[TableRow]:
        """Parse text into structured table rows"""
        lines = text.split('\n')
        rows = []
        row_number = 0
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if this looks like a table row
            if self.is_table_row(line):
                row_number += 1
                columns = self.split_table_columns(line)
                
                if columns:
                    has_bengali = bool(self.bengali_pattern.search(line))
                    has_english = bool(self.english_pattern.search(line))
                    confidence = self.calculate_row_confidence(line, columns)
                    
                    row = TableRow(
                        columns=columns,
                        row_number=row_number,
                        confidence=confidence,
                        has_bengali=has_bengali,
                        has_english=has_english
                    )
                    rows.append(row)
        
        return rows
    
    def is_table_row(self, line: str) -> bool:
        """Check if a line looks like a table row"""
        # Skip obvious non-table lines
        if len(line) < 5:
            return False
        
        # Check for table row patterns
        patterns = [
            r'^\d+\.\d+\.\d+',  # H.S. codes
            r'^\d+\s+\S+.*\d+',  # Number followed by text and number
            r'.*\|\s*.*\|\s*.*',  # Pipe-separated values
            r'^\d+[A-Z]?\s+',     # Numbered entries
            r'.*\d+\s*%\s*$',     # Ends with percentage
            r'.*টাকা.*\d+',       # Contains taka and numbers
        ]
        
        for pattern in patterns:
            if re.match(pattern, line):
                return True
        
        return False
    
    def split_table_columns(self, line: str) -> List[str]:
        """Split a line into table columns"""
        # Try different splitting methods
        
        # Method 1: Pipe-separated
        if '|' in line or '│' in line:
            columns = re.split(r'[|│]', line)
            return [col.strip() for col in columns if col.strip()]
        
        # Method 2: Multiple spaces
        columns = re.split(r'\s{2,}', line)
        if len(columns) >= 2:
            return [col.strip() for col in columns if col.strip()]
        
        # Method 3: Tab-separated
        if '\t' in line:
            columns = line.split('\t')
            return [col.strip() for col in columns if col.strip()]
        
        # Method 4: Smart splitting for H.S. codes
        hs_match = re.match(r'^(\d+\.\d+\.\d+)\s+(.+?)(?:\s+(\d+(?:\.\d+)?)\s*%?\s*)?$', line)
        if hs_match:
            return [group for group in hs_match.groups() if group]
        
        # Fallback: return the whole line as single column
        return [line]
    
    def calculate_row_confidence(self, line: str, columns: List[str]) -> float:
        """Calculate confidence score for a table row"""
        confidence = 0.0
        
        # More columns = higher confidence
        confidence += min(len(columns) / 5.0, 1.0) * 0.3
        
        # Presence of numbers
        if re.search(r'\d+', line):
            confidence += 0.2
        
        # Presence of percentage
        if '%' in line:
            confidence += 0.1
        
        # H.S. code pattern
        if re.search(r'\d+\.\d+\.\d+', line):
            confidence += 0.3
        
        # Mixed language content
        if self.bengali_pattern.search(line) and self.english_pattern.search(line):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def ocr_page_with_enhanced_table_detection(self, img, page_num: int) -> Tuple[str, List[ExtractedTable]]:
        """
        Enhanced version of the original OCR function with table structure extraction
        """
        # Quick pass for table detection
        quick = pytesseract.image_to_string(
            img.resize((img.width // 2, img.height // 2)),
            lang=LANG,
            config=TESS_FAST,
        )
        
        tables = []
        
        if not self.detect_table_in_text(quick):
            return quick, tables
        
        # High-res re-OCR for table content
        hi = img.resize((img.width * 2, img.height * 2))  # ~600 dpi
        raw = pytesseract.image_to_string(hi, lang=LANG, config=TESS_TABLE)
        
        # Extract structured table data
        table_type = self.classify_table_type(raw)
        headers = self.extract_table_headers(raw)
        rows = self.parse_table_rows(raw)
        
        if rows:
            table = ExtractedTable(
                rows=rows,
                page_number=page_num,
                table_type=table_type,
                headers=headers,
                extraction_method='ocr_enhanced'
            )
            tables.append(table)
        
        # Create pipe-delimited output (original format)
        text_lines = raw.splitlines()
        pipe_rows, buf = [], []
        
        for ln in text_lines:
            ln = ln.strip()
            if not ln:
                continue
                
            if re.match(r"^\d+[A-Z]?\s", ln):  # New numbered row
                if buf:
                    pipe_rows.append(" | ".join(buf))
                    buf.clear()
            buf.append(ln)
        
        if buf:
            pipe_rows.append(" | ".join(buf))
        
        formatted_text = "\n".join(pipe_rows) + "\n"
        
        return formatted_text, tables
    
    def save_structured_data(self, pdf_path: Path, tables: List[ExtractedTable]):
        """Save extracted tables in structured formats"""
        if not tables:
            return
        
        base_name = pdf_path.stem
        output_dir = pdf_path.parent / "structured_data"
        output_dir.mkdir(exist_ok=True)
        
        # Save as JSON
        json_data = {
            'source_pdf': str(pdf_path),
            'extraction_date': datetime.now().isoformat(),
            'tables': []
        }
        
        for table in tables:
            table_data = {
                'page_number': table.page_number,
                'table_type': table.table_type,
                'headers': table.headers,
                'extraction_method': table.extraction_method,
                'rows': []
            }
            
            for row in table.rows:
                row_data = {
                    'row_number': row.row_number,
                    'columns': row.columns,
                    'confidence': row.confidence,
                    'has_bengali': row.has_bengali,
                    'has_english': row.has_english
                }
                table_data['rows'].append(row_data)
            
            json_data['tables'].append(table_data)
        
        # Save JSON
        json_path = output_dir / f"{base_name}_tables.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)
        
        # Save as CSV for each table
        for i, table in enumerate(tables):
            csv_path = output_dir / f"{base_name}_table_{i+1}.csv"
            with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                
                # Write headers if available
                if table.headers:
                    writer.writerow(table.headers)
                
                # Write data rows
                for row in table.rows:
                    writer.writerow(row.columns)
        
        print(f"✅ Structured data saved: {len(tables)} tables in {output_dir}")
    
    def process_single_pdf(self, pdf_path: Path) -> Dict:
        """Process a single PDF file with enhanced table extraction"""
        txt_path = pdf_path.with_suffix(".txt")
        
        if txt_path.exists():
            return {'status': 'skipped', 'reason': 'already processed'}
        
        txt_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            pages = convert_from_path(pdf_path, dpi=DPI_FAST, fmt="png", use_pdftocairo=True)
            full_text = []
            all_tables = []
            
            for page_num, img in enumerate(pages, 1):
                page_text, page_tables = self.ocr_page_with_enhanced_table_detection(img, page_num)
                full_text.append(page_text)
                all_tables.extend(page_tables)
            
            # Save text file
            txt_path.write_text("\n".join(full_text), encoding="utf-8")
            
            # Save structured data
            self.save_structured_data(pdf_path, all_tables)
            
            return {
                'status': 'success',
                'pages_processed': len(pages),
                'tables_extracted': len(all_tables),
                'text_file': str(txt_path),
                'has_tables': len(all_tables) > 0
            }
            
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def process_all_pdfs(self) -> Dict:
        """Process all PDFs in the root directory"""
        pdfs = list(self.root_dir.rglob("*.pdf"))
        
        if not pdfs:
            print("No PDFs found in", self.root_dir)
            return {'status': 'no_files'}
        
        results = {
            'total_pdfs': len(pdfs),
            'processed': 0,
            'skipped': 0,
            'errors': 0,
            'tables_found': 0,
            'files': []
        }
        
        for pdf in tqdm(pdfs, desc="Processing PDFs", unit="file"):
            result = self.process_single_pdf(pdf)
            results['files'].append({
                'pdf': str(pdf),
                'result': result
            })
            
            if result['status'] == 'success':
                results['processed'] += 1
                results['tables_found'] += result.get('tables_extracted', 0)
            elif result['status'] == 'skipped':
                results['skipped'] += 1
            else:
                results['errors'] += 1
            
            # Progress update
            if result['status'] == 'success' and result.get('has_tables'):
                tqdm.write(f"✅ {pdf.name}: {result['tables_extracted']} tables extracted")
        
        return results


def main():
    """Main function"""
    processor = EnhancedPDFProcessor()
    
    print("🚀 Enhanced PDF Processor for NBR Documents")
    print("=" * 50)
    print(f"📁 Root directory: {processor.root_dir}")
    print(f"🔤 Languages: {LANG}")
    print(f"📊 Table detection: Enhanced")
    print("=" * 50)
    
    results = processor.process_all_pdfs()
    
    print("\n" + "=" * 50)
    print("📈 PROCESSING SUMMARY")
    print("=" * 50)
    print(f"📄 Total PDFs: {results['total_pdfs']}")
    print(f"✅ Processed: {results['processed']}")
    print(f"⏭️  Skipped: {results['skipped']}")
    print(f"❌ Errors: {results['errors']}")
    print(f"📊 Tables extracted: {results['tables_found']}")
    
    if results['tables_found'] > 0:
        print(f"\n🎉 Successfully extracted {results['tables_found']} structured tables!")
        print("📁 Check the 'structured_data' folders for:")
        print("   - JSON files with complete table data")
        print("   - CSV files for each table")
        print("   - Original text files with pipe-delimited format")
    
    # Save summary report
    summary_path = processor.root_dir / "processing_summary.json"
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n📋 Full report saved to: {summary_path}")


if __name__ == "__main__":
    main()