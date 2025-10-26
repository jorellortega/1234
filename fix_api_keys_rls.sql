-- Fix RLS policies for api_keys table
-- This script ensures proper Row Level Security is set up

-- Enable RLS on api_keys table
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can insert own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete own api keys" ON public.api_keys;

-- Create RLS policies for api_keys
CREATE POLICY "Users can view own api_keys" ON public.api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api_keys" ON public.api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_keys" ON public.api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api_keys" ON public.api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

-- Ensure the table has the correct structure
-- Add user_id column if it doesn't exist
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create unique constraint if it doesn't exist
ALTER TABLE public.api_keys ADD CONSTRAINT IF NOT EXISTS api_keys_user_id_service_id_key UNIQUE (user_id, service_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_service_id ON public.api_keys(service_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active);
