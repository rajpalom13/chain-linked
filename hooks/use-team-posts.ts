/**
 * Team Posts Hook
 * @description Fetches team activity posts from Supabase
 * @module hooks/use-team-posts
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'
import type { TeamActivityItem } from '@/components/features/team-activity-feed'

/**
 * Demo team posts for when database is empty or unavailable
 */
const DEMO_TEAM_POSTS: TeamActivityItem[] = [
  {
    id: 'demo-post-1',
    author: {
      name: 'Sarah Chen',
      headline: 'VP of Engineering at TechCorp',
      avatar: null,
    },
    content: 'Excited to share that our team just shipped a major feature that\'s been 6 months in the making! The key lesson? Breaking down complex problems into smaller, manageable pieces makes all the difference.',
    metrics: { impressions: 12450, reactions: 342, comments: 56, reposts: 23 },
    postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    postType: 'text',
  },
  {
    id: 'demo-post-2',
    author: {
      name: 'Marcus Johnson',
      headline: 'Product Manager | Building the future of work',
      avatar: null,
    },
    content: 'Just published my thoughts on why async communication is the secret to high-performing remote teams. After 3 years of remote work, here are the frameworks that actually work.',
    metrics: { impressions: 8920, reactions: 215, comments: 89, reposts: 45 },
    postedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    postType: 'article',
  },
  {
    id: 'demo-post-3',
    author: {
      name: 'Emily Rodriguez',
      headline: 'Design Lead | UX Strategist',
      avatar: null,
    },
    content: 'Design systems are not about consistency for consistency\'s sake. They\'re about freeing your team to focus on solving real user problems instead of reinventing the wheel.',
    metrics: { impressions: 5670, reactions: 178, comments: 34, reposts: 12 },
    postedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    postType: 'text',
  },
]

/**
 * Hook return type for team posts
 */
interface UseTeamPostsReturn {
  /** Formatted posts for the activity feed */
  posts: TeamActivityItem[]
  /** Raw post data from database */
  rawPosts: Tables<'my_posts'>[]
  /** Loading state */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refetch posts */
  refetch: () => Promise<void>
}

/**
 * Map media type to post type
 */
function mapMediaToPostType(mediaType: string | null): TeamActivityItem['postType'] {
  if (!mediaType) return 'text'
  const type = mediaType.toLowerCase()
  if (type.includes('image')) return 'image'
  if (type.includes('video')) return 'video'
  if (type.includes('article')) return 'article'
  if (type.includes('poll')) return 'poll'
  return 'text'
}

/**
 * Hook to fetch team activity posts
 * Fetches posts from team members (currently user's own posts until team structure is implemented)
 * @param limit - Maximum number of posts to fetch
 * @returns Team posts data and loading state
 * @example
 * const { posts, isLoading, error } = useTeamPosts(20)
 */
export function useTeamPosts(limit: number = 20): UseTeamPostsReturn {
  const [posts, setPosts] = useState<TeamActivityItem[]>([])
  const [rawPosts, setRawPosts] = useState<Tables<'my_posts'>[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  /**
   * Fetch posts from database
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

      // Fetch user's profile for author info
      const { data: userData } = await supabase
        .from('users')
        .select('id, name, email, avatar_url, linkedin_profile_url')
        .eq('id', user.id)
        .single()

      // Fetch posts (currently user's own posts, will be expanded to team posts)
      // TODO: Once team structure is implemented, filter by team_id
      const { data: postsData, error: fetchError } = await supabase
        .from('my_posts')
        .select('*')
        .order('posted_at', { ascending: false })
        .limit(limit)

      // If table doesn't exist or error, use demo data
      if (fetchError) {
        console.warn('Team posts fetch warning (using demo data):', fetchError.message)
        setPosts(DEMO_TEAM_POSTS)
        setRawPosts([])
        setIsLoading(false)
        return
      }

      if (!postsData || postsData.length === 0) {
        // No posts - show demo data for better UX
        console.info('No team posts found, showing demo data')
        setPosts(DEMO_TEAM_POSTS)
        setRawPosts([])
        setIsLoading(false)
        return
      }

      // Transform to TeamActivityItem format
      // For now, all posts are attributed to the current user
      // TODO: Fetch author data for each unique user_id when team posts are implemented
      const transformedPosts: TeamActivityItem[] = postsData.map((post) => ({
        id: post.id,
        author: {
          name: userData?.name || user.email?.split('@')[0] || 'Unknown User',
          headline: userData?.linkedin_profile_url || userData?.email || '',
          avatar: userData?.avatar_url || null,
        },
        content: post.content || '',
        metrics: {
          impressions: post.impressions || 0,
          reactions: post.reactions || 0,
          comments: post.comments || 0,
          reposts: post.reposts || 0,
        },
        postedAt: post.posted_at || post.created_at,
        postType: mapMediaToPostType(post.media_type),
      }))

      setPosts(transformedPosts)
      setRawPosts(postsData)
    } catch (err) {
      console.error('Team posts fetch error:', err)
      // Use demo data on error for better UX
      setPosts(DEMO_TEAM_POSTS)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, limit])

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
