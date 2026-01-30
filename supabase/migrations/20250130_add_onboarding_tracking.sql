-- Add onboarding tracking columns to profiles table
-- Migration: 20250130_add_onboarding_tracking.sql
-- Description: Adds columns to track full onboarding completion and current step

-- Add onboarding_completed column to track overall onboarding completion
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add onboarding_current_step column to track user's current step (1-6)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_current_step INTEGER DEFAULT 1 CHECK (onboarding_current_step >= 1 AND onboarding_current_step <= 6);

-- Create index for efficient querying of onboarding status
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON public.profiles(onboarding_completed);

-- Update existing users: if company_onboarding_completed is true, mark full onboarding as complete
UPDATE public.profiles
SET onboarding_completed = true, onboarding_current_step = 6
WHERE company_onboarding_completed = true AND onboarding_completed IS NOT true;

-- Comment on new columns for documentation
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether the user has completed the full onboarding flow';
COMMENT ON COLUMN public.profiles.onboarding_current_step IS 'Current step in the onboarding flow (1-6)';
