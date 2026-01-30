-- Create scheduled_posts table for storing scheduled LinkedIn posts
-- This table stores posts that are scheduled to be published at a future time

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posting', 'posted', 'failed')),
  visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'CONNECTIONS')),
  media_urls TEXT[] DEFAULT NULL,
  linkedin_post_id TEXT DEFAULT NULL,
  posted_at TIMESTAMPTZ DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient querying by user and status
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON scheduled_posts(scheduled_for);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_status ON scheduled_posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_pending ON scheduled_posts(scheduled_for) WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own scheduled posts
CREATE POLICY "Users can view own scheduled posts"
  ON scheduled_posts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own scheduled posts
CREATE POLICY "Users can insert own scheduled posts"
  ON scheduled_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own scheduled posts
CREATE POLICY "Users can update own scheduled posts"
  ON scheduled_posts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own scheduled posts
CREATE POLICY "Users can delete own scheduled posts"
  ON scheduled_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scheduled_posts_updated_at
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_posts_updated_at();

-- Add comment to table
COMMENT ON TABLE scheduled_posts IS 'Stores scheduled LinkedIn posts for users';
