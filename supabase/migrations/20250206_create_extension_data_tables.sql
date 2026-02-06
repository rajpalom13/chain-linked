-- ============================================
-- Extension Data Tables Migration (Reference)
-- NOTE: These tables already exist in the live Supabase database.
-- This file documents the actual schema as verified on 2026-02-06.
-- ============================================

-- Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. linkedin_analytics
-- ============================================
CREATE TABLE IF NOT EXISTS public.linkedin_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    page_type TEXT NOT NULL,
    impressions INTEGER,
    members_reached INTEGER,
    engagements INTEGER,
    new_followers INTEGER,
    profile_views INTEGER,
    search_appearances INTEGER,
    top_posts JSONB,
    raw_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. post_analytics
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_urn TEXT,
    post_content TEXT,
    post_type TEXT,
    impressions INTEGER,
    members_reached INTEGER,
    unique_views INTEGER,
    reactions INTEGER,
    comments INTEGER,
    reposts INTEGER,
    engagement_rate NUMERIC,
    profile_viewers INTEGER,
    followers_gained INTEGER,
    demographics JSONB,
    raw_data JSONB,
    posted_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. audience_data
-- ============================================
CREATE TABLE IF NOT EXISTS public.audience_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    total_followers INTEGER,
    follower_growth INTEGER,
    demographics_preview JSONB,
    top_job_titles JSONB,
    top_companies JSONB,
    top_locations JSONB,
    top_industries JSONB,
    raw_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. feed_posts
-- ============================================
CREATE TABLE IF NOT EXISTS public.feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_urn TEXT NOT NULL,
    author_urn TEXT,
    author_name TEXT,
    author_headline TEXT,
    author_profile_url TEXT,
    content TEXT,
    hashtags JSONB,
    media_type TEXT,
    reactions INTEGER,
    comments INTEGER,
    reposts INTEGER,
    engagement_score NUMERIC,
    posted_at TIMESTAMPTZ,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. my_posts
-- ============================================
CREATE TABLE IF NOT EXISTS public.my_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_urn TEXT NOT NULL,
    content TEXT,
    media_type TEXT,
    reactions INTEGER,
    comments INTEGER,
    reposts INTEGER,
    impressions INTEGER,
    posted_at TIMESTAMPTZ,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. comments
-- ============================================
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_urn TEXT,
    author_name TEXT,
    author_headline TEXT,
    author_profile_url TEXT,
    content TEXT,
    comment_urn TEXT,
    parent_urn TEXT,
    reactions INTEGER DEFAULT 0,
    posted_at TIMESTAMPTZ,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. connections
-- ============================================
CREATE TABLE IF NOT EXISTS public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    linkedin_id TEXT,
    first_name TEXT,
    last_name TEXT,
    headline TEXT,
    profile_picture TEXT,
    public_identifier TEXT,
    connected_at TIMESTAMPTZ,
    connection_degree INTEGER DEFAULT 1,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. followers
-- ============================================
CREATE TABLE IF NOT EXISTS public.followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    linkedin_id TEXT,
    first_name TEXT,
    last_name TEXT,
    headline TEXT,
    profile_picture TEXT,
    public_identifier TEXT,
    followed_at TIMESTAMPTZ,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. captured_apis
-- ============================================
CREATE TABLE IF NOT EXISTS public.captured_apis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT,
    endpoint TEXT,
    method TEXT DEFAULT 'GET',
    response_hash TEXT,
    response_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. capture_stats
-- ============================================
CREATE TABLE IF NOT EXISTS public.capture_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    api_calls_captured INTEGER DEFAULT 0,
    feed_posts_captured INTEGER DEFAULT 0,
    analytics_captures INTEGER DEFAULT 0,
    dom_extractions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- ============================================
-- 11. extension_settings
-- ============================================
CREATE TABLE IF NOT EXISTS public.extension_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    auto_capture_enabled BOOLEAN DEFAULT TRUE,
    capture_feed BOOLEAN DEFAULT TRUE,
    capture_analytics BOOLEAN DEFAULT TRUE,
    capture_profile BOOLEAN DEFAULT TRUE,
    capture_messaging BOOLEAN DEFAULT FALSE,
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_interval INTEGER DEFAULT 30,
    dark_mode BOOLEAN DEFAULT FALSE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    raw_settings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
