-- Create table for GPT model preferences
CREATE TABLE IF NOT EXISTS gpt_model_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL UNIQUE,
  model_name TEXT NOT NULL,
  input_cost NUMERIC(10, 5) NOT NULL, -- Per 1M tokens
  output_cost NUMERIC(10, 5) NOT NULL, -- Per 1M tokens
  cached_input_cost NUMERIC(10, 5), -- Per 1M tokens (optional)
  enabled BOOLEAN DEFAULT true,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gpt_model_preferences_model_id ON gpt_model_preferences(model_id);
CREATE INDEX IF NOT EXISTS idx_gpt_model_preferences_enabled ON gpt_model_preferences(enabled);
CREATE INDEX IF NOT EXISTS idx_gpt_model_preferences_category ON gpt_model_preferences(category);

-- Enable RLS
ALTER TABLE gpt_model_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read model preferences (needed for model selection dropdowns)
CREATE POLICY "Allow authenticated users to read model preferences"
  ON gpt_model_preferences
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can insert/update/delete
CREATE POLICY "Allow admins to manage model preferences"
  ON gpt_model_preferences
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_gpt_model_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gpt_model_preferences_updated_at
  BEFORE UPDATE ON gpt_model_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_gpt_model_preferences_updated_at();

-- Add comment
COMMENT ON TABLE gpt_model_preferences IS 'Stores admin preferences for which GPT models are enabled and their costs';

