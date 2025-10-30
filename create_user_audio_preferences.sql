-- Create user audio preferences table
-- This allows users to set their preferred voice and audio settings

CREATE TABLE IF NOT EXISTS user_audio_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_voice_id TEXT, -- ElevenLabs voice ID
  preferred_model_id TEXT DEFAULT 'eleven_multilingual_v2', -- ElevenLabs model
  stability DECIMAL(3,2) DEFAULT 0.50,
  similarity_boost DECIMAL(3,2) DEFAULT 0.75,
  style DECIMAL(3,2) DEFAULT 0.00,
  use_speaker_boost BOOLEAN DEFAULT true,
  output_format TEXT DEFAULT 'mp3_44100_128',
  optimize_streaming_latency INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one preference record per user
  UNIQUE(user_id)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_audio_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_audio_preferences_updated_at
  BEFORE UPDATE ON user_audio_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_audio_preferences_updated_at();

-- Enable RLS
ALTER TABLE user_audio_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only access their own audio preferences
CREATE POLICY "Users can view own audio preferences" ON user_audio_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audio preferences" ON user_audio_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audio preferences" ON user_audio_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own audio preferences" ON user_audio_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can access all audio preferences
CREATE POLICY "Admins can access all audio preferences" ON user_audio_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_audio_preferences_user_id ON user_audio_preferences(user_id);

-- Insert default preferences for existing users (optional)
-- This creates a default preference record for users who don't have one yet
INSERT INTO user_audio_preferences (user_id, preferred_voice_id, preferred_model_id)
SELECT 
  id as user_id,
  'EXAVITQu4vr4xnSDxMaL' as preferred_voice_id, -- Default to Sarah voice
  'eleven_multilingual_v2' as preferred_model_id
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_audio_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Add comment
COMMENT ON TABLE user_audio_preferences IS 'User-specific audio preferences for text-to-speech generation';
COMMENT ON COLUMN user_audio_preferences.preferred_voice_id IS 'ElevenLabs voice ID that user prefers for audio generation';
COMMENT ON COLUMN user_audio_preferences.preferred_model_id IS 'ElevenLabs model ID for audio generation';
COMMENT ON COLUMN user_audio_preferences.stability IS 'Voice stability setting (0.0-1.0)';
COMMENT ON COLUMN user_audio_preferences.similarity_boost IS 'Voice similarity boost setting (0.0-1.0)';
COMMENT ON COLUMN user_audio_preferences.style IS 'Voice style exaggeration setting (0.0-1.0)';
COMMENT ON COLUMN user_audio_preferences.use_speaker_boost IS 'Whether to use speaker boost for better quality';
COMMENT ON COLUMN user_audio_preferences.output_format IS 'Audio output format (mp3_44100_128, etc.)';
COMMENT ON COLUMN user_audio_preferences.optimize_streaming_latency IS 'Latency optimization level (0-4)';
