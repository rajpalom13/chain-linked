/**
 * Supabase Browser Client
 * @description Creates a Supabase client for use in browser/client components
 * @module lib/supabase/client
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Creates a Supabase client for browser-side operations
 * Uses default cookie storage for PKCE compatibility with server-side auth callbacks
 * @returns Supabase browser client instance
 * @example
 * const supabase = createClient()
 * const { data } = await supabase.from('profiles').select()
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use default cookie storage (required for PKCE flow with server-side callbacks)
        // This ensures code verifier is accessible during email verification
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Use PKCE flow for enhanced security
        flowType: 'pkce',
      },
    }
  )
}
