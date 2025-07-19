#!/usr/bin/env python3
"""
Legal Table Parser for NBR Documents
Specialized parser for legal penalty tables and amendments
"""

import re
import json
import csv
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class LegalEntry:
    """Represents a legal penalty or amendment entry"""
    offense_type: str
    penalty_amount: str
    section_ref: str
    description: str
    amendment_type: str
    confidence: float
    has_bengali: bool
    has_english: bool
    line_number: int

class LegalTableParser:
    """Parser for legal penalty tables and amendments"""
    
    def __init__(self):
        self.bengali_pattern = re.compile(r'[\u0980-\u09FF]')
        self.english_pattern = re.compile(r'[a-zA-Z]')
        
        # Legal penalty patterns
        self.penalty_patterns = [
            re.compile(r'penalty not exceeding ([^|]+)'),
            re.compile(r'fine not exceeding ([^|]+)'),
            re.compile(r'punishment.*?([^|]+)'),
            re.compile(r'(\d+)\s+lakh\s+Taka', re.IGNORECASE),
            re.compile(r'(\d+)\s+thousand\s+Taka', re.IGNORECASE),
        ]
        
        # Section reference patterns
        self.section_patterns = [
            re.compile(r'section\s+(\d+[A-Z]?)'),
            re.compile(r'Act\s+No\.\s+([IVX]+)\s+of\s+(\d+)'),
            re.compile(r'sub-section\s+\((\d+[A-Z]?)\)'),
            re.compile(r'clause\s+\(([a-z])\)'),
        ]
        
        # Amendment type patterns
        self.amendment_patterns = [
            re.compile(r'সংশোধন|amendment', re.IGNORECASE),
            re.compile(r'সন্নিবেশ|insertion', re.IGNORECASE),
            re.compile(r'প্রতিস্থাপন|substitution', re.IGNORECASE),
            re.compile(r'বিলুপ্ত|omission', re.IGNORECASE),
        ]
    
    def detect_legal_entries(self, text: str) -> List[str]:
        """Detect legal entries in text"""
        lines = text.split('\n')
        legal_entries = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check for legal patterns
            is_legal = False
            
            # Check for penalty patterns
            for pattern in self.penalty_patterns:
                if pattern.search(line):
                    is_legal = True
                    break
            
            # Check for section references
            if not is_legal:
                for pattern in self.section_patterns:
                    if pattern.search(line):
                        is_legal = True
                        break
            
            # Check for amendment patterns
            if not is_legal:
                for pattern in self.amendment_patterns:
                    if pattern.search(line):
                        is_legal = True
                        break
            
            # Check for pipe-separated structure (penalty table format)
            if not is_legal and '|' in line and len(line) > 30:
                is_legal = True
            
            if is_legal:
                legal_entries.append(line)
        
        return legal_entries
    
    def parse_legal_entry(self, entry_text: str, line_number: int) -> Optional[LegalEntry]:
        """Parse a single legal entry"""
        
        # Extract penalty amount
        penalty_amount = ""
        for pattern in self.penalty_patterns:
            match = pattern.search(entry_text)
            if match:
                penalty_amount = match.group(1).strip()
                break
        
        # Extract section reference
        section_ref = ""
        for pattern in self.section_patterns:
            match = pattern.search(entry_text)
            if match:
                section_ref = match.group(0).strip()
                break
        
        # Determine amendment type
        amendment_type = "general"
        for pattern in self.amendment_patterns:
            match = pattern.search(entry_text)
            if match:
                amendment_type = match.group(0).strip()
                break
        
        # Extract offense type (before penalty)
        offense_type = ""
        if penalty_amount:
            parts = entry_text.split(penalty_amount)
            if len(parts) > 0:
                offense_type = parts[0].strip()
                # Clean up offense type
                offense_type = re.sub(r'penalty not exceeding|fine not exceeding', '', offense_type, flags=re.IGNORECASE)
                offense_type = offense_type.strip(' |')
        
        # Description is the cleaned entry text
        description = entry_text
        
        # Language detection
        has_bengali = bool(self.bengali_pattern.search(entry_text))
        has_english = bool(self.english_pattern.search(entry_text))
        
        # Calculate confidence
        confidence = self.calculate_confidence(entry_text, penalty_amount, section_ref, offense_type)
        
        # Only return if we have meaningful content
        if penalty_amount or section_ref or len(description) > 50:
            return LegalEntry(
                offense_type=offense_type,
                penalty_amount=penalty_amount,
                section_ref=section_ref,
                description=description,
                amendment_type=amendment_type,
                confidence=confidence,
                has_bengali=has_bengali,
                has_english=has_english,
                line_number=line_number
            )
        
        return None
    
    def calculate_confidence(self, text: str, penalty: str, section: str, offense: str) -> float:
        """Calculate confidence score for a legal entry"""
        confidence = 0.0
        
        # Penalty amount presence
        if penalty:
            confidence += 0.4
        
        # Section reference presence
        if section:
            confidence += 0.3
        
        # Offense type presence
        if offense and len(offense) > 10:
            confidence += 0.2
        
        # Mixed language content
        if self.bengali_pattern.search(text) and self.english_pattern.search(text):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def parse_text_file(self, file_path: Path) -> List[LegalEntry]:
        """Parse a text file for legal entries"""
        
        if not file_path.exists():
            return []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            
            # Detect legal entries
            entries = self.detect_legal_entries(text)
            
            # Parse each entry
            parsed_entries = []
            for i, entry_text in enumerate(entries):
                parsed_entry = self.parse_legal_entry(entry_text, i + 1)
                if parsed_entry:
                    parsed_entries.append(parsed_entry)
            
            return parsed_entries
            
        except Exception as e:
            print(f"Error parsing file {file_path}: {e}")
            return []
    
    def save_as_csv(self, entries: List[LegalEntry], output_path: Path):
        """Save entries as CSV"""
        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            
            # Write header
            writer.writerow([
                'Offense Type', 'Penalty Amount', 'Section Reference', 
                'Amendment Type', 'Confidence', 'Has Bengali', 'Has English', 'Description'
            ])
            
            # Write data
            for entry in entries:
                writer.writerow([
                    entry.offense_type,
                    entry.penalty_amount,
                    entry.section_ref,
                    entry.amendment_type,
                    f"{entry.confidence:.2f}",
                    entry.has_bengali,
                    entry.has_english,
                    entry.description[:100] + "..." if len(entry.description) > 100 else entry.description
                ])
    
    def save_as_json(self, entries: List[LegalEntry], output_path: Path, source_file: str):
        """Save entries as JSON"""
        data = {
            'source_file': source_file,
            'document_type': 'legal_penalties',
            'extraction_date': datetime.now().isoformat(),
            'total_entries': len(entries),
            'entries': [asdict(entry) for entry in entries]
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def analyze_entries(self, entries: List[LegalEntry]) -> Dict:
        """Analyze legal entries"""
        if not entries:
            return {'total': 0}
        
        penalty_amounts = [e.penalty_amount for e in entries if e.penalty_amount]
        section_refs = [e.section_ref for e in entries if e.section_ref]
        amendment_types = [e.amendment_type for e in entries if e.amendment_type]
        
        analysis = {
            'total_entries': len(entries),
            'with_penalty': len(penalty_amounts),
            'with_section_ref': len(section_refs),
            'with_bengali': len([e for e in entries if e.has_bengali]),
            'with_english': len([e for e in entries if e.has_english]),
            'mixed_language': len([e for e in entries if e.has_bengali and e.has_english]),
            'avg_confidence': sum(e.confidence for e in entries) / len(entries),
            'high_confidence': len([e for e in entries if e.confidence > 0.6]),
            'unique_penalty_amounts': len(set(penalty_amounts)),
            'unique_sections': len(set(section_refs)),
            'amendment_types': list(set(amendment_types))
        }
        
        return analysis


def main():
    """Test the legal table parser"""
    print("⚖️  Legal Table Parser for NBR Documents")
    print("=" * 60)
    
    # Test with the extracted Customs Act file
    test_file = Path("test_output/Customs_Act-1969_Amendment_Again_Uploaded_test.txt")
    
    if not test_file.exists():
        print(f"❌ Test file not found: {test_file}")
        return
    
    # Parse the file
    parser = LegalTableParser()
    entries = parser.parse_text_file(test_file)
    
    # Analyze results
    analysis = parser.analyze_entries(entries)
    
    print(f"📊 Legal Parsing Results:")
    print(f"   📋 Total entries: {analysis['total_entries']}")
    print(f"   💰 With Penalty: {analysis['with_penalty']}")
    print(f"   📚 With Section Ref: {analysis['with_section_ref']}")
    print(f"   🇧🇩 With Bengali: {analysis['with_bengali']}")
    print(f"   🇺🇸 With English: {analysis['with_english']}")
    print(f"   🌐 Mixed Language: {analysis['mixed_language']}")
    print(f"   📈 Avg Confidence: {analysis['avg_confidence']:.2f}")
    print(f"   ⭐ High Confidence: {analysis['high_confidence']}")
    print(f"   💵 Unique Penalties: {analysis['unique_penalty_amounts']}")
    print(f"   📖 Unique Sections: {analysis['unique_sections']}")
    print(f"   🔄 Amendment Types: {analysis['amendment_types']}")
    
    # Show sample entries
    print(f"\n📋 Sample Legal Entries:")
    for i, entry in enumerate(entries[:5], 1):
        print(f"   {i}. {entry.section_ref} | {entry.penalty_amount} | {entry.offense_type[:30]}...")
    
    # Save results
    output_dir = Path("legal_output")
    output_dir.mkdir(exist_ok=True)
    
    base_name = "customs_act_legal"
    
    # Save as CSV
    csv_path = output_dir / f"{base_name}.csv"
    parser.save_as_csv(entries, csv_path)
    
    # Save as JSON
    json_path = output_dir / f"{base_name}.json"
    parser.save_as_json(entries, json_path, str(test_file))
    
    print(f"\n💾 Legal Output Files:")
    print(f"   📄 CSV: {csv_path}")
    print(f"   📄 JSON: {json_path}")
    
    print(f"\n🎉 Legal parsing completed!")


if __name__ == "__main__":
    main()