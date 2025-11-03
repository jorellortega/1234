-- AI Manager Database Schema
-- This schema supports the AI Manager system for managing rules, tasks, intents, context, and executions

-- AI Manager Rules - Store rules and guidelines that the AI Manager should follow
CREATE TABLE IF NOT EXISTS ai_manager_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Rule details
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('system', 'user_preference', 'guideline', 'constraint', 'exclusion')),
  rule_content TEXT NOT NULL, -- The actual rule text
  description TEXT,
  
  -- Rule scope and priority
  scope TEXT DEFAULT 'global' CHECK (scope IN ('global', 'page_specific', 'task_specific')),
  page_path TEXT, -- For page-specific rules (e.g., '/image-mode', '/video-mode')
  priority INTEGER DEFAULT 5, -- 1-10, higher = more important
  
  -- Rule activation
  is_active BOOLEAN DEFAULT true,
  applies_to TEXT[], -- Array of what this applies to: ['image', 'video', 'text', 'audio', 'all']
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for faster lookups
  CONSTRAINT user_rule_name_unique UNIQUE(user_id, rule_name)
);

CREATE INDEX IF NOT EXISTS idx_ai_manager_rules_user_id ON ai_manager_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_manager_rules_type ON ai_manager_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_ai_manager_rules_active ON ai_manager_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_manager_rules_page_path ON ai_manager_rules(page_path) WHERE page_path IS NOT NULL;

-- AI Manager Intents - Store detected user intents from prompts
CREATE TABLE IF NOT EXISTS ai_manager_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Intent detection
  user_prompt TEXT NOT NULL, -- Original user input
  detected_intent TEXT NOT NULL, -- e.g., 'generate_image', 'create_video', 'ask_question', 'complex_task'
  intent_category TEXT NOT NULL, -- 'image', 'video', 'text', 'audio', 'multi_step', 'preference'
  confidence_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0
  
  -- Extracted parameters from the prompt
  extracted_params JSONB DEFAULT '{}', -- e.g., {"subject": "dog", "style": "realistic", "count": 1}
  
  -- Context
  page_context TEXT, -- Which page/user interface this came from
  session_id TEXT, -- To group related intents
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_manager_intents_user_id ON ai_manager_intents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_manager_intents_category ON ai_manager_intents(intent_category);
CREATE INDEX IF NOT EXISTS idx_ai_manager_intents_session ON ai_manager_intents(session_id) WHERE session_id IS NOT NULL;

-- AI Manager Tasks - Individual tasks/checklist items created from intents
CREATE TABLE IF NOT EXISTS ai_manager_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  intent_id UUID REFERENCES ai_manager_intents(id) ON DELETE CASCADE,
  
  -- Task details
  task_title TEXT NOT NULL,
  task_description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('generate_image', 'generate_video', 'generate_audio', 'generate_text', 'process_data', 'manage_rule', 'other')),
  
  -- Task parameters
  ai_service TEXT, -- Which AI service to use: 'openai', 'runway', 'dalle', 'elevenlabs', etc.
  ai_model TEXT, -- Specific model to use
  task_params JSONB DEFAULT '{}', -- Task-specific parameters (prompts, settings, etc.)
  
  -- Task execution
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5, -- 1-10, higher = more urgent
  order_index INTEGER DEFAULT 0, -- Order in which tasks should be executed
  
  -- Dependencies
  depends_on_task_id UUID REFERENCES ai_manager_tasks(id) ON DELETE SET NULL, -- Task that must complete first
  
  -- Results
  execution_result JSONB, -- Results from execution (file URLs, generated content, etc.)
  error_message TEXT,
  
  -- Execution tracking
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  execution_time_ms INTEGER,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_manager_tasks_user_id ON ai_manager_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_manager_tasks_intent_id ON ai_manager_tasks(intent_id);
CREATE INDEX IF NOT EXISTS idx_ai_manager_tasks_status ON ai_manager_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ai_manager_tasks_order ON ai_manager_tasks(intent_id, order_index);

-- AI Manager Context - Store conversation context and user preferences
CREATE TABLE IF NOT EXISTS ai_manager_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Context storage
  context_key TEXT NOT NULL, -- e.g., 'preferred_image_style', 'remember_dont_use_words', 'company_brand_colors'
  context_value JSONB NOT NULL, -- The actual context data
  context_type TEXT NOT NULL CHECK (context_type IN ('preference', 'memory', 'fact', 'instruction', 'exclusion')),
  
  -- Context scope
  scope TEXT DEFAULT 'global' CHECK (scope IN ('global', 'page_specific', 'task_specific', 'session_specific')),
  page_path TEXT, -- For page-specific context
  session_id TEXT, -- For session-specific context
  
  -- Expiry and importance
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiry
  importance INTEGER DEFAULT 5, -- 1-10, higher = more important
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_manager_context_user_id ON ai_manager_context(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_manager_context_key ON ai_manager_context(context_key);
CREATE INDEX IF NOT EXISTS idx_ai_manager_context_type ON ai_manager_context(context_type);
CREATE INDEX IF NOT EXISTS idx_ai_manager_context_page_path ON ai_manager_context(page_path) WHERE page_path IS NOT NULL;

-- Unique index for context keys per user and scope (using COALESCE for NULL handling)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_manager_context_unique 
ON ai_manager_context(user_id, context_key, scope, COALESCE(page_path, ''), COALESCE(session_id, ''));

-- AI Manager Executions - Track execution history and results
CREATE TABLE IF NOT EXISTS ai_manager_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  intent_id UUID REFERENCES ai_manager_intents(id) ON DELETE SET NULL,
  
  -- Execution details
  execution_type TEXT NOT NULL, -- 'single_task', 'task_list', 'multi_step'
  execution_status TEXT DEFAULT 'pending' CHECK (execution_status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'partial')),
  
  -- Tasks involved
  task_ids UUID[], -- Array of task IDs in this execution
  
  -- Execution parameters
  execution_params JSONB DEFAULT '{}',
  execution_result JSONB, -- Overall execution result
  
  -- Progress tracking
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  failed_tasks INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  execution_time_ms INTEGER,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_manager_executions_user_id ON ai_manager_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_manager_executions_intent_id ON ai_manager_executions(intent_id);
CREATE INDEX IF NOT EXISTS idx_ai_manager_executions_status ON ai_manager_executions(execution_status);
CREATE INDEX IF NOT EXISTS idx_ai_manager_executions_created ON ai_manager_executions(user_id, created_at DESC);

-- Enable Row Level Security on all tables
ALTER TABLE ai_manager_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_manager_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_manager_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_manager_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_manager_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_manager_rules
DROP POLICY IF EXISTS "Users can view own rules" ON ai_manager_rules;
CREATE POLICY "Users can view own rules"
  ON ai_manager_rules FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own rules" ON ai_manager_rules;
CREATE POLICY "Users can insert own rules"
  ON ai_manager_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rules" ON ai_manager_rules;
CREATE POLICY "Users can update own rules"
  ON ai_manager_rules FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own rules" ON ai_manager_rules;
CREATE POLICY "Users can delete own rules"
  ON ai_manager_rules FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for ai_manager_intents
DROP POLICY IF EXISTS "Users can view own intents" ON ai_manager_intents;
CREATE POLICY "Users can view own intents"
  ON ai_manager_intents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own intents" ON ai_manager_intents;
CREATE POLICY "Users can insert own intents"
  ON ai_manager_intents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own intents" ON ai_manager_intents;
CREATE POLICY "Users can update own intents"
  ON ai_manager_intents FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own intents" ON ai_manager_intents;
CREATE POLICY "Users can delete own intents"
  ON ai_manager_intents FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for ai_manager_tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON ai_manager_tasks;
CREATE POLICY "Users can view own tasks"
  ON ai_manager_tasks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tasks" ON ai_manager_tasks;
CREATE POLICY "Users can insert own tasks"
  ON ai_manager_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON ai_manager_tasks;
CREATE POLICY "Users can update own tasks"
  ON ai_manager_tasks FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON ai_manager_tasks;
CREATE POLICY "Users can delete own tasks"
  ON ai_manager_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for ai_manager_context
DROP POLICY IF EXISTS "Users can view own context" ON ai_manager_context;
CREATE POLICY "Users can view own context"
  ON ai_manager_context FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own context" ON ai_manager_context;
CREATE POLICY "Users can insert own context"
  ON ai_manager_context FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own context" ON ai_manager_context;
CREATE POLICY "Users can update own context"
  ON ai_manager_context FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own context" ON ai_manager_context;
CREATE POLICY "Users can delete own context"
  ON ai_manager_context FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for ai_manager_executions
DROP POLICY IF EXISTS "Users can view own executions" ON ai_manager_executions;
CREATE POLICY "Users can view own executions"
  ON ai_manager_executions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own executions" ON ai_manager_executions;
CREATE POLICY "Users can insert own executions"
  ON ai_manager_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own executions" ON ai_manager_executions;
CREATE POLICY "Users can update own executions"
  ON ai_manager_executions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own executions" ON ai_manager_executions;
CREATE POLICY "Users can delete own executions"
  ON ai_manager_executions FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_ai_manager_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ai_manager_rules_timestamp ON ai_manager_rules;
CREATE TRIGGER update_ai_manager_rules_timestamp
  BEFORE UPDATE ON ai_manager_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_manager_timestamp();

DROP TRIGGER IF EXISTS update_ai_manager_tasks_timestamp ON ai_manager_tasks;
CREATE TRIGGER update_ai_manager_tasks_timestamp
  BEFORE UPDATE ON ai_manager_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_manager_timestamp();

DROP TRIGGER IF EXISTS update_ai_manager_context_timestamp ON ai_manager_context;
CREATE TRIGGER update_ai_manager_context_timestamp
  BEFORE UPDATE ON ai_manager_context
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_manager_timestamp();

DROP TRIGGER IF EXISTS update_ai_manager_executions_timestamp ON ai_manager_executions;
CREATE TRIGGER update_ai_manager_executions_timestamp
  BEFORE UPDATE ON ai_manager_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_manager_timestamp();

-- AI Manager Questions - Store clarifying questions asked by the AI Manager
CREATE TABLE IF NOT EXISTS ai_manager_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  intent_id UUID REFERENCES ai_manager_intents(id) ON DELETE CASCADE,
  
  -- Question details
  question_text TEXT NOT NULL, -- The actual question to ask the user
  question_type TEXT NOT NULL CHECK (question_type IN ('clarification', 'missing_info', 'preference', 'confirmation', 'context')),
  is_required BOOLEAN DEFAULT true, -- Whether an answer is required before proceeding
  
  -- Question status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'skipped', 'cancelled')),
  answer TEXT, -- User's answer to the question
  answered_at TIMESTAMP WITH TIME ZONE,
  
  -- Question context
  related_field TEXT, -- What field/information this question is about (e.g., 'birthday_date', 'company_name')
  priority INTEGER DEFAULT 5, -- 1-10, higher = more important
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_manager_questions_user_id ON ai_manager_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_manager_questions_intent_id ON ai_manager_questions(intent_id);
CREATE INDEX IF NOT EXISTS idx_ai_manager_questions_status ON ai_manager_questions(status);
CREATE INDEX IF NOT EXISTS idx_ai_manager_questions_pending ON ai_manager_questions(user_id, status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE ai_manager_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_manager_questions
DROP POLICY IF EXISTS "Users can view own questions" ON ai_manager_questions;
CREATE POLICY "Users can view own questions"
  ON ai_manager_questions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own questions" ON ai_manager_questions;
CREATE POLICY "Users can insert own questions"
  ON ai_manager_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own questions" ON ai_manager_questions;
CREATE POLICY "Users can update own questions"
  ON ai_manager_questions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own questions" ON ai_manager_questions;
CREATE POLICY "Users can delete own questions"
  ON ai_manager_questions FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger for questions
DROP TRIGGER IF EXISTS update_ai_manager_questions_timestamp ON ai_manager_questions;
CREATE TRIGGER update_ai_manager_questions_timestamp
  BEFORE UPDATE ON ai_manager_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_manager_timestamp();

-- Add helpful comments
COMMENT ON TABLE ai_manager_rules IS 'Stores rules and guidelines for the AI Manager to follow';
COMMENT ON TABLE ai_manager_intents IS 'Stores detected user intents from prompts';
COMMENT ON TABLE ai_manager_tasks IS 'Stores individual tasks/checklist items created from intents';
COMMENT ON TABLE ai_manager_context IS 'Stores conversation context, preferences, and user memories';
COMMENT ON TABLE ai_manager_executions IS 'Tracks execution history and results of task lists';
COMMENT ON TABLE ai_manager_questions IS 'Stores clarifying questions asked by the AI Manager when information is missing or unclear';

