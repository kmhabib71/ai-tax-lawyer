-- Updated Supabase schema for AI Tax Lawyer Bangladesh
-- Simplified structure for OCR-processed documents with embeddings

-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS tax_documents CASCADE;

-- Create unified tax_documents table for storing chunks with embeddings
CREATE TABLE tax_documents (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}',
  document_type TEXT,
  document_name TEXT,
  source_file TEXT,
  extraction_method TEXT DEFAULT 'OCR',
  language TEXT DEFAULT 'bn',
  chunk_index INTEGER,
  total_chunks INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tax_documents_type ON tax_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_tax_documents_language ON tax_documents(language);
CREATE INDEX IF NOT EXISTS idx_tax_documents_document_name ON tax_documents(document_name);
CREATE INDEX IF NOT EXISTS idx_tax_documents_created_at ON tax_documents(created_at);

-- Create vector similarity index using HNSW (Hierarchical Navigable Small World)
CREATE INDEX IF NOT EXISTS idx_tax_documents_embedding ON tax_documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Function to search for similar documents using cosine similarity
CREATE OR REPLACE FUNCTION match_tax_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.1,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id text,
  content text,
  metadata jsonb,
  document_type text,
  document_name text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    td.id,
    td.content,
    td.metadata,
    td.document_type,
    td.document_name,
    1 - (td.embedding <=> query_embedding) as similarity
  FROM tax_documents td
  WHERE td.embedding IS NOT NULL
  AND 1 - (td.embedding <=> query_embedding) > match_threshold
  ORDER BY td.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get document statistics
CREATE OR REPLACE FUNCTION get_tax_document_stats()
RETURNS TABLE (
  document_type text,
  document_count bigint,
  chunk_count bigint,
  total_characters bigint,
  languages text[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    td.document_type,
    COUNT(DISTINCT td.document_name) as document_count,
    COUNT(*) as chunk_count,
    SUM(LENGTH(td.content)) as total_characters,
    ARRAY_AGG(DISTINCT td.language) as languages
  FROM tax_documents td
  GROUP BY td.document_type
  ORDER BY chunk_count DESC;
END;
$$;

-- Function to search by content (full-text search)
CREATE OR REPLACE FUNCTION search_tax_documents_text(
  search_text text,
  doc_type text DEFAULT NULL,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id text,
  content text,
  document_name text,
  document_type text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    td.id,
    td.content,
    td.document_name,
    td.document_type,
    ts_rank_cd(to_tsvector('english', td.content), plainto_tsquery('english', search_text)) as similarity
  FROM tax_documents td
  WHERE 
    to_tsvector('english', td.content) @@ plainto_tsquery('english', search_text)
    AND (doc_type IS NULL OR td.document_type = doc_type)
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_tax_documents_modtime 
  BEFORE UPDATE ON tax_documents 
  FOR EACH ROW 
  EXECUTE FUNCTION update_modified_column();

-- Grant necessary permissions for public access (adjust as needed)
GRANT SELECT ON tax_documents TO anon;
GRANT SELECT ON tax_documents TO authenticated;
GRANT INSERT ON tax_documents TO authenticated;
GRANT UPDATE ON tax_documents TO authenticated;
GRANT DELETE ON tax_documents TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE tax_documents IS 'Stores OCR-processed tax document chunks with vector embeddings for semantic search';
COMMENT ON FUNCTION match_tax_documents IS 'Searches for document chunks similar to a given embedding using cosine similarity';
COMMENT ON FUNCTION get_tax_document_stats IS 'Returns statistics about processed tax documents';
COMMENT ON FUNCTION search_tax_documents_text IS 'Performs full-text search on tax document content';

-- Show completion message
SELECT 'Updated Supabase schema for AI Tax Lawyer Bangladesh setup completed!' as status;