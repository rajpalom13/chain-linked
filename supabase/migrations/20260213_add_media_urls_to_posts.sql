-- Add media_urls column to my_posts and feed_posts tables
-- Stores Supabase Storage URLs for persisted LinkedIn media

-- Add media_urls to my_posts
ALTER TABLE my_posts
  ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT NULL;

-- Add media_urls to feed_posts
ALTER TABLE feed_posts
  ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT NULL;

-- Create index for querying posts with media
CREATE INDEX IF NOT EXISTS idx_my_posts_has_media ON my_posts ((media_urls IS NOT NULL)) WHERE media_urls IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feed_posts_has_media ON feed_posts ((media_urls IS NOT NULL)) WHERE media_urls IS NOT NULL;

-- Create Supabase Storage bucket for post media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for post-media bucket
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload post media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to read post media (public bucket)
CREATE POLICY "Public read access for post media" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'post-media');

-- Allow users to delete their own media
CREATE POLICY "Users can delete own post media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
