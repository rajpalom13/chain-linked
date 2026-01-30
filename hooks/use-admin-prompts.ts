/**
 * Admin Prompts Hook
 * @description Manages CRUD operations for admin system prompts via Supabase API
 * @module hooks/use-admin-prompts
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import type {
  SystemPrompt,
  PromptType,
  PromptVariable,
} from "@/lib/prompts/prompt-types"

/**
 * Input for creating a new prompt
 */
interface CreatePromptInput {
  /** Prompt type (required) */
  type: PromptType
  /** Display name (required) */
  name: string
  /** Description of the prompt's purpose */
  description?: string
  /** Prompt content (required) */
  content: string
  /** Variable definitions */
  variables?: PromptVariable[]
  /** Whether to set as active immediately */
  setActive?: boolean
}

/**
 * Input for updating an existing prompt
 */
interface UpdatePromptInput {
  /** New name */
  name?: string
  /** New description */
  description?: string
  /** New content */
  content?: string
  /** New variables */
  variables?: PromptVariable[]
  /** Notes about the changes */
  changeNotes?: string
  /** Whether to set as active */
  setActive?: boolean
}

/**
 * Return type for the useAdminPrompts hook
 */
interface UseAdminPromptsReturn {
  /** Array of all prompts */
  prompts: SystemPrompt[]
  /** Whether prompts are currently loading */
  isLoading: boolean
  /** Error message if any operation failed */
  error: string | null
  /** Create a new prompt */
  createPrompt: (prompt: CreatePromptInput) => Promise<SystemPrompt | null>
  /** Update an existing prompt */
  updatePrompt: (id: string, updates: UpdatePromptInput) => Promise<SystemPrompt | null>
  /** Delete a prompt by ID */
  deletePrompt: (id: string) => Promise<boolean>
  /** Duplicate an existing prompt */
  duplicatePrompt: (id: string) => Promise<SystemPrompt | null>
  /** Set a prompt as the active default for its type */
  setActivePrompt: (id: string) => Promise<boolean>
  /** Manually refetch prompts */
  refetch: () => Promise<void>
}

/**
 * Hook for managing admin system prompts via API.
 * Provides CRUD operations with optimistic updates and error handling.
 *
 * @returns Object with prompts data and CRUD operations
 * @example
 * ```tsx
 * const { prompts, createPrompt, updatePrompt, deletePrompt, setActivePrompt } = useAdminPrompts()
 *
 * // Create a new prompt
 * const newPrompt = await createPrompt({
 *   type: PromptType.REMIX_PROFESSIONAL,
 *   name: 'My Custom Remix',
 *   content: 'You are an expert...',
 * })
 *
 * // Update a prompt
 * await updatePrompt(prompt.id, {
 *   content: 'Updated content...',
 *   changeNotes: 'Fixed typo',
 * })
 *
 * // Set as active
 * await setActivePrompt(prompt.id)
 *
 * // Delete
 * await deletePrompt(prompt.id)
 * ```
 */
export function useAdminPrompts(): UseAdminPromptsReturn {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch all prompts from the API
   */
  const fetchPrompts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/prompts")

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch prompts")
      }

      const { data } = await response.json()
      setPrompts(data ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch prompts"
      setError(message)
      toast.error("Failed to load prompts", { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Load prompts on mount
   */
  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  /**
   * Create a new prompt
   * @param prompt - Prompt data to create
   * @returns Created prompt or null on error
   */
  const createPrompt = useCallback(
    async (prompt: CreatePromptInput): Promise<SystemPrompt | null> => {
      setError(null)

      try {
        const response = await fetch("/api/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: prompt.type,
            name: prompt.name,
            description: prompt.description,
            content: prompt.content,
            variables: prompt.variables ?? [],
            setActive: prompt.setActive ?? false,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to create prompt")
        }

        const { data: createdPrompt } = await response.json()

        // Update local state - if setActive was true, update other prompts of same type
        if (prompt.setActive) {
          setPrompts((prev) => {
            const updated = prev.map((p) =>
              p.type === prompt.type ? { ...p, isActive: false } : p
            )
            return [...updated, createdPrompt]
          })
        } else {
          setPrompts((prev) => [...prev, createdPrompt])
        }

        toast.success("Prompt created successfully")
        return createdPrompt
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create prompt"
        setError(message)
        toast.error("Failed to create prompt", { description: message })
        return null
      }
    },
    []
  )

  /**
   * Update an existing prompt
   * @param id - Prompt ID to update
   * @param updates - Fields to update
   * @returns Updated prompt or null on error
   */
  const updatePrompt = useCallback(
    async (id: string, updates: UpdatePromptInput): Promise<SystemPrompt | null> => {
      setError(null)

      try {
        const response = await fetch(`/api/prompts/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to update prompt")
        }

        const { data: updatedPrompt } = await response.json()

        // Update local state
        setPrompts((prev) =>
          prev.map((p) => (p.id === id ? updatedPrompt : p))
        )

        toast.success("Prompt updated successfully")
        return updatedPrompt
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update prompt"
        setError(message)
        toast.error("Failed to update prompt", { description: message })
        return null
      }
    },
    []
  )

  /**
   * Delete a prompt by ID
   * @param id - Prompt ID to delete
   * @returns True if deleted successfully
   */
  const deletePrompt = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null)

      // Find the prompt to check if it's a default
      const prompt = prompts.find((p) => p.id === id)
      if (prompt?.isDefault) {
        toast.error("Cannot delete default prompts")
        return false
      }

      try {
        const response = await fetch(`/api/prompts/${id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to delete prompt")
        }

        // Update local state
        setPrompts((prev) => prev.filter((p) => p.id !== id))

        toast.success("Prompt deleted successfully")
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete prompt"
        setError(message)
        toast.error("Failed to delete prompt", { description: message })
        return false
      }
    },
    [prompts]
  )

  /**
   * Duplicate an existing prompt
   * @param id - Prompt ID to duplicate
   * @returns Duplicated prompt or null on error
   */
  const duplicatePrompt = useCallback(
    async (id: string): Promise<SystemPrompt | null> => {
      const source = prompts.find((p) => p.id === id)
      if (!source) {
        toast.error("Prompt not found")
        return null
      }

      // Create a new prompt with the same content but different name
      return createPrompt({
        type: source.type,
        name: `${source.name} (Copy)`,
        description: source.description ?? undefined,
        content: source.content,
        variables: source.variables,
        setActive: false, // Duplicates should not be active by default
      })
    },
    [prompts, createPrompt]
  )

  /**
   * Set a prompt as the active default for its type.
   * Deactivates other prompts of the same type.
   * @param id - Prompt ID to set as active
   * @returns True if activated successfully
   */
  const setActivePrompt = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null)

      const target = prompts.find((p) => p.id === id)
      if (!target) {
        toast.error("Prompt not found")
        return false
      }

      if (target.isActive) {
        toast.info("Prompt is already active")
        return true
      }

      try {
        const response = await fetch(`/api/prompts/${id}/activate`, {
          method: "POST",
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to activate prompt")
        }

        // Update local state - deactivate others of same type, activate this one
        setPrompts((prev) =>
          prev.map((p) => {
            if (p.type === target.type) {
              return { ...p, isActive: p.id === id }
            }
            return p
          })
        )

        toast.success("Prompt activated successfully")
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to activate prompt"
        setError(message)
        toast.error("Failed to activate prompt", { description: message })
        return false
      }
    },
    [prompts]
  )

  return {
    prompts,
    isLoading,
    error,
    createPrompt,
    updatePrompt,
    deletePrompt,
    duplicatePrompt,
    setActivePrompt,
    refetch: fetchPrompts,
  }
}
