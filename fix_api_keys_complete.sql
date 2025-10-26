-- Comprehensive fix for API keys functionality
-- This script ensures proper setup for the AI Settings feature

-- 1. Ensure ai_services table exists and has data
CREATE TABLE IF NOT EXISTS ai_services (
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

-- Insert default AI services (including ElevenLabs)
INSERT INTO ai_services (id, name, description, category, icon_name, is_required) VALUES
('openai', 'OpenAI', 'GPT-4, GPT-3.5, DALL-E, Whisper', 'llm', 'Brain', FALSE),
('anthropic', 'Anthropic', 'Claude 3, Claude 2', 'llm', 'Bot', FALSE),
('google', 'Google AI', 'Gemini Pro, PaLM, Vertex AI', 'llm', 'Sparkles', FALSE),
('huggingface', 'Hugging Face', 'Open source models and inference', 'llm', 'Zap', FALSE),
('replicate', 'Replicate', 'Open source model hosting', 'llm', 'Settings', FALSE),
('stability', 'Stability AI', 'SDXL, Stable Diffusion', 'vision', 'Sparkles', FALSE),
('elevenlabs', 'ElevenLabs', 'Text-to-speech, voice cloning', 'audio', 'Zap', FALSE),
('cohere', 'Cohere', 'Command, Command-R, Embed', 'llm', 'Zap', FALSE),
('perplexity', 'Perplexity', 'Mixtral, CodeLlama, Llama', 'llm', 'Search', FALSE),
('together', 'Together AI', 'Open source model hosting', 'llm', 'Users', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure api_keys table exists with proper structure
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id VARCHAR(50) REFERENCES ai_services(id) ON DELETE CASCADE,
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT api_keys_user_id_service_id_key UNIQUE (user_id, service_id)
);

-- 3. Enable RLS and set up policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own api_keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert own api_keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update own api_keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete own api_keys" ON api_keys;

-- Create RLS policies
CREATE POLICY "Users can view own api_keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api_keys" ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_keys" ON api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api_keys" ON api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Grant permissions
GRANT ALL ON api_keys TO authenticated;
GRANT ALL ON api_keys TO service_role;
GRANT ALL ON ai_services TO authenticated;
GRANT ALL ON ai_services TO service_role;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_service_id ON api_keys(service_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- 6. Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_api_keys_updated_at 
    BEFORE UPDATE ON api_keys 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Verify setup
SELECT 'Setup complete! Tables and policies are ready.' as status;
