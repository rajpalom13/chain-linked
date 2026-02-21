-- Create template_favorites table for persisting user template favorites
-- Supports both built-in template IDs (string) and saved template UUIDs
CREATE TABLE IF NOT EXISTS template_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, template_id)
);

-- Indexes
CREATE INDEX idx_template_favorites_user_id ON template_favorites(user_id);

-- RLS
ALTER TABLE template_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites" ON template_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON template_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON template_favorites FOR DELETE USING (auth.uid() = user_id);
