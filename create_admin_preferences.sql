-- Create admin_preferences table for universal admin settings
CREATE TABLE IF NOT EXISTS admin_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Text Models
  model_openai BOOLEAN DEFAULT true,
  model_gpt BOOLEAN DEFAULT true,
  model_llama BOOLEAN DEFAULT true,
  model_mistral BOOLEAN DEFAULT true,
  model_custom BOOLEAN DEFAULT true,
  model_rag BOOLEAN DEFAULT true,
  model_web BOOLEAN DEFAULT true,
  
  -- Vision/Image Models
  model_blip BOOLEAN DEFAULT true,
  model_llava BOOLEAN DEFAULT true,
  model_dalle_image BOOLEAN DEFAULT true,
  model_runway_image BOOLEAN DEFAULT true,
  
  -- Video Models
  model_gen4_turbo BOOLEAN DEFAULT true,
  model_gen3a_turbo BOOLEAN DEFAULT true,
  model_gen4_aleph BOOLEAN DEFAULT true,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default preferences (all models enabled)
INSERT INTO admin_preferences (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE admin_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read preferences
CREATE POLICY "Admins can read preferences"
ON admin_preferences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Policy: Only admins can update preferences
CREATE POLICY "Admins can update preferences"
ON admin_preferences
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_admin_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_admin_preferences_timestamp
BEFORE UPDATE ON admin_preferences
FOR EACH ROW
EXECUTE FUNCTION update_admin_preferences_timestamp();

