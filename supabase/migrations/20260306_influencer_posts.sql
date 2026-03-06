-- Influencer posts table for storing scraped posts from followed influencers
CREATE TABLE IF NOT EXISTS public.influencer_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES public.followed_influencers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin_url TEXT,
  content TEXT NOT NULL,
  post_type TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  posted_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT now(),
  quality_score NUMERIC(3,2),
  quality_status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, linkedin_url)
);

ALTER TABLE public.influencer_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own influencer posts"
  ON public.influencer_posts FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for cron jobs)
CREATE POLICY "Service role full access to influencer posts"
  ON public.influencer_posts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_influencer_posts_user ON public.influencer_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_influencer_posts_influencer ON public.influencer_posts(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_posts_linkedin_url ON public.influencer_posts(linkedin_url);
CREATE INDEX IF NOT EXISTS idx_influencer_posts_quality_status ON public.influencer_posts(quality_status);
CREATE INDEX IF NOT EXISTS idx_influencer_posts_posted_at ON public.influencer_posts(posted_at DESC);

-- Viral source profiles for the viral post ingest cron
CREATE TABLE IF NOT EXISTS public.viral_source_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linkedin_url TEXT NOT NULL UNIQUE,
  linkedin_username TEXT,
  display_name TEXT,
  category TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.viral_source_profiles ENABLE ROW LEVEL SECURITY;

-- Only service role can access (used by cron)
CREATE POLICY "Service role full access to viral source profiles"
  ON public.viral_source_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_viral_source_profiles_status ON public.viral_source_profiles(status);

-- Seed viral source profiles across categories
INSERT INTO public.viral_source_profiles (linkedin_url, linkedin_username, display_name, category) VALUES
  ('https://www.linkedin.com/in/justinwelsh', 'justinwelsh', 'Justin Welsh', 'entrepreneurship'),
  ('https://www.linkedin.com/in/garyvaynerchuk', 'garyvaynerchuk', 'Gary Vaynerchuk', 'marketing'),
  ('https://www.linkedin.com/in/neilpatel', 'neilpatel', 'Neil Patel', 'marketing'),
  ('https://www.linkedin.com/in/davegerhardt', 'davegerhardt', 'Dave Gerhardt', 'marketing'),
  ('https://www.linkedin.com/in/chriswalker171', 'chriswalker171', 'Chris Walker', 'marketing'),
  ('https://www.linkedin.com/in/jasonfalkner', 'jasonfalkner', 'Jason Falkner', 'sales'),
  ('https://www.linkedin.com/in/jaborham', 'jaborham', 'Josh Braun', 'sales'),
  ('https://www.linkedin.com/in/mlokeefe', 'mlokeefe', 'Morgan Ingram', 'sales'),
  ('https://www.linkedin.com/in/laborin', 'laborin', 'Lenny Rachitsky', 'product-management'),
  ('https://www.linkedin.com/in/shreyas', 'shreyas', 'Shreyas Doshi', 'product-management'),
  ('https://www.linkedin.com/in/adamnash', 'adamnash', 'Adam Nash', 'leadership'),
  ('https://www.linkedin.com/in/simonsinek', 'simonsinek', 'Simon Sinek', 'leadership'),
  ('https://www.linkedin.com/in/brigettehyacinth', 'brigettehyacinth', 'Brigette Hyacinth', 'leadership'),
  ('https://www.linkedin.com/in/noahkagan', 'noahkagan', 'Noah Kagan', 'entrepreneurship'),
  ('https://www.linkedin.com/in/sahilbloom', 'sahilbloom', 'Sahil Bloom', 'entrepreneurship'),
  ('https://www.linkedin.com/in/alexhormozi', 'alexhormozi', 'Alex Hormozi', 'entrepreneurship'),
  ('https://www.linkedin.com/in/gregisenberg', 'gregisenberg', 'Greg Isenberg', 'startups'),
  ('https://www.linkedin.com/in/emilykramer', 'emilykramer', 'Emily Kramer', 'marketing'),
  ('https://www.linkedin.com/in/nicolascole', 'nicolascole', 'Nicolas Cole', 'content-creation'),
  ('https://www.linkedin.com/in/dickiebush', 'dickiebush', 'Dickie Bush', 'content-creation')
ON CONFLICT (linkedin_url) DO NOTHING;

-- Add service_role INSERT/UPDATE on discover_posts for viral cron
CREATE POLICY "Service role full access to discover posts"
  ON public.discover_posts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
