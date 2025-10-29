-- Add new OpenAI model columns to admin_preferences table
-- Run this migration to enable the new OpenAI models in the admin panel

ALTER TABLE admin_preferences
ADD COLUMN IF NOT EXISTS "model_gpt-4o" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "model_gpt-4o-mini" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "model_gpt-4-turbo" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "model_gpt-4" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "model_gpt-3.5-turbo" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "model_o1" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "model_o1-mini" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "model_o1-preview" BOOLEAN DEFAULT true;

-- Update existing admin preferences to enable all new models by default
UPDATE admin_preferences
SET 
  "model_gpt-4o" = COALESCE("model_gpt-4o", true),
  "model_gpt-4o-mini" = COALESCE("model_gpt-4o-mini", true),
  "model_gpt-4-turbo" = COALESCE("model_gpt-4-turbo", true),
  "model_gpt-4" = COALESCE("model_gpt-4", true),
  "model_gpt-3.5-turbo" = COALESCE("model_gpt-3.5-turbo", true),
  "model_o1" = COALESCE("model_o1", true),
  "model_o1-mini" = COALESCE("model_o1-mini", true),
  "model_o1-preview" = COALESCE("model_o1-preview", true);

