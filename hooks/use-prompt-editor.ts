/**
 * Prompt Editor Hook
 * @description React hook for editing, testing, and saving prompts in the playground
 * @module hooks/use-prompt-editor
 */

"use client"

import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type {
  SystemPrompt,
  PromptType,
  PromptVariable,
} from '@/lib/prompts/prompt-types'

/**
 * Options for configuring the usePromptEditor hook
 */
interface UsePromptEditorOptions {
  /** ID of an existing prompt to load */
  promptId?: string
  /** Initial prompt data to populate the editor */
  initialPrompt?: SystemPrompt | null
}

/**
 * Data for saving a new prompt
 */
interface SavePromptData {
  /** Type of the prompt */
  type: PromptType
  /** Display name for the prompt */
  name: string
  /** Optional description */
  description?: string
  /** Prompt content */
  content: string
  /** Variable definitions */
  variables?: PromptVariable[]
  /** Notes about changes */
  changeNotes?: string
  /** Whether to set this as active */
  setActive?: boolean
}

/**
 * Data for testing a prompt
 */
interface TestPromptData {
  /** System prompt text */
  systemPrompt: string
  /** User prompt/input text */
  userPrompt: string
  /** Variable values to substitute */
  variables?: Record<string, string>
  /** Model to use for testing */
  model?: string
  /** Temperature setting (0-2) */
  temperature?: number
  /** Max tokens for response */
  maxTokens?: number
  /** Top-p setting (0-1) */
  topP?: number
  /** Label for this test run */
  label?: string
}

/**
 * Result from testing a prompt
 */
interface TestResult {
  /** Generated content */
  content: string
  /** Test metadata */
  metadata?: {
    /** Test run ID */
    testId?: string
    /** Tokens used in the test */
    tokensUsed?: number
    /** Usage breakdown */
    usage?: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
    /** Model used */
    model?: string
    /** Estimated cost in USD */
    estimatedCost?: number
    /** Duration in milliseconds */
    durationMs?: number
    /** Finish reason */
    finishReason?: string | null
  }
  /** Processed prompts after variable substitution */
  processedPrompts?: {
    systemPrompt: string
    userPrompt: string
  }
}

/**
 * Return type for the usePromptEditor hook
 */
interface UsePromptEditorReturn {
  // Current state
  /** The prompt being edited */
  prompt: SystemPrompt | null
  /** Current content in the editor */
  content: string
  /** Current name in the editor */
  name: string
  /** Current description in the editor */
  description: string
  /** Current variables in the editor */
  variables: PromptVariable[]
  /** Whether the editor has unsaved changes */
  isDirty: boolean
  /** Whether a save operation is in progress */
  isSaving: boolean
  /** Whether a test operation is in progress */
  isTesting: boolean
  /** Error message if any operation failed */
  error: string | null
  /** Result from the last test run */
  lastTestResult: TestResult | null

  // Edit operations
  /** Update the prompt content */
  setContent: (content: string) => void
  /** Update the prompt name */
  setName: (name: string) => void
  /** Update the prompt description */
  setDescription: (description: string) => void
  /** Update the prompt variables */
  setVariables: (variables: PromptVariable[]) => void
  /** Reset editor to original prompt state */
  reset: () => void

  // API operations
  /** Save changes to the current prompt */
  savePrompt: (data?: Partial<SavePromptData>) => Promise<SystemPrompt | null>
  /** Create a new prompt with the current content */
  saveAsNew: (data: SavePromptData) => Promise<SystemPrompt | null>
  /** Test the prompt with AI generation */
  testPrompt: (data: TestPromptData) => Promise<TestResult | null>
  /** Activate this prompt for its type */
  activatePrompt: () => Promise<boolean>
  /** Delete the current prompt */
  deletePrompt: () => Promise<boolean>

  // Load operations
  /** Load a prompt by ID */
  loadPrompt: (promptId: string) => Promise<void>
  /** Load the active prompt for a type */
  loadPromptByType: (type: PromptType) => Promise<void>
}

/**
 * Hook for editing, testing, and saving prompts
 * @param options - Configuration options
 * @returns Object with editor state and operations
 * @example
 * ```tsx
 * const {
 *   content,
 *   setContent,
 *   savePrompt,
 *   testPrompt,
 *   isSaving,
 *   isTesting,
 * } = usePromptEditor({ promptId: '550e8400-e29b-41d4-a716-446655440000' })
 *
 * // Edit content
 * setContent('You are an expert LinkedIn content writer...')
 *
 * // Test the prompt
 * const result = await testPrompt({
 *   systemPrompt: content,
 *   userPrompt: 'Write a post about AI',
 *   temperature: 0.7,
 * })
 *
 * // Save changes
 * await savePrompt({ changeNotes: 'Updated hook section' })
 * ```
 */
export function usePromptEditor(
  options: UsePromptEditorOptions = {}
): UsePromptEditorReturn {
  const { promptId, initialPrompt } = options

  // Editor state
  const [prompt, setPrompt] = useState<SystemPrompt | null>(initialPrompt ?? null)
  const [content, setContent] = useState(initialPrompt?.content ?? '')
  const [name, setName] = useState(initialPrompt?.name ?? '')
  const [description, setDescription] = useState(initialPrompt?.description ?? '')
  const [variables, setVariables] = useState<PromptVariable[]>(
    initialPrompt?.variables ?? []
  )

  // Operation states
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastTestResult, setLastTestResult] = useState<TestResult | null>(null)

  // Track original values for dirty checking
  const originalValues = useRef({
    content: initialPrompt?.content ?? '',
    name: initialPrompt?.name ?? '',
    description: initialPrompt?.description ?? '',
    variables: initialPrompt?.variables ?? [],
  })

  /**
   * Update dirty state when any value changes
   */
  useEffect(() => {
    const hasChanges =
      content !== originalValues.current.content ||
      name !== originalValues.current.name ||
      description !== originalValues.current.description ||
      JSON.stringify(variables) !== JSON.stringify(originalValues.current.variables)

    setIsDirty(hasChanges)
  }, [content, name, description, variables])

  /**
   * Load a prompt by ID when promptId option changes
   */
  useEffect(() => {
    if (promptId && !initialPrompt) {
      loadPromptInternal(promptId)
    }
  }, [promptId, initialPrompt])

  /**
   * Update editor state when initialPrompt changes
   */
  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt)
      setContent(initialPrompt.content)
      setName(initialPrompt.name)
      setDescription(initialPrompt.description ?? '')
      setVariables(initialPrompt.variables ?? [])
      originalValues.current = {
        content: initialPrompt.content,
        name: initialPrompt.name,
        description: initialPrompt.description ?? '',
        variables: initialPrompt.variables ?? [],
      }
      setIsDirty(false)
    }
  }, [initialPrompt])

  /**
   * Internal function to load a prompt by ID
   */
  const loadPromptInternal = async (id: string) => {
    setError(null)

    try {
      const response = await fetch(`/api/prompts/${id}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Prompt not found')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load prompt')
      }

      const { data } = await response.json()

      if (data) {
        setPrompt(data)
        setContent(data.content)
        setName(data.name)
        setDescription(data.description ?? '')
        setVariables(data.variables ?? [])
        originalValues.current = {
          content: data.content,
          name: data.name,
          description: data.description ?? '',
          variables: data.variables ?? [],
        }
        setIsDirty(false)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load prompt'
      setError(message)
      toast.error('Failed to load prompt', { description: message })
    }
  }

  /**
   * Load a prompt by ID
   */
  const loadPrompt = useCallback(async (id: string) => {
    await loadPromptInternal(id)
  }, [])

  /**
   * Load the active prompt for a specific type
   */
  const loadPromptByType = useCallback(async (type: PromptType) => {
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('type', type)
      params.set('isActive', 'true')

      const response = await fetch(`/api/prompts?${params}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch prompts')
      }

      const { data } = await response.json()
      const activePrompt = data?.find((p: SystemPrompt) => p.isActive)

      if (activePrompt) {
        setPrompt(activePrompt)
        setContent(activePrompt.content)
        setName(activePrompt.name)
        setDescription(activePrompt.description ?? '')
        setVariables(activePrompt.variables ?? [])
        originalValues.current = {
          content: activePrompt.content,
          name: activePrompt.name,
          description: activePrompt.description ?? '',
          variables: activePrompt.variables ?? [],
        }
        setIsDirty(false)
      } else {
        toast.info(`No active prompt found for type: ${type}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load prompt by type'
      setError(message)
      toast.error('Failed to load prompt', { description: message })
    }
  }, [])

  /**
   * Reset editor to original prompt state
   */
  const reset = useCallback(() => {
    setContent(originalValues.current.content)
    setName(originalValues.current.name)
    setDescription(originalValues.current.description)
    setVariables(originalValues.current.variables)
    setError(null)
    setIsDirty(false)
  }, [])

  /**
   * Save changes to the current prompt
   */
  const savePrompt = useCallback(
    async (data?: Partial<SavePromptData>): Promise<SystemPrompt | null> => {
      if (!prompt) {
        toast.error('No prompt loaded to save')
        return null
      }

      setIsSaving(true)
      setError(null)

      try {
        const response = await fetch(`/api/prompts/${prompt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data?.name ?? name,
            description: data?.description ?? description,
            content: data?.content ?? content,
            variables: data?.variables ?? variables,
            changeNotes: data?.changeNotes,
            setActive: data?.setActive,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to save prompt')
        }

        const { data: updatedPrompt } = await response.json()

        // Update internal state
        setPrompt(updatedPrompt)
        originalValues.current = {
          content: updatedPrompt.content,
          name: updatedPrompt.name,
          description: updatedPrompt.description ?? '',
          variables: updatedPrompt.variables ?? [],
        }
        setIsDirty(false)

        toast.success('Prompt saved successfully')
        return updatedPrompt
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save prompt'
        setError(message)
        toast.error('Failed to save prompt', { description: message })
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [prompt, name, description, content, variables]
  )

  /**
   * Create a new prompt with the current content
   */
  const saveAsNew = useCallback(
    async (data: SavePromptData): Promise<SystemPrompt | null> => {
      setIsSaving(true)
      setError(null)

      try {
        const response = await fetch('/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: data.type,
            name: data.name,
            description: data.description,
            content: data.content,
            variables: data.variables ?? [],
            setActive: data.setActive ?? false,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to create prompt')
        }

        const { data: createdPrompt } = await response.json()

        // Update internal state with new prompt
        setPrompt(createdPrompt)
        setContent(createdPrompt.content)
        setName(createdPrompt.name)
        setDescription(createdPrompt.description ?? '')
        setVariables(createdPrompt.variables ?? [])
        originalValues.current = {
          content: createdPrompt.content,
          name: createdPrompt.name,
          description: createdPrompt.description ?? '',
          variables: createdPrompt.variables ?? [],
        }
        setIsDirty(false)

        toast.success('Prompt created successfully')
        return createdPrompt
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create prompt'
        setError(message)
        toast.error('Failed to create prompt', { description: message })
        return null
      } finally {
        setIsSaving(false)
      }
    },
    []
  )

  /**
   * Test the prompt with AI generation
   */
  const testPrompt = useCallback(
    async (data: TestPromptData): Promise<TestResult | null> => {
      setIsTesting(true)
      setError(null)

      try {
        const response = await fetch('/api/prompts/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt: data.systemPrompt,
            userPrompt: data.userPrompt,
            variables: data.variables,
            model: data.model,
            temperature: data.temperature,
            maxTokens: data.maxTokens,
            topP: data.topP,
            label: data.label,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to test prompt')
        }

        const result = await response.json()

        // Transform response to TestResult format
        const testResult: TestResult = {
          content: result.content,
          metadata: {
            testId: result.metadata?.testId,
            tokensUsed: result.metadata?.usage?.totalTokens,
            usage: result.metadata?.usage,
            model: result.metadata?.model,
            estimatedCost: result.metadata?.estimatedCost,
            durationMs: result.metadata?.durationMs,
            finishReason: result.metadata?.finishReason,
          },
          processedPrompts: result.processedPrompts,
        }

        setLastTestResult(testResult)
        return testResult
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to test prompt'
        setError(message)
        toast.error('Failed to test prompt', { description: message })
        return null
      } finally {
        setIsTesting(false)
      }
    },
    []
  )

  /**
   * Activate this prompt for its type
   */
  const activatePrompt = useCallback(async (): Promise<boolean> => {
    if (!prompt) {
      toast.error('No prompt loaded to activate')
      return false
    }

    setError(null)

    try {
      const response = await fetch(`/api/prompts/${prompt.id}/activate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to activate prompt')
      }

      // Update local state
      setPrompt({ ...prompt, isActive: true })

      toast.success('Prompt activated successfully')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate prompt'
      setError(message)
      toast.error('Failed to activate prompt', { description: message })
      return false
    }
  }, [prompt])

  /**
   * Delete the current prompt
   */
  const deletePrompt = useCallback(async (): Promise<boolean> => {
    if (!prompt) {
      toast.error('No prompt loaded to delete')
      return false
    }

    setError(null)

    try {
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete prompt')
      }

      // Clear local state
      setPrompt(null)
      setContent('')
      setName('')
      setDescription('')
      setVariables([])
      originalValues.current = {
        content: '',
        name: '',
        description: '',
        variables: [],
      }
      setIsDirty(false)

      toast.success('Prompt deleted successfully')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete prompt'
      setError(message)
      toast.error('Failed to delete prompt', { description: message })
      return false
    }
  }, [prompt])

  return {
    // Current state
    prompt,
    content,
    name,
    description,
    variables,
    isDirty,
    isSaving,
    isTesting,
    error,
    lastTestResult,

    // Edit operations
    setContent,
    setName,
    setDescription,
    setVariables,
    reset,

    // API operations
    savePrompt,
    saveAsNew,
    testPrompt,
    activatePrompt,
    deletePrompt,

    // Load operations
    loadPrompt,
    loadPromptByType,
  }
}
