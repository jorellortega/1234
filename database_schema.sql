-- AI Settings Database Schema
-- This schema supports the AI Settings page for managing API keys and service configurations

-- AI Services table to store available AI service information
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

-- API Keys table to store user API keys for AI services
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id VARCHAR(50) REFERENCES ai_services(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    encrypted_key TEXT NOT NULL, -- Store encrypted API keys
    key_hash VARCHAR(255) NOT NULL, -- Hash for verification
    is_active BOOLEAN DEFAULT TRUE,
    is_visible BOOLEAN DEFAULT FALSE,
    last_used TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    rate_limit_remaining INTEGER,
    rate_limit_reset TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combination of user and service
    UNIQUE(user_id, service_id)
);

-- API Key Usage Log for tracking and monitoring
CREATE TABLE IF NOT EXISTS api_key_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id VARCHAR(50) REFERENCES ai_services(id) ON DELETE CASCADE,
    endpoint VARCHAR(255),
    request_data JSONB,
    response_status INTEGER,
    response_data JSONB,
    tokens_used INTEGER,
    cost_usd DECIMAL(10,6),
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Service Configuration table for user-specific service settings
CREATE TABLE IF NOT EXISTS service_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id VARCHAR(50) REFERENCES ai_services(id) ON DELETE CASCADE,
    configuration JSONB NOT NULL DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, service_id)
);

-- Insert default AI services
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_service_id ON api_keys(service_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_usage_log_api_key_id ON api_key_usage_log(api_key_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_user_id ON api_key_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_created_at ON api_key_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_service_config_user_id ON service_configurations(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_api_keys_updated_at 
    BEFORE UPDATE ON api_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_services_updated_at 
    BEFORE UPDATE ON ai_services 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_configurations_updated_at 
    BEFORE UPDATE ON service_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies for Supabase
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policy for api_keys - users can only see their own keys
CREATE POLICY "Users can view own api keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys" ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys" ON api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys" ON api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policy for api_key_usage_log
CREATE POLICY "Users can view own usage logs" ON api_key_usage_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs" ON api_key_usage_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy for service_configurations
CREATE POLICY "Users can view own service configs" ON service_configurations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own service configs" ON service_configurations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own service configs" ON service_configurations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own service configs" ON service_configurations
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE ai_services IS 'Available AI services that can be configured with API keys';
COMMENT ON TABLE api_keys IS 'User API keys for AI services, encrypted and secured';
COMMENT ON TABLE api_key_usage_log IS 'Log of API key usage for monitoring and cost tracking';
COMMENT ON TABLE service_configurations IS 'User-specific configuration for AI services';
COMMENT ON COLUMN api_keys.encrypted_key IS 'API key encrypted using application encryption key';
COMMENT ON COLUMN api_keys.key_hash IS 'Hash of API key for verification without storing plaintext'; 