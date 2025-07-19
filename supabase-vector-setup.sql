-- Supabase Vector Database Setup for AI Tax Lawyer Bangladesh
-- Run this SQL in your Supabase SQL Editor

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_chunks table for RAG system
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS document_chunks_source_idx ON document_chunks(source_document);
CREATE INDEX IF NOT EXISTS document_chunks_type_idx ON document_chunks(document_type);
CREATE INDEX IF NOT EXISTS document_chunks_language_idx ON document_chunks(language);
CREATE INDEX IF NOT EXISTS document_chunks_chunk_id_idx ON document_chunks(chunk_id);

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION search_documents(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
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
    WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    AND (filter_document_type IS NULL OR document_chunks.document_type = filter_document_type)
    ORDER BY document_chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Create RLS (Row Level Security) policies if needed
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access for authenticated users" 
ON document_chunks FOR SELECT 
TO authenticated 
USING (true);

-- Allow insert for service role (for bulk uploads)
CREATE POLICY "Allow insert for service role" 
ON document_chunks FOR INSERT 
TO service_role 
WITH CHECK (true);

-- Create view for quick document statistics
CREATE OR REPLACE VIEW document_stats AS
SELECT 
    source_document,
    document_type,
    language,
    COUNT(*) as chunk_count,
    AVG(character_count) as avg_chunk_size,
    SUM(character_count) as total_characters
FROM document_chunks
GROUP BY source_document, document_type, language
ORDER BY source_document;

-- Sample query functions for testing
CREATE OR REPLACE FUNCTION test_vector_search()
RETURNS TABLE (
    test_name TEXT,
    chunk_count BIGINT,
    sample_content TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Total chunks' as test_name,
        COUNT(*) as chunk_count,
        'N/A' as sample_content
    FROM document_chunks
    
    UNION ALL
    
    SELECT 
        'Sample Bengali content' as test_name,
        1 as chunk_count,
        LEFT(content, 100) as sample_content
    FROM document_chunks 
    WHERE language = 'bn' 
    LIMIT 1
    
    UNION ALL
    
    SELECT 
        'Finance Act chunks' as test_name,
        COUNT(*) as chunk_count,
        'N/A' as sample_content
    FROM document_chunks 
    WHERE document_type = 'finance_act';
END;
$$;

-- Comments for documentation
COMMENT ON TABLE document_chunks IS 'Stores document chunks with embeddings for RAG system';
COMMENT ON COLUMN document_chunks.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';
COMMENT ON COLUMN document_chunks.content IS 'Text content of the chunk';
COMMENT ON COLUMN document_chunks.source_document IS 'Original document filename';
COMMENT ON COLUMN document_chunks.document_type IS 'Type: finance_act, income_tax_act, vat_act';
COMMENT ON COLUMN document_chunks.section IS 'Legal section reference if detected';
COMMENT ON COLUMN document_chunks.language IS 'Detected language: bn, en, mixed';

-- Success message
SELECT 'Supabase vector database setup complete!' as status;