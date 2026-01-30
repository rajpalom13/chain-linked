-- Create research_sessions table for tracking deep research workflows
-- Used by the Inngest deep research workflow

CREATE TABLE IF NOT EXISTS public.research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Research configuration
  topics TEXT[] NOT NULL,
  depth TEXT NOT NULL DEFAULT 'basic',

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status values: pending, initializing, searching, enriching, generating, saving, completed, failed

  -- Results
  posts_discovered INTEGER DEFAULT 0,
  posts_generated INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  failed_step TEXT,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Inngest tracking
  inngest_run_id TEXT
);

-- Indexes for research_sessions
CREATE INDEX IF NOT EXISTS idx_research_sessions_user ON public.research_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_status ON public.research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_research_sessions_created ON public.research_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for research_sessions
CREATE POLICY "Users can view their own research sessions"
  ON public.research_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own research sessions"
  ON public.research_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own research sessions"
  ON public.research_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for Inngest background jobs)
CREATE POLICY "Service role full access to research_sessions"
  ON public.research_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- Create generated_posts table for AI-generated LinkedIn post drafts
CREATE TABLE IF NOT EXISTS public.generated_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discover_post_id UUID REFERENCES public.discover_posts(id) ON DELETE SET NULL,
  research_session_id UUID REFERENCES public.research_sessions(id) ON DELETE SET NULL,

  -- Content
  content TEXT NOT NULL,
  post_type TEXT NOT NULL, -- thought-leadership, storytelling, educational, contrarian, data-driven, how-to, listicle
  hook TEXT, -- Opening line
  cta TEXT, -- Call to action

  -- Metadata
  word_count INTEGER,
  estimated_read_time INTEGER, -- seconds

  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, posted, archived

  -- Source tracking
  source_url TEXT,
  source_title TEXT,
  source_snippet TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for generated_posts
CREATE INDEX IF NOT EXISTS idx_generated_posts_user ON public.generated_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_posts_session ON public.generated_posts(research_session_id);
CREATE INDEX IF NOT EXISTS idx_generated_posts_status ON public.generated_posts(status);
CREATE INDEX IF NOT EXISTS idx_generated_posts_type ON public.generated_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_generated_posts_created ON public.generated_posts(created_at DESC);

-- Enable RLS
ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generated_posts
CREATE POLICY "Users can view their own generated posts"
  ON public.generated_posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated posts"
  ON public.generated_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated posts"
  ON public.generated_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated posts"
  ON public.generated_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can do everything (for Inngest background jobs)
CREATE POLICY "Service role full access to generated_posts"
  ON public.generated_posts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS research_sessions_updated_at ON public.research_sessions;
CREATE TRIGGER research_sessions_updated_at
  BEFORE UPDATE ON public.research_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS generated_posts_updated_at ON public.generated_posts;
CREATE TRIGGER generated_posts_updated_at
  BEFORE UPDATE ON public.generated_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
