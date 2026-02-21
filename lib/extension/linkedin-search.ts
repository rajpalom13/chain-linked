/**
 * LinkedIn Search via Extension
 * @description Sends search queries to the ChainLinked Chrome extension which
 * makes Voyager API calls using its own session cookies. Cookies never leave
 * the extension — only parsed results are returned to the web app.
 * @module lib/extension/linkedin-search
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const chrome: any

import { EXTENSION_ID } from './detect'

/**
 * Mention search result returned by the extension
 */
export interface ExtensionMentionResult {
  /** Display name */
  name: string
  /** LinkedIn URN (urn:li:person:xxx) */
  urn: string
  /** Professional headline */
  headline: string | null
  /** Profile picture URL */
  avatarUrl: string | null
  /** Public profile identifier */
  publicIdentifier: string | null
}

/**
 * Search LinkedIn users via the ChainLinked extension.
 * The extension reads cookies internally and makes the Voyager API call —
 * no credentials are sent to or stored by the web app.
 * @param query - Search query string (name or keyword)
 * @returns Array of matching profiles, or null if extension unavailable
 */
export async function searchLinkedInViaExtension(
  query: string
): Promise<ExtensionMentionResult[] | null> {
  if (typeof window === 'undefined') return null
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return null

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 12000)

    try {
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        { type: 'LINKEDIN_MENTION_SEARCH', query },
        (response: any) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError || !response) {
            resolve(null)
            return
          }
          if (response.success && response.results) {
            resolve(response.results)
          } else {
            resolve(null)
          }
        }
      )
    } catch {
      clearTimeout(timeout)
      resolve(null)
    }
  })
}
