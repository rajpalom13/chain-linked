-- LinkedIn Data Extractor - Supabase Schema
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    linkedin_profile_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LINKEDIN PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS linkedin_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    profile_urn TEXT,
    public_identifier TEXT,
    first_name TEXT,
    last_name TEXT,
    headline TEXT,
    location TEXT,
    industry TEXT,
    profile_picture_url TEXT,
    background_image_url TEXT,
    connections_count INTEGER,
    followers_count INTEGER,
    summary TEXT,
    raw_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- LINKEDIN ANALYTICS (Creator Analytics Snapshots)
-- ============================================
CREATE TABLE IF NOT EXISTS linkedin_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    page_type TEXT NOT NULL, -- 'creator_analytics', 'content', etc.
    impressions INTEGER DEFAULT 0,
    members_reached INTEGER DEFAULT 0,
    engagements INTEGER DEFAULT 0,
    new_followers INTEGER DEFAULT 0,
    profile_views INTEGER DEFAULT 0,
    search_appearances INTEGER DEFAULT 0,
    top_posts JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_analytics_user_captured ON linkedin_analytics(user_id, captured_at DESC);

-- ============================================
-- ANALYTICS HISTORY (90-day trends)
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    members_reached INTEGER DEFAULT 0,
    engagements INTEGER DEFAULT 0,
    followers INTEGER DEFAULT 0,
    profile_views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_history_user_date ON analytics_history(user_id, date DESC);

-- ============================================
-- POST ANALYTICS
-- ============================================
CREATE TABLE IF NOT EXISTS post_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    activity_urn TEXT NOT NULL,
    post_content TEXT,
    post_type TEXT, -- 'text', 'image', 'video', 'article', 'poll'
    impressions INTEGER DEFAULT 0,
    members_reached INTEGER DEFAULT 0,
    unique_views INTEGER DEFAULT 0,
    reactions INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    reposts INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    profile_viewers INTEGER DEFAULT 0,
    followers_gained INTEGER DEFAULT 0,
    demographics JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB,
    posted_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, activity_urn)
);

CREATE INDEX IF NOT EXISTS idx_post_analytics_user ON post_analytics(user_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_analytics_urn ON post_analytics(activity_urn);

-- ============================================
-- AUDIENCE DATA
-- ============================================
CREATE TABLE IF NOT EXISTS audience_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    total_followers INTEGER DEFAULT 0,
    follower_growth DECIMAL(5,2),
    follower_growth_formatted TEXT,
    demographics_preview JSONB,
    top_job_titles JSONB DEFAULT '[]'::jsonb,
    top_companies JSONB DEFAULT '[]'::jsonb,
    top_locations JSONB DEFAULT '[]'::jsonb,
    top_industries JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- AUDIENCE HISTORY (Follower trends)
-- ============================================
CREATE TABLE IF NOT EXISTS audience_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    total_followers INTEGER DEFAULT 0,
    new_followers INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_audience_history_user ON audience_history(user_id, date DESC);

-- ============================================
-- CONNECTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    connection_urn TEXT NOT NULL,
    public_identifier TEXT,
    first_name TEXT,
    last_name TEXT,
    headline TEXT,
    profile_picture_url TEXT,
    connection_degree INTEGER DEFAULT 1,
    connected_at TIMESTAMPTZ,
    raw_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, connection_urn)
);

CREATE INDEX IF NOT EXISTS idx_connections_user ON connections(user_id);

-- ============================================
-- FEED POSTS (Captured from feed)
-- ============================================
CREATE TABLE IF NOT EXISTS feed_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    activity_urn TEXT NOT NULL,
    author_urn TEXT,
    author_name TEXT,
    author_headline TEXT,
    author_profile_url TEXT,
    content TEXT,
    hashtags JSONB DEFAULT '[]'::jsonb,
    media_type TEXT,
    reactions INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    reposts INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 0,
    posted_at TIMESTAMPTZ,
    raw_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, activity_urn)
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_user ON feed_posts(user_id, captured_at DESC);

-- ============================================
-- MY POSTS (User's own posts)
-- ============================================
CREATE TABLE IF NOT EXISTS my_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    activity_urn TEXT NOT NULL,
    content TEXT,
    media_type TEXT,
    reactions INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    reposts INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    posted_at TIMESTAMPTZ,
    raw_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, activity_urn)
);

CREATE INDEX IF NOT EXISTS idx_my_posts_user ON my_posts(user_id, posted_at DESC);

-- ============================================
-- COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    comment_urn TEXT NOT NULL,
    activity_urn TEXT,
    author_urn TEXT,
    author_name TEXT,
    content TEXT,
    reactions INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    commented_at TIMESTAMPTZ,
    raw_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, comment_urn)
);

CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_activity ON comments(activity_urn);

-- ============================================
-- FOLLOWERS
-- ============================================
CREATE TABLE IF NOT EXISTS followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    follower_urn TEXT NOT NULL,
    public_identifier TEXT,
    first_name TEXT,
    last_name TEXT,
    headline TEXT,
    profile_picture_url TEXT,
    followed_at TIMESTAMPTZ,
    raw_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, follower_urn)
);

CREATE INDEX IF NOT EXISTS idx_followers_user ON followers(user_id);

-- ============================================
-- CAPTURED APIS (Raw API response log)
-- ============================================
CREATE TABLE IF NOT EXISTS captured_apis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL, -- 'feed', 'profile', 'messaging', 'analytics', etc.
    endpoint TEXT,
    method TEXT,
    response_hash TEXT,
    response_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_captured_apis_user ON captured_apis(user_id, category, captured_at DESC);

-- ============================================
-- CAPTURE STATS
-- ============================================
CREATE TABLE IF NOT EXISTS capture_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    api_calls_captured INTEGER DEFAULT 0,
    feed_posts_captured INTEGER DEFAULT 0,
    analytics_captures INTEGER DEFAULT 0,
    dom_extractions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- ============================================
-- EXTENSION SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS extension_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    auto_capture_enabled BOOLEAN DEFAULT true,
    capture_feed BOOLEAN DEFAULT true,
    capture_analytics BOOLEAN DEFAULT true,
    capture_profile BOOLEAN DEFAULT true,
    capture_messaging BOOLEAN DEFAULT false,
    sync_enabled BOOLEAN DEFAULT true,
    sync_interval INTEGER DEFAULT 300, -- seconds
    dark_mode BOOLEAN DEFAULT false,
    notifications_enabled BOOLEAN DEFAULT true,
    raw_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- SYNC METADATA
-- ============================================
CREATE TABLE IF NOT EXISTS sync_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    table_name TEXT NOT NULL,
    last_synced_at TIMESTAMPTZ,
    last_local_change_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'idle', -- 'idle', 'syncing', 'error'
    error_message TEXT,
    pending_changes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, table_name)
);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE my_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE captured_apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE capture_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

-- Users table: users can only see/modify their own record
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = google_id OR id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = google_id OR id = auth.uid());

-- Helper function to get user_id from auth
CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM users WHERE google_id = auth.uid()::text LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generic RLS policies for all user-owned tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'user_id'
        AND table_schema = 'public'
        AND table_name != 'users'
    LOOP
        -- SELECT policy
        EXECUTE format('
            DROP POLICY IF EXISTS "%I_select_policy" ON %I;
            CREATE POLICY "%I_select_policy" ON %I
            FOR SELECT USING (user_id = get_user_id_from_auth());
        ', t, t, t, t);

        -- INSERT policy
        EXECUTE format('
            DROP POLICY IF EXISTS "%I_insert_policy" ON %I;
            CREATE POLICY "%I_insert_policy" ON %I
            FOR INSERT WITH CHECK (user_id = get_user_id_from_auth());
        ', t, t, t, t);

        -- UPDATE policy
        EXECUTE format('
            DROP POLICY IF EXISTS "%I_update_policy" ON %I;
            CREATE POLICY "%I_update_policy" ON %I
            FOR UPDATE USING (user_id = get_user_id_from_auth());
        ', t, t, t, t);

        -- DELETE policy
        EXECUTE format('
            DROP POLICY IF EXISTS "%I_delete_policy" ON %I;
            CREATE POLICY "%I_delete_policy" ON %I
            FOR DELETE USING (user_id = get_user_id_from_auth());
        ', t, t, t, t);
    END LOOP;
END $$;

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE linkedin_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE linkedin_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE post_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE audience_data;
ALTER PUBLICATION supabase_realtime ADD TABLE extension_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE sync_metadata;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE users IS 'User accounts linked to Google OAuth';
COMMENT ON TABLE linkedin_profiles IS 'LinkedIn profile data for each user';
COMMENT ON TABLE linkedin_analytics IS 'Creator analytics snapshots';
COMMENT ON TABLE analytics_history IS '90-day analytics trend data';
COMMENT ON TABLE post_analytics IS 'Individual post performance metrics';
COMMENT ON TABLE audience_data IS 'Follower demographics and audience data';
COMMENT ON TABLE audience_history IS 'Follower count trend data';
COMMENT ON TABLE connections IS 'LinkedIn connections';
COMMENT ON TABLE feed_posts IS 'Posts captured from LinkedIn feed';
COMMENT ON TABLE my_posts IS 'User own posts';
COMMENT ON TABLE comments IS 'Captured comments on posts';
COMMENT ON TABLE followers IS 'Follower list';
COMMENT ON TABLE captured_apis IS 'Raw API response log for debugging';
COMMENT ON TABLE capture_stats IS 'Daily capture statistics';
COMMENT ON TABLE extension_settings IS 'User extension preferences';
COMMENT ON TABLE sync_metadata IS 'Sync state tracking per table';
