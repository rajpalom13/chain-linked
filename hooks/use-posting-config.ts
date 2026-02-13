/**
 * Client-side LinkedIn Posting Configuration Hook
 * @description Reads NEXT_PUBLIC_LINKEDIN_POSTING_ENABLED to determine
 * whether live posting is allowed in the UI.
 * @module hooks/use-posting-config
 */

/** Message shown in UI when posting is disabled */
const POSTING_DISABLED_MESSAGE =
  'LinkedIn posting is disabled. Posts will be saved as drafts.'

/**
 * Hook to check if LinkedIn posting is enabled on the client
 * @returns Object with posting status and disabled message
 * @example
 * const { isPostingEnabled, disabledMessage } = usePostingConfig()
 */
export function usePostingConfig() {
  const isPostingEnabled =
    process.env.NEXT_PUBLIC_LINKEDIN_POSTING_ENABLED === 'true'

  return {
    isPostingEnabled,
    disabledMessage: POSTING_DISABLED_MESSAGE,
  } as const
}
