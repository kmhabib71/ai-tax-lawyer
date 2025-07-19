# AI Tax Lawyer Bangladesh - Document Processing System

## Overview

This document processing pipeline is designed to handle Bengali, English, and mixed-language legal documents for the AI Tax Lawyer Bangladesh application. It provides intelligent text extraction, multilingual query processing, and advanced RAG (Retrieval-Augmented Generation) capabilities.

## 🚀 Features

### Core Capabilities
- ✅ **Multilingual Support**: Bengali, English, and Banglish queries
- ✅ **Advanced PDF Processing**: OCR fallback for scanned documents
- ✅ **Intelligent Chunking**: Section-aware text segmentation
- ✅ **Vector Embeddings**: OpenAI text-embedding-3-small
- ✅ **Hybrid Search**: Semantic + keyword + fuzzy matching
- ✅ **Real-time Analytics**: Query logging and performance monitoring

### Language-Specific Features
- **Bengali**: Native script support, fuzzy text matching, legal term recognition
- **English**: Standard semantic search, keyword matching
- **Banglish**: Intelligent term mapping, cross-language search

## 📁 Project Structure

```
src/lib/ai/
├── document-pipeline.ts          # Core document processing
├── multilingual-query-processor.ts # Query handling and translation
├── enhanced-rag-system.ts        # Advanced RAG with context
└── supabase-vector.ts            # Existing vector integration

scripts/
└── process-documents.ts          # Batch processing script

supabase-vector-schema.sql        # Database schema
```

## 🛠️ Setup Instructions

### 1. Prerequisites

```bash
# Ensure you have the required environment variables
OPENAI_API_KEY=your_openai_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Setup

Run the vector database schema:

```sql
-- Execute supabase-vector-schema.sql in your Supabase SQL editor
-- This creates tables: document_chunks, document_processing_log, query_analytics
```

### 3. Install Dependencies

```bash
npm install pdf-parse
npm install @supabase/supabase-js
# Other dependencies should already be installed
```

### 4. Prepare Documents

Place your PDF files in the `Act-files/` directory:
```
Act-files/
├── finance-act-2025-bangla.pdf
├── Income_Tax_act-2023-bangla.pdf
├── vat-act-2012-bangla.pdf
├── Income-tax-act-1984-english.pdf
└── vat-act-english.pdf
```

## 🔧 Usage

### Option 1: API Endpoints

#### Process All Documents
```bash
curl -X POST http://localhost:3000/api/process-documents \
  -H "Content-Type: application/json" \
  -d '{"action": "process_act_files"}'
```

#### Check Status
```bash
curl http://localhost:3000/api/process-documents?action=db_status
```

#### List Available Files
```bash
curl http://localhost:3000/api/process-documents?action=list_files
```

### Option 2: Direct Script Execution

```bash
# Run the batch processing script
cd scripts
npx tsx process-documents.ts
```

### Option 3: Programmatic Usage

```typescript
import { DocumentProcessor } from '@/lib/ai/document-pipeline';

const processor = new DocumentProcessor();

// Process single document
const result = await processor.processDocument('/path/to/document.pdf');

// Process all documents in Act-files
await processor.processAllDocuments();
```

## 🧠 Query Processing

### Multilingual Chat API

```bash
curl -X POST http://localhost:3000/api/multilingual-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "আমার বেতন ৫ লক্ষ টাকা, কত কর দিতে হবে?",
    "userType": "salaried",
    "language": "auto"
  }'
```

### Example Queries

#### Bengali Queries
```
আমার বেতনের কর কত?
ফ্রিল্যান্সারদের জন্য কি কি ছাড় আছে?
ভ্যাট রেজিস্ট্রেশন কিভাবে করবো?
ধারা ২৫ সম্পর্কে বলুন
```

#### English Queries
```
What is the tax rate for freelancers?
How to file VAT return in Bangladesh?
What are the deductions available for salaried employees?
Explain Section 25 of Income Tax Ordinance
```

#### Banglish Queries
```
Amar income 6 lakh, tax koto?
Freelancer der jonno ki ki deduction ase?
Business er VAT kivabe calculate korbo?
Tax return file korar process ki?
```

## 📊 System Architecture

### Document Processing Pipeline

```
PDF File → Text Extraction → Language Detection → Section Splitting → 
Intelligent Chunking → Keyword Extraction → Embeddings → Vector Storage
```

### Query Processing Flow

```
User Query → Language Detection → Translation (if needed) → 
Vector Search + Keyword Search + Fuzzy Search → 
Result Ranking → Response Generation → Context Update
```

### Database Schema

#### document_chunks
- `id`: Unique chunk identifier
- `content`: Original text content
- `content_bn`: Bengali translation
- `content_en`: English translation
- `metadata`: Document metadata (JSONB)
- `embeddings`: Vector embeddings (1536 dimensions)
- `keywords_bn`: Bengali keywords array
- `keywords_en`: English keywords array
- `search_vector`: Full-text search vector

#### Specialized Functions
- `hybrid_search()`: Combines semantic + keyword search
- `bengali_fuzzy_search()`: Fuzzy matching for Bengali text
- `banglish_search()`: Handles Banglish queries

## 🔍 Advanced Features

### Intelligent Section Detection

The system automatically detects and extracts:
- **Bengali Sections**: ধারা, অনুচ্ছেদ, খণ্ড, পরিচ্ছেদ
- **English Sections**: Section, Chapter, Part, Article
- **Mixed Documents**: Handles bilingual documents

### Multilingual Keyword Extraction

Uses OpenAI to extract relevant legal terms:
```typescript
{
  "bengali": ["কর", "বেতন", "আয়", "ছাড়"],
  "english": ["tax", "salary", "income", "deduction"]
}
```

### Context-Aware Conversations

Maintains conversation history and user preferences:
```typescript
interface ChatContext {
  user_type: 'salaried' | 'freelancer' | 'business' | 'general';
  conversation_history: ChatMessage[];
  user_language_preference: 'bn' | 'en' | 'auto';
  session_id: string;
}
```

## 📈 Performance Optimization

### Cost Optimization
- **Smart Model Routing**: GPT-3.5-turbo for simple queries, GPT-4o for complex
- **Response Caching**: Common queries cached for 1 hour
- **Batch Processing**: Multiple documents processed efficiently
- **Token Management**: Optimized prompt design and chunking

### Speed Optimization
- **Parallel Processing**: Multiple search methods run concurrently
- **Database Indexes**: Optimized for vector, text, and metadata searches
- **Streaming Responses**: Real-time response generation
- **Connection Pooling**: Efficient database connections

## 🧪 Testing

### Test Document Processing
```bash
# Test with a sample query
curl -X GET http://localhost:3000/api/multilingual-chat?action=test_query
```

### Verify Database Status
```bash
curl -X GET http://localhost:3000/api/process-documents?action=db_status
```

Expected Response:
```json
{
  "success": true,
  "database_status": {
    "total_chunks": 150,
    "processing_logs": {
      "completed": 5,
      "failed": 0
    },
    "tables_exist": true
  }
}
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "No PDF text extracted"
- **Cause**: Scanned PDF without OCR
- **Solution**: Implement Tesseract.js for OCR processing

#### 2. "Bengali text not searchable"
- **Cause**: Character encoding issues
- **Solution**: Verify UTF-8 encoding in database

#### 3. "Low search accuracy"
- **Cause**: Insufficient training data
- **Solution**: Add more diverse legal documents

#### 4. "Slow query processing"
- **Cause**: Database not optimized
- **Solution**: Check vector index configuration

### Debug Commands

```bash
# Check processing logs
curl http://localhost:3000/api/process-documents?action=recent_logs

# Test specific query types
curl -X POST http://localhost:3000/api/multilingual-chat \
  -d '{"message": "test query", "debug": true}'
```

## 📋 Monitoring & Analytics

### Query Analytics
- Response times tracked per language
- Search accuracy metrics
- User satisfaction feedback
- Token usage optimization

### Performance Metrics
- **Target Response Time**: <2 seconds
- **Search Accuracy**: >95%
- **User Satisfaction**: >4.5/5
- **Uptime**: >99.9%

## 🔮 Future Enhancements

### Planned Features
- [ ] Advanced OCR with Tesseract.js
- [ ] Voice input/output in Bengali
- [ ] Real-time document updates
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant support
- [ ] API rate limiting
- [ ] Advanced caching strategies

### Performance Improvements
- [ ] Query result caching
- [ ] Precomputed embeddings
- [ ] Advanced ranking algorithms
- [ ] Real-time learning from user feedback

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the API documentation
3. Examine the processing logs
4. Test with sample queries

## 🤝 Contributing

When adding new features:
1. Follow the existing code structure
2. Add comprehensive error handling
3. Include logging for debugging
4. Update tests and documentation
5. Consider multilingual implications

---

**Note**: This system is optimized for Bangladesh tax law documents and Bengali language processing. Adaptation for other legal systems may require modifications to the document structure detection and legal term recognition components.