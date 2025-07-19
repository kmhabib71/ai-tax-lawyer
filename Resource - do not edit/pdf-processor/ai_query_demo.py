#!/usr/bin/env python3
"""
AI Query Demo for NBR Documents
Demonstrates how AI can query structured document content
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional

class AIQueryEngine:
    """Query engine for structured NBR documents"""
    
    def __init__(self, context_file: str, search_index_file: str):
        """Initialize with context and search index files"""
        self.context_data = self.load_json(context_file)
        self.search_index = self.load_json(search_index_file)
        self.chunks = {chunk['id']: chunk for chunk in self.context_data['chunks']}
    
    def load_json(self, file_path: str) -> Dict[str, Any]:
        """Load JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
            return {}
    
    def search_by_keyword(self, keyword: str) -> List[Dict[str, Any]]:
        """Search chunks by keyword"""
        keyword_lower = keyword.lower()
        results = []
        
        # Search in keyword index
        for indexed_keyword, chunks in self.search_index.get('keywords', {}).items():
            if keyword_lower in indexed_keyword.lower():
                results.extend(chunks)
        
        # Remove duplicates
        seen_ids = set()
        unique_results = []
        for result in results:
            if result['id'] not in seen_ids:
                unique_results.append(result)
                seen_ids.add(result['id'])
        
        return unique_results
    
    def search_by_section(self, section: str) -> List[Dict[str, Any]]:
        """Search chunks by section reference"""
        return self.search_index.get('sections', {}).get(section, [])
    
    def search_by_content_type(self, content_type: str) -> List[Dict[str, Any]]:
        """Search chunks by content type"""
        return self.search_index.get('content_types', {}).get(content_type, [])
    
    def get_chunk_details(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        """Get full details of a chunk"""
        return self.chunks.get(chunk_id)
    
    def find_penalties(self) -> List[Dict[str, Any]]:
        """Find all penalty-related content"""
        penalty_results = []
        
        # Search by keyword
        penalty_keywords = ['penalty', 'fine', 'lakh', 'taka', 'imprisonment']
        for keyword in penalty_keywords:
            results = self.search_by_keyword(keyword)
            penalty_results.extend(results)
        
        # Search by content type
        penalty_tables = self.search_by_content_type('penalty_table')
        penalty_results.extend(penalty_tables)
        
        # Remove duplicates
        seen_ids = set()
        unique_results = []
        for result in penalty_results:
            if result['id'] not in seen_ids:
                unique_results.append(result)
                seen_ids.add(result['id'])
        
        return unique_results
    
    def find_sections_by_number(self, section_number: str) -> List[Dict[str, Any]]:
        """Find content related to specific section number"""
        results = []
        
        # Search in section index
        for section_ref, chunks in self.search_index.get('sections', {}).items():
            if section_number in section_ref:
                results.extend(chunks)
        
        return results
    
    def get_context_summary(self) -> Dict[str, Any]:
        """Get summary of document context"""
        return self.context_data.get('document_info', {})
    
    def search_mixed_content(self, bengali_keyword: str = None, english_keyword: str = None) -> List[Dict[str, Any]]:
        """Search for mixed Bengali-English content"""
        mixed_chunks = []
        
        for chunk_id, chunk in self.chunks.items():
            if chunk['metadata']['has_bengali'] and chunk['metadata']['has_english']:
                # Check if keywords match
                match = True
                if bengali_keyword:
                    if bengali_keyword not in chunk['searchable_text']['bengali']:
                        match = False
                if english_keyword:
                    if english_keyword.lower() not in chunk['searchable_text']['english'].lower():
                        match = False
                
                if match:
                    mixed_chunks.append({
                        'id': chunk_id,
                        'content_preview': chunk['content'][:100] + "...",
                        'confidence': chunk['context']['confidence'],
                        'file': chunk['file_reference']
                    })
        
        return mixed_chunks


def demo_ai_queries():
    """Demonstrate AI query capabilities"""
    print("🔍 AI Query Demo for NBR Documents")
    print("=" * 60)
    
    # Initialize query engine
    try:
        engine = AIQueryEngine(
            "ai_context_output/customs_act_ai_context.json",
            "ai_context_output/customs_act_search_index.json"
        )
    except Exception as e:
        print(f"❌ Error initializing query engine: {e}")
        return
    
    # Demo 1: Document Summary
    print("\n📊 Document Summary:")
    summary = engine.get_context_summary()
    print(f"   Total chunks: {summary.get('total_chunks', 0)}")
    print(f"   Content types: {', '.join(summary.get('content_types', []))}")
    print(f"   Bengali chunks: {summary.get('languages', {}).get('bengali_chunks', 0)}")
    print(f"   English chunks: {summary.get('languages', {}).get('english_chunks', 0)}")
    print(f"   Mixed chunks: {summary.get('languages', {}).get('mixed_chunks', 0)}")
    
    # Demo 2: Search for penalties
    print("\n💰 Query: Find all penalty information")
    penalties = engine.find_penalties()
    print(f"   Found {len(penalties)} penalty-related chunks:")
    for i, penalty in enumerate(penalties[:3], 1):
        print(f"   {i}. {penalty['id']}")
        print(f"      Content: {penalty['content_preview']}")
        print(f"      Confidence: {penalty['confidence']:.2f}")
    
    # Demo 3: Search by section
    print("\n📚 Query: Find section 119B information")
    section_results = engine.search_by_section("section 119B")
    print(f"   Found {len(section_results)} chunks for section 119B:")
    for i, result in enumerate(section_results, 1):
        print(f"   {i}. {result['content_preview']}")
    
    # Demo 4: Search by keyword
    print("\n🔍 Query: Search for 'lakh taka'")
    keyword_results = engine.search_by_keyword("lakh taka")
    print(f"   Found {len(keyword_results)} chunks containing 'lakh taka':")
    for i, result in enumerate(keyword_results[:2], 1):
        print(f"   {i}. {result['content_preview']}")
    
    # Demo 5: Search by content type
    print("\n📋 Query: Find all penalty tables")
    penalty_tables = engine.search_by_content_type("penalty_table")
    print(f"   Found {len(penalty_tables)} penalty table chunks:")
    for i, table in enumerate(penalty_tables, 1):
        print(f"   {i}. {table['content_preview']}")
    
    # Demo 6: Mixed language search
    print("\n🌐 Query: Find mixed Bengali-English content")
    mixed_results = engine.search_mixed_content(english_keyword="section")
    print(f"   Found {len(mixed_results)} mixed language chunks:")
    for i, result in enumerate(mixed_results[:2], 1):
        print(f"   {i}. {result['content_preview']}")
    
    # Demo 7: Detailed chunk information
    print("\n🔍 Query: Get detailed information for specific chunk")
    if penalties:
        chunk_details = engine.get_chunk_details(penalties[0]['id'])
        if chunk_details:
            print(f"   Chunk ID: {chunk_details['id']}")
            print(f"   Content Type: {chunk_details['content_type']}")
            print(f"   Section Reference: {chunk_details['section_reference']}")
            print(f"   Keywords: {', '.join(chunk_details['searchable_text']['keywords'][:5])}")
            print(f"   Related Chunks: {len(chunk_details['context']['related_chunks'])}")
    
    print("\n🎉 AI Query Demo completed!")
    print("\n💡 Use cases for AI Tax Lawyer:")
    print("   • 'Show me all penalty amounts for unauthorized access'")
    print("   • 'Find section 119B amendments and related content'")
    print("   • 'What are the penalties for customs violations?'")
    print("   • 'Search for Bengali content about tax procedures'")
    print("   • 'Find all mixed language legal references'")


if __name__ == "__main__":
    demo_ai_queries()