-- Swipe Suggestions Feature Migration
-- Creates tables for AI-generated post suggestions, wishlist, and generation tracking
-- Dependencies: auth.users, company_context, scheduled_posts

-- ============================================================================
-- Table: generated_suggestions
-- Stores AI-generated post suggestions personalized to each user
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.generated_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,
  post_type VARCHAR(50), -- 'story', 'listicle', 'how-to', 'case-study', 'contrarian', 'question', 'data-driven'
  tone VARCHAR(50), -- 'professional', 'casual', 'inspiring', etc.
  category VARCHAR(100), -- Topic category for filtering

  -- Generation metadata
  prompt_context JSONB, -- Snapshot of company context used for generation
  generation_batch_id UUID, -- Groups suggestions from same generation run
  estimated_engagement INTEGER CHECK (estimated_engagement >= 0 AND estimated_engagement <= 100),

  -- Status tracking
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'dismissed', 'expired')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,

  -- Unique constraint to prevent duplicate content per user
  CONSTRAINT unique_suggestion_content_per_user UNIQUE (user_id, content)
);

-- Indexes for generated_suggestions
CREATE INDEX IF NOT EXISTS idx_generated_suggestions_user_status
  ON public.generated_suggestions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_generated_suggestions_batch
  ON public.generated_suggestions(generation_batch_id);

CREATE INDEX IF NOT EXISTS idx_generated_suggestions_expires
  ON public.generated_suggestions(expires_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_generated_suggestions_user_created
  ON public.generated_suggestions(user_id, created_at DESC);

-- Table comment
COMMENT ON TABLE public.generated_suggestions IS 'AI-generated post suggestions personalized to each user based on their company context';

-- ============================================================================
-- Table: swipe_wishlist
-- Stores liked suggestions for later review, scheduling, or posting
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.swipe_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_id UUID REFERENCES public.generated_suggestions(id) ON DELETE SET NULL,

  -- Content (stored separately so it persists when suggestion is deleted/expired)
  content TEXT NOT NULL,
  post_type VARCHAR(50),
  category VARCHAR(100),

  -- User actions
  notes TEXT, -- User's personal notes about the saved suggestion
  is_scheduled BOOLEAN DEFAULT FALSE,
  scheduled_post_id UUID REFERENCES public.scheduled_posts(id) ON DELETE SET NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'saved' CHECK (status IN ('saved', 'scheduled', 'posted', 'removed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint to prevent duplicate wishlist items
  CONSTRAINT unique_wishlist_item_per_user UNIQUE (user_id, content)
);

-- Indexes for swipe_wishlist
CREATE INDEX IF NOT EXISTS idx_swipe_wishlist_user_status
  ON public.swipe_wishlist(user_id, status);

CREATE INDEX IF NOT EXISTS idx_swipe_wishlist_user_created
  ON public.swipe_wishlist(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_swipe_wishlist_scheduled
  ON public.swipe_wishlist(scheduled_post_id)
  WHERE scheduled_post_id IS NOT NULL;

-- Table comment
COMMENT ON TABLE public.swipe_wishlist IS 'Stores liked post suggestions for later scheduling or posting';

-- ============================================================================
-- Table: suggestion_generation_runs
-- Tracks generation job runs for audit, debugging, and rate limiting
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.suggestion_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Run metadata
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  suggestions_requested INTEGER DEFAULT 10,
  suggestions_generated INTEGER DEFAULT 0,

  -- Context used for generation
  company_context_id UUID REFERENCES public.company_context(id) ON DELETE SET NULL,
  post_types_used TEXT[], -- Array of post types used in generation

  -- Tracking
  inngest_run_id VARCHAR(255), -- Inngest workflow run ID for debugging
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for suggestion_generation_runs
CREATE INDEX IF NOT EXISTS idx_suggestion_generation_runs_user_status
  ON public.suggestion_generation_runs(user_id, status);

CREATE INDEX IF NOT EXISTS idx_suggestion_generation_runs_user_created
  ON public.suggestion_generation_runs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suggestion_generation_runs_inngest
  ON public.suggestion_generation_runs(inngest_run_id)
  WHERE inngest_run_id IS NOT NULL;

-- Partial unique index to prevent multiple concurrent runs per user
-- This ensures only one pending or generating run per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_suggestion_generation_runs_active_per_user
  ON public.suggestion_generation_runs(user_id)
  WHERE status IN ('pending', 'generating');

-- Table comment
COMMENT ON TABLE public.suggestion_generation_runs IS 'Tracks AI suggestion generation job runs for audit and rate limiting';

-- ============================================================================
-- RLS Policies: generated_suggestions
-- ============================================================================

ALTER TABLE public.generated_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can view their own suggestions
CREATE POLICY "Users can view own suggestions"
  ON public.generated_suggestions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own suggestions (mark as used, dismissed, etc.)
CREATE POLICY "Users can update own suggestions"
  ON public.generated_suggestions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own suggestions
CREATE POLICY "Users can delete own suggestions"
  ON public.generated_suggestions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can insert suggestions (for Inngest background jobs)
-- Note: Service role bypasses RLS by default, but we add explicit policy for clarity
CREATE POLICY "Service role can insert suggestions"
  ON public.generated_suggestions
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- RLS Policies: swipe_wishlist
-- ============================================================================

ALTER TABLE public.swipe_wishlist ENABLE ROW LEVEL SECURITY;

-- Users can manage their own wishlist items (full access)
CREATE POLICY "Users can view own wishlist"
  ON public.swipe_wishlist
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlist items"
  ON public.swipe_wishlist
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wishlist items"
  ON public.swipe_wishlist
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist items"
  ON public.swipe_wishlist
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS Policies: suggestion_generation_runs
-- ============================================================================

ALTER TABLE public.suggestion_generation_runs ENABLE ROW LEVEL SECURITY;

-- Users can view their own generation runs
CREATE POLICY "Users can view own generation runs"
  ON public.suggestion_generation_runs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own generation runs (to trigger generation)
CREATE POLICY "Users can insert own generation runs"
  ON public.suggestion_generation_runs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update generation runs (for Inngest background jobs)
-- Note: Service role bypasses RLS by default, but we add explicit policy for clarity
CREATE POLICY "Service role can update generation runs"
  ON public.suggestion_generation_runs
  FOR UPDATE
  WITH CHECK (true);

-- ============================================================================
-- Triggers: Auto-update updated_at timestamps
-- ============================================================================

-- Trigger function for swipe_wishlist updated_at
CREATE OR REPLACE FUNCTION public.update_swipe_wishlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_swipe_wishlist_updated_at
  BEFORE UPDATE ON public.swipe_wishlist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_swipe_wishlist_updated_at();

-- ============================================================================
-- Helper function: Expire old suggestions
-- Can be called via pg_cron or manually to clean up expired suggestions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.expire_old_suggestions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.generated_suggestions
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.expire_old_suggestions IS 'Marks active suggestions as expired if past their expiration date. Returns count of expired suggestions.';

-- ============================================================================
-- Helper function: Get active suggestion count for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_active_suggestion_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  suggestion_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO suggestion_count
  FROM public.generated_suggestions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND expires_at > NOW();

  RETURN suggestion_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_active_suggestion_count IS 'Returns the count of active, non-expired suggestions for a user.';

-- ============================================================================
-- Helper function: Check if user can generate new suggestions
-- Returns true if user has fewer than 10 active suggestions and no pending runs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_user_generate_suggestions(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  active_count INTEGER;
  pending_run_exists BOOLEAN;
BEGIN
  -- Check active suggestion count
  SELECT public.get_active_suggestion_count(p_user_id) INTO active_count;

  -- Check for pending/generating runs
  SELECT EXISTS (
    SELECT 1
    FROM public.suggestion_generation_runs
    WHERE user_id = p_user_id
      AND status IN ('pending', 'generating')
  ) INTO pending_run_exists;

  -- User can generate if they have < 10 active suggestions and no pending runs
  RETURN active_count < 10 AND NOT pending_run_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_user_generate_suggestions IS 'Checks if a user is eligible to generate new suggestions (< 10 active, no pending runs).';
