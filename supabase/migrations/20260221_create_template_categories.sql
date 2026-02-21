-- Create template_categories table for user-defined carousel template categories
-- Categories persist independently of templates so users can create them upfront

CREATE TABLE IF NOT EXISTS template_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, name)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_template_categories_user_id ON template_categories(user_id);
