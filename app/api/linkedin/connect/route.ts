/**
 * LinkedIn OAuth Connect Route Handler
 * @description Initiates LinkedIn OAuth flow by redirecting to LinkedIn
 * @module app/api/linkedin/connect
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateState, generateAuthUrl } from '@/lib/linkedin'

/**
 * Cookie name for storing OAuth state
 */
const STATE_COOKIE_NAME = 'linkedin_oauth_state'

/**
 * Cookie name for storing redirect URL
 */
const REDIRECT_COOKIE_NAME = 'linkedin_oauth_redirect'

/**
 * State cookie max age in seconds (10 minutes)
 */
const STATE_COOKIE_MAX_AGE = 600

/**
 * Initiates LinkedIn OAuth flow
 * @param request - Incoming request
 * @returns Redirect to LinkedIn authorization page
 */
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url)
  const redirectTo = searchParams.get('redirect') || '/dashboard/settings'

  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Please log in first')}`
      )
    }

    // Generate CSRF protection state
    const state = generateState()

    // Store state in cookie
    const cookieStore = await cookies()
    cookieStore.set(STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_COOKIE_MAX_AGE,
      path: '/',
    })

    // Store redirect URL in cookie for callback
    cookieStore.set(REDIRECT_COOKIE_NAME, redirectTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_COOKIE_MAX_AGE,
      path: '/',
    })

    // Generate authorization URL
    const authUrl = generateAuthUrl(state)

    // Redirect to LinkedIn
    return NextResponse.redirect(authUrl)

  } catch (err) {
    console.error('LinkedIn connect error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Failed to connect'
    return NextResponse.redirect(
      `${origin}/dashboard/settings?linkedin_error=${encodeURIComponent(errorMessage)}`
    )
  }
}
