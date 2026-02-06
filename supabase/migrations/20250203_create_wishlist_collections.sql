-- Migration: Create Wishlist Collections
-- Description: Adds support for multiple named wishlists (like Instagram collections)
-- Date: 2025-02-03

-- ============================================================================
-- Create wishlist_collections table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wishlist_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  emoji_icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#6366f1', -- Default indigo color
  item_count INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraint for user + collection name
CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_collections_user_name
  ON public.wishlist_collections(user_id, name);

-- Add index for querying user's collections
CREATE INDEX IF NOT EXISTS idx_wishlist_collections_user_id
  ON public.wishlist_collections(user_id);

-- Add comment
COMMENT ON TABLE public.wishlist_collections IS 'User-created collections/folders for organizing wishlisted posts (like Instagram save folders)';

-- ============================================================================
-- Add collection_id column to swipe_wishlist table
-- ============================================================================

ALTER TABLE public.swipe_wishlist
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.wishlist_collections(id) ON DELETE SET NULL;

-- Add index for querying items by collection
CREATE INDEX IF NOT EXISTS idx_swipe_wishlist_collection_id
  ON public.swipe_wishlist(collection_id);

-- Add combined index for user + collection queries
CREATE INDEX IF NOT EXISTS idx_swipe_wishlist_user_collection
  ON public.swipe_wishlist(user_id, collection_id);

-- ============================================================================
-- Create function to update item_count on wishlist_collections
-- ============================================================================

CREATE OR REPLACE FUNCTION update_collection_item_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update old collection count if moving from one collection
  IF TG_OP = 'UPDATE' AND OLD.collection_id IS DISTINCT FROM NEW.collection_id THEN
    IF OLD.collection_id IS NOT NULL THEN
      UPDATE public.wishlist_collections
      SET item_count = (
        SELECT COUNT(*) FROM public.swipe_wishlist
        WHERE collection_id = OLD.collection_id AND status != 'removed'
      ),
      updated_at = now()
      WHERE id = OLD.collection_id;
    END IF;
  END IF;

  -- Update new collection count
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.collection_id IS NOT NULL THEN
      UPDATE public.wishlist_collections
      SET item_count = (
        SELECT COUNT(*) FROM public.swipe_wishlist
        WHERE collection_id = NEW.collection_id AND status != 'removed'
      ),
      updated_at = now()
      WHERE id = NEW.collection_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle delete
  IF TG_OP = 'DELETE' THEN
    IF OLD.collection_id IS NOT NULL THEN
      UPDATE public.wishlist_collections
      SET item_count = (
        SELECT COUNT(*) FROM public.swipe_wishlist
        WHERE collection_id = OLD.collection_id AND status != 'removed'
      ),
      updated_at = now()
      WHERE id = OLD.collection_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for item count updates
DROP TRIGGER IF EXISTS trigger_update_collection_item_count ON public.swipe_wishlist;
CREATE TRIGGER trigger_update_collection_item_count
  AFTER INSERT OR UPDATE OR DELETE ON public.swipe_wishlist
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_item_count();

-- ============================================================================
-- Create function to auto-create default collection for users
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_wishlist_collection()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wishlist_collections (user_id, name, description, emoji_icon, is_default)
  VALUES (NEW.id, 'All Saved', 'Default collection for all saved posts', '⭐', true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create default collection when user is created
DROP TRIGGER IF EXISTS trigger_create_default_collection ON auth.users;
CREATE TRIGGER trigger_create_default_collection
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_wishlist_collection();

-- ============================================================================
-- Create default collections for existing users
-- ============================================================================

INSERT INTO public.wishlist_collections (user_id, name, description, emoji_icon, is_default)
SELECT id, 'All Saved', 'Default collection for all saved posts', '⭐', true
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.wishlist_collections WHERE is_default = true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Enable RLS on wishlist_collections
-- ============================================================================

ALTER TABLE public.wishlist_collections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own collections
CREATE POLICY "Users can view own collections"
  ON public.wishlist_collections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own collections
CREATE POLICY "Users can insert own collections"
  ON public.wishlist_collections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own collections
CREATE POLICY "Users can update own collections"
  ON public.wishlist_collections
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own collections (except default)
CREATE POLICY "Users can delete own non-default collections"
  ON public.wishlist_collections
  FOR DELETE
  USING (auth.uid() = user_id AND is_default = false);
