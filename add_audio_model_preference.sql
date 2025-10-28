-- Add audio model selection preference to admin_preferences table
-- This stores which audio/TTS model is currently selected

ALTER TABLE admin_preferences
ADD COLUMN IF NOT EXISTS selected_audio_model VARCHAR(50) DEFAULT NULL;

-- Update the existing row to have default
UPDATE admin_preferences
SET selected_audio_model = COALESCE(selected_audio_model, NULL)
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Add comment
COMMENT ON COLUMN admin_preferences.selected_audio_model IS 'Currently selected audio/TTS model for admin (e.g., elevenlabs, google_tts, amazon_polly)';

