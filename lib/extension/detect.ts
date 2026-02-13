/**
 * Chrome Extension Detection Utilities
 * @description Detects if the ChainLinked Chrome extension is installed
 * using multiple methods with sessionStorage caching.
 * @module lib/extension/detect
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const chrome: any

/** Extension ID for ChainLinked Chrome extension */
export const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID || 'chainlinked-extension'

/** Chrome Web Store URL for the extension */
export const CHROME_STORE_URL = process.env.NEXT_PUBLIC_CHROME_STORE_URL || 'https://chrome.google.com/webstore/detail/chainlinked'

/** Local storage key for dismissing the extension prompt */
export const DISMISS_PROMPT_KEY = 'chainlinked_extension_prompt_dismissed'

/** Local storage key for tracking prompt dismissal timestamp */
export const DISMISS_PROMPT_TIMESTAMP_KEY = 'chainlinked_extension_prompt_dismissed_at'

/** Session storage key for caching detection result */
const SESSION_CACHE_KEY = 'chainlinked_extension_detected'

/** Number of days before showing prompt again after dismissal */
export const PROMPT_COOLDOWN_DAYS = 7

/**
 * Check if the ChainLinked extension is installed using multiple detection methods.
 * Results are cached in sessionStorage so detection only runs once per session.
 * @param skipCache - If true, bypass the session cache and re-run detection
 * @returns Promise resolving to true if extension is detected
 */
export async function isExtensionInstalled(skipCache = false): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false
  }

  // Check session cache first
  if (!skipCache) {
    try {
      const cached = sessionStorage.getItem(SESSION_CACHE_KEY)
      if (cached !== null) {
        return cached === 'true'
      }
    } catch {
      // sessionStorage may be blocked
    }
  }

  try {
    // Method 1: Check for extension-injected global variable
    if ((window as Window & { __CHAINLINKED_EXTENSION__?: boolean }).__CHAINLINKED_EXTENSION__) {
      cacheResult(true)
      return true
    }

    // Method 2: Check for custom DOM element injected by extension
    const extensionMarker = document.getElementById('chainlinked-extension-marker')
    if (extensionMarker) {
      cacheResult(true)
      return true
    }

    // Method 3: Dispatch custom event and wait for response
    const eventResult = await checkExtensionViaEvent()
    if (eventResult) {
      cacheResult(true)
      return true
    }

    // Method 4: External messaging via chrome.runtime.sendMessage
    const externalResult = await checkExtensionViaExternalMessage()
    if (externalResult) {
      cacheResult(true)
      return true
    }

    cacheResult(false)
    return false
  } catch (error) {
    console.warn('[Extension Detection] Error checking extension:', error)
    return false
  }
}

/**
 * Cache the detection result in sessionStorage
 * @param detected - Whether the extension was detected
 */
function cacheResult(detected: boolean): void {
  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, String(detected))
  } catch {
    // sessionStorage may be blocked
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
    }, 500)

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
 * Check for extension via chrome.runtime.sendMessage (external messaging)
 * Most reliable method when extension is configured with externally_connectable
 * @returns Promise resolving to true if extension responds
 */
function checkExtensionViaExternalMessage(): Promise<boolean> {
  return new Promise((resolve) => {
    // chrome.runtime.sendMessage is only available in Chrome-based browsers
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      resolve(false)
      return
    }

    const timeout = setTimeout(() => resolve(false), 1000)

    try {
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        { type: 'CHAINLINKED_PING' },
        (response: any) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) {
            // Extension not installed or not connectable
            resolve(false)
            return
          }
          resolve(response?.installed === true)
        }
      )
    } catch {
      clearTimeout(timeout)
      resolve(false)
    }
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

    const dismissedAt = localStorage.getItem(DISMISS_PROMPT_TIMESTAMP_KEY)
    if (!dismissedAt) {
      return true
    }

    const dismissedDate = new Date(dismissedAt)
    const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceDismissed < PROMPT_COOLDOWN_DAYS
  } catch (error) {
    console.warn('[Extension Detection] Error checking prompt dismissed state:', error)
    return false
  }
}

/**
 * Dismiss the extension prompt for a cooldown period
 * @param permanent - If true, dismiss permanently
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
 * Reset the prompt dismissal state
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
 * Check if extension prompt should be shown
 * @returns Promise resolving to true if prompt should be shown
 */
export async function shouldShowExtensionPrompt(): Promise<boolean> {
  if (isPromptDismissed()) {
    return false
  }

  const installed = await isExtensionInstalled()
  if (installed) {
    return false
  }

  return true
}
