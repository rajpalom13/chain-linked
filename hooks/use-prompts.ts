/**
 * Prompts Hook
 * @description React hook for fetching and managing prompts from the API
 * @module hooks/use-prompts
 */

"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import type { SystemPrompt, PromptType } from '@/lib/prompts/prompt-types'

/**
 * Options for configuring the usePrompts hook
 */
interface UsePromptsOptions {
  /** Filter prompts by type */
  type?: PromptType
  /** Filter by active status */
  isActive?: boolean
  /** Filter by default status */
  isDefault?: boolean
  /** Whether to auto-fetch on mount (default: true) */
  autoFetch?: boolean
}

/**
 * Return type for the usePrompts hook
 */
interface UsePromptsReturn {
  /** Array of fetched prompts */
  prompts: SystemPrompt[]
  /** Whether prompts are currently loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Manually refetch prompts */
  refetch: () => Promise<void>
  /** Get a prompt by its type */
  getPromptByType: (type: PromptType) => SystemPrompt | undefined
  /** Get the active prompt for a specific type */
  getActivePrompt: (type: PromptType) => SystemPrompt | undefined
}

/**
 * Hook for fetching and managing prompts from the API
 * @param options - Configuration options for filtering and auto-fetching
 * @returns Object with prompts data and helper functions
 * @example
 * ```tsx
 * // Fetch all prompts
 * const { prompts, isLoading } = usePrompts()
 *
 * // Fetch only active remix prompts
 * const { prompts } = usePrompts({
 *   type: PromptType.REMIX_PROFESSIONAL,
 *   isActive: true
 * })
 * ```
 */
export function usePrompts(options: UsePromptsOptions = {}): UsePromptsReturn {
  const { type, isActive, isDefault, autoFetch = true } = options

  const [prompts, setPrompts] = useState<SystemPrompt[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetches prompts from the API with the configured filters
   */
  const fetchPrompts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Build query parameters from options
      const params = new URLSearchParams()
      if (type) params.set('type', type)
      if (isActive !== undefined) params.set('isActive', String(isActive))
      if (isDefault !== undefined) params.set('isDefault', String(isDefault))

      const queryString = params.toString()
      const url = `/api/prompts${queryString ? `?${queryString}` : ''}`

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch prompts: ${response.status}`)
      }

      const { data } = await response.json()
      setPrompts(data ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching prompts'
      setError(message)
      toast.error('Failed to fetch prompts', { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [type, isActive, isDefault])

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchPrompts()
    }
  }, [autoFetch, fetchPrompts])

  /**
   * Gets a prompt by its type (returns first match)
   * @param promptType - The type to search for
   * @returns The first prompt matching the type, or undefined
   */
  const getPromptByType = useCallback(
    (promptType: PromptType): SystemPrompt | undefined => {
      return prompts.find((p) => p.type === promptType)
    },
    [prompts]
  )

  /**
   * Gets the active prompt for a specific type
   * @param promptType - The type to search for
   * @returns The active prompt of that type, or undefined
   */
  const getActivePrompt = useCallback(
    (promptType: PromptType): SystemPrompt | undefined => {
      return prompts.find((p) => p.type === promptType && p.isActive)
    },
    [prompts]
  )

  return {
    prompts,
    isLoading,
    error,
    refetch: fetchPrompts,
    getPromptByType,
    getActivePrompt,
  }
}

/**
 * Options for configuring the usePrompt hook
 */
interface UsePromptOptions {
  /** Whether to auto-fetch on mount (default: true) */
  autoFetch?: boolean
}

/**
 * Return type for the usePrompt hook
 */
interface UsePromptReturn {
  /** The fetched prompt, or null if not found/loading */
  prompt: SystemPrompt | null
  /** Whether the prompt is currently loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Manually refetch the prompt */
  refetch: () => Promise<void>
}

/**
 * Hook for fetching a single prompt by ID
 * @param promptId - The UUID of the prompt to fetch, or null to skip fetching
 * @param options - Configuration options
 * @returns Object with prompt data and helper functions
 * @example
 * ```tsx
 * const { prompt, isLoading, error } = usePrompt('550e8400-e29b-41d4-a716-446655440000')
 *
 * // Skip fetching until ID is available
 * const [selectedId, setSelectedId] = useState<string | null>(null)
 * const { prompt } = usePrompt(selectedId)
 * ```
 */
export function usePrompt(
  promptId: string | null,
  options: UsePromptOptions = {}
): UsePromptReturn {
  const { autoFetch = true } = options

  const [prompt, setPrompt] = useState<SystemPrompt | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetches a single prompt by ID from the API
   */
  const fetchPrompt = useCallback(async () => {
    // Skip if no ID provided
    if (!promptId) {
      setPrompt(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/prompts/${promptId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Prompt not found')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch prompt: ${response.status}`)
      }

      const { data } = await response.json()
      setPrompt(data ?? null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching prompt'
      setError(message)
      setPrompt(null)
      toast.error('Failed to fetch prompt', { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [promptId])

  // Auto-fetch when promptId changes
  useEffect(() => {
    if (autoFetch && promptId) {
      fetchPrompt()
    } else if (!promptId) {
      // Clear prompt when ID is nullified
      setPrompt(null)
      setError(null)
    }
  }, [autoFetch, promptId, fetchPrompt])

  return {
    prompt,
    isLoading,
    error,
    refetch: fetchPrompt,
  }
}

/**
 * Hook for fetching the active prompt for a specific type
 * @param promptType - The type of prompt to fetch the active version for
 * @returns Object with the active prompt and loading state
 * @example
 * ```tsx
 * const { activePrompt, isLoading } = useActivePrompt(PromptType.REMIX_PROFESSIONAL)
 * ```
 */
export function useActivePrompt(promptType: PromptType | null): {
  activePrompt: SystemPrompt | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const { prompts, isLoading, error, refetch } = usePrompts(
    promptType
      ? {
          type: promptType,
          isActive: true,
          autoFetch: true,
        }
      : {
          autoFetch: false,
        }
  )

  const activePrompt = useMemo(() => {
    if (!promptType) return null
    return prompts.find((p) => p.isActive) ?? null
  }, [prompts, promptType])

  return {
    activePrompt,
    isLoading,
    error,
    refetch,
  }
}
