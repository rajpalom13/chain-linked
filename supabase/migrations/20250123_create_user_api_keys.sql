-- User API Keys Table Migration (for BYOK - Bring Your Own Key)
-- Run this in Supabase SQL Editor

-- ============================================
-- USER API KEYS (Encrypted storage for user-provided API keys)
-- ============================================
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL DEFAULT 'openai', -- 'openai', 'anthropic', etc.
    encrypted_key TEXT NOT NULL,
    key_hint TEXT, -- Last 4 characters of the key for display
    is_valid BOOLEAN DEFAULT true,
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(user_id, provider);

-- Enable RLS
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_api_keys
-- Users can only access their own API keys

-- SELECT policy
DROP POLICY IF EXISTS "user_api_keys_select_policy" ON user_api_keys;
CREATE POLICY "user_api_keys_select_policy" ON user_api_keys
    FOR SELECT USING (auth.uid() = user_id);

-- INSERT policy
DROP POLICY IF EXISTS "user_api_keys_insert_policy" ON user_api_keys;
CREATE POLICY "user_api_keys_insert_policy" ON user_api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
DROP POLICY IF EXISTS "user_api_keys_update_policy" ON user_api_keys;
CREATE POLICY "user_api_keys_update_policy" ON user_api_keys
    FOR UPDATE USING (auth.uid() = user_id);

-- DELETE policy
DROP POLICY IF EXISTS "user_api_keys_delete_policy" ON user_api_keys;
CREATE POLICY "user_api_keys_delete_policy" ON user_api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON user_api_keys;
CREATE TRIGGER update_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE user_api_keys IS 'Encrypted storage for user-provided API keys (BYOK)';
