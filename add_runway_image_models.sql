-- Add new RunwayML image models to admin_preferences table
-- These models are from RunwayML's text-to-image API

ALTER TABLE admin_preferences
ADD COLUMN IF NOT EXISTS model_gen4_image BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS model_gen4_image_turbo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS model_gemini_2_5_flash BOOLEAN DEFAULT true;

-- Update the existing row to enable all models by default
UPDATE admin_preferences
SET 
  model_gen4_image = COALESCE(model_gen4_image, true),
  model_gen4_image_turbo = COALESCE(model_gen4_image_turbo, true),
  model_gemini_2_5_flash = COALESCE(model_gemini_2_5_flash, true)
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Add comments
COMMENT ON COLUMN admin_preferences.model_gen4_image IS 'Enable RunwayML Gen4 Image model (high-quality text-to-image)';
COMMENT ON COLUMN admin_preferences.model_gen4_image_turbo IS 'Enable RunwayML Gen4 Image Turbo model (fast text-to-image)';
COMMENT ON COLUMN admin_preferences.model_gemini_2_5_flash IS 'Enable Gemini 2.5 Flash model (advanced text-to-image)';

