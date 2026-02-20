"use client"

/**
 * Team Activity Page
 * @description Team hub with animated tab navigation, top influencers leaderboard,
 * and grid-based post feed with popup detail view
 * @module app/dashboard/team/page
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  IconLayoutDashboard,
  IconUsers,
  IconActivity,
  IconSettings,
  IconX,
  IconEye,
  IconThumbUp,
  IconMessageCircle,
  IconShare,
  IconSparkles,
} from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"

import { ErrorBoundary } from "@/components/error-boundary"
import { TeamActivityFeed, type TeamActivityItem } from "@/components/features/team-activity-feed"
import { TeamLeaderboard } from "@/components/features/team-leaderboard"
import { TeamHeader } from "@/components/features/team-header"
import { TeamMembersPreview } from "@/components/features/team-members-preview"
import { PendingInvitationsCard, type PendingInvitation } from "@/components/features/pending-invitations-card"
import { NoTeamState } from "@/components/features/no-team-state"
import { TeamMemberList } from "@/components/features/team-member-list"
import { TeamSkeleton } from "@/components/skeletons/page-skeletons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useTeamPosts } from "@/hooks/use-team-posts"
import { useTeamLeaderboard } from "@/hooks/use-team-leaderboard"
import { useTeam } from "@/hooks/use-team"
import { useTeamInvitations } from "@/hooks/use-team-invitations"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { usePageMeta } from "@/lib/dashboard-context"
import { cn, getInitials, formatMetricNumber } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

/** Tab type for team page */
type TeamTab = "overview" | "members" | "activity" | "settings"

/** Tab configuration */
interface TabConfig {
  value: TeamTab
  label: string
  icon: React.ElementType
}

const TABS: TabConfig[] = [
  { value: "overview", label: "Overview", icon: IconLayoutDashboard },
  { value: "members", label: "Members", icon: IconUsers },
  { value: "activity", label: "Activity", icon: IconActivity },
  { value: "settings", label: "Settings", icon: IconSettings },
]

// ============================================================================
// Animated Tab Bar
// ============================================================================

/**
 * Animated capsule tab bar with framer-motion sliding indicator
 * @param props.activeTab - Currently active tab
 * @param props.onTabChange - Callback when tab changes
 */
function AnimatedTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TeamTab
  onTabChange: (tab: TeamTab) => void
}) {
  const [tabBounds, setTabBounds] = useState<Record<string, { left: number; width: number }>>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  /** Measure tab positions for the sliding capsule */
  useEffect(() => {
    const measureTabs = () => {
      if (!containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const bounds: Record<string, { left: number; width: number }> = {}
      TABS.forEach((tab) => {
        const el = tabRefs.current[tab.value]
        if (el) {
          const rect = el.getBoundingClientRect()
          bounds[tab.value] = {
            left: rect.left - containerRect.left,
            width: rect.width,
          }
        }
      })
      setTabBounds(bounds)
    }

    measureTabs()
    window.addEventListener("resize", measureTabs)
    return () => window.removeEventListener("resize", measureTabs)
  }, [])

  const activeBounds = tabBounds[activeTab]

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/50"
    >
      {/* Animated capsule background */}
      {activeBounds && (
        <motion.div
          className="absolute top-1 bottom-1 rounded-lg bg-background shadow-sm border border-border/60"
          initial={false}
          animate={{
            left: activeBounds.left,
            width: activeBounds.width,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
        />
      )}

      {/* Tab buttons */}
      {TABS.map((tab) => {
        const isActive = tab.value === activeTab
        const Icon = tab.icon
        return (
          <button
            key={tab.value}
            ref={(el) => { tabRefs.current[tab.value] = el }}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "relative z-10 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// Post Grid with Popup
// ============================================================================

/**
 * Grid card for a single post - shows image/thumbnail + text snippet
 * Clicking opens the detail popup
 */
function PostGridCard({
  post,
  onClick,
}: {
  post: TeamActivityItem
  onClick: () => void
}) {
  const hasMedia = post.mediaUrls && post.mediaUrls.length > 0
  const relativeTime = formatDistanceToNow(new Date(post.postedAt), { addSuffix: false })
  const snippet = post.content.length > 80
    ? `${post.content.slice(0, 80)}...`
    : post.content

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="text-left bg-card rounded-xl border border-border/50 overflow-hidden transition-all hover:shadow-md hover:border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Image or gradient placeholder */}
      {hasMedia ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={post.mediaUrls![0]}
          alt="Post media"
          className="w-full h-40 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 flex items-center justify-center">
          <div className="text-4xl opacity-30">
            {post.postType === "article" ? "\u{1F4DD}" : "\u{1F4AC}"}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="p-3">
        {/* Author mini row */}
        <div className="flex items-center gap-2 mb-1.5">
          <Avatar className="size-6">
            {post.author.avatar && (
              <AvatarImage src={post.author.avatar} alt={post.author.name} />
            )}
            <AvatarFallback className="text-[9px]">
              {getInitials(post.author.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium truncate flex-1">{post.author.name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime}</span>
        </div>

        {/* Text snippet */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{snippet}</p>

        {/* Mini metrics */}
        <div className="flex items-center gap-2.5 mt-2 text-[10px] text-muted-foreground">
          {post.metrics.impressions > 0 && (
            <span className="flex items-center gap-0.5">
              <IconEye className="size-3" />
              {formatMetricNumber(post.metrics.impressions)}
            </span>
          )}
          {post.metrics.reactions > 0 && (
            <span className="flex items-center gap-0.5">
              <IconThumbUp className="size-3" />
              {formatMetricNumber(post.metrics.reactions)}
            </span>
          )}
          {post.metrics.comments > 0 && (
            <span className="flex items-center gap-0.5">
              <IconMessageCircle className="size-3" />
              {formatMetricNumber(post.metrics.comments)}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

/**
 * Full post detail popup/modal
 * Shows the complete post with all content and metrics
 */
function PostDetailPopup({
  post,
  onClose,
}: {
  post: TeamActivityItem
  onClose: () => void
}) {
  const relativeTime = formatDistanceToNow(new Date(post.postedAt), { addSuffix: true })
  const hasMedia = post.mediaUrls && post.mediaUrls.length > 0

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative bg-card rounded-xl border border-border/50 shadow-2xl overflow-hidden max-w-lg w-full max-h-[85vh] overflow-y-auto"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full bg-background/80 backdrop-blur-sm p-1.5 hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <IconX className="size-4" />
        </button>

        {/* Author header */}
        <div className="flex items-start gap-3 p-4 pb-0">
          <Avatar className="size-12 shrink-0">
            {post.author.avatar && (
              <AvatarImage src={post.author.avatar} alt={post.author.name} />
            )}
            <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
              {getInitials(post.author.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pt-0.5">
            <span className="font-semibold text-sm">{post.author.name}</span>
            <p className="text-xs text-muted-foreground truncate">{post.author.headline}</p>
            <p className="text-xs text-muted-foreground">{relativeTime}</p>
          </div>
        </div>

        {/* Full post content */}
        <div className="px-4 pt-3 pb-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Media */}
        {hasMedia && (
          <div>
            {post.mediaUrls!.map((url, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={i}
                src={url}
                alt={`Post media ${i + 1}`}
                className="w-full object-cover"
                loading="lazy"
              />
            ))}
          </div>
        )}

        {/* Metrics bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <IconEye className="size-3.5" />
              {formatMetricNumber(post.metrics.impressions)} impressions
            </span>
          </div>
          <div className="flex items-center gap-2">
            {post.metrics.reactions > 0 && (
              <span>{formatMetricNumber(post.metrics.reactions)} reactions</span>
            )}
            {post.metrics.comments > 0 && (
              <span>{formatMetricNumber(post.metrics.comments)} comments</span>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center border-t border-border/40 px-2 py-1">
          <button type="button" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors">
            <IconThumbUp className="size-4" />
            React
          </button>
          <button type="button" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors">
            <IconMessageCircle className="size-4" />
            Comment
          </button>
          <button type="button" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors">
            <IconShare className="size-4" />
            Repost
          </button>
          <button type="button" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors">
            <IconSparkles className="size-4" />
            Remix
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/**
 * Post grid with popup detail view
 * Shows posts as image+text cards in a responsive grid
 */
function PostGrid({
  posts,
  isLoading,
  className,
}: {
  posts: TeamActivityItem[]
  isLoading: boolean
  className?: string
}) {
  const [selectedPost, setSelectedPost] = useState<TeamActivityItem | null>(null)

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3", className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <Skeleton className="w-full h-40" />
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="rounded-full bg-muted/60 p-3 mx-auto w-fit mb-3">
          <IconActivity className="size-5 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-sm mb-1">No recent posts</h3>
        <p className="text-xs text-muted-foreground">
          Posts from team members will appear here
        </p>
      </div>
    )
  }

  return (
    <>
      <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3", className)}>
        {posts.map((post) => (
          <PostGridCard
            key={post.id}
            post={post}
            onClick={() => setSelectedPost(post)}
          />
        ))}
      </div>

      {/* Post detail popup */}
      <AnimatePresence>
        {selectedPost && (
          <PostDetailPopup
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ============================================================================
// Main Team Content
// ============================================================================

/**
 * Team page content component
 * @description Fetches team data and renders appropriate content based on team existence
 */
function TeamContent() {
  const router = useRouter()
  const { user, profile } = useAuthContext()
  const [activeTab, setActiveTab] = useState<TeamTab>("overview")

  const { posts, isLoading: postsLoading } = useTeamPosts(10)
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
    <motion.div
      className="flex flex-col"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Team Header with logo.dev company logo */}
      <TeamHeader
        team={currentTeam}
        userRole={currentUserRole}
        pendingInvitationsCount={pendingInvitations.length}
        companyWebsite={profile?.company_website}
        onSettingsClick={handleSettingsClick}
        onInvitationsSent={handleInvitationsSent}
      />

      {/* Animated Tab Bar */}
      <div className="px-4 md:px-6 py-3 border-b">
        <AnimatedTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="p-4 md:p-6 space-y-6">
              {/* Top Influencers (Full Width) */}
              <TeamLeaderboard
                members={leaderboardMembers}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                currentUserId={currentUserId || undefined}
                isLoading={leaderboardLoading}
              />

              {/* Recent Team Posts Grid - Below the leaderboard */}
              <div>
                <h3 className="text-base font-semibold mb-3">Recent Team Activity</h3>
                <PostGrid posts={posts} isLoading={postsLoading} />
              </div>
            </div>
          )}

          {/* Members Tab */}
          {activeTab === "members" && (
            <div className="p-4 md:p-6 space-y-6">
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
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="p-4 md:p-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Recent Team Activity</CardTitle>
                  <CardDescription>
                    Posts created by team members in the last 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TeamActivityFeed posts={posts} isLoading={postsLoading} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="p-4 md:p-6">
              <div className="max-w-2xl">
                <Card className="border-border/50">
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
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Team page component
 * @returns Team page with animated tabs for overview, members, activity, and settings
 */
export default function TeamPage() {
  usePageMeta({ title: "Team Activity" })

  return (
    <ErrorBoundary>
      <TeamContent />
    </ErrorBoundary>
  )
}
