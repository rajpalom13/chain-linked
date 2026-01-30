/**
 * Team Leaderboard Hook
 * @description Fetches and calculates team member statistics for the leaderboard
 * @module hooks/use-team-leaderboard
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthContext } from '@/lib/auth/auth-provider'
import type { TeamMemberStats, LeaderboardTimeRange } from '@/components/features/team-leaderboard'

/**
 * Hook return type for team leaderboard
 */
interface UseTeamLeaderboardReturn {
  /** Team member statistics for leaderboard */
  members: TeamMemberStats[]
  /** Loading state */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Currently selected time range */
  timeRange: LeaderboardTimeRange
  /** Update the time range */
  setTimeRange: (range: LeaderboardTimeRange) => void
  /** Refetch leaderboard data */
  refetch: () => Promise<void>
  /** Current user ID for highlighting */
  currentUserId: string | null
}

/**
 * Get start date for time range filter
 * @param range - Time range to calculate
 * @returns ISO date string for start of period
 */
function getStartDate(range: LeaderboardTimeRange): string {
  const now = new Date()
  switch (range) {
    case 'week':
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - 7)
      return weekStart.toISOString()
    case 'month':
      const monthStart = new Date(now)
      monthStart.setMonth(now.getMonth() - 1)
      return monthStart.toISOString()
    case 'all-time':
    default:
      return new Date(0).toISOString()
  }
}

/**
 * Demo leaderboard data for when database is empty or unavailable
 */
const DEMO_LEADERBOARD: TeamMemberStats[] = [
  { id: 'demo-1', name: 'Sarah Chen', role: 'VP of Engineering', postsThisWeek: 5, postsThisMonth: 18, totalEngagement: 4520, engagementRate: 5.8, rank: 1, rankChange: 2 },
  { id: 'demo-2', name: 'Marcus Johnson', role: 'Product Manager', postsThisWeek: 4, postsThisMonth: 15, totalEngagement: 3890, engagementRate: 5.2, rank: 2, rankChange: -1 },
  { id: 'demo-3', name: 'Emily Rodriguez', role: 'Design Lead', postsThisWeek: 3, postsThisMonth: 12, totalEngagement: 2340, engagementRate: 4.9, rank: 3, rankChange: 1 },
  { id: 'demo-4', name: 'Alex Kim', role: 'Software Engineer', postsThisWeek: 2, postsThisMonth: 8, totalEngagement: 1560, engagementRate: 4.2, rank: 4, rankChange: 0 },
]

/**
 * Hook to fetch team leaderboard data
 * Aggregates post counts and engagement metrics per team member
 * @returns Team leaderboard data and controls
 * @example
 * const { members, isLoading, timeRange, setTimeRange } = useTeamLeaderboard()
 */
export function useTeamLeaderboard(): UseTeamLeaderboardReturn {
  // Get auth state from context
  const { user, isLoading: authLoading } = useAuthContext()

  // State initialization
  const [members, setMembers] = useState<TeamMemberStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<LeaderboardTimeRange>('week')
  const supabase = createClient()

  /**
   * Fetch leaderboard data from database
   */
  const fetchLeaderboard = useCallback(async () => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      return
    }

    // If no user (not authenticated), show demo data
    if (!user) {
      setMembers(DEMO_LEADERBOARD)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Get user's team membership - handle gracefully if table doesn't exist
      let teamMemberIds: string[] = [user!.id]

      try {
        const { data: teamMembership, error: teamError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user!.id)
          .single()

        // If table doesn't exist or RLS blocks access, continue with solo user
        if (teamError) {
          // 406 = Not Acceptable (often RLS/table issues), PGRST116 = not found
          if (teamError.code !== 'PGRST116' && teamError.code !== '406' && !teamError.message?.includes('406')) {
            console.warn('Team membership query error:', teamError.message)
          }
        } else if (teamMembership?.team_id) {
          // Get all team members
          const { data: teamMembersData, error: membersError } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', teamMembership.team_id)

          if (!membersError && teamMembersData && teamMembersData.length > 0) {
            teamMemberIds = teamMembersData.map(m => m.user_id)
          }
        }
      } catch {
        // Silently continue with solo user if team_members table is unavailable
        console.info('Team members table unavailable, using solo mode')
      }

      // Get user profiles for team members
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', teamMemberIds)

      if (!usersData || usersData.length === 0) {
        // Keep demo data when no real data exists
        console.info('No team members found, keeping demo data')
        setIsLoading(false)
        return
      }

      // Get LinkedIn profiles for role/headline info
      const { data: profilesData } = await supabase
        .from('linkedin_profiles')
        .select('user_id, headline')
        .in('user_id', teamMemberIds)

      // Get posts for the selected time range
      const startDate = getStartDate(timeRange)
      const weekStart = getStartDate('week')
      const monthStart = getStartDate('month')

      // Fetch all posts for team members
      const { data: postsData } = await supabase
        .from('my_posts')
        .select('user_id, posted_at, reactions, comments, reposts, impressions')
        .in('user_id', teamMemberIds)
        .gte('posted_at', timeRange === 'all-time' ? new Date(0).toISOString() : startDate)
        .order('posted_at', { ascending: false })

      // Also fetch week and month posts for the respective counts
      const { data: allPostsData } = await supabase
        .from('my_posts')
        .select('user_id, posted_at, reactions, comments, reposts, impressions')
        .in('user_id', teamMemberIds)

      // Aggregate stats per user
      const userStatsMap = new Map<string, {
        postsThisWeek: number
        postsThisMonth: number
        totalEngagement: number
        totalImpressions: number
      }>()

      // Initialize all users
      teamMemberIds.forEach(id => {
        userStatsMap.set(id, {
          postsThisWeek: 0,
          postsThisMonth: 0,
          totalEngagement: 0,
          totalImpressions: 0,
        })
      })

      // Calculate stats from posts
      if (allPostsData) {
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        allPostsData.forEach(post => {
          const stats = userStatsMap.get(post.user_id)
          if (!stats) return

          const postDate = post.posted_at ? new Date(post.posted_at) : null
          if (postDate) {
            if (postDate >= weekAgo) {
              stats.postsThisWeek++
            }
            if (postDate >= monthAgo) {
              stats.postsThisMonth++
            }
          }

          // Calculate engagement
          const engagement = (post.reactions || 0) + (post.comments || 0) + (post.reposts || 0)
          stats.totalEngagement += engagement
          stats.totalImpressions += post.impressions || 0
        })
      }

      // Build leaderboard entries
      const leaderboardEntries: TeamMemberStats[] = usersData.map(userData => {
        const profile = profilesData?.find(p => p.user_id === userData.id)
        const stats = userStatsMap.get(userData.id) || {
          postsThisWeek: 0,
          postsThisMonth: 0,
          totalEngagement: 0,
          totalImpressions: 0,
        }

        // Calculate engagement rate (engagement / impressions * 100)
        const engagementRate = stats.totalImpressions > 0
          ? (stats.totalEngagement / stats.totalImpressions) * 100
          : 0

        return {
          id: userData.id,
          name: userData.full_name || userData.email?.split('@')[0] || 'Unknown User',
          avatarUrl: userData.avatar_url || undefined,
          role: profile?.headline || 'Team Member',
          postsThisWeek: stats.postsThisWeek,
          postsThisMonth: stats.postsThisMonth,
          totalEngagement: stats.totalEngagement,
          engagementRate: Math.round(engagementRate * 10) / 10,
          rank: 0, // Will be calculated below
          rankChange: 0, // Would need historical data to calculate
        }
      })

      // Sort by engagement and assign ranks
      const sortedEntries = [...leaderboardEntries].sort((a, b) => {
        // Sort by engagement rate first, then by total engagement
        if (b.engagementRate !== a.engagementRate) {
          return b.engagementRate - a.engagementRate
        }
        return b.totalEngagement - a.totalEngagement
      })

      sortedEntries.forEach((entry, index) => {
        entry.rank = index + 1
      })

      setMembers(sortedEntries)
    } catch (err) {
      console.error('Team leaderboard fetch error:', err)
      // Keep demo data on error for better UX
      setMembers(DEMO_LEADERBOARD)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, timeRange, user, authLoading])

  // Fetch when auth state changes or on mount
  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  // Combined loading state
  const combinedLoading = authLoading || isLoading

  return {
    members,
    isLoading: combinedLoading,
    error,
    timeRange,
    setTimeRange,
    refetch: fetchLeaderboard,
    currentUserId: user?.id || null,
  }
}
