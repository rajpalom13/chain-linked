/**
 * Wishlist Collections Hook
 * @description Manages user's wishlist collections (like Instagram save folders)
 * @module hooks/use-wishlist-collections
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { WishlistCollection } from '@/types/database'

/**
 * API response shape for collections
 */
interface CollectionsResponse {
  collections: WishlistCollection[]
  totalItems: number
  uncategorizedCount: number
}

/**
 * Options for creating a new collection
 */
export interface CreateCollectionOptions {
  name: string
  description?: string
  emojiIcon?: string
  color?: string
}

/**
 * Options for updating a collection
 */
export interface UpdateCollectionOptions {
  name?: string
  description?: string
  emojiIcon?: string
  color?: string
}

/**
 * Return type for the useWishlistCollections hook
 */
export interface UseWishlistCollectionsReturn {
  /** All user collections */
  collections: WishlistCollection[]
  /** Currently selected collection ID (null = all items) */
  selectedCollectionId: string | null
  /** Total items across all collections */
  totalItems: number
  /** Items without a collection */
  uncategorizedCount: number
  /** Loading state */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Select a collection */
  selectCollection: (id: string | null) => void
  /** Create a new collection */
  createCollection: (options: CreateCollectionOptions) => Promise<WishlistCollection | null>
  /** Update a collection */
  updateCollection: (id: string, options: UpdateCollectionOptions) => Promise<boolean>
  /** Delete a collection */
  deleteCollection: (id: string, moveToDefault?: boolean) => Promise<boolean>
  /** Move an item to a collection */
  moveItemToCollection: (itemId: string, collectionId: string | null) => Promise<boolean>
  /** Refetch collections */
  refetch: () => Promise<void>
}

/**
 * Hook to manage wishlist collections
 * Provides CRUD operations for collections and item-to-collection management
 *
 * @returns Collections data and management functions
 *
 * @example
 * ```tsx
 * const {
 *   collections,
 *   selectedCollectionId,
 *   createCollection,
 *   selectCollection,
 *   moveItemToCollection
 * } = useWishlistCollections()
 *
 * // Create a new collection
 * await createCollection({ name: 'Marketing Ideas', emojiIcon: '💡' })
 *
 * // Move an item to a collection
 * await moveItemToCollection(itemId, collectionId)
 * ```
 */
export function useWishlistCollections(): UseWishlistCollectionsReturn {
  const [collections, setCollections] = useState<WishlistCollection[]>([])
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [totalItems, setTotalItems] = useState(0)
  const [uncategorizedCount, setUncategorizedCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch all collections
   */
  const fetchCollections = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/swipe/wishlist/collections')
      if (!response.ok) {
        throw new Error('Failed to fetch collections')
      }

      const data: CollectionsResponse = await response.json()
      setCollections(data.collections)
      setTotalItems(data.totalItems)
      setUncategorizedCount(data.uncategorizedCount)
    } catch (err) {
      console.error('[useWishlistCollections] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch collections')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  /**
   * Select a collection
   */
  const selectCollection = useCallback((id: string | null) => {
    setSelectedCollectionId(id)
  }, [])

  /**
   * Create a new collection
   */
  const createCollection = useCallback(
    async (options: CreateCollectionOptions): Promise<WishlistCollection | null> => {
      try {
        const response = await fetch('/api/swipe/wishlist/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: options.name,
            description: options.description,
            emojiIcon: options.emojiIcon,
            color: options.color,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          toast.error(errorData.error || 'Failed to create collection')
          return null
        }

        const { collection } = await response.json()
        setCollections((prev) => [...prev, collection])
        toast.success(`Collection "${options.name}" created`)
        return collection
      } catch (err) {
        console.error('[useWishlistCollections] Create error:', err)
        toast.error('Failed to create collection')
        return null
      }
    },
    []
  )

  /**
   * Update a collection
   */
  const updateCollection = useCallback(
    async (id: string, options: UpdateCollectionOptions): Promise<boolean> => {
      try {
        const response = await fetch(`/api/swipe/wishlist/collections/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        })

        if (!response.ok) {
          const errorData = await response.json()
          toast.error(errorData.error || 'Failed to update collection')
          return false
        }

        const { collection } = await response.json()
        setCollections((prev) =>
          prev.map((c) => (c.id === id ? collection : c))
        )
        toast.success('Collection updated')
        return true
      } catch (err) {
        console.error('[useWishlistCollections] Update error:', err)
        toast.error('Failed to update collection')
        return false
      }
    },
    []
  )

  /**
   * Delete a collection
   */
  const deleteCollection = useCallback(
    async (id: string, moveToDefault = false): Promise<boolean> => {
      const collection = collections.find((c) => c.id === id)
      if (!collection) {
        toast.error('Collection not found')
        return false
      }

      if (collection.is_default) {
        toast.error('Cannot delete the default collection')
        return false
      }

      try {
        const response = await fetch(
          `/api/swipe/wishlist/collections/${id}?move_to_default=${moveToDefault}`,
          { method: 'DELETE' }
        )

        if (!response.ok) {
          const errorData = await response.json()
          toast.error(errorData.error || 'Failed to delete collection')
          return false
        }

        setCollections((prev) => prev.filter((c) => c.id !== id))

        // If the deleted collection was selected, reset selection
        if (selectedCollectionId === id) {
          setSelectedCollectionId(null)
        }

        // Refetch to update counts
        await fetchCollections()

        toast.success(`Collection "${collection.name}" deleted`)
        return true
      } catch (err) {
        console.error('[useWishlistCollections] Delete error:', err)
        toast.error('Failed to delete collection')
        return false
      }
    },
    [collections, selectedCollectionId, fetchCollections]
  )

  /**
   * Move an item to a collection (or remove from collection with null)
   */
  const moveItemToCollection = useCallback(
    async (itemId: string, collectionId: string | null): Promise<boolean> => {
      try {
        const response = await fetch('/api/swipe/wishlist', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            collectionId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          toast.error(errorData.error || 'Failed to move item')
          return false
        }

        // Refetch to update counts
        await fetchCollections()

        const targetCollection = collections.find((c) => c.id === collectionId)
        toast.success(
          collectionId
            ? `Moved to "${targetCollection?.name || 'collection'}"`
            : 'Removed from collection'
        )
        return true
      } catch (err) {
        console.error('[useWishlistCollections] Move error:', err)
        toast.error('Failed to move item')
        return false
      }
    },
    [collections, fetchCollections]
  )

  return {
    collections,
    selectedCollectionId,
    totalItems,
    uncategorizedCount,
    isLoading,
    error,
    selectCollection,
    createCollection,
    updateCollection,
    deleteCollection,
    moveItemToCollection,
    refetch: fetchCollections,
  }
}
