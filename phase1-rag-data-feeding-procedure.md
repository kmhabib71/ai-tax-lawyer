# Phase 1: RAG Data Feeding Procedure - AI Tax Lawyer Bangladesh

## Overview
Feed both structured tax tables (30%) and full document content (70%) to create a comprehensive RAG system for Bangladesh tax law.

## Data Sources Summary

### Structured Tax Tables (For Precise Calculations)
```
✅ clean-tax-finance-act-2025.json    → 281 HS code records
✅ clean-tax-vat-act-2012.json        → 29 HS code records  
❌ clean-tax-income-tax-act-2023.json → N/A (no HS codes in Income Tax Act)
Total: 310 structured tax records
```

### Full Document Content (For Legal Guidance)
```
✅ chrome-cleaned-finance-act-2025.json    → Finance Act full text chunks
✅ chrome-cleaned-income-tax-act-2023.json → 711 income tax regulation chunks
✅ chrome-cleaned-vat-act-2012.json        → VAT Act full text chunks
Total: ~1200+ text chunks for legal context
```

## Data Feeding Strategy

### Step 1: Structured Tax Records → MongoDB
**Collection: `tax_records`**
```javascript
// Example record structure
{
  _id: ObjectId(),
  hs_code: "2202.10.00",
  description: "কোমল পানীয়",
  duty_percent: 100.0,
  source_act: "VAT Act 2012",
  source_pattern: "latin",
  metadata: {
    document_type: "vat_act",
    extraction_date: "2025-07-19",
    validation_status: "clean"
  }
}
```

### Step 2: Document Chunks → Supabase Vector
**Table: `document_chunks`**
```sql
-- Example chunk structure
{
  id: uuid,
  content: "কর অব্যাহতির পরিমাণ হইবে নিম্নরূপ...",
  embedding: vector(1536),
  metadata: {
    source_document: "Income Tax Act 2023",
    chunk_index: 45,
    section: "tax_exemptions",
    language: "bn",
    character_count: 250
  }
}
```

## Dual Query Strategy

### Query Type 1: Exact Tax Calculations
```
User: "কোমল পানীয়ের শুল্ক কত?"
Route: MongoDB tax_records collection
Search: HS code or description matching
Result: "কোমল পানীয়ের উপর ১০০% শুল্ক (HS Code: 2202.10.00, VAT Act 2012)"
```

### Query Type 2: Legal Guidance & Context
```
User: "আয়কর ছাড়ের নিয়ম কি?"
Route: Supabase vector similarity search
Search: Semantic matching across document chunks
Result: Relevant sections from Income Tax Act 2023 with context
```

### Query Type 3: Hybrid Queries
```
User: "কোমল পানীয় আমদানি করলে কি কি কর দিতে হবে?"
Route: Both systems
MongoDB: Get exact duty rates
Supabase: Get import procedures and additional taxes
Result: Complete tax breakdown with legal context
```

## Data Quality Assurance

### Structured Records Validation
- ✅ 310 clean records (filtered from 396 raw extractions)
- ✅ Valid HS code patterns (4.2.2 format)
- ✅ Reasonable duty rate ranges (0-1000%)
- ✅ Bengali/English description normalization

### Document Chunks Quality
- ✅ Proper text segmentation (logical chunks)
- ✅ Metadata tagging (source, section, language)
- ✅ Character encoding (Bengali UTF-8)
- ✅ OCR error correction applied

## Implementation Priority

### Phase 1A: Core Tax Tables (Week 1)
1. Upload structured tax records to MongoDB
2. Create HS code search API endpoints
3. Implement exact duty rate calculations
4. Test with common import items

### Phase 1B: Document Context (Week 2)  
1. Generate embeddings for all document chunks
2. Store in Supabase vector database
3. Implement semantic search API
4. Test with tax regulation queries

### Phase 1C: Hybrid System (Week 3)
1. Create intelligent query router
2. Combine structured + semantic results
3. Implement citation tracking
4. Test complete user workflows

## Expected Benefits

### Dual-Purpose RAG System
- **Precision**: Exact tax calculations from structured data
- **Context**: Legal guidance from full document content
- **Completeness**: 310 tax records + 1200+ regulation chunks
- **Efficiency**: Fast lookups + comprehensive coverage

### User Experience
- **Quick Answers**: "HS 2202.10.00 has 100% duty"
- **Detailed Guidance**: "Import procedures for beverages include..."
- **Complete Coverage**: Both specific rates and general regulations
- **Source Citations**: NBR document references for trust

## Files for Phase 1 Implementation

### Ready for Upload
```
✅ clean-tax-finance-act-2025.json (281 records)
✅ clean-tax-vat-act-2012.json (29 records)
✅ chrome-cleaned-finance-act-2025.json (full content)
✅ chrome-cleaned-income-tax-act-2023.json (711 chunks)
✅ chrome-cleaned-vat-act-2012.json (full content)
```

### Next: Generate Embeddings
```
📋 TODO: Create embedding generation script
📋 TODO: Upload to Supabase vector store
📋 TODO: Test search accuracy and performance
📋 TODO: Implement query routing logic
```

---

**Note**: The intentional duplication (structured tables + full content) enables both precise calculations AND comprehensive legal guidance - essential for a complete AI Tax Lawyer system.