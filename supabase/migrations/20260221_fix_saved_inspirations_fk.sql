-- Fix saved_inspirations foreign key constraint
-- The FK was pointing to the empty inspiration_posts table instead of
-- linkedin_research_posts where the actual data lives
ALTER TABLE saved_inspirations
DROP CONSTRAINT IF EXISTS saved_inspirations_inspiration_post_id_fkey;

ALTER TABLE saved_inspirations
ADD CONSTRAINT saved_inspirations_inspiration_post_id_fkey
FOREIGN KEY (inspiration_post_id) REFERENCES linkedin_research_posts(id) ON DELETE CASCADE;
