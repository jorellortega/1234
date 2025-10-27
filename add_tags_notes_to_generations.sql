-- Add tags and notes columns to generations table
-- Run this in Supabase SQL Editor

-- Add tags column (array of text)
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add notes column (text)
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add parent_id column if it doesn't exist (for conversation threading)
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.generations(id) ON DELETE SET NULL;

-- Create index on tags for faster filtering
CREATE INDEX IF NOT EXISTS idx_generations_tags ON public.generations USING GIN (tags);

-- Create index on parent_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_generations_parent_id ON public.generations(parent_id);

-- Comments for documentation
COMMENT ON COLUMN public.generations.tags IS 'Array of tags for categorizing and filtering generations';
COMMENT ON COLUMN public.generations.notes IS 'User notes about this generation';
COMMENT ON COLUMN public.generations.parent_id IS 'Reference to parent generation for conversation threading';

