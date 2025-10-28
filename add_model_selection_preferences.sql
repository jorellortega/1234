-- Add model selection preferences to admin_preferences table
-- These store which models are currently selected (not just enabled/disabled)

ALTER TABLE admin_preferences
ADD COLUMN IF NOT EXISTS selected_text_model VARCHAR(50) DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS selected_image_model VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS selected_video_model VARCHAR(50) DEFAULT NULL;

-- Update the existing row to have defaults
UPDATE admin_preferences
SET 
  selected_text_model = COALESCE(selected_text_model, 'openai'),
  selected_image_model = COALESCE(selected_image_model, NULL),
  selected_video_model = COALESCE(selected_video_model, NULL)
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Add comment
COMMENT ON COLUMN admin_preferences.selected_text_model IS 'Currently selected text model for admin (openai, gpt, llama, mistral, custom, rag, web)';
COMMENT ON COLUMN admin_preferences.selected_image_model IS 'Currently selected image model for admin (blip, llava, dalle_image, runway_image)';
COMMENT ON COLUMN admin_preferences.selected_video_model IS 'Currently selected video model for admin (gen4_turbo, gen3a_turbo, gen4_aleph)';

