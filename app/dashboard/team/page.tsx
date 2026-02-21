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
  IconChevronRight,
} from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

import { ErrorBoundary } from "@/components/error-boundary"
import { type TeamActivityItem } from "@/components/features/team-activity-feed"
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
import { createClient } from "@/lib/supabase/client"

// ============================================================================
// Types
// ============================================================================

/** Tab type for team page */
type TeamTab = "overview" | "members" | "settings"

/** Tab configuration */
interface TabConfig {
  value: TeamTab
  label: string
  icon: React.ElementType
}

const TABS: TabConfig[] = [
  { value: "overview", label: "Overview", icon: IconLayoutDashboard },
  { value: "members", label: "Members", icon: IconUsers },
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
 * Grid card for a single post - professional card with author info,
 * content preview, engagement metrics, and posted date
 * @param props.post - The team activity item to display
 * @param props.onClick - Callback when the card is clicked to open detail popup
 * @param props.index - Card index used for stagger animation delay
 */
function PostGridCard({
  post,
  onClick,
  index = 0,
}: {
  post: TeamActivityItem
  onClick: () => void
  index?: number
}) {
  const relativeTime = formatDistanceToNow(new Date(post.postedAt), { addSuffix: true })
  const snippet = post.content.length > 120
    ? `${post.content.slice(0, 120)}...`
    : post.content
  const imageUrl = post.mediaUrls?.[0] ?? null

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="text-left bg-card rounded-xl border border-border/40 overflow-hidden transition-all hover:shadow-md hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -3 }}
    >
      {/* Post image */}
      {imageUrl && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Post media"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        </div>
      )}

      {/* Author section */}
      <div className="flex items-start gap-3 p-4 pb-0">
        <Avatar className="size-10 shrink-0 ring-1 ring-border/30">
          {post.author.avatar && (
            <AvatarImage src={post.author.avatar} alt={post.author.name} />
          )}
          <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
            {getInitials(post.author.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold leading-tight truncate block">
            {post.author.name}
          </span>
          <p className="text-xs text-muted-foreground truncate leading-snug mt-0.5">
            {post.author.headline}
          </p>
        </div>
      </div>

      {/* Content preview */}
      <div className="px-4 pt-3 pb-3">
        <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-3">
          {snippet}
        </p>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-border/30" />

      {/* Engagement metrics + date */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {post.metrics.impressions > 0 && (
            <span className="flex items-center gap-1" title="Impressions">
              <IconEye className="size-3.5" />
              {formatMetricNumber(post.metrics.impressions)}
            </span>
          )}
          {post.metrics.reactions > 0 && (
            <span className="flex items-center gap-1" title="Reactions">
              <IconThumbUp className="size-3.5" />
              {formatMetricNumber(post.metrics.reactions)}
            </span>
          )}
          {post.metrics.comments > 0 && (
            <span className="flex items-center gap-1" title="Comments">
              <IconMessageCircle className="size-3.5" />
              {formatMetricNumber(post.metrics.comments)}
            </span>
          )}
          {post.metrics.reposts > 0 && (
            <span className="flex items-center gap-1" title="Reposts">
              <IconShare className="size-3.5" />
              {formatMetricNumber(post.metrics.reposts)}
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground/70 shrink-0">
          {relativeTime}
        </span>
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
 * Displays posts in a responsive 3-column card grid with stagger animations
 * @param props.posts - Array of team activity items to render
 * @param props.isLoading - Whether the data is still loading
 * @param props.className - Additional CSS classes for the container
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
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border/40 overflow-hidden">
            <div className="flex items-start gap-3 p-4 pb-0">
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <div className="px-4 pt-3 pb-3 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <div className="mx-4 border-t border-border/30" />
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex gap-3">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-3 w-16" />
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
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
        {posts.map((post, index) => (
          <PostGridCard
            key={post.id}
            post={post}
            index={index}
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
  const [brandKitLogoUrl, setBrandKitLogoUrl] = useState<string | null>(null)

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

  // Fetch brand kit logo from the active brand kit (saved in onboarding Step 3)
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('brand_kits')
      .select('logo_url')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.logo_url) {
          setBrandKitLogoUrl(data.logo_url)
        }
      })
  }, [user])

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
      {/* Team Header with brand kit logo */}
      <TeamHeader
        team={currentTeam}
        userRole={currentUserRole}
        pendingInvitationsCount={pendingInvitations.length}
        companyWebsite={profile?.company_website}
        brandKitLogoUrl={brandKitLogoUrl}
        onSettingsClick={handleSettingsClick}
        onInvitationsSent={handleInvitationsSent}
      />

      {/* Animated Tab Bar - centered */}
      <div className="flex justify-center px-4 md:px-6 pt-5 pb-0">
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
            <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
              {/* Top Influencers */}
              <TeamLeaderboard
                members={leaderboardMembers}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                currentUserId={currentUserId || undefined}
                isLoading={leaderboardLoading}
                onMemberClick={(memberId) => {
                  router.push(`/dashboard/team/activity?member=${memberId}`)
                }}
              />

              {/* Recent Team Posts Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold">Recent Team Activity</h3>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/team/activity" className="gap-1.5">
                      View All Activity
                      <IconChevronRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
                <PostGrid posts={posts} isLoading={postsLoading} />
              </div>
            </div>
          )}

          {/* Members Tab */}
          {activeTab === "members" && (
            <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
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

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="p-4 md:p-6">
              <div className="max-w-2xl mx-auto space-y-5">
                {/* General Settings Card */}
                <Card className="border-border/50 rounded-xl shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <IconSettings className="size-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">General</CardTitle>
                        <CardDescription className="text-xs">
                          Basic team information
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    <div className="flex items-center justify-between py-3 border-b border-border/30">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">Team Name</p>
                        <p className="text-xs text-muted-foreground">The display name for your team</p>
                      </div>
                      <span className="text-sm font-medium bg-muted/50 px-3 py-1.5 rounded-lg">
                        {currentTeam.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-border/30">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">Your Role</p>
                        <p className="text-xs text-muted-foreground">Your permission level in this team</p>
                      </div>
                      <span className={cn(
                        "text-sm font-medium px-3 py-1.5 rounded-lg capitalize",
                        currentUserRole === 'owner'
                          ? "bg-primary/10 text-primary"
                          : currentUserRole === 'admin'
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-muted/50 text-muted-foreground"
                      )}>
                        {currentUserRole || 'Member'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">Team Size</p>
                        <p className="text-xs text-muted-foreground">Total number of team members</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <IconUsers className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {currentTeam.member_count} member{currentTeam.member_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Company Info Card */}
                {currentTeam.company && (
                  <Card className="border-border/50 rounded-xl shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-blue-500/10 p-2">
                          <IconActivity className="size-4 text-blue-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Company</CardTitle>
                          <CardDescription className="text-xs">
                            Associated organization details
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Company Name</p>
                          <p className="text-xs text-muted-foreground">Linked organization</p>
                        </div>
                        <span className="text-sm font-medium bg-muted/50 px-3 py-1.5 rounded-lg">
                          {currentTeam.company.name}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions Card */}
                {canManage && (
                  <Card className="border-border/50 rounded-xl shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-violet-500/10 p-2">
                          <IconSparkles className="size-4 text-violet-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Quick Actions</CardTitle>
                          <CardDescription className="text-xs">
                            Manage your team settings
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="rounded-lg" onClick={handleSettingsClick}>
                          <IconSettings className="size-4 mr-1.5" />
                          Advanced Settings
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-lg" onClick={handleViewAllMembers}>
                          <IconUsers className="size-4 mr-1.5" />
                          Manage Members
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Danger Zone */}
                {currentUserRole === 'owner' && (
                  <Card className="border-destructive/30 bg-destructive/[0.02] rounded-xl">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-destructive/10 p-2">
                          <IconX className="size-4 text-destructive" />
                        </div>
                        <div>
                          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                          <CardDescription className="text-xs">
                            Irreversible actions that affect your team
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background">
                        <div>
                          <p className="text-sm font-medium">Transfer Ownership</p>
                          <p className="text-xs text-muted-foreground">
                            Transfer team ownership to another member
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-lg" disabled>
                          Transfer
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl border border-destructive/20 bg-background">
                        <div>
                          <p className="text-sm font-medium text-destructive">Delete Team</p>
                          <p className="text-xs text-muted-foreground">
                            Permanently delete this team and all its data
                          </p>
                        </div>
                        <Button variant="destructive" size="sm" className="rounded-lg" disabled>
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
