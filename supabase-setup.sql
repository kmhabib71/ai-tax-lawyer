-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create tax_documents table for storing document metadata
CREATE TABLE IF NOT EXISTS tax_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('nbr_rule', 'sro', 'ordinance', 'circular', 'gazette')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_chunks table for storing text chunks with embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 embedding dimension
  document_id TEXT NOT NULL REFERENCES tax_documents(id) ON DELETE CASCADE,
  document_title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  page_number INTEGER,
  section TEXT,
  date_issued DATE,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_type ON document_chunks(document_type);
CREATE INDEX IF NOT EXISTS idx_document_chunks_keywords ON document_chunks USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_document_chunks_date ON document_chunks(date_issued);

-- Create vector similarity index using HNSW (Hierarchical Navigable Small World)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Function to search for similar chunks using cosine similarity
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id text,
  content text,
  embedding vector(1536),
  document_id text,
  document_title text,
  document_type text,
  page_number integer,
  section text,
  date_issued date,
  keywords text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.content,
    dc.embedding,
    dc.document_id,
    dc.document_title,
    dc.document_type,
    dc.page_number,
    dc.section,
    dc.date_issued,
    dc.keywords,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get document statistics
CREATE OR REPLACE FUNCTION get_document_stats()
RETURNS TABLE (
  document_type text,
  document_count bigint,
  chunk_count bigint,
  latest_document date
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    td.type as document_type,
    COUNT(DISTINCT td.id) as document_count,
    COUNT(dc.id) as chunk_count,
    MAX(dc.date_issued) as latest_document
  FROM tax_documents td
  LEFT JOIN document_chunks dc ON td.id = dc.document_id
  GROUP BY td.type
  ORDER BY document_count DESC;
END;
$$;

-- Function to search by keywords
CREATE OR REPLACE FUNCTION search_by_keywords(
  search_keywords text[],
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id text,
  content text,
  document_title text,
  document_type text,
  keywords text[],
  keyword_matches int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.content,
    dc.document_title,
    dc.document_type,
    dc.keywords,
    (
      SELECT COUNT(*)::int 
      FROM unnest(dc.keywords) AS keyword 
      WHERE keyword = ANY(search_keywords)
    ) as keyword_matches
  FROM document_chunks dc
  WHERE dc.keywords && search_keywords
  ORDER BY keyword_matches DESC, dc.created_at DESC
  LIMIT match_count;
END;
$$;

-- Function to update document updated_at timestamp
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

-- Insert sample data for testing (you can remove this in production)
INSERT INTO tax_documents (id, title, type, content) VALUES 
('sample_nbr_001', 'Income Tax Rules 2024', 'nbr_rule', 'Sample NBR rule content for testing purposes...')
ON CONFLICT (id) DO NOTHING;

-- Create RLS (Row Level Security) policies if needed
-- ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT ON tax_documents TO anon;
-- GRANT SELECT ON document_chunks TO anon;

COMMENT ON TABLE tax_documents IS 'Stores tax-related documents from NBR, including rules, SROs, ordinances, etc.';
COMMENT ON TABLE document_chunks IS 'Stores chunked content from tax documents with vector embeddings for similarity search';
COMMENT ON FUNCTION search_similar_chunks IS 'Searches for document chunks similar to a given embedding using cosine similarity';
COMMENT ON FUNCTION get_document_stats IS 'Returns statistics about documents and chunks by type';
COMMENT ON FUNCTION search_by_keywords IS 'Searches for chunks containing specific keywords';

-- Show completion message
SELECT 'Supabase vector database setup completed successfully!' as status;