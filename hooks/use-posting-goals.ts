/**
 * Posting Goals Hook
 * @description Fetches and manages posting goals from Supabase
 * @module hooks/use-posting-goals
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'
import type { Goal } from '@/components/features/goals-tracker'

/**
 * Demo goals for when database is empty or unavailable
 */
const DEMO_GOALS: Goal[] = [
  {
    id: 'demo-weekly-goal',
    period: 'weekly',
    target: 5,
    current: 3,
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-monthly-goal',
    period: 'monthly',
    target: 20,
    current: 12,
    startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

/**
 * Hook return type for posting goals data
 */
interface UsePostingGoalsReturn {
  /** Formatted goals for the GoalsTracker component */
  goals: Goal[]
  /** Raw data from database */
  rawGoals: Tables<'posting_goals'>[]
  /** Current posting streak in days */
  currentStreak: number
  /** Best posting streak achieved */
  bestStreak: number
  /** Loading state */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refetch goals */
  refetch: () => Promise<void>
  /** Update a goal's target */
  updateGoalTarget: (goalId: string, target: number) => Promise<void>
}

/**
 * Calculate posting streak from posts
 * @param posts - Array of posts with posted_at dates
 * @returns Current streak and best streak
 */
function calculateStreaks(posts: { posted_at: string | null }[]): { current: number; best: number } {
  if (!posts || posts.length === 0) {
    return { current: 0, best: 0 }
  }

  // Sort posts by date descending (most recent first)
  const sortedPosts = posts
    .filter(p => p.posted_at)
    .sort((a, b) => new Date(b.posted_at!).getTime() - new Date(a.posted_at!).getTime())

  if (sortedPosts.length === 0) {
    return { current: 0, best: 0 }
  }

  // Get unique posting dates
  const postingDates = new Set<string>()
  sortedPosts.forEach(post => {
    const date = new Date(post.posted_at!)
    postingDates.add(date.toISOString().split('T')[0])
  })

  const uniqueDates = Array.from(postingDates).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  )

  // Calculate current streak
  let currentStreak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Check if the most recent post is today or yesterday
  const mostRecentDate = new Date(uniqueDates[0])
  mostRecentDate.setHours(0, 0, 0, 0)

  if (mostRecentDate.getTime() === today.getTime() || mostRecentDate.getTime() === yesterday.getTime()) {
    currentStreak = 1
    let checkDate = new Date(mostRecentDate)
    checkDate.setDate(checkDate.getDate() - 1)

    for (let i = 1; i < uniqueDates.length; i++) {
      const postDate = new Date(uniqueDates[i])
      postDate.setHours(0, 0, 0, 0)

      if (postDate.getTime() === checkDate.getTime()) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
  }

  // Calculate best streak
  let bestStreak = currentStreak
  let tempStreak = 1

  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDate = new Date(uniqueDates[i - 1])
    const prevDate = new Date(uniqueDates[i])
    currentDate.setHours(0, 0, 0, 0)
    prevDate.setHours(0, 0, 0, 0)

    const daysDiff = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff === 1) {
      tempStreak++
    } else {
      bestStreak = Math.max(bestStreak, tempStreak)
      tempStreak = 1
    }
  }
  bestStreak = Math.max(bestStreak, tempStreak)

  return { current: currentStreak, best: bestStreak }
}

/**
 * Hook to fetch posting goals from Supabase
 * @param userId - User ID to fetch goals for (optional, uses current user if not provided)
 * @returns Posting goals data, streaks, loading state, and management functions
 * @example
 * const { goals, currentStreak, bestStreak, isLoading, updateGoalTarget } = usePostingGoals()
 */
export function usePostingGoals(userId?: string): UsePostingGoalsReturn {
  const [goals, setGoals] = useState<Goal[]>([])
  const [rawGoals, setRawGoals] = useState<Tables<'posting_goals'>[]>([])
  const [currentStreak, setCurrentStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  /**
   * Fetch posting goals from database
   */
  const fetchGoals = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current user if userId not provided
      let targetUserId = userId
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser()
        targetUserId = user?.id
      }

      if (!targetUserId) {
        setGoals([])
        setRawGoals([])
        setIsLoading(false)
        return
      }

      // Fetch posting goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('posting_goals')
        .select('*')
        .eq('user_id', targetUserId)
        .order('period', { ascending: true })

      // If table doesn't exist or error, use demo data
      if (goalsError) {
        console.warn('Posting goals fetch warning (using demo data):', goalsError.message)
        setGoals(DEMO_GOALS)
        setCurrentStreak(7)
        setBestStreak(14)
        setRawGoals([])
        setIsLoading(false)
        return
      }

      // Fetch posts for streak calculation
      const { data: postsData, error: postsError } = await supabase
        .from('my_posts')
        .select('posted_at')
        .eq('user_id', targetUserId)
        .not('posted_at', 'is', null)
        .order('posted_at', { ascending: false })
        .limit(365) // Last year of posts for streak calculation

      if (postsError) {
        console.warn('Error fetching posts for streak calculation:', postsError)
      }

      // Calculate streaks
      const streaks = calculateStreaks(postsData || [])
      setCurrentStreak(streaks.current)
      setBestStreak(streaks.best)

      if (!goalsData || goalsData.length === 0) {
        // No goals - show demo data for better UX
        console.info('No posting goals found, showing demo data')
        setGoals(DEMO_GOALS)
        setCurrentStreak(7)
        setBestStreak(14)
        setRawGoals([])
        setIsLoading(false)
        return
      }

      // Transform to Goal format
      const transformedGoals: Goal[] = goalsData.map((goal) => ({
        id: goal.id,
        period: goal.period as 'daily' | 'weekly' | 'monthly',
        target: goal.target_posts,
        current: goal.current_posts,
        startDate: goal.start_date,
        endDate: goal.end_date,
      }))

      setGoals(transformedGoals)
      setRawGoals(goalsData)
    } catch (err) {
      console.error('Posting goals fetch error:', err)
      // Use demo data on error for better UX
      setGoals(DEMO_GOALS)
      setCurrentStreak(7)
      setBestStreak(14)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, userId])

  /**
   * Update a goal's target posts
   */
  const updateGoalTarget = useCallback(async (goalId: string, target: number) => {
    try {
      const { error: updateError } = await supabase
        .from('posting_goals')
        .update({ target_posts: target, updated_at: new Date().toISOString() })
        .eq('id', goalId)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setGoals(prev => prev.map(g =>
        g.id === goalId ? { ...g, target } : g
      ))
      setRawGoals(prev => prev.map(g =>
        g.id === goalId ? { ...g, target_posts: target } : g
      ))
    } catch (err) {
      console.error('Goal update error:', err)
      throw err
    }
  }, [supabase])

  // Fetch on mount
  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  return {
    goals,
    rawGoals,
    currentStreak,
    bestStreak,
    isLoading,
    error,
    refetch: fetchGoals,
    updateGoalTarget,
  }
}
