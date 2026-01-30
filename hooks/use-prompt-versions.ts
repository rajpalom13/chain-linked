/**
 * Prompt Versions Hook
 * @description React hook for managing prompt version history and rollback
 * @module hooks/use-prompt-versions
 */

"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import type { PromptVersion } from '@/lib/prompts/prompt-types'

/**
 * Return type for the usePromptVersions hook
 */
interface UsePromptVersionsReturn {
  /** Array of version history entries, ordered by version descending */
  versions: PromptVersion[]
  /** Whether versions are currently loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Manually refetch versions */
  refetch: () => Promise<void>
  /** Rollback the prompt to a specific version */
  rollbackToVersion: (version: number) => Promise<boolean>
  /** Get a specific version by number */
  getVersion: (version: number) => PromptVersion | undefined
  /** Compare two versions side-by-side */
  compareVersions: (v1: number, v2: number) => {
    version1: PromptVersion | undefined
    version2: PromptVersion | undefined
  }
  /** Current version number of the prompt */
  currentVersion: number | null
  /** Name of the prompt */
  promptName: string | null
  /** Whether a rollback operation is in progress */
  isRollingBack: boolean
}

/**
 * Hook for managing prompt version history and rollback
 * @param promptId - The UUID of the prompt, or null to skip fetching
 * @returns Object with version data and helper functions
 * @example
 * ```tsx
 * const {
 *   versions,
 *   isLoading,
 *   rollbackToVersion,
 *   getVersion,
 *   compareVersions,
 * } = usePromptVersions('550e8400-e29b-41d4-a716-446655440000')
 *
 * // Get a specific version
 * const v2 = getVersion(2)
 *
 * // Compare versions
 * const { version1, version2 } = compareVersions(2, 3)
 *
 * // Rollback to a version
 * await rollbackToVersion(2)
 * ```
 */
export function usePromptVersions(promptId: string | null): UsePromptVersionsReturn {
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRollingBack, setIsRollingBack] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentVersion, setCurrentVersion] = useState<number | null>(null)
  const [promptName, setPromptName] = useState<string | null>(null)

  /**
   * Fetches version history for the prompt from the API
   */
  const fetchVersions = useCallback(async () => {
    // Skip if no prompt ID provided
    if (!promptId) {
      setVersions([])
      setCurrentVersion(null)
      setPromptName(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/prompts/${promptId}/versions`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Prompt not found')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch versions: ${response.status}`)
      }

      const data = await response.json()
      setVersions(data.data ?? [])
      setCurrentVersion(data.currentVersion ?? null)
      setPromptName(data.promptName ?? null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching versions'
      setError(message)
      toast.error('Failed to fetch version history', { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [promptId])

  // Auto-fetch when promptId changes
  useEffect(() => {
    if (promptId) {
      fetchVersions()
    } else {
      // Clear state when promptId is nullified
      setVersions([])
      setCurrentVersion(null)
      setPromptName(null)
      setError(null)
    }
  }, [promptId, fetchVersions])

  /**
   * Rollback the prompt to a specific version
   * @param version - The version number to rollback to
   * @returns True if rollback succeeded, false otherwise
   */
  const rollbackToVersion = useCallback(
    async (version: number): Promise<boolean> => {
      if (!promptId) {
        toast.error('No prompt ID provided')
        return false
      }

      if (version === currentVersion) {
        toast.info('Already at this version')
        return false
      }

      setIsRollingBack(true)
      setError(null)

      try {
        const response = await fetch(`/api/prompts/${promptId}/rollback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to rollback')
        }

        const data = await response.json()
        const newVersion = data.newVersion

        toast.success(`Rolled back to version ${version}`, {
          description: `New version ${newVersion} created`,
        })

        // Refetch versions to get updated list
        await fetchVersions()

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to rollback'
        setError(message)
        toast.error('Failed to rollback', { description: message })
        return false
      } finally {
        setIsRollingBack(false)
      }
    },
    [promptId, currentVersion, fetchVersions]
  )

  /**
   * Get a specific version by number
   * @param version - The version number to find
   * @returns The version if found, undefined otherwise
   */
  const getVersion = useCallback(
    (version: number): PromptVersion | undefined => {
      return versions.find((v) => v.version === version)
    },
    [versions]
  )

  /**
   * Compare two versions side-by-side
   * @param v1 - First version number
   * @param v2 - Second version number
   * @returns Object with both versions (may be undefined if not found)
   */
  const compareVersions = useCallback(
    (
      v1: number,
      v2: number
    ): {
      version1: PromptVersion | undefined
      version2: PromptVersion | undefined
    } => {
      return {
        version1: versions.find((v) => v.version === v1),
        version2: versions.find((v) => v.version === v2),
      }
    },
    [versions]
  )

  return {
    versions,
    isLoading,
    error,
    refetch: fetchVersions,
    rollbackToVersion,
    getVersion,
    compareVersions,
    currentVersion,
    promptName,
    isRollingBack,
  }
}

/**
 * Simplified diff result for comparing version content
 */
interface VersionDiff {
  /** Whether the versions are different */
  hasDiff: boolean
  /** Lines added (from version1 perspective) */
  addedLines: number
  /** Lines removed (from version1 perspective) */
  removedLines: number
  /** Lines changed */
  changedLines: number
}

/**
 * Utility hook for computing basic diff stats between two versions
 * @param version1 - First version content
 * @param version2 - Second version content
 * @returns Basic diff statistics
 * @example
 * ```tsx
 * const { version1, version2 } = compareVersions(2, 3)
 * const diff = useVersionDiff(version1?.content, version2?.content)
 * console.log(`${diff.addedLines} lines added, ${diff.removedLines} lines removed`)
 * ```
 */
export function useVersionDiff(
  content1: string | undefined,
  content2: string | undefined
): VersionDiff {
  return useMemo(() => {
    if (!content1 || !content2) {
      return {
        hasDiff: content1 !== content2,
        addedLines: 0,
        removedLines: 0,
        changedLines: 0,
      }
    }

    const lines1 = content1.split('\n')
    const lines2 = content2.split('\n')

    // Create sets for quick lookup
    const set1 = new Set(lines1)
    const set2 = new Set(lines2)

    // Count lines only in version2 (added)
    const addedLines = lines2.filter((line) => !set1.has(line)).length

    // Count lines only in version1 (removed)
    const removedLines = lines1.filter((line) => !set2.has(line)).length

    // Approximate changed lines (lines in same position but different)
    const minLength = Math.min(lines1.length, lines2.length)
    let changedLines = 0
    for (let i = 0; i < minLength; i++) {
      if (lines1[i] !== lines2[i]) {
        changedLines++
      }
    }

    return {
      hasDiff: content1 !== content2,
      addedLines,
      removedLines,
      changedLines,
    }
  }, [content1, content2])
}
