"use client"

/**
 * Dashboard Page
 * @description LinkedIn-style dashboard with 3-column layout:
 * Left: Profile card with metrics | Center: Create post + feed | Right: Tips, streaks, getting started
 * @module app/dashboard/page
 */

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { motion } from "framer-motion"
import dynamic from "next/dynamic"
import Link from "next/link"
import Image from "next/image"
import {
  IconPencil,
  IconPhoto,
  IconCalendarEvent,
  IconSparkles,
  IconEye,
  IconUserPlus,
  IconUsers,
  IconUser,
  IconTrendingUp,
  IconBulb,
  IconFlame,
  IconChevronRight,
  IconRocket,
  IconCheck,
  IconArticle,
  IconPresentation,
  IconTemplate,
} from "@tabler/icons-react"

import {
  ExtensionInstallBanner,
  ExtensionInstallPrompt,
  useExtensionPrompt,
} from "@/components/features/extension-install-prompt"
import { isPromptDismissed } from "@/lib/extension/detect"
import { DashboardSkeleton } from "@/components/skeletons/page-skeletons"
import { useAnalytics } from "@/hooks/use-analytics"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { usePageMeta } from "@/lib/dashboard-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { pageVariants } from "@/lib/animations"

/** Dynamically import Lottie so it doesn't block SSR */
const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

/** Lottie reaction animation URL */
const LOTTIE_REACTION_URL =
  "https://lottie.host/4f86270c-2dad-4dc0-afd9-2f93058330fa/d2KU6m2R6p.json"

/** Daily tips for the right sidebar */
const DAILY_TIPS = [
  "Posts with a question at the end get 2x more comments.",
  "Posting between 8-10am gets the most visibility on LinkedIn.",
  "Carousel posts get 3x more reach than text-only posts.",
  "Engage with 5 posts before publishing yours for better reach.",
  "Use line breaks generously — walls of text get scrolled past.",
  "Your first line is your headline. Make it count.",
  "Tag people who'd genuinely find your post useful.",
  "Repurpose your best content every 3-4 months.",
  "Reply to every comment within the first hour of posting.",
  "Share a personal story — vulnerability drives engagement.",
]

/** Getting started checklist items */
const GETTING_STARTED_ITEMS = [
  { key: "extension", label: "Install browser extension", href: "#" },
  { key: "profile", label: "Complete your profile", href: "/dashboard/settings" },
  { key: "post", label: "Create your first post", href: "/dashboard/compose" },
  { key: "template", label: "Browse templates", href: "/dashboard/templates" },
]

/**
 * Format large numbers to compact form
 * @param num - Number to format
 * @returns Formatted string like "1.2K" or "345"
 */
function formatCompact(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

/**
 * Get today's tip based on day of year (deterministic per day)
 * @returns A tip string
 */
function getTodaysTip(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length]
}

// ============================================================================
// Left Column: Profile Card
// ============================================================================

/**
 * LinkedIn-style profile card with avatar, name, tagline and key metrics
 * @param props.className - Additional CSS classes
 */
function ProfileCard({ className }: { className?: string }) {
  const { user, profile } = useAuthContext()
  const { metrics } = useAnalytics(user?.id)

  const displayName = profile?.full_name
    || (profile?.linkedin_profile?.first_name && profile?.linkedin_profile?.last_name
      ? `${profile.linkedin_profile.first_name} ${profile.linkedin_profile.last_name}`
      : null)
    || profile?.name
    || user?.user_metadata?.full_name
    || user?.email?.split("@")[0]
    || "User"

  const headline = profile?.linkedin_profile?.headline
    || profile?.linkedin_profile?.raw_data?.headline
    || profile?.linkedin_headline
    || profile?.company_name
    || ""

  const avatarUrl = profile?.linkedin_profile?.profile_picture_url
    || profile?.linkedin_profile?.raw_data?.profilePhotoUrl
    || profile?.linkedin_avatar_url
    || profile?.avatar_url
    || user?.user_metadata?.avatar_url
    || ""

  const followers = metrics?.followers.value ?? 0
  const connections = metrics?.connections?.value ?? 0
  const profileViews = metrics?.profileViews.value ?? 0

  return (
    <Card className={cn("border-border/50 overflow-hidden", className)}>
      {/* Banner gradient */}
      <div className="h-16 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20" />

      <CardContent className="pt-0 px-4 pb-4 -mt-8">
        {/* Avatar */}
        <Avatar className="size-16 border-4 border-background shadow-md">
          {avatarUrl && <AvatarImage src={avatarUrl as string} alt={displayName as string} />}
          <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
            {(displayName as string).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Name & headline */}
        <div className="mt-2">
          <h3 className="font-semibold text-sm leading-tight">{displayName}</h3>
          {headline && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {headline as string}
            </p>
          )}
        </div>

        <Separator className="my-3" />

        {/* Metrics */}
        <div className="space-y-2">
          <Link
            href="/dashboard/analytics"
            className="flex items-center justify-between text-xs hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors group"
          >
            <span className="text-muted-foreground flex items-center gap-1.5">
              <IconEye className="size-3.5" />
              Profile viewers
            </span>
            <span className="font-semibold text-primary tabular-nums">
              {formatCompact(profileViews)}
            </span>
          </Link>
          <Link
            href="/dashboard/analytics"
            className="flex items-center justify-between text-xs hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors group"
          >
            <span className="text-muted-foreground flex items-center gap-1.5">
              <IconUserPlus className="size-3.5" />
              Followers
            </span>
            <span className="font-semibold text-primary tabular-nums">
              {formatCompact(followers)}
            </span>
          </Link>
          <Link
            href="/dashboard/analytics"
            className="flex items-center justify-between text-xs hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors group"
          >
            <span className="text-muted-foreground flex items-center gap-1.5">
              <IconUsers className="size-3.5" />
              Connections
            </span>
            <span className="font-semibold text-primary tabular-nums">
              {formatCompact(connections)}
            </span>
          </Link>
        </div>

        <Separator className="my-3" />

        {/* Quick links */}
        <div className="space-y-1">
          <Link
            href="/dashboard/drafts"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground -mx-2 px-2 py-1 rounded-md transition-colors"
          >
            <IconArticle className="size-3.5" />
            Saved Drafts
          </Link>
          <Link
            href="/dashboard/analytics"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground -mx-2 px-2 py-1 rounded-md transition-colors"
          >
            <IconTrendingUp className="size-3.5" />
            Analytics & Goals
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Center Column: Create Post + Recent Activity
// ============================================================================

/**
 * LinkedIn-style "Start a post" prompt card
 * Clicking opens the compose page
 */
function CreatePostCard({ className }: { className?: string }) {
  const { profile, user } = useAuthContext()

  const avatarUrl = profile?.linkedin_profile?.profile_picture_url
    || profile?.linkedin_avatar_url
    || profile?.avatar_url
    || user?.user_metadata?.avatar_url
    || ""

  const displayName = profile?.full_name
    || profile?.name
    || user?.user_metadata?.full_name
    || "User"

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 shrink-0">
            {avatarUrl && <AvatarImage src={avatarUrl as string} alt={displayName as string} />}
            <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
              {(displayName as string).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Link
            href="/dashboard/compose"
            className="flex-1 rounded-full border border-border/60 hover:bg-muted/50 transition-colors px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Start a post...
          </Link>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-1 mt-3 -mx-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/dashboard/compose">
              <IconPhoto className="size-4 text-blue-500" />
              Media
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/dashboard/compose">
              <IconSparkles className="size-4 text-amber-500" />
              AI Generate
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/dashboard/carousels">
              <IconPresentation className="size-4 text-emerald-500" />
              Carousel
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/dashboard/templates">
              <IconTemplate className="size-4 text-purple-500" />
              Template
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Quick analytics snapshot shown below the create post card
 * Shows impressions, engagement rate, and trend
 */
function QuickAnalyticsCard({ className }: { className?: string }) {
  const { user } = useAuthContext()
  const { metrics, isLoading } = useAnalytics(user?.id)
  const [lottieData, setLottieData] = useState<unknown>(null)

  useEffect(() => {
    fetch(LOTTIE_REACTION_URL)
      .then(res => res.json())
      .then(data => setLottieData(data))
      .catch(() => {})
  }, [])

  if (isLoading) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-12 bg-muted rounded" />
              <div className="h-12 bg-muted rounded" />
              <div className="h-12 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const impressions = metrics?.impressions.value ?? 0
  const impressionsChange = metrics?.impressions.change ?? 0
  const engagement = metrics?.engagementRate.value ?? 0
  const engagementChange = metrics?.engagementRate.change ?? 0
  const followers = metrics?.followers.value ?? 0
  const followersChange = metrics?.followers.change ?? 0

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <IconTrendingUp className="size-4 text-primary" />
            Your Performance
          </h4>
          <Link
            href="/dashboard/analytics"
            className="text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            View all
            <IconChevronRight className="size-3" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Impressions */}
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold tabular-nums">{formatCompact(impressions)}</p>
            <p className="text-[10px] text-muted-foreground">Impressions</p>
            <div className={cn(
              "text-[10px] font-medium mt-0.5",
              impressionsChange >= 0 ? "text-emerald-500" : "text-red-500"
            )}>
              {impressionsChange >= 0 ? "+" : ""}{impressionsChange.toFixed(1)}%
            </div>
          </div>

          {/* Engagement */}
          <div className="text-center p-2 rounded-lg bg-muted/30 relative">
            {lottieData && (
              <div className="absolute -top-2 -right-1 size-6">
                <Lottie animationData={lottieData} loop autoplay className="size-6" />
              </div>
            )}
            <p className="text-lg font-bold tabular-nums">{engagement.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">Engagement</p>
            <div className={cn(
              "text-[10px] font-medium mt-0.5",
              engagementChange >= 0 ? "text-emerald-500" : "text-red-500"
            )}>
              {engagementChange >= 0 ? "+" : ""}{engagementChange.toFixed(1)}%
            </div>
          </div>

          {/* Followers */}
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold tabular-nums">{formatCompact(followers)}</p>
            <p className="text-[10px] text-muted-foreground">Followers</p>
            <div className={cn(
              "text-[10px] font-medium mt-0.5",
              followersChange >= 0 ? "text-emerald-500" : "text-red-500"
            )}>
              {followersChange >= 0 ? "+" : ""}{followersChange.toFixed(1)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Quick actions grid for common tasks
 */
function QuickActionsCard({ className }: { className?: string }) {
  const actions = [
    { label: "Write Post", icon: IconPencil, href: "/dashboard/compose", color: "text-blue-500" },
    { label: "Inspiration", icon: IconBulb, href: "/dashboard/inspiration", color: "text-amber-500" },
    { label: "Carousel", icon: IconPresentation, href: "/dashboard/carousels", color: "text-emerald-500" },
    { label: "Templates", icon: IconTemplate, href: "/dashboard/templates", color: "text-purple-500" },
  ]

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-4">
        <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/40 hover:bg-muted/50 hover:border-primary/20 transition-all group"
            >
              <div className="rounded-lg bg-muted/50 p-1.5 group-hover:bg-primary/10 transition-colors">
                <action.icon className={cn("size-4", action.color)} />
              </div>
              <span className="text-xs font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Right Column: Tips, Streaks, Getting Started
// ============================================================================

/**
 * Daily tip card with rotating tips
 */
function DailyTipCard({ className }: { className?: string }) {
  const tip = useMemo(() => getTodaysTip(), [])

  return (
    <Card className={cn("border-border/50 bg-gradient-to-br from-amber-500/5 to-transparent", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-lg bg-amber-500/10 p-1.5">
            <IconBulb className="size-4 text-amber-500" />
          </div>
          <h4 className="text-sm font-medium">Daily Tip</h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
      </CardContent>
    </Card>
  )
}

/**
 * Posting streak tracker
 * Tracks consecutive days of posting
 */
function StreakCard({ className }: { className?: string }) {
  // Streak would come from the backend — for now show encouraging default
  const streak = 0
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"]
  const today = new Date().getDay()
  // Convert Sunday=0 to Monday=0 indexing
  const adjustedToday = today === 0 ? 6 : today - 1

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-lg bg-orange-500/10 p-1.5">
            <IconFlame className="size-4 text-orange-500" />
          </div>
          <h4 className="text-sm font-medium">Posting Streak</h4>
          {streak > 0 && (
            <span className="ml-auto text-xs font-bold text-orange-500 tabular-nums">
              {streak} day{streak !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Week visualization */}
        <div className="flex items-center gap-1.5">
          {weekDays.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  "size-7 rounded-full flex items-center justify-center text-[10px] font-medium border transition-colors",
                  i === adjustedToday
                    ? "border-primary bg-primary/10 text-primary"
                    : i < adjustedToday
                      ? "border-muted bg-muted/50 text-muted-foreground"
                      : "border-border/40 text-muted-foreground/50"
                )}
              >
                {day}
              </div>
            </div>
          ))}
        </div>

        {streak === 0 && (
          <p className="text-[11px] text-muted-foreground mt-2.5 text-center">
            Post today to start your streak!
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Getting started checklist for new users
 */
function GettingStartedCard({ className }: { className?: string }) {
  const { profile, extensionInstalled } = useAuthContext()

  // Determine completed items
  const completedItems = useMemo(() => {
    const completed = new Set<string>()
    if (extensionInstalled) completed.add("extension")
    if (profile?.onboarding_completed) completed.add("profile")
    return completed
  }, [extensionInstalled, profile?.onboarding_completed])

  const progress = completedItems.size
  const total = GETTING_STARTED_ITEMS.length

  // Hide if all items are completed
  if (progress >= total) return null

  return (
    <Card className={cn("border-border/50 bg-gradient-to-br from-primary/5 to-transparent", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <IconRocket className="size-4 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium">Get Started</h4>
            <p className="text-[10px] text-muted-foreground">{progress}/{total} complete</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(progress / total) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Checklist */}
        <div className="space-y-1.5">
          {GETTING_STARTED_ITEMS.map((item) => {
            const done = completedItems.has(item.key)
            return (
              <Link
                key={item.key}
                href={done ? "#" : item.href}
                className={cn(
                  "flex items-center gap-2 text-xs py-1 transition-colors rounded",
                  done
                    ? "text-muted-foreground line-through"
                    : "text-foreground hover:text-primary"
                )}
              >
                <div
                  className={cn(
                    "size-4 rounded-full border flex items-center justify-center shrink-0",
                    done
                      ? "bg-primary border-primary"
                      : "border-border"
                  )}
                >
                  {done && <IconCheck className="size-2.5 text-primary-foreground" />}
                </div>
                {item.label}
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Today's date display card
 */
function TodayCard({ className }: { className?: string }) {
  const now = new Date()
  const greeting = now.getHours() < 12
    ? "Good morning"
    : now.getHours() < 18
      ? "Good afternoon"
      : "Good evening"

  const { profile, user } = useAuthContext()
  const firstName = profile?.full_name?.split(" ")[0]
    || profile?.linkedin_profile?.first_name
    || profile?.name?.split(" ")[0]
    || user?.user_metadata?.full_name?.split(" ")[0]
    || user?.email?.split("@")[0]
    || ""

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <IconCalendarEvent className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </div>
        <p className="text-sm font-medium">
          {greeting}{firstName ? `, ${firstName}` : ""}!
        </p>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Dashboard Content
// ============================================================================

/**
 * Dashboard content component with LinkedIn-style 3-column layout
 */
function DashboardContent() {
  const { user, profile, extensionInstalled } = useAuthContext()

  // Suppress extension prompts while the dashboard tour is active / not yet completed
  const tourCompleted = profile?.dashboard_tour_completed !== false

  // Extension install popup dialog (shown once after delay if extension not installed AND tour is done)
  const { showPrompt, setShowPrompt } = useExtensionPrompt({
    delay: 2000,
    autoCheck: extensionInstalled === false && tourCompleted,
  })

  // Track if the extension banner has been dismissed this session
  const [bannerDismissed, setBannerDismissed] = React.useState(false)
  const showExtensionBanner =
    tourCompleted && extensionInstalled === false && !isPromptDismissed() && !bannerDismissed

  return (
    <motion.div
      className="flex flex-col gap-4 py-4 md:py-6"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Extension Install Banner */}
      <ExtensionInstallBanner
        visible={showExtensionBanner}
        onDismiss={() => setBannerDismissed(true)}
      />

      {/* Extension Install Popup Dialog */}
      <ExtensionInstallPrompt
        open={showPrompt && tourCompleted}
        onOpenChange={setShowPrompt}
        onDismiss={(permanent) => {
          setShowPrompt(false)
          if (permanent) setBannerDismissed(true)
        }}
      />

      {/* LinkedIn-style 3-column layout */}
      <div className="px-4 lg:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr_280px] xl:grid-cols-[260px_1fr_300px]">
          {/* LEFT COLUMN: Profile card */}
          <div className="space-y-4" data-tour="profile-card">
            <ProfileCard />
          </div>

          {/* CENTER COLUMN: Create post + analytics + quick actions */}
          <div className="space-y-4" data-tour="create-post">
            <CreatePostCard />
            <QuickAnalyticsCard />
            <QuickActionsCard />
          </div>

          {/* RIGHT COLUMN: Today, tips, streak, getting started */}
          <div className="space-y-4" data-tour="sidebar-widgets">
            <TodayCard />
            <DailyTipCard />
            <StreakCard />
            <GettingStartedCard />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Dashboard page component
 * @returns LinkedIn-style dashboard with profile, create post, and tips/streaks
 */
export default function DashboardPage() {
  usePageMeta({
    title: "Dashboard",
  })
  const { isLoading: authLoading } = useAuthContext()

  return authLoading ? <DashboardSkeleton /> : <DashboardContent />
}
