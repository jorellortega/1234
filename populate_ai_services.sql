-- Ensure ai_services table has all required services for the admin page
-- This script populates the ai_services table with the services used in the admin interface

-- Insert AI services if they don't exist
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
