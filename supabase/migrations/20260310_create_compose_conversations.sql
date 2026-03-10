-- Create compose_conversations table for persisting AI chat conversations
-- Used by both advanced compose mode and post series mode

CREATE TABLE compose_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('advanced', 'series')),
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]',
  tone TEXT DEFAULT 'professional',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_compose_conversations_user ON compose_conversations(user_id);
CREATE INDEX idx_compose_conversations_active ON compose_conversations(user_id, mode, is_active);

ALTER TABLE compose_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations"
  ON compose_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
