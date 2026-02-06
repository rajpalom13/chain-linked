/**
 * Swipe Wishlist Hook
 * @description Manages the user's wishlist of liked suggestions from the swipe feature
 * @module hooks/use-swipe-wishlist
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { WishlistItem, GeneratedSuggestion, WishlistStatus } from '@/types/database'

/**
 * Options for scheduling a wishlist item
 */
export interface ScheduleOptions {
  /** ISO datetime string for when to post */
  scheduledFor: string
  /** Timezone for the scheduled time (default: 'UTC') */
  timezone?: string
  /** Post visibility (default: 'PUBLIC') */
  visibility?: 'PUBLIC' | 'CONNECTIONS'
}

/**
 * Wishlist API response
 */
interface WishlistResponse {
  items: WishlistItem[]
  total: number
  hasMore: boolean
}

/**
 * Options for useSwipeWishlist hook
 */
export interface UseSwipeWishlistOptions {
  /** Filter by collection ID (null = all, 'uncategorized' = no collection) */
  collectionId?: string | null
}

/**
 * Return type for the useSwipeWishlist hook
 */
export interface UseSwipeWishlistReturn {
  /** All wishlist items */
  items: WishlistItem[]
  /** Items with status = 'saved' only */
  savedItems: WishlistItem[]
  /** Items with status = 'scheduled' */
  scheduledItems: WishlistItem[]

  /** Loading state for initial fetch */
  isLoading: boolean
  /** Loading state for add operation */
  isAdding: boolean

  /** Add a suggestion to the wishlist, optionally to a specific collection */
  addToWishlist: (suggestion: GeneratedSuggestion, collectionId?: string | null) => Promise<boolean>
  /** Remove an item from the wishlist */
  removeFromWishlist: (id: string) => Promise<boolean>
  /** Update notes on a wishlist item */
  updateNotes: (id: string, notes: string) => Promise<boolean>
  /** Schedule a wishlist item for posting */
  scheduleItem: (id: string, options: ScheduleOptions) => Promise<boolean>
  /** Refetch wishlist items */
  refetch: () => Promise<void>

  /** Total number of items */
  totalItems: number
  /** Count of saved items */
  savedCount: number
  /** Count of scheduled items */
  scheduledCount: number

  /** Error message if any operation failed */
  error: string | null
}

/**
 * Hook to manage the swipe wishlist - items liked from the suggestion swipe interface.
 * Handles adding, removing, updating, and scheduling wishlist items.
 *
 * @returns Wishlist data, loading states, and management functions
 *
 * @example
 * ```tsx
 * const {
 *   savedItems,
 *   scheduledItems,
 *   addToWishlist,
 *   removeFromWishlist,
 *   scheduleItem
 * } = useSwipeWishlist()
 *
 * // When user likes a suggestion
 * await addToWishlist(suggestion)
 *
 * // Schedule for posting
 * await scheduleItem(itemId, {
 *   scheduledFor: '2025-02-01T10:00:00Z',
 *   visibility: 'PUBLIC'
 * })
 *
 * // Remove from wishlist
 * await removeFromWishlist(itemId)
 * ```
 */
export function useSwipeWishlist(options: UseSwipeWishlistOptions = {}): UseSwipeWishlistReturn {
  const { collectionId } = options

  // Wishlist state
  const [items, setItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  /**
   * Fetch all wishlist items (saved and scheduled)
   */
  const fetchWishlist = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Build query params with collection filter
      const buildUrl = (status: string) => {
        const params = new URLSearchParams({ status })
        if (collectionId !== undefined && collectionId !== null) {
          params.set('collection_id', collectionId)
        }
        return `/api/swipe/wishlist?${params.toString()}`
      }

      // Fetch both saved and scheduled items
      const [savedResponse, scheduledResponse] = await Promise.all([
        fetch(buildUrl('saved')),
        fetch(buildUrl('scheduled'))
      ])

      if (!savedResponse.ok || !scheduledResponse.ok) {
        if (savedResponse.status === 401 || scheduledResponse.status === 401) {
          setError('Not authenticated')
          return
        }
        throw new Error('Failed to fetch wishlist')
      }

      const savedData: WishlistResponse = await savedResponse.json()
      const scheduledData: WishlistResponse = await scheduledResponse.json()

      // Combine both lists
      setItems([...savedData.items, ...scheduledData.items])
    } catch (err) {
      console.error('Fetch wishlist error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch wishlist')
    } finally {
      setIsLoading(false)
    }
  }, [collectionId])

  /**
   * Add a suggestion to the wishlist
   * @param suggestion - The suggestion to save
   * @param collectionId - Optional collection ID to save to (null = default collection)
   */
  const addToWishlist = useCallback(async (suggestion: GeneratedSuggestion, collectionId?: string | null): Promise<boolean> => {
    try {
      setIsAdding(true)
      setError(null)

      const payload: Record<string, unknown> = {
        suggestionId: suggestion.id,
        content: suggestion.content,
        postType: suggestion.post_type,
        category: suggestion.category,
      }
      if (collectionId !== undefined) {
        payload.collectionId = collectionId
      }

      const response = await fetch('/api/swipe/wishlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle duplicate
        if (response.status === 409 && data.error === 'Duplicate item') {
          toast.info('This suggestion is already in your wishlist')
          return false
        }
        throw new Error(data.error || 'Failed to add to wishlist')
      }

      // Optimistically add to local state
      if (data.item) {
        setItems(prev => [data.item, ...prev])
      }

      toast.success('Added to wishlist!')
      return true
    } catch (err) {
      console.error('Add to wishlist error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to wishlist'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setIsAdding(false)
    }
  }, [])

  /**
   * Remove an item from the wishlist
   */
  const removeFromWishlist = useCallback(async (id: string): Promise<boolean> => {
    // Store original items for rollback
    const originalItems = items

    try {
      setError(null)

      // Optimistic update
      setItems(prev => prev.filter(item => item.id !== id))

      const response = await fetch('/api/swipe/wishlist', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemId: id })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove from wishlist')
      }

      toast.success('Removed from wishlist')
      return true
    } catch (err) {
      console.error('Remove from wishlist error:', err)
      // Rollback on error
      setItems(originalItems)
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove from wishlist'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    }
  }, [items])

  /**
   * Update notes on a wishlist item
   */
  const updateNotes = useCallback(async (id: string, notes: string): Promise<boolean> => {
    // Store original for rollback
    const originalItem = items.find(item => item.id === id)

    try {
      setError(null)

      // Optimistic update
      setItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, notes, updated_at: new Date().toISOString() } : item
        )
      )

      const response = await fetch('/api/swipe/wishlist', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemId: id, notes })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update notes')
      }

      toast.success('Notes updated')
      return true
    } catch (err) {
      console.error('Update notes error:', err)
      // Rollback on error
      if (originalItem) {
        setItems(prev =>
          prev.map(item => item.id === id ? originalItem : item)
        )
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to update notes'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    }
  }, [items])

  /**
   * Schedule a wishlist item for posting
   */
  const scheduleItem = useCallback(async (id: string, options: ScheduleOptions): Promise<boolean> => {
    // Store original for rollback
    const originalItem = items.find(item => item.id === id)

    try {
      setError(null)

      // Optimistic update
      setItems(prev =>
        prev.map(item =>
          item.id === id
            ? {
                ...item,
                status: 'scheduled' as WishlistStatus,
                is_scheduled: true,
                updated_at: new Date().toISOString()
              }
            : item
        )
      )

      const response = await fetch(`/api/swipe/wishlist/${id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduledFor: options.scheduledFor,
          timezone: options.timezone || 'UTC',
          visibility: options.visibility || 'PUBLIC'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific errors
        if (response.status === 409 && data.error === 'Already scheduled') {
          toast.info('This item is already scheduled')
          return false
        }
        throw new Error(data.error || 'Failed to schedule item')
      }

      // Update with actual scheduled post ID
      setItems(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, scheduled_post_id: data.scheduledPostId }
            : item
        )
      )

      toast.success(`Scheduled for ${new Date(options.scheduledFor).toLocaleString()}`)
      return true
    } catch (err) {
      console.error('Schedule item error:', err)
      // Rollback on error
      if (originalItem) {
        setItems(prev =>
          prev.map(item => item.id === id ? originalItem : item)
        )
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule item'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    }
  }, [items])

  /**
   * Refetch wishlist
   */
  const refetch = useCallback(async () => {
    await fetchWishlist()
  }, [fetchWishlist])

  // Computed values
  const savedItems = useMemo(() => {
    return items.filter(item => item.status === 'saved')
  }, [items])

  const scheduledItems = useMemo(() => {
    return items.filter(item => item.status === 'scheduled')
  }, [items])

  const totalItems = useMemo(() => items.length, [items])
  const savedCount = useMemo(() => savedItems.length, [savedItems])
  const scheduledCount = useMemo(() => scheduledItems.length, [scheduledItems])

  // Initial fetch and refetch when collection changes
  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  return {
    items,
    savedItems,
    scheduledItems,
    isLoading,
    isAdding,
    addToWishlist,
    removeFromWishlist,
    updateNotes,
    scheduleItem,
    refetch,
    totalItems,
    savedCount,
    scheduledCount,
    error
  }
}
