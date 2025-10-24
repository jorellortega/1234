-- INFINITO Authentication Database Setup (Fixed for Supabase)
-- Run this SQL in your Supabase SQL Editor

-- Create user_profiles table to extend auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    phone TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, phone)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to manually create profile for existing users
CREATE OR REPLACE FUNCTION public.create_user_profile(
    user_uuid UUID,
    user_email TEXT,
    user_phone TEXT DEFAULT NULL,
    user_full_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, phone, full_name)
    VALUES (user_uuid, user_email, user_phone, COALESCE(user_full_name, user_email))
    ON CONFLICT (id) DO UPDATE SET
        phone = COALESCE(user_phone, user_profiles.phone),
        full_name = COALESCE(user_full_name, user_profiles.full_name),
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing tables to be user-specific
-- Add user_id to memories table
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to generations table  
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to api_keys table
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for memories
DROP POLICY IF EXISTS "Users can view own memories" ON public.memories;
DROP POLICY IF EXISTS "Users can insert own memories" ON public.memories;
DROP POLICY IF EXISTS "Users can update own memories" ON public.memories;
DROP POLICY IF EXISTS "Users can delete own memories" ON public.memories;

CREATE POLICY "Users can view own memories" ON public.memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories" ON public.memories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories" ON public.memories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories" ON public.memories
    FOR DELETE USING (auth.uid() = user_id);

-- Update RLS policies for generations
DROP POLICY IF EXISTS "Users can view own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can insert own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can update own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can delete own generations" ON public.generations;

CREATE POLICY "Users can view own generations" ON public.generations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations" ON public.generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generations" ON public.generations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generations" ON public.generations
    FOR DELETE USING (auth.uid() = user_id);

-- Update RLS policies for api_keys
DROP POLICY IF EXISTS "Users can view own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can insert own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete own api keys" ON public.api_keys;

CREATE POLICY "Users can view own api keys" ON public.api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys" ON public.api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys" ON public.api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys" ON public.api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON public.memories(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);

-- Create function to get user profile
CREATE OR REPLACE FUNCTION public.get_user_profile(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    phone TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.email,
        up.phone,
        up.full_name,
        up.avatar_url,
        up.created_at
    FROM public.user_profiles up
    WHERE up.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user profile
CREATE OR REPLACE FUNCTION public.update_user_profile(
    user_uuid UUID,
    new_email TEXT DEFAULT NULL,
    new_phone TEXT DEFAULT NULL,
    new_full_name TEXT DEFAULT NULL,
    new_avatar_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.user_profiles
    SET 
        email = COALESCE(new_email, email),
        phone = COALESCE(new_phone, phone),
        full_name = COALESCE(new_full_name, full_name),
        avatar_url = COALESCE(new_avatar_url, avatar_url),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.memories TO authenticated;
GRANT ALL ON public.generations TO authenticated;
GRANT ALL ON public.api_keys TO authenticated;

-- Create view for user statistics
CREATE OR REPLACE VIEW public.user_stats AS
SELECT 
    u.id,
    u.email,
    COUNT(DISTINCT m.id) as memory_count,
    COUNT(DISTINCT g.id) as generation_count,
    COUNT(DISTINCT ak.id) as api_key_count,
    u.created_at
FROM auth.users u
LEFT JOIN public.memories m ON u.id = m.user_id
LEFT JOIN public.generations g ON u.id = g.user_id
LEFT JOIN public.api_keys ak ON u.id = ak.user_id
GROUP BY u.id, u.email, u.created_at;

-- Grant access to user_stats view
GRANT SELECT ON public.user_stats TO authenticated;

-- Note: Views don't support RLS directly, but the underlying tables are protected
