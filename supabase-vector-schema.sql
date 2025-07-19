-- AI Tax Lawyer Bangladesh - Vector Database Schema
-- Optimized for Bengali, English, and Banglish queries

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS unaccent; -- For accent-insensitive search

-- Document chunks table with vector embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    content_bn TEXT, -- Bengali translation/version
    content_en TEXT, -- English translation/version
    metadata JSONB NOT NULL,
    embeddings vector(1536), -- OpenAI text-embedding-3-small dimensions
    keywords_bn TEXT[] DEFAULT '{}',
    keywords_en TEXT[] DEFAULT '{}',
    search_vector tsvector, -- Full-text search vector
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_embeddings 
ON document_chunks USING ivfflat (embeddings vector_cosine_ops) 
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_document_chunks_metadata 
ON document_chunks USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_document_chunks_keywords_bn 
ON document_chunks USING gin (keywords_bn);

CREATE INDEX IF NOT EXISTS idx_document_chunks_keywords_en 
ON document_chunks USING gin (keywords_en);

CREATE INDEX IF NOT EXISTS idx_document_chunks_search_vector 
ON document_chunks USING gin (search_vector);

-- Document type index for filtering
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_type 
ON document_chunks ((metadata->>'document_type'));

-- Language index for filtering
CREATE INDEX IF NOT EXISTS idx_document_chunks_language 
ON document_chunks ((metadata->>'language'));

-- Trigger to update search_vector automatically
CREATE OR REPLACE FUNCTION update_search_vector() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.content_en, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('simple', array_to_string(NEW.keywords_en, ' ')), 'C') ||
        setweight(to_tsvector('simple', array_to_string(NEW.keywords_bn, ' ')), 'D');
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_vector
    BEFORE INSERT OR UPDATE ON document_chunks
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Function for hybrid search (semantic + keyword)
CREATE OR REPLACE FUNCTION hybrid_search(
    query_text TEXT,
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.5,
    semantic_weight FLOAT DEFAULT 0.7,
    keyword_weight FLOAT DEFAULT 0.3,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    id TEXT,
    content TEXT,
    metadata JSONB,
    keywords_bn TEXT[],
    keywords_en TEXT[],
    semantic_score FLOAT,
    keyword_score FLOAT,
    combined_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH semantic_results AS (
        SELECT 
            dc.id,
            dc.content,
            dc.metadata,
            dc.keywords_bn,
            dc.keywords_en,
            (1 - (dc.embeddings <=> query_embedding)) AS semantic_score
        FROM document_chunks dc
        WHERE dc.embeddings IS NOT NULL
        AND (1 - (dc.embeddings <=> query_embedding)) > match_threshold
        ORDER BY dc.embeddings <=> query_embedding
        LIMIT max_results * 2
    ),
    keyword_results AS (
        SELECT 
            dc.id,
            dc.content,
            dc.metadata,
            dc.keywords_bn,
            dc.keywords_en,
            ts_rank(dc.search_vector, plainto_tsquery('simple', query_text)) AS keyword_score
        FROM document_chunks dc
        WHERE dc.search_vector @@ plainto_tsquery('simple', query_text)
        OR EXISTS (
            SELECT 1 FROM unnest(dc.keywords_bn) AS kw 
            WHERE kw ILIKE '%' || query_text || '%'
        )
        OR EXISTS (
            SELECT 1 FROM unnest(dc.keywords_en) AS kw 
            WHERE kw ILIKE '%' || query_text || '%'
        )
        ORDER BY ts_rank(dc.search_vector, plainto_tsquery('simple', query_text)) DESC
        LIMIT max_results * 2
    )
    SELECT 
        COALESCE(s.id, k.id) as id,
        COALESCE(s.content, k.content) as content,
        COALESCE(s.metadata, k.metadata) as metadata,
        COALESCE(s.keywords_bn, k.keywords_bn) as keywords_bn,
        COALESCE(s.keywords_en, k.keywords_en) as keywords_en,
        COALESCE(s.semantic_score, 0) as semantic_score,
        COALESCE(k.keyword_score, 0) as keyword_score,
        (COALESCE(s.semantic_score, 0) * semantic_weight + 
         COALESCE(k.keyword_score, 0) * keyword_weight) as combined_score
    FROM semantic_results s
    FULL OUTER JOIN keyword_results k ON s.id = k.id
    ORDER BY combined_score DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function for Bengali text search with fuzzy matching
CREATE OR REPLACE FUNCTION bengali_fuzzy_search(
    query_text TEXT,
    similarity_threshold FLOAT DEFAULT 0.3,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    id TEXT,
    content TEXT,
    metadata JSONB,
    similarity_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.content,
        dc.metadata,
        GREATEST(
            similarity(dc.content, query_text),
            (
                SELECT COALESCE(MAX(similarity(kw, query_text)), 0)
                FROM unnest(dc.keywords_bn) AS kw
            )
        ) AS similarity_score
    FROM document_chunks dc
    WHERE 
        similarity(dc.content, query_text) > similarity_threshold
        OR EXISTS (
            SELECT 1 FROM unnest(dc.keywords_bn) AS kw 
            WHERE similarity(kw, query_text) > similarity_threshold
        )
        OR dc.content ILIKE '%' || query_text || '%'
    ORDER BY similarity_score DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to handle Banglish queries
CREATE OR REPLACE FUNCTION banglish_search(
    query_text TEXT,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    id TEXT,
    content TEXT,
    metadata JSONB,
    match_type TEXT
) AS $$
DECLARE
    bengali_equivalent TEXT;
    english_equivalent TEXT;
BEGIN
    -- Common Banglish to Bengali/English mappings
    query_text := LOWER(trim(query_text));
    
    -- Convert common Banglish terms
    CASE 
        WHEN query_text LIKE '%tax%' OR query_text LIKE '%ট্যাক্স%' THEN
            bengali_equivalent := 'কর';
            english_equivalent := 'tax';
        WHEN query_text LIKE '%income%' OR query_text LIKE '%ইনকাম%' THEN
            bengali_equivalent := 'আয়';
            english_equivalent := 'income';
        WHEN query_text LIKE '%salary%' OR query_text LIKE '%বেতন%' THEN
            bengali_equivalent := 'বেতন';
            english_equivalent := 'salary';
        WHEN query_text LIKE '%vat%' OR query_text LIKE '%ভ্যাট%' THEN
            bengali_equivalent := 'মূসক';
            english_equivalent := 'vat';
        ELSE
            bengali_equivalent := query_text;
            english_equivalent := query_text;
    END CASE;

    RETURN QUERY
    SELECT 
        dc.id,
        dc.content,
        dc.metadata,
        'banglish_match' as match_type
    FROM document_chunks dc
    WHERE 
        dc.content ILIKE '%' || bengali_equivalent || '%'
        OR dc.content ILIKE '%' || english_equivalent || '%'
        OR EXISTS (
            SELECT 1 FROM unnest(dc.keywords_bn) AS kw 
            WHERE kw ILIKE '%' || bengali_equivalent || '%'
        )
        OR EXISTS (
            SELECT 1 FROM unnest(dc.keywords_en) AS kw 
            WHERE kw ILIKE '%' || english_equivalent || '%'
        )
    ORDER BY 
        CASE 
            WHEN dc.content ILIKE '%' || bengali_equivalent || '%' THEN 1
            WHEN dc.content ILIKE '%' || english_equivalent || '%' THEN 2
            ELSE 3
        END
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Processing log table
CREATE TABLE IF NOT EXISTS document_processing_log (
    id SERIAL PRIMARY KEY,
    document_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    processing_status TEXT NOT NULL CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    chunks_created INTEGER DEFAULT 0,
    embeddings_generated INTEGER DEFAULT 0,
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_log_status 
ON document_processing_log (processing_status);

CREATE INDEX IF NOT EXISTS idx_processing_log_document_id 
ON document_processing_log (document_id);

-- Query analytics table for performance monitoring
CREATE TABLE IF NOT EXISTS query_analytics (
    id SERIAL PRIMARY KEY,
    query_text TEXT NOT NULL,
    query_language TEXT, -- 'bn', 'en', 'banglish'
    query_type TEXT, -- 'semantic', 'keyword', 'hybrid'
    results_count INTEGER,
    response_time_ms INTEGER,
    user_id TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_analytics_language 
ON query_analytics (query_language);

CREATE INDEX IF NOT EXISTS idx_query_analytics_created_at 
ON query_analytics (created_at);

-- User feedback on search results
CREATE TABLE IF NOT EXISTS search_feedback (
    id SERIAL PRIMARY KEY,
    query_text TEXT NOT NULL,
    result_chunk_id TEXT NOT NULL,
    feedback_type TEXT CHECK (feedback_type IN ('helpful', 'not_helpful', 'incorrect')),
    user_id TEXT,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- View for search analytics
CREATE VIEW search_performance AS
SELECT 
    DATE(created_at) as search_date,
    query_language,
    query_type,
    COUNT(*) as total_queries,
    AVG(response_time_ms) as avg_response_time,
    AVG(results_count) as avg_results_count,
    COUNT(DISTINCT user_id) as unique_users
FROM query_analytics
GROUP BY DATE(created_at), query_language, query_type
ORDER BY search_date DESC;

-- Function to log search queries
CREATE OR REPLACE FUNCTION log_search_query(
    p_query_text TEXT,
    p_query_language TEXT,
    p_query_type TEXT,
    p_results_count INTEGER,
    p_response_time_ms INTEGER,
    p_user_id TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO query_analytics (
        query_text, query_language, query_type, results_count, 
        response_time_ms, user_id, session_id
    ) VALUES (
        p_query_text, p_query_language, p_query_type, p_results_count,
        p_response_time_ms, p_user_id, p_session_id
    );
END;
$$ LANGUAGE plpgsql;

-- Cleanup function for old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM query_analytics 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON document_chunks TO authenticated;
-- GRANT SELECT ON search_performance TO authenticated;
-- GRANT EXECUTE ON FUNCTION hybrid_search TO authenticated;
-- GRANT EXECUTE ON FUNCTION bengali_fuzzy_search TO authenticated;
-- GRANT EXECUTE ON FUNCTION banglish_search TO authenticated;