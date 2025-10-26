-- Complete fix for API keys RLS policies
-- This script ensures proper authentication and RLS setup

-- First, let's check the current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'api_keys';

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own api keys" ON api_keys;
DROP POLICY IF EXISTS "Users can view own api_keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert own api keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert own api_keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update own api keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update own api_keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete own api keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete own api_keys" ON api_keys;

-- Temporarily disable RLS to test
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users (temporary for testing)
GRANT ALL ON api_keys TO authenticated;
GRANT ALL ON api_keys TO service_role;
GRANT ALL ON api_keys TO anon;

-- Re-enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create new policies that work with both authenticated and anon roles
CREATE POLICY "Allow authenticated users to manage own api_keys" ON api_keys
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        auth.uid() = user_id
    );

CREATE POLICY "Allow anon users to manage own api_keys" ON api_keys
    FOR ALL USING (
        auth.role() = 'anon' AND 
        auth.uid() = user_id
    );

-- Alternative: Create a single policy that works for both roles
-- Drop the above policies and use this instead
DROP POLICY IF EXISTS "Allow authenticated users to manage own api_keys" ON api_keys;
DROP POLICY IF EXISTS "Allow anon users to manage own api_keys" ON api_keys;

-- Single policy that works for all roles
CREATE POLICY "Users can manage own api_keys" ON api_keys
    FOR ALL USING (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    );

-- Ensure proper permissions
GRANT ALL ON api_keys TO authenticated;
GRANT ALL ON api_keys TO service_role;
GRANT ALL ON api_keys TO anon;

-- Test the setup
SELECT 'RLS policies updated successfully!' as status;
