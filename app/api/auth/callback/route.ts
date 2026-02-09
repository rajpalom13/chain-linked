/**
 * OAuth Callback Route Handler
 * @description Handles Supabase OAuth/email verification callbacks
 * @module app/api/auth/callback
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Maps technical auth errors to user-friendly messages
 * @param error - Error object or string
 * @returns User-friendly error message
 */
/**
 * Validates a redirect URL to prevent open redirect attacks.
 * Only allows internal paths starting with `/` (not protocol-relative `//`).
 * @param url - The redirect URL to validate
 * @returns Sanitized URL or '/dashboard' fallback
 */
function sanitizeRedirect(url: string): string {
  if (url && url.startsWith('/') && !url.startsWith('//')) {
    return url
  }
  return '/dashboard'
}

function getErrorMessage(error: unknown): string {
  const errorStr = error instanceof Error ? error.message : String(error)
  const errorCode = (error as { code?: string })?.code

  // Map common error codes to friendly messages
  if (errorCode === 'pkce_code_verifier_not_found' || errorStr.includes('PKCE')) {
    return 'Your verification session expired. Please request a new verification email.'
  }
  if (errorStr.includes('expired') || errorStr.includes('invalid')) {
    return 'This link has expired. Please request a new verification email.'
  }
  if (errorStr.includes('access_denied')) {
    return 'Access was denied. Please try signing in again.'
  }

  return 'Authentication failed. Please try again.'
}

/**
 * Handles OAuth callback from Supabase (Google OAuth and email verification)
 * @param request - Incoming request with auth code
 * @returns Redirect to dashboard or error page
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeRedirect(searchParams.get('redirect') ?? searchParams.get('next') ?? '/dashboard')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const errorCode = searchParams.get('error_code')

  // Handle OAuth/email verification errors passed as query params
  if (error) {
    console.error('Auth callback error:', { error, errorCode, errorDescription })

    // Handle specific error codes
    let userMessage = errorDescription || error
    if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
      userMessage = 'Your verification link has expired. Please request a new one.'
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(userMessage)}`
    )
  }

  if (code) {
    const supabase = await createClient()

    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError)
        const userMessage = getErrorMessage(exchangeError)
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(userMessage)}`
        )
      }

      // Get user data to ensure profile exists
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check if user profile exists (trigger should auto-create, but fallback here)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        // Create profile record if not exists
        if (!existingProfile) {
          const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id,
            email: user.email ?? '',
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          })

          if (insertError) {
            console.error('Profile creation error:', insertError)
            // Don't fail the auth - profile might already exist or will be created by trigger
          }
        }
      }

      // Always use origin for the redirect to avoid trusting x-forwarded-host
      return NextResponse.redirect(`${origin}${next}`)
    } catch (err) {
      console.error('Auth callback exception:', err)
      const userMessage = getErrorMessage(err)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(userMessage)}`
      )
    }
  }

  // No code provided - redirect with generic error
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('No authentication code provided. Please try signing in again.')}`)
}
