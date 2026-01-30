"use client"

/**
 * Prompt History Hook
 * @description Manages a persistent history of prompt playground runs in localStorage
 * @module hooks/use-prompt-history
 */

import * as React from "react"

/** Maximum number of history entries to keep */
const MAX_HISTORY_ENTRIES = 50

/** localStorage key for prompt history */
const STORAGE_KEY = "chainlinked_prompt_history"

/**
 * A single prompt history entry
 */
export interface PromptHistoryEntry {
  /** Unique identifier */
  id: string
  /** ISO timestamp of when the prompt was run */
  timestamp: string
  /** System prompt text */
  systemPrompt: string
  /** User prompt text (before variable substitution) */
  userPrompt: string
  /** Variables used for substitution */
  variables: Record<string, string>
  /** Generated response content */
  response: string
  /** Model used for generation */
  model: string
  /** Temperature setting */
  temperature: number
  /** Max tokens setting */
  maxTokens: number
  /** Top-p setting */
  topP: number
  /** Token usage from the API response */
  tokenUsage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Return type for the usePromptHistory hook
 */
interface UsePromptHistoryReturn {
  /** All history entries, newest first */
  entries: PromptHistoryEntry[]
  /** Add a new history entry */
  addEntry: (entry: Omit<PromptHistoryEntry, "id" | "timestamp">) => void
  /** Delete a single entry by id */
  deleteEntry: (id: string) => void
  /** Clear all history entries */
  clearAll: () => void
  /** Search entries by prompt text or response content */
  search: (query: string) => PromptHistoryEntry[]
  /** Export all history entries as JSON */
  exportAsJson: () => string
  /** Import history entries from JSON */
  importFromJson: (json: string) => boolean
  /** Get entry by ID */
  getEntry: (id: string) => PromptHistoryEntry | undefined
  /** Duplicate an entry */
  duplicateEntry: (id: string) => void
}

/**
 * Reads prompt history from localStorage
 * @returns Array of history entries
 */
function readStorage(): PromptHistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PromptHistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Writes prompt history to localStorage
 * @param entries - History entries to persist
 */
function writeStorage(entries: PromptHistoryEntry[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // localStorage may be full; silently fail
  }
}

/**
 * Hook for managing prompt playground run history with localStorage persistence.
 * Stores up to 50 entries, newest first. Provides add, delete, clear, and search.
 * @returns History state and mutation functions
 * @example
 * const { entries, addEntry, deleteEntry, clearAll, search } = usePromptHistory()
 */
export function usePromptHistory(): UsePromptHistoryReturn {
  const [entries, setEntries] = React.useState<PromptHistoryEntry[]>([])

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    setEntries(readStorage())
  }, [])

  /**
   * Adds a new entry to the history, trimming oldest if over limit
   * @param entry - Entry data without id and timestamp
   */
  const addEntry = React.useCallback(
    (entry: Omit<PromptHistoryEntry, "id" | "timestamp">) => {
      const newEntry: PromptHistoryEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      }
      setEntries((prev) => {
        const updated = [newEntry, ...prev].slice(0, MAX_HISTORY_ENTRIES)
        writeStorage(updated)
        return updated
      })
    },
    []
  )

  /**
   * Deletes a single entry by id
   * @param id - Entry id to remove
   */
  const deleteEntry = React.useCallback((id: string) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id)
      writeStorage(updated)
      return updated
    })
  }, [])

  /**
   * Clears all history entries
   */
  const clearAll = React.useCallback(() => {
    setEntries([])
    writeStorage([])
  }, [])

  /**
   * Searches history entries by matching against prompt text and response content
   * @param query - Search query string
   * @returns Filtered entries matching the query
   */
  const search = React.useCallback(
    (query: string): PromptHistoryEntry[] => {
      if (!query.trim()) return entries
      const lower = query.toLowerCase()
      return entries.filter(
        (e) =>
          e.systemPrompt.toLowerCase().includes(lower) ||
          e.userPrompt.toLowerCase().includes(lower) ||
          e.response.toLowerCase().includes(lower) ||
          e.model.toLowerCase().includes(lower)
      )
    },
    [entries]
  )

  /**
   * Exports all history entries as a JSON string
   * @returns JSON string of all entries
   */
  const exportAsJson = React.useCallback((): string => {
    return JSON.stringify(entries, null, 2)
  }, [entries])

  /**
   * Imports history entries from a JSON string, merging with existing
   * @param json - JSON string to import
   * @returns true if import was successful
   */
  const importFromJson = React.useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as PromptHistoryEntry[]
      if (!Array.isArray(parsed)) return false

      // Validate entries have required fields
      const validEntries = parsed.filter(
        (e) =>
          typeof e.id === "string" &&
          typeof e.timestamp === "string" &&
          typeof e.systemPrompt === "string" &&
          typeof e.userPrompt === "string" &&
          typeof e.response === "string"
      )

      if (validEntries.length === 0) return false

      setEntries((prev) => {
        // Merge and deduplicate by id
        const existingIds = new Set(prev.map((e) => e.id))
        const newEntries = validEntries.filter((e) => !existingIds.has(e.id))
        const merged = [...newEntries, ...prev]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, MAX_HISTORY_ENTRIES)
        writeStorage(merged)
        return merged
      })

      return true
    } catch {
      return false
    }
  }, [])

  /**
   * Gets a single entry by ID
   * @param id - Entry ID to find
   * @returns The entry if found, undefined otherwise
   */
  const getEntry = React.useCallback(
    (id: string): PromptHistoryEntry | undefined => {
      return entries.find((e) => e.id === id)
    },
    [entries]
  )

  /**
   * Duplicates an entry with a new ID and timestamp
   * @param id - Entry ID to duplicate
   */
  const duplicateEntry = React.useCallback(
    (id: string) => {
      const entry = entries.find((e) => e.id === id)
      if (!entry) return

      const duplicate: PromptHistoryEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      }

      setEntries((prev) => {
        const updated = [duplicate, ...prev].slice(0, MAX_HISTORY_ENTRIES)
        writeStorage(updated)
        return updated
      })
    },
    [entries]
  )

  return {
    entries,
    addEntry,
    deleteEntry,
    clearAll,
    search,
    exportAsJson,
    importFromJson,
    getEntry,
    duplicateEntry,
  }
}
