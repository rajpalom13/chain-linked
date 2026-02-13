"use client"

/**
 * Team Page
 * @description Team collaboration hub with overview, members, activity, and settings tabs
 * @module app/dashboard/team/page
 */

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  IconLayoutDashboard,
  IconUsers,
  IconActivity,
  IconSettings,
} from "@tabler/icons-react"

import { TeamActivityFeed } from "@/components/features/team-activity-feed"
import { TeamLeaderboard } from "@/components/features/team-leaderboard"
import { TeamHeader } from "@/components/features/team-header"
import { TeamMembersPreview } from "@/components/features/team-members-preview"
import { PendingInvitationsCard, type PendingInvitation } from "@/components/features/pending-invitations-card"
import { NoTeamState } from "@/components/features/no-team-state"
import { TeamMemberList } from "@/components/features/team-member-list"
import { TeamSkeleton } from "@/components/skeletons/page-skeletons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTeamPosts } from "@/hooks/use-team-posts"
import { useTeamLeaderboard } from "@/hooks/use-team-leaderboard"
import { useTeam } from "@/hooks/use-team"
import { useTeamInvitations } from "@/hooks/use-team-invitations"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { usePageMeta } from "@/lib/dashboard-context"

/**
 * Tab type for team page
 */
type TeamTab = "overview" | "members" | "activity" | "settings"

/**
 * Team page content component
 * @description Fetches team data and renders appropriate content based on team existence
 */
function TeamContent() {
  const router = useRouter()
  const { user, profile } = useAuthContext()
  const [activeTab, setActiveTab] = useState<TeamTab>("overview")

  const { posts, isLoading: postsLoading } = useTeamPosts(20)
  const {
    members: leaderboardMembers,
    isLoading: leaderboardLoading,
    timeRange,
    setTimeRange,
    currentUserId
  } = useTeamLeaderboard()
  const {
    currentTeam,
    members,
    currentUserRole,
    isLoadingTeams,
    isLoadingMembers,
    createTeam,
    refetchTeams,
    fetchMembers,
    removeMember,
    updateMemberRole,
  } = useTeam()

  const {
    invitations,
    isLoading: invitationsLoading,
    cancelInvitation,
    resendInvitation,
    refetch: refetchInvitations,
  } = useTeamInvitations({
    teamId: currentTeam?.id || null,
    pendingOnly: true,
  })

  // Check if user can manage team (owner or admin)
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  // Handle team creation
  const handleCreateTeam = useCallback(async (name: string) => {
    const result = await createTeam({ name })
    if (result) {
      await refetchTeams()
      return true
    }
    return false
  }, [createTeam, refetchTeams])

  // Handle invitation resend
  const handleResendInvitation = useCallback(async (invitationId: string) => {
    const success = await resendInvitation(invitationId)
    if (success) {
      await refetchInvitations()
    }
    return success
  }, [resendInvitation, refetchInvitations])

  // Handle invitation cancel
  const handleCancelInvitation = useCallback(async (invitationId: string) => {
    const success = await cancelInvitation(invitationId)
    if (success) {
      await refetchInvitations()
    }
    return success
  }, [cancelInvitation, refetchInvitations])

  // Handle settings click
  const handleSettingsClick = useCallback(() => {
    if (currentTeam?.id) {
      router.push(`/dashboard/team/settings`)
    }
  }, [router, currentTeam?.id])

  // Handle view all members
  const handleViewAllMembers = useCallback(() => {
    setActiveTab("members")
  }, [])

  // Handle invitations sent callback
  const handleInvitationsSent = useCallback(() => {
    refetchInvitations()
  }, [refetchInvitations])

  // Transform invitations to expected format
  const pendingInvitations: PendingInvitation[] = invitations.map(inv => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    created_at: inv.created_at,
    expires_at: inv.expires_at,
    invited_by: {
      full_name: inv.inviter?.name || null,
      email: inv.inviter?.email || '',
    },
  }))

  // Loading state
  if (isLoadingTeams) {
    return <TeamSkeleton />
  }

  // No team state
  if (!currentTeam) {
    return <NoTeamState onCreateTeam={handleCreateTeam} />
  }

  return (
    <div className="flex flex-col">
      {/* Team Header */}
      <TeamHeader
        team={currentTeam}
        userRole={currentUserRole}
        pendingInvitationsCount={pendingInvitations.length}
        companyWebsite={profile?.company_website}
        onSettingsClick={handleSettingsClick}
        onInvitationsSent={handleInvitationsSent}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TeamTab)} className="flex-1">
        <div className="border-b px-4 md:px-6">
          <TabsList className="h-12 bg-transparent p-0 gap-4">
            <TabsTrigger
              value="overview"
              className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <IconLayoutDashboard className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <IconUsers className="h-4 w-4 mr-2" />
              Members
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <IconActivity className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <IconSettings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-0 p-4 md:p-6">
          <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
            {/* Left Column - Members and Invitations */}
            <div className="space-y-4 md:space-y-6">
              <TeamMembersPreview
                members={members}
                isLoading={isLoadingMembers}
                currentUserId={user?.id}
                onViewAll={handleViewAllMembers}
              />

              {canManage && (
                <PendingInvitationsCard
                  invitations={pendingInvitations}
                  isLoading={invitationsLoading}
                  teamId={currentTeam.id}
                  canManage={canManage}
                  onResend={handleResendInvitation}
                  onCancel={handleCancelInvitation}
                  compact
                />
              )}
            </div>

            {/* Right Column - Leaderboard and Activity */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              <TeamLeaderboard
                members={leaderboardMembers}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                currentUserId={currentUserId || undefined}
                isLoading={leaderboardLoading}
              />

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                      Recent Activity
                    </CardTitle>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-xs h-auto p-0"
                      onClick={() => setActiveTab("activity")}
                    >
                      View all
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <TeamActivityFeed posts={posts.slice(0, 3)} isLoading={postsLoading} compact />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-0 p-4 md:p-6">
          <div className="space-y-6">
            <TeamMemberList
              members={members}
              isLoading={isLoadingMembers}
              currentUserRole={currentUserRole}
              onRemoveMember={async (userId) => {
                if (currentTeam.id) {
                  await removeMember(currentTeam.id, userId)
                  await fetchMembers(currentTeam.id)
                }
              }}
              onRoleChange={async (userId, role) => {
                if (currentTeam.id) {
                  await updateMemberRole(currentTeam.id, userId, role)
                  await fetchMembers(currentTeam.id)
                }
              }}
            />

            {canManage && pendingInvitations.length > 0 && (
              <PendingInvitationsCard
                invitations={pendingInvitations}
                isLoading={invitationsLoading}
                teamId={currentTeam.id}
                canManage={canManage}
                onResend={handleResendInvitation}
                onCancel={handleCancelInvitation}
              />
            )}
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-0 p-4 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Activity</CardTitle>
              <CardDescription>
                Recent LinkedIn posts and engagement from your team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamActivityFeed posts={posts} isLoading={postsLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-0 p-4 md:p-6">
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Team Settings</CardTitle>
                <CardDescription>
                  Manage your team configuration and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Team Name</h4>
                  <p className="text-sm text-muted-foreground">{currentTeam.name}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Your Role</h4>
                  <p className="text-sm text-muted-foreground capitalize">
                    {currentUserRole || 'Member'}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Team Members</h4>
                  <p className="text-sm text-muted-foreground">
                    {currentTeam.member_count} member{currentTeam.member_count !== 1 ? 's' : ''}
                  </p>
                </div>

                {canManage && (
                  <div className="pt-4">
                    <Button variant="outline" onClick={handleSettingsClick}>
                      <IconSettings className="h-4 w-4 mr-2" />
                      Advanced Settings
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {currentUserRole === 'owner' && (
              <Card className="mt-6 border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible actions that affect your team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Transfer Ownership</h4>
                      <p className="text-xs text-muted-foreground">
                        Transfer team ownership to another member
                      </p>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Transfer
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-destructive">Delete Team</h4>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete this team and all its data
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" disabled>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Team page component
 * @returns Team page with tabs for overview, members, activity, and settings
 */
export default function TeamPage() {
  usePageMeta({ title: "Team" })

  return <TeamContent />
}
