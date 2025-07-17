#!/usr/bin/env python3
"""
Penalty Table Parser for NBR Customs Act
Parses 3-column penalty tables with pipe separators
"""

import re
import json
import csv
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class PenaltyEntry:
    """Represents a penalty table entry with 3 columns"""
    offense_description: str
    penalty_details: str
    section_reference: str
    confidence: float
    has_bengali: bool
    has_english: bool
    row_number: int
    raw_text: str

class PenaltyTableParser:
    """Parser for 3-column penalty tables with pipe separators"""
    
    def __init__(self):
        self.bengali_pattern = re.compile(r'[\u0980-\u09FF]')
        self.english_pattern = re.compile(r'[a-zA-Z]')
        
        # Patterns for identifying table rows
        self.table_row_patterns = [
            re.compile(r'^\s*\([ivxlc]+\)\s+.*\|.*\|.*', re.IGNORECASE),  # (i), (ii), (iii), (iv)
            re.compile(r'^\s*\d+\s+.*\|.*\|.*'),  # Numbers like 1, 2, 3
            re.compile(r'^\s*[A-Z]+\d*[A-Z]*\.\s+.*\|.*\|.*'),  # 47A., ATA.
            re.compile(r'.*authority.*\|.*penalty.*\|.*', re.IGNORECASE),  # Authority/penalty pattern
            re.compile(r'.*lakh.*Taka.*\|.*', re.IGNORECASE),  # Contains lakh Taka
        ]
        
        # Clean up patterns
        self.cleanup_patterns = [
            (re.compile(r'\s+'), ' '),  # Multiple spaces to single space
            (re.compile(r'\|\s*\|'), '|'),  # Double pipes to single
            (re.compile(r'^\s*\|\s*'), ''),  # Leading pipe
            (re.compile(r'\s*\|\s*$'), ''),  # Trailing pipe
        ]
    
    def is_table_row(self, line: str) -> bool:
        """Check if a line is part of a table row"""
        line = line.strip()
        
        # Must have at least 2 pipe separators for 3 columns
        if line.count('|') < 1:
            return False
        
        # Check against table row patterns
        for pattern in self.table_row_patterns:
            if pattern.search(line):
                return True
        
        # Additional checks for table-like content
        if len(line) > 50 and '|' in line:
            # Check if it contains penalty-related keywords
            penalty_keywords = ['penalty', 'fine', 'lakh', 'Taka', 'imprisonment', 'conviction']
            if any(keyword in line.lower() for keyword in penalty_keywords):
                return True
        
        return False
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        for pattern, replacement in self.cleanup_patterns:
            text = pattern.sub(replacement, text)
        return text.strip()
    
    def split_table_row(self, line: str) -> Tuple[str, str, str]:
        """Split a table row into 3 columns"""
        # Clean the line first
        line = self.clean_text(line)
        
        # Split by pipe separator
        parts = line.split('|')
        
        # Ensure we have exactly 3 parts
        if len(parts) >= 3:
            col1 = self.clean_text(parts[0])
            col2 = self.clean_text(parts[1])
            col3 = self.clean_text(parts[2])
        elif len(parts) == 2:
            col1 = self.clean_text(parts[0])
            col2 = self.clean_text(parts[1])
            col3 = ""
        else:
            col1 = self.clean_text(parts[0]) if parts else ""
            col2 = ""
            col3 = ""
        
        return col1, col2, col3
    
    def merge_multiline_rows(self, lines: List[str]) -> List[str]:
        """Merge multiline table rows that belong together"""
        merged_rows = []
        current_row = ""
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if this line starts a new table row
            if self.is_table_row(line):
                # Save previous row if exists
                if current_row:
                    merged_rows.append(current_row)
                current_row = line
            else:
                # This might be a continuation of the previous row
                if current_row:
                    # Add to current row with a space
                    current_row += " " + line
                else:
                    # Standalone line, check if it's table-like
                    if '|' in line and len(line) > 30:
                        current_row = line
        
        # Add the last row
        if current_row:
            merged_rows.append(current_row)
        
        return merged_rows
    
    def parse_penalty_entry(self, row_text: str, row_number: int) -> Optional[PenaltyEntry]:
        """Parse a single penalty table row"""
        
        # Split into columns
        col1, col2, col3 = self.split_table_row(row_text)
        
        # Skip if all columns are empty or too short
        if len(col1) < 10 and len(col2) < 10 and len(col3) < 3:
            return None
        
        # Language detection
        has_bengali = bool(self.bengali_pattern.search(row_text))
        has_english = bool(self.english_pattern.search(row_text))
        
        # Calculate confidence based on content quality
        confidence = self.calculate_confidence(col1, col2, col3)
        
        return PenaltyEntry(
            offense_description=col1,
            penalty_details=col2,
            section_reference=col3,
            confidence=confidence,
            has_bengali=has_bengali,
            has_english=has_english,
            row_number=row_number,
            raw_text=row_text
        )
    
    def calculate_confidence(self, col1: str, col2: str, col3: str) -> float:
        """Calculate confidence score for a penalty entry"""
        confidence = 0.0
        
        # Column 1 (Offense) quality
        if len(col1) > 20:
            confidence += 0.3
        if any(keyword in col1.lower() for keyword in ['person', 'authority', 'access', 'without']):
            confidence += 0.2
        
        # Column 2 (Penalty) quality
        if len(col2) > 20:
            confidence += 0.3
        if any(keyword in col2.lower() for keyword in ['penalty', 'fine', 'lakh', 'taka', 'imprisonment']):
            confidence += 0.2
        
        # Column 3 (Section) quality
        if len(col3) > 2:
            confidence += 0.1
        if any(keyword in col3.lower() for keyword in ['204b', '79b', 'section']):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def parse_text_file(self, file_path: Path) -> List[PenaltyEntry]:
        """Parse a text file for penalty table entries"""
        
        if not file_path.exists():
            return []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Split into lines
            lines = content.split('\n')
            
            # Find table rows
            table_rows = []
            for line in lines:
                if self.is_table_row(line):
                    table_rows.append(line)
            
            # Merge multiline rows
            merged_rows = self.merge_multiline_rows(table_rows)
            
            # Parse each row
            entries = []
            for i, row_text in enumerate(merged_rows):
                entry = self.parse_penalty_entry(row_text, i + 1)
                if entry:
                    entries.append(entry)
            
            return entries
            
        except Exception as e:
            print(f"Error parsing file {file_path}: {e}")
            return []
    
    def save_as_csv(self, entries: List[PenaltyEntry], output_path: Path):
        """Save entries as CSV"""
        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            
            # Write header
            writer.writerow([
                'Row Number', 'Offense Description', 'Penalty Details', 'Section Reference',
                'Confidence', 'Has Bengali', 'Has English', 'Raw Text'
            ])
            
            # Write data
            for entry in entries:
                writer.writerow([
                    entry.row_number,
                    entry.offense_description,
                    entry.penalty_details,
                    entry.section_reference,
                    f"{entry.confidence:.2f}",
                    entry.has_bengali,
                    entry.has_english,
                    entry.raw_text[:200] + "..." if len(entry.raw_text) > 200 else entry.raw_text
                ])
    
    def save_as_json(self, entries: List[PenaltyEntry], output_path: Path, source_file: str):
        """Save entries as JSON"""
        data = {
            'source_file': source_file,
            'document_type': 'penalty_table',
            'extraction_date': datetime.now().isoformat(),
            'total_entries': len(entries),
            'entries': [asdict(entry) for entry in entries]
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def analyze_entries(self, entries: List[PenaltyEntry]) -> Dict:
        """Analyze penalty entries"""
        if not entries:
            return {'total': 0}
        
        analysis = {
            'total_entries': len(entries),
            'with_offense': len([e for e in entries if e.offense_description]),
            'with_penalty': len([e for e in entries if e.penalty_details]),
            'with_section': len([e for e in entries if e.section_reference]),
            'with_bengali': len([e for e in entries if e.has_bengali]),
            'with_english': len([e for e in entries if e.has_english]),
            'mixed_language': len([e for e in entries if e.has_bengali and e.has_english]),
            'avg_confidence': sum(e.confidence for e in entries) / len(entries),
            'high_confidence': len([e for e in entries if e.confidence > 0.6]),
        }
        
        return analysis


def main():
    """Test the penalty table parser"""
    print("📋 Penalty Table Parser for NBR Customs Act")
    print("=" * 60)
    
    # Test with the extracted Customs Act file
    test_file = Path("test_output/Customs_Act-1969_Amendment_Again_Uploaded_test.txt")
    
    if not test_file.exists():
        print(f"❌ Test file not found: {test_file}")
        return
    
    # Parse the file
    parser = PenaltyTableParser()
    entries = parser.parse_text_file(test_file)
    
    # Analyze results
    analysis = parser.analyze_entries(entries)
    
    print(f"📊 Penalty Table Parsing Results:")
    print(f"   📋 Total entries: {analysis['total_entries']}")
    print(f"   🔍 With Offense: {analysis['with_offense']}")
    print(f"   💰 With Penalty: {analysis['with_penalty']}")
    print(f"   📚 With Section: {analysis['with_section']}")
    print(f"   🇧🇩 With Bengali: {analysis['with_bengali']}")
    print(f"   🇺🇸 With English: {analysis['with_english']}")
    print(f"   🌐 Mixed Language: {analysis['mixed_language']}")
    print(f"   📈 Avg Confidence: {analysis['avg_confidence']:.2f}")
    print(f"   ⭐ High Confidence: {analysis['high_confidence']}")
    
    # Show sample entries
    print(f"\n📋 Sample Penalty Table Entries:")
    for i, entry in enumerate(entries[:3], 1):
        print(f"\n   {i}. Row {entry.row_number} (Confidence: {entry.confidence:.2f})")
        print(f"      🔍 Offense: {entry.offense_description[:60]}...")
        print(f"      💰 Penalty: {entry.penalty_details[:60]}...")
        print(f"      📚 Section: {entry.section_reference}")
    
    # Save results
    output_dir = Path("penalty_output")
    output_dir.mkdir(exist_ok=True)
    
    base_name = "customs_act_penalties"
    
    # Save as CSV
    csv_path = output_dir / f"{base_name}.csv"
    parser.save_as_csv(entries, csv_path)
    
    # Save as JSON
    json_path = output_dir / f"{base_name}.json"
    parser.save_as_json(entries, json_path, str(test_file))
    
    print(f"\n💾 Penalty Table Output Files:")
    print(f"   📄 CSV: {csv_path}")
    print(f"   📄 JSON: {json_path}")
    
    print(f"\n🎉 Penalty table parsing completed!")


if __name__ == "__main__":
    main()