/**
 * LinkedIn Posting Configuration
 * @description Controls whether live LinkedIn posting is enabled.
 * When disabled, all "Post Now" actions save as drafts instead.
 * @module lib/linkedin/posting-config
 */

/** Message shown when posting is disabled */
export const POSTING_DISABLED_MESSAGE =
  'LinkedIn posting is currently disabled. Your content has been saved as a draft.'

/** Status to assign when posting is disabled (uses 'pending' which is a valid DB enum) */
export const DISABLED_DRAFT_STATUS = 'pending' as const

/**
 * Check if live LinkedIn posting is enabled (server-side)
 * @returns true if LINKEDIN_POSTING_ENABLED is explicitly "true"
 */
export function isPostingEnabled(): boolean {
  return process.env.LINKEDIN_POSTING_ENABLED === 'true'
}
