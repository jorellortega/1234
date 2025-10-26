-- Fix RLS policies to allow system-wide API keys (user_id = null)
-- This allows admins to manage system-wide default keys

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can insert own api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update own api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete own api_keys" ON public.api_keys;

-- Create new policies that allow system-wide keys (user_id = null)
CREATE POLICY "Users can view own api_keys" ON public.api_keys
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own api_keys" ON public.api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own api_keys" ON public.api_keys
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own api_keys" ON public.api_keys
    FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Also create admin policies for service_role (bypasses RLS)
CREATE POLICY "Service role can manage all api_keys" ON public.api_keys
    FOR ALL USING (true);

-- Ensure the unique constraint allows null user_id
-- Drop the existing constraint if it exists
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_user_id_service_id_key;

-- Create a new constraint that allows null user_id
-- This creates a partial unique index that only applies when user_id is not null
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_user_service_unique 
ON public.api_keys (user_id, service_id) 
WHERE user_id IS NOT NULL;

-- For system-wide keys (user_id = null), we only want one per service
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_system_service_unique 
ON public.api_keys (service_id) 
WHERE user_id IS NULL;

-- Grant permissions
GRANT ALL ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
GRANT ALL ON public.ai_services TO authenticated;
GRANT ALL ON public.ai_services TO service_role;
