-- Add source column to generated_posts to track draft origin
-- Values: compose, swipe, inspiration, carousel, discover, research
ALTER TABLE generated_posts
ADD COLUMN IF NOT EXISTS source text DEFAULT 'compose';

-- Backfill existing records based on foreign keys
UPDATE generated_posts SET source = 'research' WHERE research_session_id IS NOT NULL AND source = 'compose';
UPDATE generated_posts SET source = 'discover' WHERE discover_post_id IS NOT NULL AND source = 'compose';
