-- Split Vector Tables for Memory-Efficient Indexing
-- Create separate tables by document type to enable vector indexes

-- Step 1: Create document-specific tables
CREATE TABLE IF NOT EXISTS finance_act_chunks (
    LIKE document_chunks INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS income_tax_chunks (
    LIKE document_chunks INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS vat_act_chunks (
    LIKE document_chunks INCLUDING ALL
);

-- Step 2: Migrate data to separate tables
INSERT INTO finance_act_chunks 
SELECT * FROM document_chunks WHERE document_type = 'finance_act';

INSERT INTO income_tax_chunks 
SELECT * FROM document_chunks WHERE document_type = 'income_tax_act';

INSERT INTO vat_act_chunks 
SELECT * FROM document_chunks WHERE document_type = 'vat_act';

-- Step 3: Create vector indexes on smaller tables (should work now)
CREATE INDEX IF NOT EXISTS finance_act_embedding_idx 
ON finance_act_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 20);

CREATE INDEX IF NOT EXISTS income_tax_embedding_idx 
ON income_tax_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 30);

CREATE INDEX IF NOT EXISTS vat_act_embedding_idx 
ON vat_act_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);

-- Step 4: Create unified search function that queries all tables
CREATE OR REPLACE FUNCTION search_all_documents(
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
    (
        SELECT f.id, f.content, f.source_document, f.document_type, f.section, f.language,
               1 - (f.embedding <=> query_embedding) AS similarity, f.chunk_id
        FROM finance_act_chunks f
        WHERE f.embedding IS NOT NULL
        AND (filter_document_type IS NULL OR filter_document_type = 'finance_act')
        
        UNION ALL
        
        SELECT i.id, i.content, i.source_document, i.document_type, i.section, i.language,
               1 - (i.embedding <=> query_embedding) AS similarity, i.chunk_id
        FROM income_tax_chunks i
        WHERE i.embedding IS NOT NULL
        AND (filter_document_type IS NULL OR filter_document_type = 'income_tax_act')
        
        UNION ALL
        
        SELECT v.id, v.content, v.source_document, v.document_type, v.section, v.language,
               1 - (v.embedding <=> query_embedding) AS similarity, v.chunk_id
        FROM vat_act_chunks v
        WHERE v.embedding IS NOT NULL
        AND (filter_document_type IS NULL OR filter_document_type = 'vat_act')
    )
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Step 5: Test the indexed search
CREATE OR REPLACE FUNCTION test_indexed_search()
RETURNS TABLE (
    table_name TEXT,
    chunk_count BIGINT,
    has_index BOOLEAN,
    sample_similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
    test_embedding VECTOR(1536);
BEGIN
    -- Get a sample embedding
    SELECT embedding INTO test_embedding 
    FROM finance_act_chunks 
    WHERE embedding IS NOT NULL 
    LIMIT 1;
    
    -- Test each table
    RETURN QUERY
    SELECT 
        'finance_act' as table_name,
        COUNT(*) as chunk_count,
        EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = 'finance_act_chunks' AND indexname LIKE '%embedding%') as has_index,
        (SELECT MAX(1 - (embedding <=> test_embedding)) FROM finance_act_chunks LIMIT 1) as sample_similarity
    FROM finance_act_chunks
    
    UNION ALL
    
    SELECT 
        'income_tax' as table_name,
        COUNT(*) as chunk_count,
        EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = 'income_tax_chunks' AND indexname LIKE '%embedding%') as has_index,
        (SELECT MAX(1 - (embedding <=> test_embedding)) FROM income_tax_chunks LIMIT 1) as sample_similarity
    FROM income_tax_chunks
    
    UNION ALL
    
    SELECT 
        'vat_act' as table_name,
        COUNT(*) as chunk_count,
        EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = 'vat_act_chunks' AND indexname LIKE '%embedding%') as has_index,
        (SELECT MAX(1 - (embedding <=> test_embedding)) FROM vat_act_chunks LIMIT 1) as sample_similarity
    FROM vat_act_chunks;
END;
$$;

-- Run the test
SELECT * FROM test_indexed_search();