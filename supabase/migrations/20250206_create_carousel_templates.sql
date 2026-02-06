-- Create carousel_templates table for saving custom carousel designs
CREATE TABLE IF NOT EXISTS carousel_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID DEFAULT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  slides JSONB NOT NULL,
  brand_colors JSONB DEFAULT '[]'::jsonb,
  fonts JSONB DEFAULT '[]'::jsonb,
  thumbnail TEXT DEFAULT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_carousel_templates_user_id ON carousel_templates(user_id);
CREATE INDEX idx_carousel_templates_category ON carousel_templates(category);

-- RLS
ALTER TABLE carousel_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON carousel_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public templates" ON carousel_templates FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert own templates" ON carousel_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON carousel_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON carousel_templates FOR DELETE USING (auth.uid() = user_id);
