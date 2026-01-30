-- LinkedIn OAuth Tokens Table Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- LINKEDIN TOKENS (OAuth tokens for API access)
-- ============================================
CREATE TABLE IF NOT EXISTS linkedin_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    linkedin_urn TEXT,
    scopes TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint (may fail if users table structure differs)
-- ALTER TABLE linkedin_tokens ADD CONSTRAINT fk_linkedin_tokens_user
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_linkedin_tokens_user_id ON linkedin_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_tokens_expires_at ON linkedin_tokens(expires_at);

-- Enable RLS
ALTER TABLE linkedin_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for linkedin_tokens
-- Users can only access their own tokens

-- SELECT policy
DROP POLICY IF EXISTS "linkedin_tokens_select_policy" ON linkedin_tokens;
CREATE POLICY "linkedin_tokens_select_policy" ON linkedin_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- INSERT policy
DROP POLICY IF EXISTS "linkedin_tokens_insert_policy" ON linkedin_tokens;
CREATE POLICY "linkedin_tokens_insert_policy" ON linkedin_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
DROP POLICY IF EXISTS "linkedin_tokens_update_policy" ON linkedin_tokens;
CREATE POLICY "linkedin_tokens_update_policy" ON linkedin_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- DELETE policy
DROP POLICY IF EXISTS "linkedin_tokens_delete_policy" ON linkedin_tokens;
CREATE POLICY "linkedin_tokens_delete_policy" ON linkedin_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_linkedin_tokens_updated_at ON linkedin_tokens;
CREATE TRIGGER update_linkedin_tokens_updated_at
    BEFORE UPDATE ON linkedin_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE linkedin_tokens IS 'LinkedIn OAuth tokens for API access (posting, etc.)';
