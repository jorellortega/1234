-- Complete setup for system-wide API keys
-- Run this script to ensure everything is properly configured

-- 1. Ensure ai_services table exists and has required services
CREATE TABLE IF NOT EXISTS public.ai_services (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(20) NOT NULL CHECK (category IN ('llm', 'vision', 'audio', 'multimodal')),
    icon_name VARCHAR(50),
    is_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert AI services
INSERT INTO public.ai_services (id, name, description, category, icon_name, is_required, is_active) VALUES
-- Language Models
('openai', 'OpenAI', 'GPT-4, GPT-3.5, DALL-E, Whisper', 'llm', 'Brain', FALSE, TRUE),
('anthropic', 'Anthropic', 'Claude 3, Claude 2', 'llm', 'Bot', FALSE, TRUE),
('google', 'Google AI', 'Gemini Pro, PaLM, Vertex AI', 'llm', 'Sparkles', FALSE, TRUE),
('huggingface', 'Hugging Face', 'Open source models and inference', 'llm', 'Zap', FALSE, TRUE),
('replicate', 'Replicate', 'Open source model hosting', 'llm', 'Settings', FALSE, TRUE),

-- Vision & Image
('stability', 'Stability AI', 'SDXL, Stable Diffusion', 'vision', 'Sparkles', FALSE, TRUE),

-- Audio & Speech
('elevenlabs', 'ElevenLabs', 'Text-to-speech, voice cloning', 'audio', 'Zap', FALSE, TRUE),

-- Multimodal
('perplexity', 'Perplexity', 'Mixtral, CodeLlama, Llama', 'multimodal', 'Search', FALSE, TRUE),
('together', 'Together AI', 'Open source model hosting', 'multimodal', 'Users', FALSE, TRUE)

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    icon_name = EXCLUDED.icon_name,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- 2. Ensure api_keys table exists with proper structure
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id VARCHAR(50) REFERENCES public.ai_services(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    encrypted_key TEXT NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_visible BOOLEAN DEFAULT FALSE,
    last_used TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    rate_limit_remaining INTEGER,
    rate_limit_reset TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies
DROP POLICY IF EXISTS "Users can view own api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can insert own api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update own api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete own api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Service role can manage all api_keys" ON public.api_keys;

-- 5. Create new policies that allow system-wide keys
CREATE POLICY "Users can view own api_keys" ON public.api_keys
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own api_keys" ON public.api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own api_keys" ON public.api_keys
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own api_keys" ON public.api_keys
    FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Service role can manage all keys (bypasses RLS)
CREATE POLICY "Service role can manage all api_keys" ON public.api_keys
    FOR ALL USING (true);

-- 6. Create proper unique constraints
-- Drop existing constraints
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_user_id_service_id_key;

-- Create partial unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_user_service_unique 
ON public.api_keys (user_id, service_id) 
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_system_service_unique 
ON public.api_keys (service_id) 
WHERE user_id IS NULL;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_service_id ON public.api_keys(service_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active);

-- 8. Grant permissions
GRANT ALL ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
GRANT ALL ON public.ai_services TO authenticated;
GRANT ALL ON public.ai_services TO service_role;

-- 9. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER update_api_keys_updated_at 
    BEFORE UPDATE ON public.api_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
