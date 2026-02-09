-- ============================================
-- Fix create_default_wishlist_collection trigger
-- Problem: function was NOT SECURITY DEFINER, so it ran as the auth caller role
-- which cannot insert through RLS on wishlist_collections.
-- Also had no EXCEPTION handler, so any error killed the signup transaction.
-- ============================================

CREATE OR REPLACE FUNCTION public.create_default_wishlist_collection()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wishlist_collections (user_id, name, description, emoji_icon, is_default)
  VALUES (NEW.id, 'All Saved', 'Default collection for all saved posts', '⭐', true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_default_wishlist_collection trigger failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
