/**
 * Brand Kit Templates Hook
 * Fetches the active brand kit and generates carousel templates from it.
 * Templates are memoized to avoid unnecessary regeneration on each render.
 * @module hooks/use-brand-kit-templates
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useBrandKit } from './use-brand-kit'
import { generateBrandKitTemplates } from '@/lib/canvas-templates/brand-kit-template-generator'
import type { CanvasTemplate } from '@/types/canvas-editor'

/**
 * Return type for the useBrandKitTemplates hook
 */
interface UseBrandKitTemplatesReturn {
  /** Array of generated brand templates (empty if no active brand kit) */
  brandTemplates: CanvasTemplate[]
  /** Whether the brand kit is currently being loaded */
  isLoading: boolean
  /** Whether the user has an active brand kit */
  hasBrandKit: boolean
}

/**
 * Hook that fetches the active brand kit and auto-generates carousel templates.
 *
 * Uses the `useBrandKit` hook to fetch saved brand kits, finds the active one,
 * and generates 5 template variants using `generateBrandKitTemplates`. The
 * generated templates are memoized based on the active kit's ID and updatedAt
 * timestamp to prevent unnecessary regeneration.
 *
 * @returns Object containing brand templates, loading state, and brand kit availability
 * @example
 * const { brandTemplates, isLoading, hasBrandKit } = useBrandKitTemplates()
 *
 * if (isLoading) return <Spinner />
 * if (!hasBrandKit) return <NoBrandKitMessage />
 * return <TemplateGrid templates={brandTemplates} />
 */
export function useBrandKitTemplates(): UseBrandKitTemplatesReturn {
  const { activeKit, isLoading, fetchBrandKits } = useBrandKit()
  const [hasFetched, setHasFetched] = useState(false)

  /**
   * Fetch brand kits on mount so the activeKit is populated.
   * Only runs once per hook lifecycle.
   */
  useEffect(() => {
    if (!hasFetched) {
      setHasFetched(true)
      fetchBrandKits()
    }
  }, [hasFetched, fetchBrandKits])

  /**
   * Memoized template generation.
   * Re-generates only when the active kit's identity or content changes
   * (tracked via id and updatedAt).
   */
  const brandTemplates = useMemo<CanvasTemplate[]>(() => {
    if (!activeKit) {
      return []
    }
    return generateBrandKitTemplates(activeKit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKit?.id, activeKit?.updatedAt])

  const hasBrandKit = activeKit !== null

  return {
    brandTemplates,
    isLoading: isLoading || (!hasFetched),
    hasBrandKit,
  }
}
