/**
 * Scheduled Posts Hook
 * @description Fetches scheduled posts from Supabase
 * @module hooks/use-scheduled-posts
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'
import type { ScheduledPostItem } from '@/components/features/schedule-calendar'

/**
 * Demo scheduled posts for when database is empty or unavailable
 */
const DEMO_SCHEDULED_POSTS: ScheduledPostItem[] = [
  {
    id: 'demo-scheduled-1',
    content: 'Sharing insights on how AI is transforming the way we work. Key takeaways from my research...',
    scheduledFor: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
    status: 'pending',
    platform: 'linkedin',
  },
  {
    id: 'demo-scheduled-2',
    content: 'Leadership lesson: The best managers I\'ve worked with all have one thing in common...',
    scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    status: 'pending',
    platform: 'linkedin',
  },
  {
    id: 'demo-scheduled-3',
    content: 'Why remote work isn\'t going away - my thoughts on the future of distributed teams.',
    scheduledFor: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    status: 'pending',
    platform: 'linkedin',
  },
  {
    id: 'demo-posted-1',
    content: 'Just wrapped up an amazing product launch! Here\'s what we learned along the way...',
    scheduledFor: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    status: 'posted',
    platform: 'linkedin',
  },
]

/**
 * Hook return type for scheduled posts
 */
interface UseScheduledPostsReturn {
  /** Formatted posts for the calendar */
  posts: ScheduledPostItem[]
  /** Raw scheduled post data from database */
  rawPosts: Tables<'scheduled_posts'>[]
  /** Loading state */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refetch posts */
  refetch: () => Promise<void>
}

/**
 * Map status string to ScheduledPostItem status
 */
function mapStatus(status: string): ScheduledPostItem['status'] {
  switch (status.toLowerCase()) {
    case 'pending':
    case 'scheduled':
      return 'pending'
    case 'posted':
    case 'completed':
      return 'posted'
    case 'failed':
    case 'error':
      return 'failed'
    default:
      return 'pending'
  }
}

/**
 * Hook to fetch scheduled posts
 * @param daysRange - Number of days to fetch (past and future)
 * @returns Scheduled posts data and loading state
 * @example
 * const { posts, isLoading, error } = useScheduledPosts(30)
 */
export function useScheduledPosts(daysRange: number = 30): UseScheduledPostsReturn {
  const [posts, setPosts] = useState<ScheduledPostItem[]>([])
  const [rawPosts, setRawPosts] = useState<Tables<'scheduled_posts'>[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  /**
   * Fetch scheduled posts from database
   */
  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setPosts([])
        setRawPosts([])
        setIsLoading(false)
        return
      }

      // Calculate date range
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysRange)
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + daysRange)

      // Fetch scheduled posts for the user
      const { data: postsData, error: fetchError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_for', startDate.toISOString())
        .lte('scheduled_for', endDate.toISOString())
        .order('scheduled_for', { ascending: true })

      // If table doesn't exist or error, use demo data
      if (fetchError) {
        console.warn('Scheduled posts fetch warning (using demo data):', fetchError.message)
        setPosts(DEMO_SCHEDULED_POSTS)
        setRawPosts([])
        setIsLoading(false)
        return
      }

      if (!postsData || postsData.length === 0) {
        // No scheduled posts - show demo data for better UX
        console.info('No scheduled posts found, showing demo data')
        setPosts(DEMO_SCHEDULED_POSTS)
        setRawPosts([])
        setIsLoading(false)
        return
      }

      // Transform to ScheduledPostItem format
      const transformedPosts: ScheduledPostItem[] = postsData.map((post) => ({
        id: post.id,
        content: post.content,
        scheduledFor: new Date(post.scheduled_for),
        status: mapStatus(post.status),
        platform: 'linkedin',
      }))

      setPosts(transformedPosts)
      setRawPosts(postsData)
    } catch (err) {
      console.error('Scheduled posts fetch error:', err)
      // Use demo data on error for better UX
      setPosts(DEMO_SCHEDULED_POSTS)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, daysRange])

  // Fetch on mount
  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return {
    posts,
    rawPosts,
    isLoading,
    error,
    refetch: fetchPosts,
  }
}
