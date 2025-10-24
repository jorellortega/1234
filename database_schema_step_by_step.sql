-- Step-by-step database setup for Memory Core
-- Run these commands one by one in your Supabase SQL editor

-- Step 1: Drop existing table if it exists
DROP TABLE IF EXISTS memories CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

-- Step 2: Create the documents table first (for foreign key reference)
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID, -- Future user authentication support
  is_public BOOLEAN DEFAULT false
);

-- Step 3: Create the new memories table
CREATE TABLE memories (
  -- Primary identifier
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Memory content
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  salience DECIMAL(3,2) CHECK (salience >= 0 AND salience <= 1) NOT NULL,
  concept TEXT NOT NULL,
  data TEXT NOT NULL,
  connections TEXT[] DEFAULT '{}',
  
  -- Hierarchical structure
  parent_id UUID, -- Will reference another memory (for sub-memories)
  memory_category VARCHAR(100) DEFAULT 'general',
  hierarchy_level INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  
  -- Document reference
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  document_filename TEXT,
  document_url TEXT,
  
  -- Future user authentication support
  user_id UUID, -- Will reference users table when auth is implemented
  is_public BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Future features
  memory_type VARCHAR(50) DEFAULT 'core',
  priority INTEGER DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  source VARCHAR(100),
  
  -- Constraints
  CONSTRAINT valid_salience CHECK (salience >= 0 AND salience <= 1),
  CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10),
  CONSTRAINT valid_hierarchy_level CHECK (hierarchy_level >= 0)
);

-- Step 4: Add self-referencing foreign key (after table creation)
ALTER TABLE memories ADD CONSTRAINT fk_memories_parent_id 
FOREIGN KEY (parent_id) REFERENCES memories(id) ON DELETE CASCADE;

-- Step 5: Create indexes for performance
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_parent_id ON memories(parent_id);
CREATE INDEX idx_memories_category ON memories(memory_category);
CREATE INDEX idx_memories_hierarchy_level ON memories(hierarchy_level);
CREATE INDEX idx_memories_salience ON memories(salience DESC);
CREATE INDEX idx_memories_timestamp ON memories(timestamp DESC);
CREATE INDEX idx_memories_priority ON memories(priority DESC);
CREATE INDEX idx_memories_type ON memories(memory_type);
CREATE INDEX idx_memories_public ON memories(is_public);
CREATE INDEX idx_memories_sort_order ON memories(parent_id, sort_order);
CREATE INDEX idx_memories_document_id ON memories(document_id);

-- Document table indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at DESC);

-- Step 6: Create full-text search index
CREATE INDEX idx_memories_search ON memories USING GIN (to_tsvector('english', concept || ' ' || data));

-- Step 7: Create update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_memories_updated_at 
    BEFORE UPDATE ON memories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Insert sample root memories
INSERT INTO memories (concept, data, salience, connections, memory_category, hierarchy_level, sort_order) VALUES
(
  'Aztec Design Project',
  'A comprehensive design project exploring Aztec themes and futuristic aesthetics. This project combines historical research with modern design principles.',
  0.95,
  ARRAY['design', 'aztec', 'project', 'aesthetics'],
  'project',
  0,
  1
),
(
  'AI Memory System',
  'Development of an advanced AI memory management system with hierarchical structure and beautiful UI.',
  0.88,
  ARRAY['ai', 'memory', 'system', 'development'],
  'project',
  0,
  2
),
(
  'Family History Research',
  'Researching and documenting family genealogy and historical connections.',
  0.72,
  ARRAY['family', 'history', 'genealogy', 'research'],
  'family_tree',
  0,
  1
);

-- Step 9: Get the IDs of the root memories for sub-memories
DO $$
DECLARE
  aztec_project_id UUID;
  ai_memory_id UUID;
BEGIN
  -- Get IDs for sub-memories
  SELECT id INTO aztec_project_id FROM memories WHERE concept = 'Aztec Design Project';
  SELECT id INTO ai_memory_id FROM memories WHERE concept = 'AI Memory System';
  
  -- Insert sub-memories for Aztec Design Project
  INSERT INTO memories (concept, data, salience, connections, memory_category, parent_id, hierarchy_level, sort_order) VALUES
  (
    'Color Palette Research',
    'Research into traditional Aztec color schemes and their psychological impact. Exploring reds, golds, and earth tones.',
    0.78,
    ARRAY['colors', 'research', 'psychology', 'traditional'],
    'project',
    aztec_project_id,
    1,
    1
  ),
  (
    'Typography Studies',
    'Analysis of Aztec glyphs and how to adapt them for modern digital interfaces while maintaining authenticity.',
    0.65,
    ARRAY['typography', 'glyphs', 'digital', 'authenticity'],
    'project',
    aztec_project_id,
    1,
    2
  );
  
  -- Insert sub-memories for AI Memory System
  INSERT INTO memories (concept, data, salience, connections, memory_category, parent_id, hierarchy_level, sort_order) VALUES
  (
    'Database Schema Design',
    'Designing the PostgreSQL schema to support hierarchical memories with efficient queries.',
    0.85,
    ARRAY['database', 'schema', 'postgresql', 'hierarchy'],
    'project',
    ai_memory_id,
    1,
    1
  ),
  (
    'UI Component Architecture',
    'Building reusable React components for the memory interface with TypeScript and Tailwind CSS.',
    0.78,
    ARRAY['react', 'typescript', 'components', 'tailwind'],
    'project',
    ai_memory_id,
    1,
    2
  );
END $$;

-- Step 10: Verify the data
SELECT 
  id, 
  concept, 
  memory_category, 
  hierarchy_level, 
  parent_id,
  salience
FROM memories 
ORDER BY hierarchy_level, sort_order;

-- Step 11: Create Supabase Storage bucket for documents
-- Run this in Supabase Dashboard > Storage > Create new bucket
-- Bucket name: files
-- Public bucket: true
-- File size limit: 10MB
-- Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain
