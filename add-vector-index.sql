-- Add Vector Index After Data Upload
-- Run this AFTER uploading embeddings to avoid memory issues

-- Step 1: Check if we have data
SELECT 
    COUNT(*) as total_chunks,
    COUNT(embedding) as chunks_with_embeddings
FROM document_chunks;

-- Step 2: Add vector index for similarity search
-- This will be more efficient with data already in the table
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Step 3: Create optimized search function with vector index
CREATE OR REPLACE FUNCTION search_documents(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    filter_document_type TEXT DEFAULT NULL,
    filter_language TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    source_document TEXT,
    document_type TEXT,
    section TEXT,
    language TEXT,
    similarity FLOAT,
    chunk_id TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.content,
        dc.source_document,
        dc.document_type,
        dc.section,
        dc.language,
        1 - (dc.embedding <=> query_embedding) AS similarity,
        dc.chunk_id
    FROM document_chunks dc
    WHERE dc.embedding IS NOT NULL
    AND (match_threshold IS NULL OR 1 - (dc.embedding <=> query_embedding) > match_threshold)
    AND (filter_document_type IS NULL OR dc.document_type = filter_document_type)
    AND (filter_language IS NULL OR dc.language = filter_language)
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Step 4: Create test search function
CREATE OR REPLACE FUNCTION test_vector_search()
RETURNS TABLE (
    test_name TEXT,
    result_count BIGINT,
    sample_similarity FLOAT,
    sample_content TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    test_embedding VECTOR(1536);
BEGIN
    -- Get a sample embedding from existing data
    SELECT embedding INTO test_embedding 
    FROM document_chunks 
    WHERE embedding IS NOT NULL 
    LIMIT 1;
    
    IF test_embedding IS NULL THEN
        RETURN QUERY
        SELECT 
            'ERROR: No embeddings found' as test_name,
            0::BIGINT as result_count,
            0.0::FLOAT as sample_similarity,
            'Upload embeddings first' as sample_content;
        RETURN;
    END IF;
    
    -- Test vector search
    RETURN QUERY
    SELECT 
        'Vector search test' as test_name,
        COUNT(*)::BIGINT as result_count,
        MAX(similarity) as sample_similarity,
        LEFT(MAX(content), 100) as sample_content
    FROM search_documents(test_embedding, 0.5, 5);
END;
$$;

-- Step 5: Run test
SELECT * FROM test_vector_search();

-- Step 6: Show index information
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'document_chunks'
AND indexname LIKE '%embedding%';

SELECT 'Vector index setup complete!' as status;