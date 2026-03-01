/**
 * Compose Mode Hook
 * @description Manages compose mode state (basic/advanced) with localStorage
 * persistence and computed theme classes
 * @module hooks/use-compose-mode
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ComposeMode, ComposeTheme } from '@/types/compose'

/** localStorage key for persisting compose mode */
const STORAGE_KEY = 'chainlinked-compose-mode'

/**
 * Theme configuration for Basic mode (blue-tinted)
 */
const BASIC_THEME: ComposeTheme = {
  borderColor: 'border-primary/20',
  bgTint: 'bg-primary/[0.02]',
  accentColor: 'text-primary',
  gradientFrom: 'oklch(0.97 0.02 230)',
  gradientTo: 'oklch(0.95 0.03 230)',
}

/**
 * Theme configuration for Advanced mode (warm red-tinted)
 */
const ADVANCED_THEME: ComposeTheme = {
  borderColor: 'border-destructive/20',
  bgTint: 'bg-destructive/[0.02]',
  accentColor: 'text-destructive',
  gradientFrom: 'oklch(0.97 0.02 25)',
  gradientTo: 'oklch(0.95 0.03 25)',
}

/**
 * Hook for managing compose mode state and theme
 * @returns Mode state, setter, and computed theme
 * @example
 * const { mode, setMode, theme } = useComposeMode()
 */
export function useComposeMode() {
  const [mode, setModeState] = useState<ComposeMode>('basic')
  const [hydrated, setHydrated] = useState(false)

  /** Load persisted mode on mount */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'basic' || stored === 'advanced') {
      setModeState(stored)
    }
    setHydrated(true)
  }, [])

  /** Set mode and persist to localStorage */
  const setMode = useCallback((newMode: ComposeMode) => {
    setModeState(newMode)
    localStorage.setItem(STORAGE_KEY, newMode)
  }, [])

  /** Computed theme based on current mode */
  const theme = useMemo<ComposeTheme>(
    () => (mode === 'basic' ? BASIC_THEME : ADVANCED_THEME),
    [mode]
  )

  return { mode, setMode, theme, hydrated }
}
