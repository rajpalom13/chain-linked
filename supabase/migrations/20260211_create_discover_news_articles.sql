-- Create discover_news_articles table for Perplexity-sourced news feed
-- This is separate from discover_posts which is LinkedIn-post-centric

CREATE TABLE IF NOT EXISTS public.discover_news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  published_date TIMESTAMPTZ,
  relevance_tags TEXT[] NOT NULL DEFAULT '{}',
  topic TEXT NOT NULL,
  ingest_batch_id UUID,
  freshness TEXT NOT NULL DEFAULT 'new',
  perplexity_citations TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(source_url, topic)
);

-- Indexes for efficient querying
CREATE INDEX idx_news_articles_topic ON public.discover_news_articles (topic);
CREATE INDEX idx_news_articles_created_at ON public.discover_news_articles (created_at DESC);
CREATE INDEX idx_news_articles_freshness ON public.discover_news_articles (freshness);
CREATE INDEX idx_news_articles_ingest_batch ON public.discover_news_articles (ingest_batch_id);
CREATE INDEX idx_news_articles_relevance_tags ON public.discover_news_articles USING GIN (relevance_tags);

-- RLS
ALTER TABLE public.discover_news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read news articles"
  ON public.discover_news_articles FOR SELECT
  TO authenticated USING (true);
