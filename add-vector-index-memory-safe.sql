-- Memory-Safe Vector Index Setup
-- Works within Supabase's memory limitations

-- Step 1: Check current data
SELECT 
    COUNT(*) as total_chunks,
    COUNT(embedding) as chunks_with_embeddings,
    COUNT(DISTINCT document_type) as document_types
FROM document_chunks;

-- Step 2: Create search function WITHOUT vector index first
-- This allows vector search to work immediately, just slower
CREATE OR REPLACE FUNCTION search_documents_basic(
    query_embedding VECTOR(1536),
    match_count INT DEFAULT 10,
    filter_document_type TEXT DEFAULT NULL
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
    AND (filter_document_type IS NULL OR dc.document_type = filter_document_type)
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Step 3: Try to create a smaller vector index with reduced memory usage
-- Use smaller lists parameter to reduce memory requirements
DO $$
BEGIN
    BEGIN
        -- Try with very small lists parameter
        CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
        ON document_chunks USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 10);  -- Much smaller than default 100
        
        RAISE NOTICE 'Vector index created successfully with lists=10';
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE NOTICE 'Vector index creation failed: %', SQLERRM;
            RAISE NOTICE 'Vector search will work without index (slower but functional)';
    END;
END;
$$;

-- Step 4: Create test function
CREATE OR REPLACE FUNCTION test_vector_search()
RETURNS TABLE (
    test_name TEXT,
    result_count BIGINT,
    sample_similarity FLOAT,
    sample_content TEXT,
    has_index BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    test_embedding VECTOR(1536);
    index_exists BOOLEAN;
BEGIN
    -- Check if vector index exists
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'document_chunks' 
        AND indexname = 'document_chunks_embedding_idx'
    ) INTO index_exists;
    
    -- Get a sample embedding
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
            'Upload embeddings first' as sample_content,
            false as has_index;
        RETURN;
    END IF;
    
    -- Test vector search
    RETURN QUERY
    SELECT 
        'Vector search test' as test_name,
        COUNT(*)::BIGINT as result_count,
        MAX(similarity) as sample_similarity,
        LEFT(MAX(content), 100) as sample_content,
        index_exists as has_index
    FROM search_documents_basic(test_embedding, 5);
END;
$$;

-- Step 5: Test the search functionality
SELECT * FROM test_vector_search();

-- Step 6: Show current indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'document_chunks';

-- Step 7: Provide usage instructions
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'document_chunks' 
            AND indexname = 'document_chunks_embedding_idx'
        ) 
        THEN 'SUCCESS: Vector index created! Use search_documents_basic() for fast searches.'
        ELSE 'INFO: Vector search ready without index. Slower but functional. Use search_documents_basic().'
    END as status;