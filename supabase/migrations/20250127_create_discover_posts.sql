-- Create discover_posts table for the Discover tab content feed
-- Stores curated/scraped LinkedIn posts for industry trend discovery

CREATE TABLE IF NOT EXISTS public.discover_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linkedin_url TEXT NOT NULL UNIQUE,
  author_name TEXT NOT NULL,
  author_headline TEXT NOT NULL DEFAULT '',
  author_avatar_url TEXT,
  author_profile_url TEXT,
  content TEXT NOT NULL,
  post_type TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  reposts_count INTEGER NOT NULL DEFAULT 0,
  impressions_count INTEGER,
  posted_at TIMESTAMPTZ NOT NULL,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  topics TEXT[] NOT NULL DEFAULT '{}',
  is_viral BOOLEAN NOT NULL DEFAULT false,
  engagement_rate NUMERIC(6,2),
  source TEXT NOT NULL DEFAULT 'apify'
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_discover_posts_topics ON public.discover_posts USING GIN (topics);
CREATE INDEX IF NOT EXISTS idx_discover_posts_posted_at ON public.discover_posts (posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_discover_posts_engagement_rate ON public.discover_posts (engagement_rate DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_discover_posts_is_viral ON public.discover_posts (is_viral) WHERE is_viral = true;
CREATE INDEX IF NOT EXISTS idx_discover_posts_linkedin_url ON public.discover_posts (linkedin_url);

-- Enable Row Level Security
ALTER TABLE public.discover_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can read discover posts (shared content)
CREATE POLICY "Authenticated users can read discover posts"
  ON public.discover_posts
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert (for import API)
CREATE POLICY "Authenticated users can insert discover posts"
  ON public.discover_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update (for import API upserts)
CREATE POLICY "Authenticated users can update discover posts"
  ON public.discover_posts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
