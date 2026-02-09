/**
 * Writing Style Hook
 * @description Custom hook for managing user's writing style profile
 * @module hooks/use-writing-style
 */

import * as React from "react"
import type { WritingStyleProfile } from "@/types/database"

/**
 * Writing style hook return type
 */
interface UseWritingStyleReturn {
  /** Current style profile or null if not yet analyzed */
  style: WritingStyleProfile | null
  /** Whether style analysis is currently running */
  isAnalyzing: boolean
  /** Whether the style profile needs a refresh */
  needsRefresh: boolean
  /** Whether the style has been loaded */
  isLoaded: boolean
  /** Trigger a new style analysis */
  analyzeStyle: () => Promise<void>
  /** Fetch the current style profile */
  fetchStyle: () => Promise<void>
}

/**
 * Custom hook for managing user's writing style profile
 * Provides style data, analysis triggering, and refresh status
 * @returns Writing style state and actions
 * @example
 * ```tsx
 * const { style, isAnalyzing, analyzeStyle } = useWritingStyle()
 * ```
 */
export function useWritingStyle(): UseWritingStyleReturn {
  const [style, setStyle] = React.useState<WritingStyleProfile | null>(null)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [needsRefresh, setNeedsRefresh] = React.useState(false)
  const [isLoaded, setIsLoaded] = React.useState(false)

  /**
   * Fetch the current style profile from the API
   */
  const fetchStyle = React.useCallback(async () => {
    try {
      const response = await fetch("/api/user/style")
      if (!response.ok) return

      const data = await response.json()
      setStyle(data.style || null)
      setNeedsRefresh(data.needsRefresh ?? true)
      setIsLoaded(true)
    } catch {
      console.error("[useWritingStyle] Failed to fetch style")
      setIsLoaded(true)
    }
  }, [])

  /**
   * Trigger a new style analysis
   */
  const analyzeStyle = React.useCallback(async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch("/api/user/style", { method: "POST" })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to analyze style")
      }

      const data = await response.json()
      setStyle(data.style || null)
      setNeedsRefresh(false)
    } catch (error) {
      console.error("[useWritingStyle] Failed to analyze style:", error)
      throw error
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  /**
   * Load style profile on mount
   */
  React.useEffect(() => {
    fetchStyle()
  }, [fetchStyle])

  return {
    style,
    isAnalyzing,
    needsRefresh,
    isLoaded,
    analyzeStyle,
    fetchStyle,
  }
}
