/**
 * Template Categories Hook
 * @description Hook for managing user-defined template categories stored in Supabase
 * @module hooks/use-template-categories
 */

'use client'

import { useState, useCallback, useMemo } from 'react'

/**
 * The 5 built-in template categories
 */
export const DEFAULT_CATEGORIES = [
  'Thought Leadership',
  'Personal Story',
  'How-To',
  'Engagement',
  'Sales',
] as const

/**
 * Represents a template category stored in the database
 */
export interface TemplateCategory {
  /** Unique category identifier */
  id: string
  /** Category display name */
  name: string
  /** ISO timestamp of creation */
  createdAt: string
}

/**
 * A merged category combining defaults and user-defined categories
 */
export interface MergedCategory {
  /** Unique identifier (synthetic for defaults, real UUID for custom) */
  id: string
  /** Category display name */
  name: string
  /** Whether this is a built-in default category */
  isDefault: boolean
  /** ISO timestamp of creation (only for custom categories) */
  createdAt?: string
}

/**
 * Return type for the useTemplateCategories hook
 */
interface UseTemplateCategoriesReturn {
  /** List of user-defined categories from the database */
  categories: TemplateCategory[]
  /** Merged list of default + custom categories (deduplicated) */
  allCategories: MergedCategory[]
  /** Whether categories are being fetched */
  isLoading: boolean
  /** Whether a create/delete operation is in progress */
  isSaving: boolean
  /** Fetch all categories from the API */
  fetchCategories: () => Promise<void>
  /** Create a new category */
  createCategory: (name: string) => Promise<TemplateCategory | null>
  /** Delete a category by ID */
  deleteCategory: (id: string) => Promise<boolean>
}

/**
 * Hook for managing user-defined template categories
 * Provides CRUD operations against /api/carousel-templates/categories
 * @returns Category state and action methods
 */
export function useTemplateCategories(): UseTemplateCategoriesReturn {
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  /**
   * Merged list of default + custom categories, deduplicated by name
   */
  const allCategories = useMemo<MergedCategory[]>(() => {
    const defaults: MergedCategory[] = DEFAULT_CATEGORIES.map((name) => ({
      id: `default-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      isDefault: true,
    }))

    const defaultNames = new Set(DEFAULT_CATEGORIES.map((n) => n.toLowerCase()))
    const custom: MergedCategory[] = categories
      .filter((c) => !defaultNames.has(c.name.toLowerCase()))
      .map((c) => ({
        id: c.id,
        name: c.name,
        isDefault: false,
        createdAt: c.createdAt,
      }))

    return [...defaults, ...custom]
  }, [categories])

  /**
   * Fetch all categories from the API
   */
  const fetchCategories = useCallback(async (): Promise<void> => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/carousel-templates/categories')
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }

      const data = await response.json()
      const fetched = (data.categories ?? []).map(
        (row: { id: string; name: string; created_at: string }) => ({
          id: row.id,
          name: row.name,
          createdAt: row.created_at,
        })
      )
      setCategories(fetched)
    } catch (err) {
      console.error('Failed to fetch template categories:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Create a new category
   * @param name - Category name
   * @returns The created category or null on failure
   */
  const createCategory = useCallback(
    async (name: string): Promise<TemplateCategory | null> => {
      setIsSaving(true)

      try {
        const response = await fetch('/api/carousel-templates/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create category')
        }

        const data = await response.json()
        const created: TemplateCategory = {
          id: data.category.id,
          name: data.category.name,
          createdAt: data.category.created_at,
        }

        setCategories((prev) => {
          // Avoid duplicates (upsert may return an existing row)
          if (prev.some((c) => c.id === created.id)) return prev
          return [...prev, created]
        })

        return created
      } catch (err) {
        console.error('Failed to create template category:', err)
        return null
      } finally {
        setIsSaving(false)
      }
    },
    []
  )

  /**
   * Delete a category by ID
   * @param id - Category ID to delete
   * @returns True on success, false on failure
   */
  const deleteCategory = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetch(
          `/api/carousel-templates/categories?id=${encodeURIComponent(id)}`,
          { method: 'DELETE' }
        )

        if (!response.ok) {
          throw new Error('Failed to delete category')
        }

        setCategories((prev) => prev.filter((c) => c.id !== id))
        return true
      } catch (err) {
        console.error('Failed to delete template category:', err)
        return false
      }
    },
    []
  )

  return {
    categories,
    allCategories,
    isLoading,
    isSaving,
    fetchCategories,
    createCategory,
    deleteCategory,
  }
}
