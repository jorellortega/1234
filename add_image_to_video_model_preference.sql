-- Add image-to-video model preference to admin_preferences table
-- This stores the model to use when converting images to video (separate from main video model)
-- Note: gen4_aleph is V2V (video-to-video) not I2V (image-to-video), so it's not included

ALTER TABLE admin_preferences
ADD COLUMN IF NOT EXISTS selected_image_to_video_model VARCHAR(50) DEFAULT 'gen4_turbo';

-- Update the existing row to have default
UPDATE admin_preferences
SET selected_image_to_video_model = COALESCE(selected_image_to_video_model, 'gen4_turbo')
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Add comment
COMMENT ON COLUMN admin_preferences.selected_image_to_video_model IS 'Model to use for image-to-video conversion (gen4_turbo, gen3a_turbo, veo3.1, veo3.1_fast, veo3). Note: gen4_aleph is V2V not I2V.';

