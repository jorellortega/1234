-- Add video category support and Runway ML service
-- Run this in your Supabase SQL editor

-- 1. Add 'video' to the category constraint
ALTER TABLE ai_services 
  DROP CONSTRAINT IF EXISTS ai_services_category_check;

ALTER TABLE ai_services 
  ADD CONSTRAINT ai_services_category_check 
  CHECK (category IN ('llm', 'vision', 'audio', 'video', 'multimodal'));

-- 2. Insert Runway ML service
INSERT INTO ai_services (id, name, description, category, icon_name, is_required, is_active) VALUES
('runwayml', 'Runway ML', 'Video generation AI', 'video', 'Video', FALSE, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    icon_name = EXCLUDED.icon_name,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;
