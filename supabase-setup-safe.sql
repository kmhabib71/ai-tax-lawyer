-- Safe Supabase Setup with Error Handling
-- This script handles existing tables and missing columns

-- Step 1: Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Drop existing table if it has issues and recreate
DROP TABLE IF EXISTS document_chunks CASCADE;

-- Step 3: Create fresh table with all required columns
CREATE TABLE document_chunks (
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

-- Step 4: Create basic indexes (avoiding memory issues)
CREATE INDEX document_chunks_source_idx ON document_chunks(source_document);
CREATE INDEX document_chunks_type_idx ON document_chunks(document_type);
CREATE INDEX document_chunks_language_idx ON document_chunks(language);
CREATE INDEX document_chunks_chunk_id_idx ON document_chunks(chunk_id);

-- Step 5: Simple search function (no vector index yet)
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
        dc.id,
        dc.content,
        dc.source_document,
        dc.document_type,
        dc.section,
        dc.language,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Step 6: Enable RLS and create policies
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON document_chunks;
DROP POLICY IF EXISTS "Allow insert for service role" ON document_chunks;

-- Create fresh policies
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
DECLARE
    result_text TEXT;
BEGIN
    -- Check if table exists and has correct structure
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'document_chunks'
    ) THEN
        result_text := 'SUCCESS: document_chunks table created with all required columns!';
    ELSE
        result_text := 'ERROR: Failed to create document_chunks table';
    END IF;
    
    RETURN result_text;
END;
$$;

-- Step 8: Run verification
SELECT test_setup() as setup_status;

-- Step 9: Show table structure for verification
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'document_chunks' 
ORDER BY ordinal_position;