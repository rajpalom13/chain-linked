-- Migration: Discover Topics + Writing Style Profiles
-- Adds topic selection tracking to profiles, creates writing_style_profiles table,
-- and adds ingest columns to discover_posts

-- 1. Add discover topic columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discover_topics_selected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS discover_topics TEXT[] DEFAULT '{}';

-- 2. Create writing_style_profiles table
CREATE TABLE IF NOT EXISTS writing_style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avg_sentence_length NUMERIC,
  vocabulary_level TEXT,
  tone TEXT,
  formatting_style JSONB DEFAULT '{}',
  hook_patterns TEXT[] DEFAULT '{}',
  emoji_usage TEXT,
  cta_patterns TEXT[] DEFAULT '{}',
  signature_phrases TEXT[] DEFAULT '{}',
  content_themes TEXT[] DEFAULT '{}',
  raw_analysis JSONB DEFAULT '{}',
  posts_analyzed_count INT DEFAULT 0,
  wishlisted_analyzed_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_refreshed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add ingest columns to discover_posts
ALTER TABLE public.discover_posts
  ADD COLUMN IF NOT EXISTS ingest_batch_id UUID,
  ADD COLUMN IF NOT EXISTS freshness TEXT DEFAULT 'new';

-- 4. RLS policies for writing_style_profiles
ALTER TABLE writing_style_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own writing style"
  ON writing_style_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own writing style"
  ON writing_style_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own writing style"
  ON writing_style_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own writing style"
  ON writing_style_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Auto-update updated_at trigger for writing_style_profiles
CREATE OR REPLACE FUNCTION public.update_writing_style_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_writing_style_updated_at
  BEFORE UPDATE ON public.writing_style_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_writing_style_updated_at();

-- 6. Index for discover_posts freshness queries
CREATE INDEX IF NOT EXISTS idx_discover_posts_freshness ON public.discover_posts(freshness);
CREATE INDEX IF NOT EXISTS idx_discover_posts_ingest_batch ON public.discover_posts(ingest_batch_id);
