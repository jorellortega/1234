-- Add VEO video models to admin preferences
-- This adds the new VEO 3, VEO 3.1, and VEO 3.1 FAST models with text-to-video support

ALTER TABLE admin_preferences
ADD COLUMN IF NOT EXISTS model_veo3 BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "model_veo3.1" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS model_veo3_1_fast BOOLEAN DEFAULT true;

-- Update the existing admin preferences row to enable all new models by default
UPDATE admin_preferences
SET 
  model_veo3 = COALESCE(model_veo3, true),
  "model_veo3.1" = COALESCE("model_veo3.1", true),
  model_veo3_1_fast = COALESCE(model_veo3_1_fast, true)
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Add comments for documentation
COMMENT ON COLUMN admin_preferences.model_veo3 IS 'Enable VEO 3 video model (text-to-video and image-to-video, 8 seconds)';
COMMENT ON COLUMN admin_preferences."model_veo3.1" IS 'Enable VEO 3.1 video model (text-to-video and image-to-video, 4-8 seconds)';
COMMENT ON COLUMN admin_preferences.model_veo3_1_fast IS 'Enable VEO 3.1 FAST video model (text-to-video and image-to-video, 4-8 seconds)';

-- Display current video model settings
SELECT 
  model_gen4_turbo,
  model_gen3a_turbo,
  model_gen4_aleph,
  model_veo3,
  "model_veo3.1",
  model_veo3_1_fast
FROM admin_preferences
WHERE id = '00000000-0000-0000-0000-000000000001';

