#!/usr/bin/env python3
"""
AI Context Processor for NBR Documents
Creates AI-queryable structured content with context and file references
"""

import re
import json
import csv
from pathlib import Path
from typing import List, Dict, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum

class ContentType(Enum):
    """Types of content in NBR documents"""
    HEADING = "heading"
    SECTION = "section"
    AMENDMENT = "amendment"
    PENALTY_TABLE = "penalty_table"
    PLAIN_TEXT = "plain_text"
    NUMBERED_LIST = "numbered_list"
    LEGAL_REFERENCE = "legal_reference"
    SCHEDULE = "schedule"

@dataclass
class DocumentChunk:
    """Represents a chunk of document content with context"""
    chunk_id: str
    content_type: ContentType
    content: str
    bengali_content: str
    english_content: str
    section_reference: str
    file_reference: str
    page_number: int
    chunk_number: int
    metadata: Dict[str, Any]
    confidence: float
    searchable_keywords: List[str]
    related_chunks: List[str]

class AIContextProcessor:
    """Processor for creating AI-queryable document structure"""
    
    def __init__(self):
        self.bengali_pattern = re.compile(r'[\u0980-\u09FF]+')
        self.english_pattern = re.compile(r'[a-zA-Z]+')
        self.number_pattern = re.compile(r'\d+')
        
        # Content type detection patterns
        self.content_patterns = {
            ContentType.HEADING: [
                re.compile(r'^[A-Z\s]+$'),  # ALL CAPS
                re.compile(r'FIRST SCHEDULE|SECOND SCHEDULE|THIRD SCHEDULE'),
                re.compile(r'Bangladesh Customs Tariff|Customs Act'),
            ],
            ContentType.SECTION: [
                re.compile(r'section\s+\d+[A-Z]?', re.IGNORECASE),
                re.compile(r'sub-section\s+\(\d+\)', re.IGNORECASE),
                re.compile(r'clause\s+\([a-z]\)', re.IGNORECASE),
            ],
            ContentType.AMENDMENT: [
                re.compile(r'সংশোধন|amendment', re.IGNORECASE),
                re.compile(r'সন্নিবেশ|insertion', re.IGNORECASE),
                re.compile(r'প্রতিস্থাপন|substitution', re.IGNORECASE),
                re.compile(r'বিলুপ্ত|omission', re.IGNORECASE),
            ],
            ContentType.PENALTY_TABLE: [
                re.compile(r'penalty.*\|.*section', re.IGNORECASE),
                re.compile(r'lakh.*Taka.*\|', re.IGNORECASE),
                re.compile(r'\([ivx]+\).*\|.*penalty', re.IGNORECASE),
            ],
            ContentType.NUMBERED_LIST: [
                re.compile(r'^\s*\(\d+\)'),
                re.compile(r'^\s*\([ivx]+\)'),
                re.compile(r'^\s*\([a-z]\)'),
            ],
            ContentType.LEGAL_REFERENCE: [
                re.compile(r'Act No\.\s+[IVX]+\s+of\s+\d+'),
                re.compile(r'Right to Information Act, 2009'),
                re.compile(r'অর্থ আইন, ২০২২'),
            ],
            ContentType.SCHEDULE: [
                re.compile(r'FIRST SCHEDULE|SECOND SCHEDULE|THIRD SCHEDULE'),
                re.compile(r'তফসিল|schedule', re.IGNORECASE),
            ]
        }
        
        # Keyword extraction patterns
        self.keyword_patterns = {
            'penalties': re.compile(r'penalty|fine|punishment|শাস্তি|জরিমানা|দণ্ড', re.IGNORECASE),
            'amounts': re.compile(r'(\d+)\s*(lakh|thousand|crore|টাকা|taka)', re.IGNORECASE),
            'sections': re.compile(r'section\s+(\d+[A-Z]?)', re.IGNORECASE),
            'acts': re.compile(r'(Act No\.\s+[IVX]+\s+of\s+\d+|Customs Act|অর্থ আইন)', re.IGNORECASE),
            'offenses': re.compile(r'without.*authority|unauthorized|unlawful|illegal|অবৈধ|অনধিকার', re.IGNORECASE),
            'procedures': re.compile(r'procedure|process|notification|gazette|প্রক্রিয়া|বিজ্ঞপ্তি', re.IGNORECASE),
        }
    
    def detect_content_type(self, text: str) -> ContentType:
        """Detect the type of content"""
        text_clean = text.strip()
        
        # Check each content type
        for content_type, patterns in self.content_patterns.items():
            for pattern in patterns:
                if pattern.search(text_clean):
                    return content_type
        
        # Default to plain text
        return ContentType.PLAIN_TEXT
    
    def extract_languages(self, text: str) -> Tuple[str, str]:
        """Extract Bengali and English content separately"""
        bengali_matches = self.bengali_pattern.findall(text)
        english_matches = self.english_pattern.findall(text)
        
        bengali_content = ' '.join(bengali_matches) if bengali_matches else ""
        english_content = ' '.join(english_matches) if english_matches else ""
        
        return bengali_content, english_content
    
    def extract_keywords(self, text: str) -> List[str]:
        """Extract searchable keywords from text"""
        keywords = []
        
        for keyword_type, pattern in self.keyword_patterns.items():
            matches = pattern.findall(text)
            if matches:
                if isinstance(matches[0], tuple):
                    keywords.extend([match[0] for match in matches])
                else:
                    keywords.extend(matches)
        
        # Add individual words for better searchability
        words = re.findall(r'\b\w+\b', text.lower())
        keywords.extend([word for word in words if len(word) > 3])
        
        return list(set(keywords))
    
    def extract_section_reference(self, text: str) -> str:
        """Extract section reference from text"""
        section_patterns = [
            re.compile(r'section\s+(\d+[A-Z]?)', re.IGNORECASE),
            re.compile(r'sub-section\s+\((\d+)\)', re.IGNORECASE),
            re.compile(r'clause\s+\(([a-z])\)', re.IGNORECASE),
        ]
        
        for pattern in section_patterns:
            match = pattern.search(text)
            if match:
                return match.group(0)
        
        return ""
    
    def create_metadata(self, text: str, content_type: ContentType) -> Dict[str, Any]:
        """Create metadata for the chunk"""
        metadata = {
            'length': len(text),
            'word_count': len(text.split()),
            'has_bengali': bool(self.bengali_pattern.search(text)),
            'has_english': bool(self.english_pattern.search(text)),
            'has_numbers': bool(self.number_pattern.search(text)),
            'content_type': content_type.value,
            'extracted_at': datetime.now().isoformat(),
        }
        
        # Add content-specific metadata
        if content_type == ContentType.PENALTY_TABLE:
            metadata['penalty_count'] = len(re.findall(r'penalty|fine', text, re.IGNORECASE))
            metadata['amount_count'] = len(re.findall(r'\d+\s*lakh', text, re.IGNORECASE))
        
        elif content_type == ContentType.AMENDMENT:
            metadata['amendment_type'] = 'সংশোধন' if 'সংশোধন' in text else 'general'
            metadata['affects_sections'] = len(re.findall(r'section\s+\d+', text, re.IGNORECASE))
        
        return metadata
    
    def calculate_confidence(self, text: str, content_type: ContentType) -> float:
        """Calculate confidence score for content classification"""
        confidence = 0.5  # Base confidence
        
        # Length-based confidence
        if len(text) > 50:
            confidence += 0.2
        
        # Language mix confidence
        if self.bengali_pattern.search(text) and self.english_pattern.search(text):
            confidence += 0.1
        
        # Content type specific confidence
        if content_type == ContentType.PENALTY_TABLE and '|' in text:
            confidence += 0.2
        
        if content_type == ContentType.SECTION and re.search(r'section\s+\d+', text, re.IGNORECASE):
            confidence += 0.2
        
        return min(confidence, 1.0)
    
    def chunk_document(self, text: str, file_path: str) -> List[DocumentChunk]:
        """Chunk document into AI-queryable segments"""
        chunks = []
        
        # Split by major sections
        sections = re.split(r'\n\s*--\|\s*', text)
        
        for section_idx, section in enumerate(sections):
            if not section.strip():
                continue
            
            # Further split by paragraphs or logical breaks
            paragraphs = re.split(r'\n\s*\n', section.strip())
            
            for para_idx, paragraph in enumerate(paragraphs):
                if not paragraph.strip() or len(paragraph) < 20:
                    continue
                
                # Detect content type
                content_type = self.detect_content_type(paragraph)
                
                # Extract language content
                bengali_content, english_content = self.extract_languages(paragraph)
                
                # Extract section reference
                section_ref = self.extract_section_reference(paragraph)
                
                # Extract keywords
                keywords = self.extract_keywords(paragraph)
                
                # Create metadata
                metadata = self.create_metadata(paragraph, content_type)
                
                # Calculate confidence
                confidence = self.calculate_confidence(paragraph, content_type)
                
                # Create chunk ID
                chunk_id = f"{Path(file_path).stem}_{section_idx}_{para_idx}"
                
                # Create chunk
                chunk = DocumentChunk(
                    chunk_id=chunk_id,
                    content_type=content_type,
                    content=paragraph.strip(),
                    bengali_content=bengali_content,
                    english_content=english_content,
                    section_reference=section_ref,
                    file_reference=file_path,
                    page_number=section_idx + 1,
                    chunk_number=para_idx + 1,
                    metadata=metadata,
                    confidence=confidence,
                    searchable_keywords=keywords,
                    related_chunks=[]
                )
                
                chunks.append(chunk)
        
        # Find related chunks
        self.find_related_chunks(chunks)
        
        return chunks
    
    def find_related_chunks(self, chunks: List[DocumentChunk]):
        """Find related chunks based on content similarity"""
        for i, chunk in enumerate(chunks):
            related = []
            
            for j, other_chunk in enumerate(chunks):
                if i == j:
                    continue
                
                # Check for keyword overlap
                common_keywords = set(chunk.searchable_keywords) & set(other_chunk.searchable_keywords)
                if len(common_keywords) > 2:
                    related.append(other_chunk.chunk_id)
                
                # Check for section references
                if chunk.section_reference and chunk.section_reference == other_chunk.section_reference:
                    related.append(other_chunk.chunk_id)
            
            chunk.related_chunks = related[:5]  # Limit to top 5 related chunks
    
    def process_file(self, file_path: Path) -> List[DocumentChunk]:
        """Process a single file into AI-queryable chunks"""
        if not file_path.exists():
            return []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return self.chunk_document(content, str(file_path))
            
        except Exception as e:
            print(f"Error processing file {file_path}: {e}")
            return []
    
    def save_ai_context(self, chunks: List[DocumentChunk], output_path: Path):
        """Save chunks in AI-queryable format"""
        # Prepare data for AI system
        ai_data = {
            'document_info': {
                'total_chunks': len(chunks),
                'processing_date': datetime.now().isoformat(),
                'content_types': list(set(chunk.content_type.value for chunk in chunks)),
                'languages': {
                    'bengali_chunks': len([c for c in chunks if c.metadata['has_bengali']]),
                    'english_chunks': len([c for c in chunks if c.metadata['has_english']]),
                    'mixed_chunks': len([c for c in chunks if c.metadata['has_bengali'] and c.metadata['has_english']])
                }
            },
            'chunks': []
        }
        
        # Process each chunk for AI
        for chunk in chunks:
            ai_chunk = {
                'id': chunk.chunk_id,
                'content': chunk.content,
                'content_type': chunk.content_type.value,
                'section_reference': chunk.section_reference,
                'file_reference': chunk.file_reference,
                'page_number': chunk.page_number,
                'metadata': chunk.metadata,
                'searchable_text': {
                    'full': chunk.content,
                    'bengali': chunk.bengali_content,
                    'english': chunk.english_content,
                    'keywords': chunk.searchable_keywords
                },
                'context': {
                    'confidence': chunk.confidence,
                    'related_chunks': chunk.related_chunks,
                    'chunk_position': chunk.chunk_number
                }
            }
            ai_data['chunks'].append(ai_chunk)
        
        # Save as JSON for AI system
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(ai_data, f, ensure_ascii=False, indent=2)
    
    def create_search_index(self, chunks: List[DocumentChunk], output_path: Path):
        """Create search index for quick queries"""
        search_index = {
            'keywords': {},
            'sections': {},
            'content_types': {},
            'files': {}
        }
        
        for chunk in chunks:
            chunk_ref = {
                'id': chunk.chunk_id,
                'content_preview': chunk.content[:100] + "...",
                'confidence': chunk.confidence,
                'file': chunk.file_reference
            }
            
            # Index by keywords
            for keyword in chunk.searchable_keywords:
                if keyword not in search_index['keywords']:
                    search_index['keywords'][keyword] = []
                search_index['keywords'][keyword].append(chunk_ref)
            
            # Index by sections
            if chunk.section_reference:
                if chunk.section_reference not in search_index['sections']:
                    search_index['sections'][chunk.section_reference] = []
                search_index['sections'][chunk.section_reference].append(chunk_ref)
            
            # Index by content type
            content_type = chunk.content_type.value
            if content_type not in search_index['content_types']:
                search_index['content_types'][content_type] = []
            search_index['content_types'][content_type].append(chunk_ref)
            
            # Index by file
            if chunk.file_reference not in search_index['files']:
                search_index['files'][chunk.file_reference] = []
            search_index['files'][chunk.file_reference].append(chunk_ref)
        
        # Save search index
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(search_index, f, ensure_ascii=False, indent=2)


def main():
    """Test the AI context processor"""
    print("🤖 AI Context Processor for NBR Documents")
    print("=" * 60)
    
    # Test with the extracted Customs Act file
    test_file = Path("test_output/Customs_Act-1969_Amendment_Again_Uploaded_test.txt")
    
    if not test_file.exists():
        print(f"❌ Test file not found: {test_file}")
        return
    
    # Process the file
    processor = AIContextProcessor()
    chunks = processor.process_file(test_file)
    
    # Analyze results
    print(f"📊 AI Context Processing Results:")
    print(f"   📋 Total chunks: {len(chunks)}")
    print(f"   🔍 Content types: {len(set(chunk.content_type.value for chunk in chunks))}")
    print(f"   🇧🇩 Bengali chunks: {len([c for c in chunks if c.metadata['has_bengali']])}")
    print(f"   🇺🇸 English chunks: {len([c for c in chunks if c.metadata['has_english']])}")
    print(f"   🌐 Mixed chunks: {len([c for c in chunks if c.metadata['has_bengali'] and c.metadata['has_english']])}")
    print(f"   📈 Avg confidence: {sum(c.confidence for c in chunks) / len(chunks):.2f}")
    
    # Show sample chunks
    print(f"\n📋 Sample AI-Queryable Chunks:")
    for i, chunk in enumerate(chunks[:3], 1):
        print(f"\n   {i}. {chunk.chunk_id} ({chunk.content_type.value})")
        print(f"      📚 Section: {chunk.section_reference}")
        print(f"      🔍 Keywords: {', '.join(chunk.searchable_keywords[:5])}...")
        print(f"      📄 Content: {chunk.content[:80]}...")
        print(f"      🔗 Related: {len(chunk.related_chunks)} chunks")
    
    # Save results
    output_dir = Path("ai_context_output")
    output_dir.mkdir(exist_ok=True)
    
    # Save AI context
    ai_context_path = output_dir / "customs_act_ai_context.json"
    processor.save_ai_context(chunks, ai_context_path)
    
    # Save search index
    search_index_path = output_dir / "customs_act_search_index.json"
    processor.create_search_index(chunks, search_index_path)
    
    print(f"\n💾 AI Context Output Files:")
    print(f"   🤖 AI Context: {ai_context_path}")
    print(f"   🔍 Search Index: {search_index_path}")
    
    print(f"\n🎉 AI context processing completed!")


if __name__ == "__main__":
    main()