# MongoDB Atlas Vector Search Index Setup Guide

## Current Status ✅
- **Documents**: 1,000 legal documents uploaded
- **Embeddings**: All documents have 1536-dimension embeddings (text-embedding-3-small)
- **Database**: `ai_tax_lawyer` 
- **Collection**: `document_chunks`
- **Issue**: Vector Search Index not created yet

## Step-by-Step Index Creation

### 1. Access MongoDB Atlas
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Sign in to your account
3. Select your cluster

### 2. Create Vector Search Index
1. Click on **"Search"** in the left sidebar
2. Click **"Create Search Index"**
3. Select **"Atlas Vector Search"** (NOT Atlas Search)

### 3. Index Configuration
**Database**: `ai_tax_lawyer`
**Collection**: `document_chunks`
**Index Name**: `vector_index`

### 4. Index Definition (JSON Editor)
Use this EXACT configuration:

```json
{
  "fields": [
    {
      "numDimensions": 1536,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    }
  ]
}
```

### 5. Alternative Visual Editor Configuration
If using Visual Editor:
- **Field Name**: `embedding`
- **Data Type**: `vector`
- **Dimensions**: `1536`
- **Similarity**: `cosine`

## Verification Commands

### Test Vector Search After Creation
```bash
# Run this after creating the index
node check-vector-index.js
```

### Run Comprehensive Performance Tests
```bash
# Vector search performance test
node comprehensive-vector-search-test.js

# End-to-end RAG performance test  
node rag-performance-test.js
```

### Test via API
```bash
# Start Next.js dev server
npm run dev

# Test benchmark endpoint
curl -X POST "http://localhost:3000/api/vector-search-benchmark" \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [
      {"query": "মূল্য সংযোজন কর হার", "language": "Bengali"},
      {"query": "income tax rate", "language": "English"},
      {"query": "tax calculation er niyom", "language": "Banglish"}
    ],
    "mode": "vector"
  }'
```

## Expected Performance Targets

### Vector Search Performance
- **Sub-50ms**: Vector search operation
- **Sub-100ms**: Including embedding generation
- **>95%**: Success rate
- **>0.7**: Average similarity score

### RAG System Performance
- **Sub-2000ms**: Complete RAG response
- **Sub-500ms**: Vector retrieval component
- **>90%**: Relevant responses
- **>0.8**: User satisfaction score

## Index Status Indicators

### ✅ Index Working Correctly
- Vector search returns results
- Similarity scores > 0.5
- Performance < 100ms
- No error messages

### ❌ Index Issues
- "vector_index" not found errors
- No search results returned
- High latency (>500ms)
- Similarity scores all 0

## Troubleshooting

### Common Issues

1. **Index Not Found**
   - **Cause**: Index name mismatch
   - **Solution**: Ensure index name is exactly `vector_index`

2. **No Results Returned**
   - **Cause**: Dimension mismatch
   - **Solution**: Verify 1536 dimensions in index config

3. **Low Similarity Scores**
   - **Cause**: Incorrect similarity function
   - **Solution**: Use `cosine` similarity

4. **Slow Performance**
   - **Cause**: Too many candidates
   - **Solution**: Optimize `numCandidates` parameter

### Re-create Index If Needed
If the index has issues:
1. Delete existing index in Atlas UI
2. Wait 2-3 minutes for deletion
3. Create new index with exact configuration above
4. Wait 5-10 minutes for index building
5. Test with verification commands

## Performance Optimization

### Query Optimization
```javascript
// Optimized vector search pipeline
{
  $vectorSearch: {
    index: 'vector_index',
    path: 'embedding',
    queryVector: embeddingVector,
    numCandidates: 50,  // Start with 50, adjust based on results
    limit: 5           // Limit results for performance
  }
}
```

### Batch Processing
```javascript
// For multiple queries, use connection pooling
const client = new MongoClient(uri, {
  maxPoolSize: 10,
  minPoolSize: 2
});
```

## Next Steps After Index Creation

1. **Run Performance Tests**: Execute all test scripts
2. **Benchmark Results**: Verify sub-100ms performance  
3. **Quality Assessment**: Check similarity scores >0.7
4. **Production Deployment**: Deploy with confidence
5. **Monitoring Setup**: Implement performance tracking

## Support

If you encounter issues:
1. Check MongoDB Atlas logs
2. Verify connection string
3. Confirm index build status in Atlas UI
4. Run diagnostic scripts provided

**Index creation typically takes 5-10 minutes for 1,000 documents.**