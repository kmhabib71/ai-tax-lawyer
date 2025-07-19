#!/usr/bin/env python3
"""
Improved Table Parser for NBR Tax Documents
Better parsing of H.S. code tables with proper structure recognition
"""

import re
import json
import csv
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class TableEntry:
    """Represents a single table entry (product/tax item)"""
    hs_code: str
    heading_number: str
    description: str
    rate: str
    confidence: float
    line_number: int
    has_bengali: bool
    has_english: bool

class ImprovedTableParser:
    """Improved parser for NBR tax table structures"""
    
    def __init__(self):
        self.bengali_pattern = re.compile(r'[\u0980-\u09FF]')
        self.english_pattern = re.compile(r'[a-zA-Z]')
        
        # Enhanced H.S. Code pattern with context
        self.hs_code_pattern = re.compile(r'(\d{4}\.\d{2}\.\d{2})')
        
        # Rate patterns
        self.rate_patterns = [
            re.compile(r'(\d+)\s*%'),  # "20%"
            re.compile(r'(\d+)\s+(?=\d{4}\.\d{2}\.\d{2}|\w+|$)'),  # "20 " followed by code or word
        ]
        
        # Product description patterns
        self.description_keywords = [
            'স্টীল', 'steel', 'লৌহ', 'iron', 'পাইপ', 'pipe', 'তৈরী', 'made',
            'অন্যান্য', 'other', 'সার্কুলার', 'circular', 'ফ্যান', 'fan',
            'ব্যাটারী', 'battery', 'রেজর', 'razor', 'ফিল্টার', 'filter'
        ]
    
    def split_into_entries(self, text: str) -> List[str]:
        """Split text into individual table entries"""
        entries = []
        
        # First, try to split by H.S. codes
        hs_code_splits = self.hs_code_pattern.split(text)
        
        current_entry = ""
        for i, part in enumerate(hs_code_splits):
            if self.hs_code_pattern.match(part):
                # This is an H.S. code
                if current_entry.strip():
                    entries.append(current_entry.strip())
                current_entry = part
            else:
                # This is content after an H.S. code
                current_entry += part
        
        # Add the last entry
        if current_entry.strip():
            entries.append(current_entry.strip())
        
        # Filter out entries that are too short or don't look like table entries
        filtered_entries = []
        for entry in entries:
            if (len(entry) > 10 and 
                (self.hs_code_pattern.search(entry) or 
                 any(keyword in entry.lower() for keyword in self.description_keywords))):
                filtered_entries.append(entry)
        
        return filtered_entries
    
    def parse_single_entry(self, entry_text: str, line_number: int) -> Optional[TableEntry]:
        """Parse a single table entry"""
        
        # Extract H.S. code
        hs_match = self.hs_code_pattern.search(entry_text)
        hs_code = hs_match.group(1) if hs_match else ""
        
        # Extract heading number
        heading_number = ""
        if hs_code:
            parts = hs_code.split('.')
            if len(parts) >= 2:
                heading_number = f"{parts[0]}.{parts[1]}"
        
        # Extract rate
        rate = ""
        for pattern in self.rate_patterns:
            match = pattern.search(entry_text)
            if match:
                rate = match.group(1) + "%"
                break
        
        # Extract description
        description = entry_text
        
        # Remove H.S. code from description
        if hs_code:
            description = description.replace(hs_code, "").strip()
        
        # Remove rate from description
        if rate:
            # Remove the rate number (without %)
            rate_num = rate.replace("%", "")
            description = re.sub(rf'\b{rate_num}\s*%?\b', '', description).strip()
        
        # Clean up description
        description = self.clean_description(description)
        
        # Language detection
        has_bengali = bool(self.bengali_pattern.search(entry_text))
        has_english = bool(self.english_pattern.search(entry_text))
        
        # Calculate confidence
        confidence = self.calculate_confidence(entry_text, hs_code, rate, description)
        
        # Only return if we have minimum required data
        if hs_code or (len(description) > 20 and rate):
            return TableEntry(
                hs_code=hs_code,
                heading_number=heading_number,
                description=description,
                rate=rate,
                confidence=confidence,
                line_number=line_number,
                has_bengali=has_bengali,
                has_english=has_english
            )
        
        return None
    
    def clean_description(self, desc: str) -> str:
        """Clean up description text"""
        # Remove extra whitespace
        desc = re.sub(r'\s+', ' ', desc).strip()
        
        # Remove common OCR artifacts
        desc = re.sub(r'[|│]', '', desc)
        desc = re.sub(r'^\d+\s*', '', desc)  # Remove leading numbers
        desc = re.sub(r'\s*\d+\s*$', '', desc)  # Remove trailing numbers
        
        # Remove very short words that might be OCR errors
        words = desc.split()
        cleaned_words = []
        for word in words:
            if len(word) > 1 or word.isdigit() or re.match(r'[\u0980-\u09FF]', word):
                cleaned_words.append(word)
        
        return ' '.join(cleaned_words)
    
    def calculate_confidence(self, text: str, hs_code: str, rate: str, description: str) -> float:
        """Calculate confidence score for a table entry"""
        confidence = 0.0
        
        # H.S. code presence (strong indicator)
        if hs_code:
            confidence += 0.5
        
        # Rate presence
        if rate:
            confidence += 0.3
        
        # Description quality
        if len(description) > 20:
            confidence += 0.2
        elif len(description) > 10:
            confidence += 0.1
        
        # Language diversity
        if self.bengali_pattern.search(text) and self.english_pattern.search(text):
            confidence += 0.1
        
        # Keyword presence
        if any(keyword in description.lower() for keyword in self.description_keywords):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def parse_text_file(self, file_path: Path) -> List[TableEntry]:
        """Parse a text file and extract table entries"""
        
        if not file_path.exists():
            return []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            
            # Split into entries
            entries = self.split_into_entries(text)
            
            # Parse each entry
            parsed_entries = []
            for i, entry_text in enumerate(entries):
                parsed_entry = self.parse_single_entry(entry_text, i + 1)
                if parsed_entry:
                    parsed_entries.append(parsed_entry)
            
            return parsed_entries
            
        except Exception as e:
            print(f"Error parsing file {file_path}: {e}")
            return []
    
    def save_as_csv(self, entries: List[TableEntry], output_path: Path):
        """Save entries as CSV"""
        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            
            # Write header
            writer.writerow([
                'H.S. Code', 'Heading Number', 'Description', 'Rate', 
                'Confidence', 'Has Bengali', 'Has English'
            ])
            
            # Write data
            for entry in entries:
                writer.writerow([
                    entry.hs_code,
                    entry.heading_number,
                    entry.description,
                    entry.rate,
                    f"{entry.confidence:.2f}",
                    entry.has_bengali,
                    entry.has_english
                ])
    
    def save_as_json(self, entries: List[TableEntry], output_path: Path, source_file: str):
        """Save entries as JSON"""
        data = {
            'source_file': source_file,
            'extraction_date': datetime.now().isoformat(),
            'total_entries': len(entries),
            'entries': [asdict(entry) for entry in entries]
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def analyze_entries(self, entries: List[TableEntry]) -> Dict:
        """Analyze extracted entries"""
        if not entries:
            return {'total': 0}
        
        analysis = {
            'total_entries': len(entries),
            'with_hs_code': len([e for e in entries if e.hs_code]),
            'with_rate': len([e for e in entries if e.rate]),
            'with_bengali': len([e for e in entries if e.has_bengali]),
            'with_english': len([e for e in entries if e.has_english]),
            'mixed_language': len([e for e in entries if e.has_bengali and e.has_english]),
            'avg_confidence': sum(e.confidence for e in entries) / len(entries),
            'high_confidence': len([e for e in entries if e.confidence > 0.7]),
            'unique_headings': len(set(e.heading_number for e in entries if e.heading_number)),
            'unique_rates': len(set(e.rate for e in entries if e.rate))
        }
        
        return analysis


def main():
    """Test the improved table parser"""
    print("🔍 Improved Table Parser for NBR Tax Documents")
    print("=" * 60)
    
    # Test file
    test_file = Path("../incomeact.txt")
    
    if not test_file.exists():
        print(f"❌ Test file not found: {test_file}")
        return
    
    # Parse the file
    parser = ImprovedTableParser()
    entries = parser.parse_text_file(test_file)
    
    # Analyze results
    analysis = parser.analyze_entries(entries)
    
    print(f"📊 Parsing Results:")
    print(f"   📋 Total entries: {analysis['total_entries']}")
    print(f"   🏷️  With H.S. Code: {analysis['with_hs_code']}")
    print(f"   💯 With Rate: {analysis['with_rate']}")
    print(f"   🇧🇩 With Bengali: {analysis['with_bengali']}")
    print(f"   🇺🇸 With English: {analysis['with_english']}")
    print(f"   🌐 Mixed Language: {analysis['mixed_language']}")
    print(f"   📈 Avg Confidence: {analysis['avg_confidence']:.2f}")
    print(f"   ⭐ High Confidence: {analysis['high_confidence']}")
    print(f"   📂 Unique Headings: {analysis['unique_headings']}")
    print(f"   💰 Unique Rates: {analysis['unique_rates']}")
    
    # Show sample entries
    print(f"\n📋 Sample Entries:")
    for i, entry in enumerate(entries[:5], 1):
        print(f"   {i}. {entry.hs_code} | {entry.rate} | {entry.description[:50]}...")
    
    # Save results
    output_dir = Path("improved_output")
    output_dir.mkdir(exist_ok=True)
    
    base_name = test_file.stem
    
    # Save as CSV
    csv_path = output_dir / f"{base_name}_improved.csv"
    parser.save_as_csv(entries, csv_path)
    
    # Save as JSON
    json_path = output_dir / f"{base_name}_improved.json"
    parser.save_as_json(entries, json_path, str(test_file))
    
    print(f"\n💾 Output Files:")
    print(f"   📄 CSV: {csv_path}")
    print(f"   📄 JSON: {json_path}")
    
    print(f"\n🎉 Improved parsing completed!")


if __name__ == "__main__":
    main()