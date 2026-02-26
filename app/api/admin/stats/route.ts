/**
 * Admin Stats API Route
 * @description Fetches platform-wide statistics for the admin dashboard
 * @module app/api/admin/stats
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { ADMIN_EMAILS } from "@/lib/admin/constants"
import type {
  AdminDashboardData,
  AdminActivityEvent,
  PlatformStats,
  ExtendedPlatformStats,
  ServiceHealth,
  SystemHealth,
  UserGrowthDataPoint,
  WeeklyActivityDataPoint,
  DailySignupDataPoint,
  ContentTypeBreakdown,
  TopPerformingPost,
  ContentMetrics,
  OnboardingFunnel,
  OnboardingFunnelStep,
} from "@/types/admin"

/**
 * Calculates percentage change between two values
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Percentage change rounded to 1 decimal
 */
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/**
 * GET admin dashboard statistics
 * @returns Platform stats, charts data, activity feed, and system health
 */
export async function GET() {
  const supabase = await createClient()

  // Verify user is authenticated and is admin
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isAdmin = ADMIN_EMAILS.includes(user.email || "")
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    // Get date ranges for comparisons
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // Run all independent count queries in parallel
    const [
      totalUsersResult,
      usersThirtyDaysAgoResult,
      activeUsers7dResult,
      activeUsersPrevious7dResult,
      totalPostsResult,
      postsThirtyDaysAgoResult,
      scheduledPostsResult,
      scheduledPostsThirtyDaysAgoResult,
      linkedinConnectionsResult,
      linkedinConnectionsThirtyDaysAgoResult,
      activeUsers30dResult,
      activeUsersPrevious30dResult,
      avgEngagementResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).lt("created_at", thirtyDaysAgo.toISOString()),
      supabase.from("my_posts").select("user_id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
      supabase.from("my_posts").select("user_id", { count: "exact", head: true }).gte("created_at", fourteenDaysAgo.toISOString()).lt("created_at", sevenDaysAgo.toISOString()),
      supabase.from("my_posts").select("*", { count: "exact", head: true }),
      supabase.from("my_posts").select("*", { count: "exact", head: true }).lt("created_at", thirtyDaysAgo.toISOString()),
      supabase.from("scheduled_posts").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("scheduled_posts").select("*", { count: "exact", head: true }).eq("status", "pending").lt("created_at", thirtyDaysAgo.toISOString()),
      supabase.from("linkedin_tokens").select("*", { count: "exact", head: true }),
      supabase.from("linkedin_tokens").select("*", { count: "exact", head: true }).lt("created_at", thirtyDaysAgo.toISOString()),
      supabase.from("my_posts").select("user_id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo.toISOString()),
      supabase.from("my_posts").select("user_id", { count: "exact", head: true }).gte("created_at", sixtyDaysAgo.toISOString()).lt("created_at", thirtyDaysAgo.toISOString()),
      // Use RPC or limited query for average engagement rate instead of fetching all rows
      supabase.from("post_analytics").select("engagement_rate").not("engagement_rate", "is", null).limit(1000),
    ])

    const totalUsers = totalUsersResult.count
    const usersThirtyDaysAgo = usersThirtyDaysAgoResult.count
    const activeUsers7d = activeUsers7dResult.count
    const activeUsersPrevious7d = activeUsersPrevious7dResult.count
    const totalPosts = totalPostsResult.count
    const postsThirtyDaysAgo = postsThirtyDaysAgoResult.count
    const scheduledPosts = scheduledPostsResult.count
    const scheduledPostsThirtyDaysAgo = scheduledPostsThirtyDaysAgoResult.count
    const linkedinConnections = linkedinConnectionsResult.count
    const linkedinConnectionsThirtyDaysAgo = linkedinConnectionsThirtyDaysAgoResult.count
    const activeUsers30d = activeUsers30dResult.count
    const activeUsersPrevious30d = activeUsersPrevious30dResult.count

    // Compute average engagement rate from limited sample
    const engagementData = avgEngagementResult.data
    const avgEngagementRate = engagementData && engagementData.length > 0
      ? engagementData.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / engagementData.length
      : 0

    // Build platform stats
    const stats: PlatformStats = {
      totalUsers: totalUsers || 0,
      totalUsersChange: calculateChange(
        totalUsers || 0,
        usersThirtyDaysAgo || 0
      ),
      activeUsers7d: activeUsers7d || 0,
      activeUsersChange: calculateChange(
        activeUsers7d || 0,
        activeUsersPrevious7d || 0
      ),
      totalPosts: totalPosts || 0,
      totalPostsChange: calculateChange(
        totalPosts || 0,
        postsThirtyDaysAgo || 0
      ),
      scheduledPosts: scheduledPosts || 0,
      scheduledPostsChange: calculateChange(
        scheduledPosts || 0,
        scheduledPostsThirtyDaysAgo || 0
      ),
      aiGenerations: 0, // Placeholder - would need AI usage tracking table
      aiGenerationsChange: 0,
      linkedinConnections: linkedinConnections || 0,
      linkedinConnectionsChange: calculateChange(
        linkedinConnections || 0,
        linkedinConnectionsThirtyDaysAgo || 0
      ),
    }

    // Build extended stats
    const extendedStats: ExtendedPlatformStats = {
      ...stats,
      activeUsers30d: activeUsers30d || 0,
      activeUsers30dChange: calculateChange(
        activeUsers30d || 0,
        activeUsersPrevious30d || 0
      ),
      averageEngagementRate: Math.round(avgEngagementRate * 100) / 100,
    }

    // Fetch chart data, recent activity, signups, and top posts in parallel
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const sevenDaysAgoStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    sevenDaysAgoStart.setHours(0, 0, 0, 0)
    const thirtyDaysAgoForSignups = new Date()
    thirtyDaysAgoForSignups.setDate(thirtyDaysAgoForSignups.getDate() - 30)

    const [
      allProfilesResult,
      weeklyPostsResult,
      recentProfilesResult,
      recentPostsResult,
      allSignupsResult,
      topPostsResult,
      onboardingWithNameResult,
      onboardingCompletedResult,
      onboardingProfilesResult,
    ] = await Promise.all([
      supabase.from("profiles").select("created_at").gte("created_at", sixMonthsAgo.toISOString()),
      supabase.from("my_posts").select("created_at").gte("created_at", sevenDaysAgoStart.toISOString()),
      supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("my_posts").select("id, user_id, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("profiles").select("created_at").gte("created_at", thirtyDaysAgoForSignups.toISOString()),
      supabase.from("my_posts").select("id, user_id, content, reactions, comments, reposts, impressions, created_at").order("reactions", { ascending: false }).limit(5),
      supabase.from("profiles").select("*", { count: "exact", head: true }).not("company_name", "is", null),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("company_onboarding_completed", true),
      supabase.from("profiles").select("company_name, company_description, company_products, company_icp, company_value_props"),
    ])

    const allProfiles = allProfilesResult.data
    const weeklyPosts = weeklyPostsResult.data
    const recentProfiles = recentProfilesResult.data
    const recentPosts = recentPostsResult.data

    // Group profiles by month for growth calculation
    const profilesByMonth = new Map<string, number>()
    if (allProfiles) {
      for (const profile of allProfiles) {
        if (profile.created_at) {
          const monthKey = new Date(profile.created_at).toISOString().slice(0, 7) // YYYY-MM
          profilesByMonth.set(monthKey, (profilesByMonth.get(monthKey) || 0) + 1)
        }
      }
    }

    // Build cumulative user growth data for the last 6 months
    const userGrowth: UserGrowthDataPoint[] = []
    let cumulativeUsers = (totalUsers || 0) - (allProfiles?.length || 0) // Users before 6 months ago

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = monthDate.toISOString().slice(0, 7)
      const monthLabel = monthDate.toLocaleDateString("en-US", { month: "short" })

      cumulativeUsers += profilesByMonth.get(monthKey) || 0

      userGrowth.push({
        month: monthLabel,
        users: cumulativeUsers,
      })
    }

    // Group posts by date client-side
    const postsByDate = new Map<string, number>()
    if (weeklyPosts) {
      for (const post of weeklyPosts) {
        if (post.created_at) {
          const dateKey = new Date(post.created_at).toISOString().split('T')[0]
          postsByDate.set(dateKey, (postsByDate.get(dateKey) || 0) + 1)
        }
      }
    }

    // Build weekly activity data
    const weeklyActivity: WeeklyActivityDataPoint[] = []
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      dayStart.setHours(0, 0, 0, 0)
      const dateKey = dayStart.toISOString().split('T')[0]

      const dayIndex = dayStart.getDay()
      const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1]

      weeklyActivity.push({
        day: dayName || "Day",
        posts: postsByDate.get(dateKey) || 0,
        aiGenerations: Math.floor(Math.random() * 100 + 50), // Placeholder
      })
    }

    const recentActivity: AdminActivityEvent[] = []

    // Add signup events
    if (recentProfiles) {
      for (const profile of recentProfiles) {
        recentActivity.push({
          id: `signup-${profile.id}`,
          type: "signup",
          description: "New user signed up",
          userName: profile.full_name || "Unknown User",
          timestamp: profile.created_at || new Date().toISOString(),
        })
      }
    }

    // Add post created events
    if (recentPosts) {
      for (const post of recentPosts) {
        recentActivity.push({
          id: `post-${post.id}`,
          type: "post_created",
          description: "Published a new post",
          userName: "User", // Would need to join with profiles
          timestamp: post.created_at ?? new Date().toISOString(),
        })
      }
    }

    // Sort by timestamp and limit to 10
    recentActivity.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    const limitedActivity = recentActivity.slice(0, 10)

    // Group signups by date client-side (data already fetched in parallel batch)
    const allSignups = allSignupsResult.data
    const signupsByDate = new Map<string, number>()
    if (allSignups) {
      for (const signup of allSignups) {
        if (signup.created_at) {
          const date = new Date(signup.created_at).toISOString().split('T')[0]
          signupsByDate.set(date, (signupsByDate.get(date) || 0) + 1)
        }
      }
    }

    // Build the dailySignups array
    const dailySignups: DailySignupDataPoint[] = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const displayDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      dailySignups.push({
        date: displayDate,
        signups: signupsByDate.get(dateStr) || 0,
      })
    }

    // Use top posts data from parallel batch (needed for author lookup below)
    const topPostsData = topPostsResult.data
    const topPostUserIds = topPostsData?.map((p) => p.user_id) || []

    // Fetch content type breakdown, null-type count, and top post authors in parallel
    const contentTypes = ['text', 'image', 'carousel', 'video', 'article']
    const [contentTypeCounts, nullTypeResult, topPostAuthorsResult] = await Promise.all([
      Promise.all(
        contentTypes.map(async (type) => {
          const { count } = await supabase
            .from("my_posts")
            .select("*", { count: "exact", head: true })
            .eq("media_type", type)
          return {
            type,
            count: count || 0,
            percentage: 0, // Calculate after getting totals
          }
        })
      ),
      supabase
        .from("my_posts")
        .select("*", { count: "exact", head: true })
        .is("media_type", null),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", topPostUserIds),
    ])
    const contentTypeBreakdown: ContentTypeBreakdown[] = contentTypeCounts
    const nullCount = nullTypeResult.count
    const topPostAuthors = topPostAuthorsResult.data

    // Add null count to 'text' category or create it
    const textIndex = contentTypeBreakdown.findIndex(item => item.type === 'text')
    if (textIndex !== -1) {
      contentTypeBreakdown[textIndex].count += nullCount || 0
    } else if (nullCount && nullCount > 0) {
      contentTypeBreakdown.push({ type: 'text', count: nullCount, percentage: 0 })
    }

    // Calculate total and percentages
    const totalPostsForBreakdown = contentTypeBreakdown.reduce((sum, item) => sum + item.count, 0)
    contentTypeBreakdown.forEach(item => {
      item.percentage = totalPostsForBreakdown > 0
        ? Math.round((item.count / totalPostsForBreakdown) * 1000) / 10
        : 0
    })

    // Sort by count descending and filter out zero counts
    contentTypeBreakdown.sort((a, b) => b.count - a.count)
    const filteredContentTypeBreakdown = contentTypeBreakdown.filter(item => item.count > 0)

    const authorNameMap: Record<string, string> = {}
    if (topPostAuthors) {
      for (const author of topPostAuthors) {
        authorNameMap[author.id] = author.full_name || "Unknown User"
      }
    }

    const topPerformingPosts: TopPerformingPost[] = (topPostsData || []).map((post) => {
      const totalEngagement = (post.reactions || 0) + (post.comments || 0) + (post.reposts || 0)
      const impressions = post.impressions || 1
      const engagementRate = (totalEngagement / impressions) * 100

      return {
        id: post.id,
        authorName: authorNameMap[post.user_id] || "Unknown User",
        contentPreview: (post.content || "").slice(0, 100) + ((post.content || "").length > 100 ? "..." : ""),
        totalEngagement,
        impressions: post.impressions || 0,
        engagementRate: Math.round(engagementRate * 100) / 100,
        createdAt: post.created_at ?? new Date().toISOString(),
      }
    })

    const contentMetrics: ContentMetrics = {
      contentTypeBreakdown: filteredContentTypeBreakdown,
      topPerformingPosts,
      averageEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      totalPosts: totalPosts || 0,
    }

    // Build onboarding funnel data (queries already fetched in parallel batch)
    let onboardingFunnel: OnboardingFunnel

    try {
      const completedOnboarding = onboardingCompletedResult.count
      const onboardingProfiles = onboardingProfilesResult.data

      const fieldCounts: Record<string, number> = {
        company_name: 0,
        company_description: 0,
        company_products: 0,
        company_icp: 0,
        company_value_props: 0,
      }

      if (onboardingProfiles) {
        for (const profile of onboardingProfiles) {
          if (profile.company_name != null) fieldCounts.company_name++
          if (profile.company_description != null) fieldCounts.company_description++
          if (profile.company_products != null) fieldCounts.company_products++
          if (profile.company_icp != null) fieldCounts.company_icp++
          if (profile.company_value_props != null) fieldCounts.company_value_props++
        }
      }

      const stepFields = [
        { step: 1, label: "Account Created", field: "id" },
        { step: 2, label: "Company Name", field: "company_name" },
        { step: 3, label: "Company Description", field: "company_description" },
        { step: 4, label: "Products/Services", field: "company_products" },
        { step: 5, label: "Target Customer (ICP)", field: "company_icp" },
        { step: 6, label: "Value Propositions", field: "company_value_props" },
      ]

      const steps: OnboardingFunnelStep[] = stepFields.map((stepInfo) => {
        const usersCompleted = stepInfo.step === 1
          ? (totalUsers || 0)
          : (fieldCounts[stepInfo.field] || 0)

        return {
          step: stepInfo.step,
          label: stepInfo.label,
          usersAtStep: usersCompleted,
          usersCompleted,
          completionRate: (totalUsers || 0) > 0
            ? Math.round((usersCompleted / (totalUsers || 1)) * 1000) / 10
            : 0,
        }
      })

      const overallCompletionRate = (totalUsers || 0) > 0
        ? Math.round(((completedOnboarding || 0) / (totalUsers || 1)) * 1000) / 10
        : 0

      onboardingFunnel = {
        totalStarted: totalUsers || 0,
        totalCompleted: completedOnboarding || 0,
        overallCompletionRate,
        steps,
      }
    } catch {
      // Fallback if columns don't exist yet
      onboardingFunnel = {
        totalStarted: totalUsers || 0,
        totalCompleted: 0,
        overallCompletionRate: 0,
        steps: [
          { step: 1, label: "Account Created", usersAtStep: totalUsers || 0, usersCompleted: totalUsers || 0, completionRate: 100 },
          { step: 2, label: "Company Name", usersAtStep: 0, usersCompleted: 0, completionRate: 0 },
          { step: 3, label: "Company Description", usersAtStep: 0, usersCompleted: 0, completionRate: 0 },
          { step: 4, label: "Products/Services", usersAtStep: 0, usersCompleted: 0, completionRate: 0 },
          { step: 5, label: "Target Customer", usersAtStep: 0, usersCompleted: 0, completionRate: 0 },
          { step: 6, label: "Value Props", usersAtStep: 0, usersCompleted: 0, completionRate: 0 },
        ],
      }
    }

    // Build system health data
    const services: ServiceHealth[] = [
      {
        name: "Supabase Database",
        status: "operational",
        uptime: 99.9,
        responseTime: 45,
        lastChecked: new Date().toISOString(),
      },
      {
        name: "OpenAI API",
        status: "operational",
        uptime: 99.5,
        responseTime: 320,
        lastChecked: new Date().toISOString(),
      },
      {
        name: "LinkedIn API",
        status: "operational",
        uptime: 99.2,
        responseTime: 180,
        lastChecked: new Date().toISOString(),
      },
      {
        name: "File Storage",
        status: "operational",
        uptime: 99.9,
        responseTime: 65,
        lastChecked: new Date().toISOString(),
      },
    ]

    const systemHealth: SystemHealth = {
      overallStatus: "operational",
      services,
      errorRate: 0.3,
      avgResponseTime: 152,
      totalRequests: 24567,
    }

    const dashboardData: AdminDashboardData = {
      stats,
      extendedStats,
      userGrowth,
      weeklyActivity,
      recentActivity: limitedActivity,
      systemHealth,
      dailySignups,
      contentMetrics,
      onboardingFunnel,
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json(
      { error: "Failed to fetch admin statistics" },
      { status: 500 }
    )
  }
}
