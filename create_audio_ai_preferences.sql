-- Audio AI Settings for Admin Preferences
-- This stores ElevenLabs and other audio AI service configurations

-- Add audio settings columns to admin_preferences table
ALTER TABLE admin_preferences
ADD COLUMN IF NOT EXISTS elevenlabs_voice_id VARCHAR(100) DEFAULT 'EXAVITQu4vr4xnSDxMaL', -- Sarah voice
ADD COLUMN IF NOT EXISTS elevenlabs_model_id VARCHAR(50) DEFAULT 'eleven_multilingual_v2',
ADD COLUMN IF NOT EXISTS elevenlabs_stability DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS elevenlabs_similarity_boost DECIMAL(3,2) DEFAULT 0.75,
ADD COLUMN IF NOT EXISTS elevenlabs_style DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS elevenlabs_use_speaker_boost BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS audio_output_format VARCHAR(20) DEFAULT 'mp3_44100_128',
ADD COLUMN IF NOT EXISTS audio_optimize_streaming_latency INTEGER DEFAULT 0;

-- Update existing admin row with defaults
UPDATE admin_preferences
SET 
  elevenlabs_voice_id = COALESCE(elevenlabs_voice_id, 'EXAVITQu4vr4xnSDxMaL'),
  elevenlabs_model_id = COALESCE(elevenlabs_model_id, 'eleven_multilingual_v2'),
  elevenlabs_stability = COALESCE(elevenlabs_stability, 0.50),
  elevenlabs_similarity_boost = COALESCE(elevenlabs_similarity_boost, 0.75),
  elevenlabs_style = COALESCE(elevenlabs_style, 0.00),
  elevenlabs_use_speaker_boost = COALESCE(elevenlabs_use_speaker_boost, true),
  audio_output_format = COALESCE(audio_output_format, 'mp3_44100_128'),
  audio_optimize_streaming_latency = COALESCE(audio_optimize_streaming_latency, 0)
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Add comments for documentation
COMMENT ON COLUMN admin_preferences.elevenlabs_voice_id IS 'ElevenLabs voice ID (e.g., EXAVITQu4vr4xnSDxMaL for Sarah)';
COMMENT ON COLUMN admin_preferences.elevenlabs_model_id IS 'ElevenLabs model: eleven_multilingual_v2, eleven_monolingual_v1, etc.';
COMMENT ON COLUMN admin_preferences.elevenlabs_stability IS 'Voice stability (0.0-1.0): Higher = more consistent, Lower = more expressive';
COMMENT ON COLUMN admin_preferences.elevenlabs_similarity_boost IS 'Similarity boost (0.0-1.0): How closely to match the original voice';
COMMENT ON COLUMN admin_preferences.elevenlabs_style IS 'Style exaggeration (0.0-1.0): How much to exaggerate the speaking style';
COMMENT ON COLUMN admin_preferences.elevenlabs_use_speaker_boost IS 'Enable speaker boost for improved audio quality';
COMMENT ON COLUMN admin_preferences.audio_output_format IS 'Audio format: mp3_44100_128, mp3_44100_192, pcm_16000, pcm_22050, pcm_24000, etc.';
COMMENT ON COLUMN admin_preferences.audio_optimize_streaming_latency IS 'Optimize for streaming (0-4): 0=default, 4=lowest latency';

