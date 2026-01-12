"use client"

import * as React from "react"

/**
 * Hook to provide auto-save status indication.
 * Debounces the value changes and returns saving status.
 *
 * @param value - The value to monitor for changes
 * @param delay - Debounce delay in milliseconds (default: 1500ms)
 * @returns Object with isSaving status and lastSaved timestamp
 *
 * @example
 * ```tsx
 * const { isSaving, lastSaved } = useAutoSave(content)
 *
 * return (
 *   <div>
 *     {isSaving ? "Saving..." : `Last saved ${formatTime(lastSaved)}`}
 *   </div>
 * )
 * ```
 */
export function useAutoSave(value: unknown, delay: number = 1500) {
  const [isSaving, setIsSaving] = React.useState(false)
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null)
  const [hasChanges, setHasChanges] = React.useState(false)
  const previousValueRef = React.useRef<unknown>(value)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    // Check if value has changed
    const valueStr = JSON.stringify(value)
    const prevValueStr = JSON.stringify(previousValueRef.current)

    if (valueStr !== prevValueStr) {
      setHasChanges(true)
      setIsSaving(true)

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout for "save complete"
      timeoutRef.current = setTimeout(() => {
        setIsSaving(false)
        setLastSaved(new Date())
        setHasChanges(false)
      }, delay)

      previousValueRef.current = value
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay])

  return { isSaving, lastSaved, hasChanges }
}

/**
 * Format a relative time string for display
 * @param date - The date to format
 * @returns A human-readable relative time string
 */
export function formatLastSaved(date: Date | null): string {
  if (!date) return ""

  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 5000) {
    return "Just now"
  }
  if (diff < 60000) {
    const seconds = Math.floor(diff / 1000)
    return `${seconds}s ago`
  }
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m ago`
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}
