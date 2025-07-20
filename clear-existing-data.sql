-- Clear existing document chunks data
-- Run this before re-uploading embeddings to avoid duplicate key errors

-- Check current data count
SELECT 
    source_document,
    document_type,
    COUNT(*) as chunk_count
FROM document_chunks
GROUP BY source_document, document_type
ORDER BY source_document;

-- Clear all existing data
TRUNCATE TABLE document_chunks;

-- Confirm data is cleared
SELECT COUNT(*) as remaining_chunks FROM document_chunks;

SELECT 'Existing data cleared. Ready for fresh upload.' as status;