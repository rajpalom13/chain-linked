-- ============================================
-- Fix: Add UNIQUE constraints to my_posts and feed_posts
-- ============================================
-- The extension sync bridge uses UPSERT with onConflict: 'user_id,activity_urn'
-- but the original migration never created the corresponding UNIQUE constraints.
-- Without them, PostgreSQL silently inserts duplicates instead of updating.
--
-- This migration:
-- 1. Deduplicates existing rows (keeps the most recently updated one)
-- 2. Adds the missing UNIQUE constraints
-- 3. Adds an updated_at trigger for automatic timestamp updates on upsert
-- ============================================

-- Step 1: Deduplicate my_posts (keep the row with the latest updated_at)
DELETE FROM public.my_posts
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, activity_urn) id
  FROM public.my_posts
  ORDER BY user_id, activity_urn, updated_at DESC NULLS LAST
);

-- Step 2: Add UNIQUE constraint to my_posts
ALTER TABLE public.my_posts
  ADD CONSTRAINT my_posts_user_activity_unique UNIQUE (user_id, activity_urn);

-- Step 3: Deduplicate feed_posts
DELETE FROM public.feed_posts
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, activity_urn) id
  FROM public.feed_posts
  ORDER BY user_id, activity_urn, updated_at DESC NULLS LAST
);

-- Step 4: Add UNIQUE constraint to feed_posts
ALTER TABLE public.feed_posts
  ADD CONSTRAINT feed_posts_user_activity_unique UNIQUE (user_id, activity_urn);

-- Step 5: Create trigger function to auto-update updated_at on upsert
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Attach trigger to my_posts
DROP TRIGGER IF EXISTS my_posts_updated_at ON public.my_posts;
CREATE TRIGGER my_posts_updated_at
  BEFORE UPDATE ON public.my_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Step 7: Attach trigger to feed_posts
DROP TRIGGER IF EXISTS feed_posts_updated_at ON public.feed_posts;
CREATE TRIGGER feed_posts_updated_at
  BEFORE UPDATE ON public.feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
