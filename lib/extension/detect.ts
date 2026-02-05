/**
 * Chrome Extension Detection Utilities
 * @description Detects if the ChainLinked Chrome extension is installed
 * @module lib/extension/detect
 */

/** Extension ID for ChainLinked Chrome extension */
export const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID || 'chainlinked-extension'

/** Chrome Web Store URL for the extension */
export const CHROME_STORE_URL = process.env.NEXT_PUBLIC_CHROME_STORE_URL || 'https://chrome.google.com/webstore/detail/chainlinked'

/** Local storage key for dismissing the extension prompt */
export const DISMISS_PROMPT_KEY = 'chainlinked_extension_prompt_dismissed'

/** Local storage key for tracking prompt dismissal timestamp */
export const DISMISS_PROMPT_TIMESTAMP_KEY = 'chainlinked_extension_prompt_dismissed_at'

/** Number of days before showing prompt again after dismissal */
export const PROMPT_COOLDOWN_DAYS = 7

/**
 * Check if the ChainLinked extension is installed by looking for injected markers
 * @returns Promise resolving to true if extension is detected
 */
export async function isExtensionInstalled(): Promise<boolean> {
  // Only run in browser
  if (typeof window === 'undefined') {
    return false
  }

  try {
    // Method 1: Check for extension-injected global variable
    if ((window as Window & { __CHAINLINKED_EXTENSION__?: boolean }).__CHAINLINKED_EXTENSION__) {
      return true
    }

    // Method 2: Check for custom DOM element injected by extension
    const extensionMarker = document.getElementById('chainlinked-extension-marker')
    if (extensionMarker) {
      return true
    }

    // Method 3: Dispatch custom event and wait for response
    return await checkExtensionViaEvent()
  } catch (error) {
    console.warn('[Extension Detection] Error checking extension:', error)
    return false
  }
}

/**
 * Check for extension by dispatching a custom event and listening for response
 * @returns Promise resolving to true if extension responds
 */
function checkExtensionViaEvent(): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('chainlinked-extension-pong', handlePong)
      resolve(false)
    }, 500) // 500ms timeout

    function handlePong() {
      clearTimeout(timeout)
      window.removeEventListener('chainlinked-extension-pong', handlePong)
      resolve(true)
    }

    window.addEventListener('chainlinked-extension-pong', handlePong)
    window.dispatchEvent(new CustomEvent('chainlinked-extension-ping'))
  })
}

/**
 * Check if the prompt has been dismissed and is still within cooldown period
 * @returns true if prompt should be hidden
 */
export function isPromptDismissed(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const dismissed = localStorage.getItem(DISMISS_PROMPT_KEY)
    if (dismissed !== 'true') {
      return false
    }

    // Check if cooldown period has passed
    const dismissedAt = localStorage.getItem(DISMISS_PROMPT_TIMESTAMP_KEY)
    if (!dismissedAt) {
      return true // Dismissed permanently (legacy)
    }

    const dismissedDate = new Date(dismissedAt)
    const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)

    // Show prompt again after cooldown period
    return daysSinceDismissed < PROMPT_COOLDOWN_DAYS
  } catch (error) {
    console.warn('[Extension Detection] Error checking prompt dismissed state:', error)
    return false
  }
}

/**
 * Dismiss the extension prompt for a cooldown period
 * @param permanent - If true, dismiss permanently (don't show again)
 */
export function dismissPrompt(permanent = false): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(DISMISS_PROMPT_KEY, 'true')
    if (!permanent) {
      localStorage.setItem(DISMISS_PROMPT_TIMESTAMP_KEY, new Date().toISOString())
    } else {
      localStorage.removeItem(DISMISS_PROMPT_TIMESTAMP_KEY)
    }
  } catch (error) {
    console.warn('[Extension Detection] Error dismissing prompt:', error)
  }
}

/**
 * Reset the prompt dismissal state (for testing or settings)
 */
export function resetPromptDismissal(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(DISMISS_PROMPT_KEY)
    localStorage.removeItem(DISMISS_PROMPT_TIMESTAMP_KEY)
  } catch (error) {
    console.warn('[Extension Detection] Error resetting prompt:', error)
  }
}

/**
 * Hook-friendly function to check if extension prompt should be shown
 * @returns Promise resolving to true if prompt should be shown
 */
export async function shouldShowExtensionPrompt(): Promise<boolean> {
  // Don't show if prompt was recently dismissed
  if (isPromptDismissed()) {
    return false
  }

  // Don't show if extension is already installed
  const installed = await isExtensionInstalled()
  if (installed) {
    return false
  }

  return true
}
