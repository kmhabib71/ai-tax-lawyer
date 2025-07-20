-- Simplified Supabase Setup (Memory-Friendly)
-- Run this in Supabase SQL Editor to avoid memory issues

-- Step 1: Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create table without indexes first
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    source_document TEXT,
    document_type TEXT,
    chunk_index INTEGER,
    section TEXT,
    language TEXT,
    character_count INTEGER,
    chunk_id TEXT UNIQUE,
    extraction_method TEXT,
    processing_date TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Basic indexes only (memory-friendly)
CREATE INDEX IF NOT EXISTS document_chunks_source_idx ON document_chunks(source_document);
CREATE INDEX IF NOT EXISTS document_chunks_type_idx ON document_chunks(document_type);
CREATE INDEX IF NOT EXISTS document_chunks_language_idx ON document_chunks(language);
CREATE INDEX IF NOT EXISTS document_chunks_chunk_id_idx ON document_chunks(chunk_id);

-- Step 4: Simple search function (without vector index for now)
CREATE OR REPLACE FUNCTION search_documents_simple(
    query_embedding VECTOR(1536),
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    source_document TEXT,
    document_type TEXT,
    section TEXT,
    language TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        document_chunks.id,
        document_chunks.content,
        document_chunks.source_document,
        document_chunks.document_type,
        document_chunks.section,
        document_chunks.language,
        1 - (document_chunks.embedding <=> query_embedding) AS similarity
    FROM document_chunks
    WHERE document_chunks.embedding IS NOT NULL
    ORDER BY document_chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Step 5: Enable RLS
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Step 6: Basic policies
CREATE POLICY "Allow read access for authenticated users" 
ON document_chunks FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow insert for service role" 
ON document_chunks FOR INSERT 
TO service_role 
WITH CHECK (true);

-- Step 7: Test function
CREATE OR REPLACE FUNCTION test_setup()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 'Supabase setup complete! Ready for embedding upload.';
END;
$$;

-- Run test
SELECT test_setup();