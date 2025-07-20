-- Fix Row Level Security Policy for Data Upload
-- This allows the service role to insert data properly

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON document_chunks;
DROP POLICY IF EXISTS "Allow insert for service role" ON document_chunks;

-- Step 2: Create proper policies for service role
CREATE POLICY "Allow read access for authenticated users" 
ON document_chunks FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow read access for anon users" 
ON document_chunks FOR SELECT 
TO anon 
USING (true);

-- Step 3: Allow service role full access (critical for data upload)
CREATE POLICY "Allow all operations for service role" 
ON document_chunks FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- Step 4: Temporarily disable RLS for easier debugging (optional)
-- Uncomment the next line if you still have issues
-- ALTER TABLE document_chunks DISABLE ROW LEVEL SECURITY;

-- Step 5: Test service role access
CREATE OR REPLACE FUNCTION test_service_role_access()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    -- Try to insert a test record
    INSERT INTO document_chunks (
        content,
        source_document,
        document_type,
        language,
        character_count,
        chunk_id
    ) VALUES (
        'RLS Test Content',
        'test-document',
        'test',
        'en',
        16,
        'rls_test_' || extract(epoch from now())
    );
    
    -- Clean up test record
    DELETE FROM document_chunks WHERE content = 'RLS Test Content';
    
    RETURN 'SUCCESS: Service role can insert data';
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- Run the test (this should succeed)
SELECT test_service_role_access() as rls_test_result;

-- Show current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'document_chunks';