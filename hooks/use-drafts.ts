/**
 * Saved Drafts Hook
 * @description Fetches and manages saved drafts from multiple sources:
 * generated_posts (status=draft) and swipe_wishlist (status=saved)
 * @module hooks/use-drafts
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

/**
 * The source from which a draft originated
 */
export type DraftSource = 'compose' | 'swipe' | 'discover' | 'inspiration' | 'research'

/**
 * Unified draft item combining data from multiple Supabase tables
 */
export interface SavedDraft {
  /** Unique identifier */
  id: string
  /** Post content text */
  content: string
  /** Where the draft originated from */
  source: DraftSource
  /** The underlying table this draft is stored in */
  table: 'generated_posts' | 'swipe_wishlist'
  /** Post type (thought-leadership, storytelling, etc.) */
  postType: string | null
  /** Category tag */
  category: string | null
  /** Word count of the content */
  wordCount: number
  /** When the draft was created */
  createdAt: string
  /** When the draft was last updated */
  updatedAt: string
}

/**
 * Sort options for draft listings
 */
export type DraftSortBy = 'newest' | 'oldest' | 'longest' | 'shortest'

/**
 * Return type for the useDrafts hook
 */
export interface UseDraftsReturn {
  /** All unified drafts */
  drafts: SavedDraft[]
  /** Whether the initial fetch is loading */
  isLoading: boolean
  /** Error message if any operation failed */
  error: string | null
  /** Delete a draft by ID and table */
  deleteDraft: (id: string, table: SavedDraft['table']) => Promise<boolean>
  /** Refetch all drafts */
  refetch: () => Promise<void>
  /** Total number of drafts */
  totalCount: number
}

/**
 * Count words in a string
 * @param text - Input text
 * @returns Number of words
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Map a generated_posts row source to a DraftSource
 * @param discoverPostId - Whether it came from discover
 * @param researchSessionId - Whether it came from research
 * @returns The draft source label
 */
function inferGeneratedPostSource(
  discoverPostId: string | null,
  researchSessionId: string | null
): DraftSource {
  if (researchSessionId) return 'research'
  if (discoverPostId) return 'discover'
  return 'compose'
}

/**
 * Hook to fetch and manage saved drafts from multiple Supabase tables.
 * Combines generated_posts (status=draft) and swipe_wishlist (status=saved)
 * into a unified list.
 *
 * @returns Draft data, loading states, and management functions
 *
 * @example
 * ```tsx
 * const { drafts, isLoading, deleteDraft, refetch } = useDrafts()
 *
 * // Delete a draft
 * await deleteDraft(draft.id, draft.table)
 *
 * // Refetch all drafts
 * await refetch()
 * ```
 */
export function useDrafts(): UseDraftsReturn {
  const [drafts, setDrafts] = useState<SavedDraft[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  /**
   * Fetch drafts from all sources and unify them
   */
  const fetchDrafts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        setDrafts([])
        return
      }

      // Fetch from both tables in parallel
      const [generatedRes, wishlistRes] = await Promise.all([
        supabase
          .from('generated_posts')
          .select('id, content, post_type, discover_post_id, research_session_id, created_at, updated_at')
          .eq('user_id', user.id)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false }),
        supabase
          .from('swipe_wishlist')
          .select('id, content, post_type, category, created_at, updated_at')
          .eq('user_id', user.id)
          .eq('status', 'saved')
          .order('updated_at', { ascending: false }),
      ])

      if (generatedRes.error) {
        console.error('Error fetching generated_posts drafts:', generatedRes.error)
      }
      if (wishlistRes.error) {
        console.error('Error fetching swipe_wishlist drafts:', wishlistRes.error)
      }

      const unified: SavedDraft[] = []

      // Map generated_posts
      if (generatedRes.data) {
        for (const row of generatedRes.data) {
          unified.push({
            id: row.id,
            content: row.content,
            source: inferGeneratedPostSource(row.discover_post_id, row.research_session_id),
            table: 'generated_posts',
            postType: row.post_type,
            category: null,
            wordCount: countWords(row.content),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          })
        }
      }

      // Map swipe_wishlist
      if (wishlistRes.data) {
        for (const row of wishlistRes.data) {
          unified.push({
            id: row.id,
            content: row.content,
            source: 'swipe',
            table: 'swipe_wishlist',
            postType: row.post_type,
            category: row.category,
            wordCount: countWords(row.content),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          })
        }
      }

      // Sort by most recently updated
      unified.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

      setDrafts(unified)
    } catch (err) {
      console.error('Fetch drafts error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch drafts')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  /**
   * Delete a draft from its source table
   * @param id - Draft ID
   * @param table - The Supabase table to delete from
   */
  const deleteDraft = useCallback(async (id: string, table: SavedDraft['table']): Promise<boolean> => {
    const originalDrafts = drafts

    try {
      setError(null)

      // Optimistic removal
      setDrafts(prev => prev.filter(d => d.id !== id))

      if (table === 'generated_posts') {
        const { error: deleteError } = await supabase
          .from('generated_posts')
          .update({ status: 'archived' })
          .eq('id', id)

        if (deleteError) throw new Error(deleteError.message)
      } else {
        const { error: deleteError } = await supabase
          .from('swipe_wishlist')
          .update({ status: 'removed' })
          .eq('id', id)

        if (deleteError) throw new Error(deleteError.message)
      }

      toast.success('Draft deleted')
      return true
    } catch (err) {
      console.error('Delete draft error:', err)
      setDrafts(originalDrafts)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete draft'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    }
  }, [drafts, supabase])

  /**
   * Refetch all drafts
   */
  const refetch = useCallback(async () => {
    await fetchDrafts()
  }, [fetchDrafts])

  const totalCount = useMemo(() => drafts.length, [drafts])

  // Initial fetch
  useEffect(() => {
    fetchDrafts()
  }, [fetchDrafts])

  return {
    drafts,
    isLoading,
    error,
    deleteDraft,
    refetch,
    totalCount,
  }
}
