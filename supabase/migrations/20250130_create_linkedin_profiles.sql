-- ============================================
-- LinkedIn Profiles Table Migration
-- Stores LinkedIn profile data for display purposes
-- Run this in Supabase SQL Editor
-- ============================================

-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create linkedin_profiles table
CREATE TABLE IF NOT EXISTS public.linkedin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    linkedin_id TEXT,
    first_name TEXT,
    last_name TEXT,
    headline TEXT,
    profile_url TEXT,
    profile_picture_url TEXT,
    background_image_url TEXT,
    about TEXT,
    location TEXT,
    industry TEXT,
    current_company TEXT,
    education TEXT,
    followers_count INTEGER DEFAULT 0,
    connections_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_linkedin_profiles_user_id ON public.linkedin_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_profiles_linkedin_id ON public.linkedin_profiles(linkedin_id);

-- Enable RLS
ALTER TABLE public.linkedin_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own LinkedIn profile" ON public.linkedin_profiles;
CREATE POLICY "Users can view their own LinkedIn profile" ON public.linkedin_profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own LinkedIn profile" ON public.linkedin_profiles;
CREATE POLICY "Users can insert their own LinkedIn profile" ON public.linkedin_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own LinkedIn profile" ON public.linkedin_profiles;
CREATE POLICY "Users can update their own LinkedIn profile" ON public.linkedin_profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own LinkedIn profile" ON public.linkedin_profiles;
CREATE POLICY "Users can delete their own LinkedIn profile" ON public.linkedin_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_linkedin_profiles_updated_at ON public.linkedin_profiles;
CREATE TRIGGER update_linkedin_profiles_updated_at
    BEFORE UPDATE ON public.linkedin_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Also add linkedin_avatar_url to profiles table for easier access
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS linkedin_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_headline TEXT,
ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_profiles TO authenticated;

-- Comment
COMMENT ON TABLE public.linkedin_profiles IS 'LinkedIn profile data for display in UI (avatar, name, etc.)';
