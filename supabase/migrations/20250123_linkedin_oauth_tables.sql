-- LinkedIn OAuth & API Keys Tables Migration
-- Run this SQL in Supabase SQL Editor: https://supabase.com/dashboard
-- Go to: SQL Editor > New Query > Paste this > Run

-- ============================================
-- 1. LINKEDIN TOKENS (OAuth tokens for API access)
-- ============================================
CREATE TABLE IF NOT EXISTS linkedin_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    linkedin_urn TEXT,
    scopes TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_linkedin_tokens_user_id ON linkedin_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_tokens_expires_at ON linkedin_tokens(expires_at);

-- Enable RLS
ALTER TABLE linkedin_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for linkedin_tokens
DROP POLICY IF EXISTS "linkedin_tokens_select_policy" ON linkedin_tokens;
CREATE POLICY "linkedin_tokens_select_policy" ON linkedin_tokens
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "linkedin_tokens_insert_policy" ON linkedin_tokens;
CREATE POLICY "linkedin_tokens_insert_policy" ON linkedin_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "linkedin_tokens_update_policy" ON linkedin_tokens;
CREATE POLICY "linkedin_tokens_update_policy" ON linkedin_tokens
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "linkedin_tokens_delete_policy" ON linkedin_tokens;
CREATE POLICY "linkedin_tokens_delete_policy" ON linkedin_tokens
    FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE linkedin_tokens IS 'LinkedIn OAuth tokens for API access (posting, etc.)';

-- ============================================
-- 2. USER API KEYS (BYOK - Bring Your Own Key)
-- ============================================
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL DEFAULT 'openai',
    encrypted_key TEXT NOT NULL,
    key_hint TEXT,
    is_valid BOOLEAN DEFAULT true,
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(user_id, provider);

-- Enable RLS
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_api_keys
DROP POLICY IF EXISTS "user_api_keys_select_policy" ON user_api_keys;
CREATE POLICY "user_api_keys_select_policy" ON user_api_keys
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_api_keys_insert_policy" ON user_api_keys;
CREATE POLICY "user_api_keys_insert_policy" ON user_api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_api_keys_update_policy" ON user_api_keys;
CREATE POLICY "user_api_keys_update_policy" ON user_api_keys
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_api_keys_delete_policy" ON user_api_keys;
CREATE POLICY "user_api_keys_delete_policy" ON user_api_keys
    FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE user_api_keys IS 'Encrypted storage for user-provided API keys (BYOK)';

-- ============================================
-- 3. UPDATED_AT TRIGGERS
-- ============================================
-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
DROP TRIGGER IF EXISTS update_linkedin_tokens_updated_at ON linkedin_tokens;
CREATE TRIGGER update_linkedin_tokens_updated_at
    BEFORE UPDATE ON linkedin_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON user_api_keys;
CREATE TRIGGER update_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE! Tables created successfully.
-- ============================================
