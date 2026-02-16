/**
 * Carousel Templates Hook
 * @description Hook for saving, loading, and managing custom carousel templates
 * @module hooks/use-carousel-templates
 */

'use client'

import { useState, useCallback } from 'react'
import type { CanvasSlide, CanvasTemplate, TemplateCategory } from '@/types/canvas-editor'

/**
 * Represents a saved carousel template persisted in the database
 */
export interface SavedCarouselTemplate {
  /** Unique template identifier */
  id: string
  /** Owner user ID */
  userId: string
  /** Optional team association */
  teamId: string | null
  /** Template display name */
  name: string
  /** Optional description of the template */
  description: string | null
  /** Template category (professional, creative, minimal, bold, custom) */
  category: string
  /** Array of slide definitions */
  slides: CanvasSlide[]
  /** Brand color hex values used in the template */
  brandColors: string[]
  /** Font family names used in the template */
  fonts: string[]
  /** Optional thumbnail image URL or data URL */
  thumbnail: string | null
  /** Whether the template is publicly visible */
  isPublic: boolean
  /** Number of times the template has been used */
  usageCount: number
  /** ISO timestamp of creation */
  createdAt: string
  /** ISO timestamp of last update */
  updatedAt: string
}

/**
 * Data required to save a new carousel template
 */
interface SaveTemplateData {
  /** Template display name (required) */
  name: string
  /** Optional description */
  description?: string
  /** Template category */
  category?: string
  /** Slide definitions (required) */
  slides: CanvasSlide[]
  /** Brand color hex values */
  brandColors?: string[]
  /** Font family names */
  fonts?: string[]
}

/**
 * Partial update data for an existing template
 */
interface UpdateTemplateData {
  /** Updated display name */
  name?: string
  /** Updated description */
  description?: string
  /** Updated category */
  category?: string
  /** Updated slide definitions */
  slides?: CanvasSlide[]
  /** Updated brand colors */
  brandColors?: string[]
  /** Updated fonts */
  fonts?: string[]
  /** Updated public visibility */
  isPublic?: boolean
  /** Updated usage count */
  usageCount?: number
}

/**
 * Return type for the useCarouselTemplates hook
 */
interface UseCarouselTemplatesReturn {
  /** List of the user's saved templates */
  savedTemplates: SavedCarouselTemplate[]
  /** Whether templates are currently being fetched */
  isLoading: boolean
  /** Whether a save operation is in progress */
  isSaving: boolean
  /** Current error message, if any */
  error: string | null
  /** Fetch all saved templates from the API */
  fetchTemplates: () => Promise<void>
  /** Save a new template to the API */
  saveTemplate: (data: SaveTemplateData) => Promise<SavedCarouselTemplate | null>
  /** Update an existing template by ID */
  updateTemplate: (id: string, updates: UpdateTemplateData) => Promise<boolean>
  /** Delete a template by ID */
  deleteTemplate: (id: string) => Promise<boolean>
  /** Increment the usage count for a template */
  incrementUsage: (id: string) => Promise<void>
  /** Convert a saved template into a CanvasTemplate for use in the editor */
  toCanvasTemplate: (saved: SavedCarouselTemplate) => CanvasTemplate
}

/**
 * Hook for managing saved carousel templates
 * Provides CRUD operations against the /api/carousel-templates endpoint
 * and utilities for converting between saved and editor template formats
 * @returns Template state and action methods
 * @example
 * const { savedTemplates, fetchTemplates, saveTemplate } = useCarouselTemplates()
 */
export function useCarouselTemplates(): UseCarouselTemplatesReturn {
  const [savedTemplates, setSavedTemplates] = useState<SavedCarouselTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch all saved carousel templates from the API
   * Updates the savedTemplates state on success
   */
  const fetchTemplates = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/carousel-templates')

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch templates')
      }

      const data = await response.json()
      setSavedTemplates(data.templates ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch templates'
      setError(message)
      console.error('Failed to fetch carousel templates:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Save a new carousel template to the API
   * @param data - Template data including name, slides, and optional metadata
   * @returns The created template on success, or null on failure
   */
  const saveTemplate = useCallback(
    async (data: SaveTemplateData): Promise<SavedCarouselTemplate | null> => {
      setIsSaving(true)
      setError(null)

      try {
        const response = await fetch('/api/carousel-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const responseData = await response.json()
          throw new Error(responseData.error || 'Failed to save template')
        }

        const responseData = await response.json()
        const template = responseData.template as SavedCarouselTemplate

        setSavedTemplates((prev) => [template, ...prev])

        return template
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save template'
        setError(message)
        console.error('Failed to save carousel template:', err)
        return null
      } finally {
        setIsSaving(false)
      }
    },
    []
  )

  /**
   * Update an existing carousel template by ID
   * @param id - Template ID to update
   * @param updates - Partial template data to merge
   * @returns True if the update succeeded, false otherwise
   */
  const updateTemplate = useCallback(
    async (id: string, updates: UpdateTemplateData): Promise<boolean> => {
      setIsSaving(true)
      setError(null)

      try {
        const response = await fetch('/api/carousel-templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...updates }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to update template')
        }

        const data = await response.json()
        const updated = data.template as SavedCarouselTemplate

        setSavedTemplates((prev) =>
          prev.map((t) => (t.id === id ? updated : t))
        )

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update template'
        setError(message)
        console.error('Failed to update carousel template:', err)
        return false
      } finally {
        setIsSaving(false)
      }
    },
    []
  )

  /**
   * Delete a carousel template by ID
   * @param id - Template ID to delete
   * @returns True if the deletion succeeded, false otherwise
   */
  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null)

      try {
        const response = await fetch(
          `/api/carousel-templates?id=${encodeURIComponent(id)}`,
          { method: 'DELETE' }
        )

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to delete template')
        }

        setSavedTemplates((prev) => prev.filter((t) => t.id !== id))

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete template'
        setError(message)
        console.error('Failed to delete carousel template:', err)
        return false
      }
    },
    []
  )

  /**
   * Increment the usage count for a template
   * Performs an optimistic update in the local state
   * @param id - Template ID whose usage count to increment
   */
  const incrementUsage = useCallback(
    async (id: string): Promise<void> => {
      let previousCount: number | undefined

      // Optimistic update using functional setState to avoid stale closure
      setSavedTemplates((prev) => {
        const template = prev.find((t) => t.id === id)
        if (!template) return prev
        previousCount = template.usageCount
        return prev.map((t) =>
          t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t
        )
      })

      if (previousCount === undefined) return

      try {
        await fetch('/api/carousel-templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, usageCount: previousCount + 1 }),
        })
      } catch (err) {
        console.error('Failed to increment template usage:', err)
        // Revert optimistic update on failure
        setSavedTemplates((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, usageCount: t.usageCount - 1 } : t
          )
        )
      }
    },
    []
  )

  /**
   * Convert a saved carousel template to a CanvasTemplate
   * suitable for use in the canvas editor
   * @param saved - The saved template to convert
   * @returns A CanvasTemplate object compatible with the editor
   */
  const toCanvasTemplate = useCallback(
    (saved: SavedCarouselTemplate): CanvasTemplate => {
      /**
       * Map the saved category string to a valid TemplateCategory.
       * Falls back to 'professional' for custom or unknown categories.
       */
      const validCategories: TemplateCategory[] = [
        'professional',
        'creative',
        'minimal',
        'bold',
      ]
      const category: TemplateCategory = validCategories.includes(
        saved.category as TemplateCategory
      )
        ? (saved.category as TemplateCategory)
        : 'professional'

      return {
        id: saved.id,
        name: saved.name,
        description: saved.description ?? undefined,
        category,
        thumbnail: saved.thumbnail ?? undefined,
        defaultSlides: saved.slides,
        brandColors: saved.brandColors,
        fonts: saved.fonts,
      }
    },
    []
  )

  return {
    savedTemplates,
    isLoading,
    isSaving,
    error,
    fetchTemplates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    incrementUsage,
    toCanvasTemplate,
  }
}
