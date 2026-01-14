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

      if (fetchError) {
        throw fetchError
      }

      if (!postsData || postsData.length === 0) {
        setPosts([])
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
      setError(err instanceof Error ? err.message : 'Failed to fetch posts')
      setPosts([])
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
