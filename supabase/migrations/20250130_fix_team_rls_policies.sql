-- ============================================
-- Fix Team RLS Policies Migration
-- Run this AFTER the core tables migration
-- ============================================

-- Drop existing restrictive policies for team_members
DROP POLICY IF EXISTS "Team members can view their team members" ON public.team_members;

-- Create a more permissive SELECT policy that allows users to query their own memberships
CREATE POLICY "Users can view their own team memberships" ON public.team_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Allow users to create their own team (and become owner)
DROP POLICY IF EXISTS "Company owners can create teams" ON public.teams;
CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Allow team owners to add themselves as the first member
DROP POLICY IF EXISTS "Team admins can add members" ON public.team_members;
CREATE POLICY "Team admins can add members" ON public.team_members
  FOR INSERT WITH CHECK (
    -- Allow owner to add themselves
    (user_id = auth.uid()) OR
    -- Allow admins to add others
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    ) OR
    -- Allow team owner (from teams table) to add first member
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
      AND t.owner_id = auth.uid()
    )
  );

-- Allow anyone to view teams they're a member of OR teams they own
DROP POLICY IF EXISTS "Team members can view their teams" ON public.teams;
CREATE POLICY "Users can view their teams" ON public.teams
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

-- Allow invited users to accept invitations (view invitation by token)
DROP POLICY IF EXISTS "Team admins can view invitations" ON public.team_invitations;
CREATE POLICY "Users can view invitations" ON public.team_invitations
  FOR SELECT USING (
    -- Admins can view all team invitations
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
    -- Note: Public token lookup is handled by service role in API
  );

-- Grant necessary permissions
GRANT SELECT ON public.teams TO authenticated;
GRANT SELECT ON public.team_members TO authenticated;
GRANT INSERT ON public.teams TO authenticated;
GRANT INSERT ON public.team_members TO authenticated;
GRANT SELECT ON public.team_invitations TO authenticated;
