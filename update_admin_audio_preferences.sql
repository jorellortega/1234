-- Update admin_preferences table to include system-wide audio settings
-- This allows admins to control which voices are available to users

-- Add new columns to admin_preferences table
ALTER TABLE admin_preferences 
ADD COLUMN IF NOT EXISTS available_voice_ids TEXT[], -- Array of voice IDs available to users
ADD COLUMN IF NOT EXISTS default_voice_id TEXT DEFAULT 'EXAVITQu4vr4xnSDxMaL', -- Default voice for new users
ADD COLUMN IF NOT EXISTS allow_custom_voices BOOLEAN DEFAULT true, -- Whether users can use custom voices
ADD COLUMN IF NOT EXISTS voice_selection_enabled BOOLEAN DEFAULT true; -- Whether users can choose voices

-- Update the existing admin preferences record
UPDATE admin_preferences 
SET 
  available_voice_ids = ARRAY[
    'EXAVITQu4vr4xnSDxMaL', -- Sarah
    '21m00Tcm4TlvDq8ikWAM', -- Rachel
    'AZnzlk1XvdvUeBnXmlld', -- Domi
    'ErXwobaYiN019PkySvjV', -- Antoni
    'MF3mGyEYCl7XYWbV9V6O', -- Elli
    'TxGEqnHWrfWFTfGW9XjX', -- Josh
    'VR6AewLTigWG4xSOukaG', -- Arnold
    'pNInz6obpgDQGcFmaJgB', -- Adam
    'yoZ06aMxZJJ28mfd3POQ', -- Sam
    'IKne3meq5aSn9XLyUdCD'  -- Charlie
  ],
  default_voice_id = 'EXAVITQu4vr4xnSDxMaL',
  allow_custom_voices = true,
  voice_selection_enabled = true
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Add comments
COMMENT ON COLUMN admin_preferences.available_voice_ids IS 'Array of ElevenLabs voice IDs available to users';
COMMENT ON COLUMN admin_preferences.default_voice_id IS 'Default voice ID for new users';
COMMENT ON COLUMN admin_preferences.allow_custom_voices IS 'Whether users can access custom voices from their ElevenLabs account';
COMMENT ON COLUMN admin_preferences.voice_selection_enabled IS 'Whether users can select different voices for audio generation';
