#!/usr/bin/env python3
"""
Simple Table Extractor for NBR Documents
Works with existing extracted text files to create structured table data
"""

import re
import json
import csv
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class TableRow:
    """Represents a structured table row"""
    hs_code: str
    heading_number: str
    description: str
    rate: str
    original_text: str
    has_bengali: bool
    has_english: bool
    confidence: float

@dataclass
class ExtractedTable:
    """Represents an extracted table with metadata"""
    table_type: str
    rows: List[TableRow]
    source_file: str
    extraction_date: str
    total_rows: int

class SimpleTableExtractor:
    """Simple table extractor for NBR text files"""
    
    def __init__(self):
        self.bengali_pattern = re.compile(r'[\u0980-\u09FF]')
        self.english_pattern = re.compile(r'[a-zA-Z]')
        
        # H.S. Code pattern (like 7306.29.20)
        self.hs_code_pattern = re.compile(r'(\d+\.\d+\.\d+)')
        
        # Heading number pattern (like 73.06)
        self.heading_pattern = re.compile(r'(\d+\.\d+)')
        
        # Rate pattern (like 20, 20%, etc.)
        self.rate_pattern = re.compile(r'(\d+)\s*%?$')
        
        # Table header indicators
        self.table_indicators = [
            'শিরনামা সংখ্যা', 'Heading No.',
            'সামঞ্জস্যপূর্ণ নামকরণ কোড', 'H.S. Code',
            'পণ্যসমূহের বিবরণ', 'Description of goods',
            'সম্পূরক শুল্ক হার', 'Rate'
        ]
    
    def detect_table_rows(self, text: str) -> List[str]:
        """Detect lines that look like table rows"""
        lines = text.split('\n')
        table_rows = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check for H.S. code pattern
            if self.hs_code_pattern.search(line):
                table_rows.append(line)
            
            # Check for patterns with rates
            elif re.search(r'.*\d+\s*%?\s*$', line) and len(line) > 10:
                table_rows.append(line)
            
            # Check for structured data with multiple parts
            elif len(line.split()) >= 3 and any(char.isdigit() for char in line):
                table_rows.append(line)
        
        return table_rows
    
    def parse_table_row(self, line: str) -> Optional[TableRow]:
        """Parse a single table row"""
        original_text = line
        
        # Extract H.S. code
        hs_match = self.hs_code_pattern.search(line)
        hs_code = hs_match.group(1) if hs_match else ""
        
        # Extract heading number (first part of H.S. code)
        heading_number = ""
        if hs_code:
            parts = hs_code.split('.')
            if len(parts) >= 2:
                heading_number = f"{parts[0]}.{parts[1]}"
        
        # Extract rate (usually at the end)
        rate = ""
        rate_match = self.rate_pattern.search(line)
        if rate_match:
            rate = rate_match.group(1) + "%"
        
        # Extract description (everything between code and rate)
        description = line
        if hs_code:
            description = description.replace(hs_code, "").strip()
        if rate:
            description = re.sub(r'\s*\d+\s*%?\s*$', '', description).strip()
        
        # Language detection
        has_bengali = bool(self.bengali_pattern.search(line))
        has_english = bool(self.english_pattern.search(line))
        
        # Calculate confidence
        confidence = self.calculate_confidence(line, hs_code, rate, description)
        
        return TableRow(
            hs_code=hs_code,
            heading_number=heading_number,
            description=description,
            rate=rate,
            original_text=original_text,
            has_bengali=has_bengali,
            has_english=has_english,
            confidence=confidence
        )
    
    def calculate_confidence(self, line: str, hs_code: str, rate: str, description: str) -> float:
        """Calculate confidence score for a table row"""
        confidence = 0.0
        
        # H.S. code presence
        if hs_code:
            confidence += 0.4
        
        # Rate presence
        if rate:
            confidence += 0.3
        
        # Description length
        if len(description) > 10:
            confidence += 0.2
        
        # Mixed language content
        if self.bengali_pattern.search(line) and self.english_pattern.search(line):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def extract_tables_from_text(self, text: str, source_file: str) -> List[ExtractedTable]:
        """Extract structured tables from text"""
        
        # Detect table rows
        table_rows = self.detect_table_rows(text)
        
        if not table_rows:
            return []
        
        # Parse rows
        parsed_rows = []
        for row_text in table_rows:
            parsed_row = self.parse_table_row(row_text)
            if parsed_row and parsed_row.confidence > 0.3:  # Only include confident rows
                parsed_rows.append(parsed_row)
        
        if not parsed_rows:
            return []
        
        # Create table
        table = ExtractedTable(
            table_type="hs_code_table",
            rows=parsed_rows,
            source_file=source_file,
            extraction_date=datetime.now().isoformat(),
            total_rows=len(parsed_rows)
        )
        
        return [table]
    
    def save_table_as_csv(self, table: ExtractedTable, output_path: Path):
        """Save table as CSV"""
        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            
            # Write header
            writer.writerow([
                'H.S. Code', 'Heading Number', 'Description', 'Rate (%)', 
                'Has Bengali', 'Has English', 'Confidence', 'Original Text'
            ])
            
            # Write data rows
            for row in table.rows:
                writer.writerow([
                    row.hs_code,
                    row.heading_number,
                    row.description,
                    row.rate,
                    row.has_bengali,
                    row.has_english,
                    f"{row.confidence:.2f}",
                    row.original_text
                ])
    
    def save_table_as_json(self, table: ExtractedTable, output_path: Path):
        """Save table as JSON"""
        table_dict = asdict(table)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(table_dict, f, ensure_ascii=False, indent=2)
    
    def process_text_file(self, text_file: Path) -> Dict:
        """Process a single text file"""
        
        if not text_file.exists():
            return {'status': 'error', 'message': 'File not found'}
        
        try:
            # Read text file
            with open(text_file, 'r', encoding='utf-8') as f:
                text = f.read()
            
            # Extract tables
            tables = self.extract_tables_from_text(text, str(text_file))
            
            if not tables:
                return {'status': 'no_tables', 'message': 'No tables found'}
            
            # Create output directory
            output_dir = text_file.parent / "structured_tables"
            output_dir.mkdir(exist_ok=True)
            
            # Save tables
            saved_files = []
            for i, table in enumerate(tables):
                base_name = f"{text_file.stem}_table_{i+1}"
                
                # Save as CSV
                csv_path = output_dir / f"{base_name}.csv"
                self.save_table_as_csv(table, csv_path)
                saved_files.append(csv_path)
                
                # Save as JSON
                json_path = output_dir / f"{base_name}.json"
                self.save_table_as_json(table, json_path)
                saved_files.append(json_path)
            
            return {
                'status': 'success',
                'tables_found': len(tables),
                'total_rows': sum(table.total_rows for table in tables),
                'output_files': [str(f) for f in saved_files]
            }
            
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
    
    def analyze_text_file(self, text_file: Path) -> Dict:
        """Analyze a text file for table content"""
        
        if not text_file.exists():
            return {'status': 'error', 'message': 'File not found'}
        
        try:
            with open(text_file, 'r', encoding='utf-8') as f:
                text = f.read()
            
            # Basic analysis
            lines = text.split('\n')
            total_lines = len(lines)
            non_empty_lines = len([l for l in lines if l.strip()])
            
            # Language analysis
            has_bengali = bool(self.bengali_pattern.search(text))
            has_english = bool(self.english_pattern.search(text))
            
            # Table detection
            table_rows = self.detect_table_rows(text)
            hs_codes = self.hs_code_pattern.findall(text)
            
            # Pattern analysis
            patterns = {
                'hs_codes': len(hs_codes),
                'potential_table_rows': len(table_rows),
                'rate_patterns': len(re.findall(r'\d+\s*%', text)),
                'heading_patterns': len(re.findall(r'শিরনামা|Heading', text)),
                'description_patterns': len(re.findall(r'বিবরণ|Description', text))
            }
            
            return {
                'status': 'success',
                'file_stats': {
                    'total_lines': total_lines,
                    'non_empty_lines': non_empty_lines,
                    'has_bengali': has_bengali,
                    'has_english': has_english,
                    'file_size': text_file.stat().st_size
                },
                'table_indicators': patterns,
                'sample_hs_codes': hs_codes[:10],  # First 10 codes
                'sample_table_rows': table_rows[:5]  # First 5 rows
            }
            
        except Exception as e:
            return {'status': 'error', 'message': str(e)}


def main():
    """Test the table extractor"""
    print("🔍 Simple Table Extractor for NBR Documents")
    print("=" * 50)
    
    # Test with the existing income act file
    test_file = Path("../incomeact.txt")
    
    if not test_file.exists():
        print(f"❌ Test file not found: {test_file}")
        return
    
    extractor = SimpleTableExtractor()
    
    # Analyze the file
    print(f"📊 Analyzing: {test_file.name}")
    analysis = extractor.analyze_text_file(test_file)
    
    if analysis['status'] != 'success':
        print(f"❌ Analysis failed: {analysis['message']}")
        return
    
    # Print analysis results
    stats = analysis['file_stats']
    indicators = analysis['table_indicators']
    
    print(f"\n📋 File Analysis:")
    print(f"   📄 Total lines: {stats['total_lines']:,}")
    print(f"   📝 Non-empty lines: {stats['non_empty_lines']:,}")
    print(f"   💾 File size: {stats['file_size'] / 1024:.1f} KB")
    print(f"   🇧🇩 Has Bengali: {'✅' if stats['has_bengali'] else '❌'}")
    print(f"   🇺🇸 Has English: {'✅' if stats['has_english'] else '❌'}")
    
    print(f"\n📊 Table Indicators:")
    print(f"   🏷️  H.S. Codes: {indicators['hs_codes']}")
    print(f"   📋 Potential rows: {indicators['potential_table_rows']}")
    print(f"   💯 Rate patterns: {indicators['rate_patterns']}")
    print(f"   📑 Heading patterns: {indicators['heading_patterns']}")
    print(f"   📝 Description patterns: {indicators['description_patterns']}")
    
    # Show sample H.S. codes
    if analysis['sample_hs_codes']:
        print(f"\n🔢 Sample H.S. Codes:")
        for code in analysis['sample_hs_codes']:
            print(f"   • {code}")
    
    # Show sample table rows
    if analysis['sample_table_rows']:
        print(f"\n📋 Sample Table Rows:")
        for i, row in enumerate(analysis['sample_table_rows'], 1):
            preview = row[:80] + "..." if len(row) > 80 else row
            print(f"   {i}. {preview}")
    
    # Process the file
    print(f"\n🔄 Processing tables...")
    result = extractor.process_text_file(test_file)
    
    if result['status'] == 'success':
        print(f"✅ Processing successful!")
        print(f"   📊 Tables found: {result['tables_found']}")
        print(f"   📋 Total rows: {result['total_rows']}")
        print(f"   💾 Output files: {len(result['output_files'])}")
        
        print(f"\n📁 Generated files:")
        for file_path in result['output_files']:
            print(f"   • {file_path}")
        
        print(f"\n🎉 Table extraction completed successfully!")
        
    elif result['status'] == 'no_tables':
        print(f"⚠️  No tables detected in the file")
        
    else:
        print(f"❌ Processing failed: {result['message']}")


if __name__ == "__main__":
    main()