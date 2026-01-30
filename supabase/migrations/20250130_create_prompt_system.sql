-- ============================================================================
-- Unified Prompt Management System Migration
-- ============================================================================
-- This migration creates the database schema for the centralized prompt
-- management system that connects the Prompt Playground to all AI features
-- (Remix, Post Composer, Carousel Generation) with version tracking.
-- ============================================================================

-- ============================================================================
-- 1. Create prompt_type ENUM
-- ============================================================================
-- Defines all available prompt types in the system

CREATE TYPE prompt_type AS ENUM (
  -- Remix tones
  'remix_professional',
  'remix_casual',
  'remix_inspiring',
  'remix_educational',
  'remix_thought_provoking',
  'remix_match_style',
  -- Post types
  'post_story',
  'post_listicle',
  'post_how_to',
  'post_contrarian',
  'post_case_study',
  'post_reflection',
  'post_data_driven',
  'post_question',
  'post_carousel',
  -- Carousel specific
  'carousel_system',
  'carousel_user_template',
  -- Shared base rules
  'base_rules'
);

COMMENT ON TYPE prompt_type IS 'Enumeration of all prompt types used across AI features';

-- ============================================================================
-- 2. Create system_prompts table
-- ============================================================================
-- Main table storing all prompt configurations

CREATE TABLE system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type prompt_type NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE system_prompts IS 'Stores all system prompts for AI features with version control';
COMMENT ON COLUMN system_prompts.type IS 'The category/type of prompt (remix tone, post type, etc.)';
COMMENT ON COLUMN system_prompts.name IS 'Human-readable name for the prompt';
COMMENT ON COLUMN system_prompts.description IS 'Optional description explaining the prompt purpose';
COMMENT ON COLUMN system_prompts.content IS 'The actual prompt template text';
COMMENT ON COLUMN system_prompts.variables IS 'JSON array of variable definitions for template substitution';
COMMENT ON COLUMN system_prompts.version IS 'Current version number of the prompt';
COMMENT ON COLUMN system_prompts.is_active IS 'Whether this prompt is the currently active one for its type';
COMMENT ON COLUMN system_prompts.is_default IS 'Whether this is the system default prompt for its type';

-- Unique partial index: only one active prompt per type
CREATE UNIQUE INDEX idx_unique_active_per_type
  ON system_prompts (type)
  WHERE is_active = true;

-- Indexes for performance
CREATE INDEX idx_prompts_type ON system_prompts(type);
CREATE INDEX idx_prompts_active ON system_prompts(is_active) WHERE is_active = true;
CREATE INDEX idx_prompts_default ON system_prompts(is_default) WHERE is_default = true;
CREATE INDEX idx_prompts_created_by ON system_prompts(created_by);

-- ============================================================================
-- 3. Create prompt_versions table
-- ============================================================================
-- Version history for audit trail and rollback capability

CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES system_prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  change_notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE prompt_versions IS 'Stores version history for prompts to enable rollback and audit trails';
COMMENT ON COLUMN prompt_versions.prompt_id IS 'Reference to the parent prompt';
COMMENT ON COLUMN prompt_versions.version IS 'Version number (incremental)';
COMMENT ON COLUMN prompt_versions.content IS 'The prompt content at this version';
COMMENT ON COLUMN prompt_versions.variables IS 'Variable definitions at this version';
COMMENT ON COLUMN prompt_versions.change_notes IS 'Optional notes describing what changed in this version';

-- Unique constraint on prompt_id + version combination
CREATE UNIQUE INDEX idx_unique_version_per_prompt
  ON prompt_versions (prompt_id, version);

-- Index for fetching version history
CREATE INDEX idx_versions_prompt ON prompt_versions(prompt_id, version DESC);

-- ============================================================================
-- 4. Create prompt_usage_logs table
-- ============================================================================
-- Track prompt usage for analytics and optimization

CREATE TABLE prompt_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES system_prompts(id) ON DELETE SET NULL,
  prompt_type prompt_type NOT NULL,
  prompt_version INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature VARCHAR(50) NOT NULL, -- 'remix', 'compose', 'carousel', 'playground'
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  model VARCHAR(100),
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE prompt_usage_logs IS 'Tracks prompt usage across all AI features for analytics';
COMMENT ON COLUMN prompt_usage_logs.prompt_id IS 'Reference to the prompt used (nullable for fallback scenarios)';
COMMENT ON COLUMN prompt_usage_logs.prompt_type IS 'The type of prompt used';
COMMENT ON COLUMN prompt_usage_logs.prompt_version IS 'The version of the prompt at time of use';
COMMENT ON COLUMN prompt_usage_logs.feature IS 'Which feature used the prompt: remix, compose, carousel, playground';
COMMENT ON COLUMN prompt_usage_logs.input_tokens IS 'Number of input tokens consumed';
COMMENT ON COLUMN prompt_usage_logs.output_tokens IS 'Number of output tokens generated';
COMMENT ON COLUMN prompt_usage_logs.total_tokens IS 'Total tokens consumed';
COMMENT ON COLUMN prompt_usage_logs.model IS 'AI model used (e.g., gpt-4, gpt-3.5-turbo)';
COMMENT ON COLUMN prompt_usage_logs.response_time_ms IS 'API response time in milliseconds';
COMMENT ON COLUMN prompt_usage_logs.success IS 'Whether the API call succeeded';
COMMENT ON COLUMN prompt_usage_logs.error_message IS 'Error message if the call failed';
COMMENT ON COLUMN prompt_usage_logs.metadata IS 'Additional context data as JSON';

-- Indexes for analytics queries
CREATE INDEX idx_usage_prompt ON prompt_usage_logs(prompt_id);
CREATE INDEX idx_usage_type ON prompt_usage_logs(prompt_type);
CREATE INDEX idx_usage_feature ON prompt_usage_logs(feature);
CREATE INDEX idx_usage_created ON prompt_usage_logs(created_at DESC);
CREATE INDEX idx_usage_user ON prompt_usage_logs(user_id);
CREATE INDEX idx_usage_success ON prompt_usage_logs(success);

-- ============================================================================
-- 5. Create prompt_test_results table
-- ============================================================================
-- Store playground test results for comparison and optimization

CREATE TABLE prompt_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES system_prompts(id) ON DELETE CASCADE,
  prompt_version INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}',
  model VARCHAR(100) NOT NULL,
  temperature DECIMAL(3, 2),
  max_tokens INTEGER,
  response_content TEXT NOT NULL,
  tokens_used INTEGER,
  estimated_cost DECIMAL(10, 6),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE prompt_test_results IS 'Stores test results from the Prompt Playground for comparison and optimization';
COMMENT ON COLUMN prompt_test_results.prompt_id IS 'Reference to the prompt being tested';
COMMENT ON COLUMN prompt_test_results.prompt_version IS 'Version of the prompt at time of test';
COMMENT ON COLUMN prompt_test_results.system_prompt IS 'The complete system prompt used in the test';
COMMENT ON COLUMN prompt_test_results.user_prompt IS 'The user/input prompt used in the test';
COMMENT ON COLUMN prompt_test_results.variables IS 'Variable values used in the test';
COMMENT ON COLUMN prompt_test_results.model IS 'AI model used for the test';
COMMENT ON COLUMN prompt_test_results.temperature IS 'Temperature setting used (0.00-2.00)';
COMMENT ON COLUMN prompt_test_results.max_tokens IS 'Maximum tokens limit for the response';
COMMENT ON COLUMN prompt_test_results.response_content IS 'The AI-generated response';
COMMENT ON COLUMN prompt_test_results.tokens_used IS 'Actual tokens consumed';
COMMENT ON COLUMN prompt_test_results.estimated_cost IS 'Estimated cost in USD';
COMMENT ON COLUMN prompt_test_results.rating IS 'User rating of the response quality (1-5)';
COMMENT ON COLUMN prompt_test_results.notes IS 'User notes about the test result';

-- Indexes for test results
CREATE INDEX idx_test_results_prompt ON prompt_test_results(prompt_id);
CREATE INDEX idx_test_results_user ON prompt_test_results(user_id);
CREATE INDEX idx_test_results_created ON prompt_test_results(created_at DESC);
CREATE INDEX idx_test_results_rating ON prompt_test_results(rating) WHERE rating IS NOT NULL;

-- ============================================================================
-- 6. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_test_results ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS Policies for system_prompts
-- ============================================================================

-- Anyone can read active or default prompts
CREATE POLICY "Anyone can read active or default prompts"
  ON system_prompts
  FOR SELECT
  USING (is_active = true OR is_default = true);

-- Admins can manage all prompts (CRUD)
CREATE POLICY "Admins can manage prompts"
  ON system_prompts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================================================
-- 8. RLS Policies for prompt_versions
-- ============================================================================

-- Anyone can read versions
CREATE POLICY "Anyone can read versions"
  ON prompt_versions
  FOR SELECT
  USING (true);

-- Admins can create versions
CREATE POLICY "Admins can create versions"
  ON prompt_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================================================
-- 9. RLS Policies for prompt_usage_logs
-- ============================================================================

-- Users can read their own usage logs
CREATE POLICY "Users can read own usage"
  ON prompt_usage_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can read all usage logs
CREATE POLICY "Admins can read all usage"
  ON prompt_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Allow all authenticated users to insert usage logs (for system logging)
CREATE POLICY "System can log usage"
  ON prompt_usage_logs
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 10. RLS Policies for prompt_test_results
-- ============================================================================

-- Users can manage their own test results
CREATE POLICY "Users can manage own test results"
  ON prompt_test_results
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can read all test results
CREATE POLICY "Admins can read all test results"
  ON prompt_test_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================================================
-- 11. Trigger for auto-updating updated_at
-- ============================================================================

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at column on row modification';

-- Apply trigger to system_prompts
CREATE TRIGGER trigger_system_prompts_updated_at
  BEFORE UPDATE ON system_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 12. Helper function to deactivate other prompts when activating one
-- ============================================================================

CREATE OR REPLACE FUNCTION deactivate_other_prompts()
RETURNS TRIGGER AS $$
BEGIN
  -- When a prompt is being activated, deactivate all other prompts of the same type
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    UPDATE system_prompts
    SET is_active = false, updated_at = NOW()
    WHERE type = NEW.type
    AND id != NEW.id
    AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION deactivate_other_prompts() IS 'Ensures only one prompt per type is active by deactivating others';

-- Apply trigger for activation
CREATE TRIGGER trigger_deactivate_other_prompts
  BEFORE INSERT OR UPDATE ON system_prompts
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_other_prompts();

-- ============================================================================
-- 13. Helper function to auto-create version entry on prompt update
-- ============================================================================

CREATE OR REPLACE FUNCTION create_prompt_version_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if content or variables changed
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.variables IS DISTINCT FROM NEW.variables THEN
    INSERT INTO prompt_versions (
      prompt_id,
      version,
      content,
      variables,
      change_notes,
      created_by
    ) VALUES (
      NEW.id,
      NEW.version,
      NEW.content,
      NEW.variables,
      'Auto-saved on update',
      NEW.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_prompt_version_on_update() IS 'Automatically creates a version entry when prompt content changes';

-- Apply trigger for version creation
CREATE TRIGGER trigger_create_prompt_version
  AFTER UPDATE ON system_prompts
  FOR EACH ROW
  EXECUTE FUNCTION create_prompt_version_on_update();

-- ============================================================================
-- Migration Complete
-- ============================================================================
