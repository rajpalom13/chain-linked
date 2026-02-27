/**
 * Password Reset API Route
 * @description Generates a password reset link via Supabase admin and sends
 * the email via Resend with a custom branded template.
 * @module app/api/auth/reset-password
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/resend'
import { PasswordResetEmail } from '@/components/emails/password-reset'

/**
 * Create a Supabase admin client that can generate auth links
 * @returns Admin Supabase client
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('[ResetPassword] Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    throw new Error('Server configuration error')
  }

  return createClient(url, serviceKey)
}

/**
 * POST /api/auth/reset-password
 * @description Sends a password reset email via Resend.
 * Uses Supabase Admin generateLink to create a recovery link, then sends
 * the email through Resend with a branded template. The redirect URL
 * routes through /api/auth/callback so the PKCE code is properly
 * exchanged for a session before landing on /reset-password.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    console.log(`[ResetPassword] Processing reset request for: ${email}`)

    let supabaseAdmin
    try {
      supabaseAdmin = getSupabaseAdmin()
    } catch {
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Generate a password reset link via Supabase admin API.
    // Route through /api/auth/callback so the PKCE auth code is exchanged
    // for a session, then the callback redirects to /reset-password.
    console.log(`[ResetPassword] Generating recovery link with redirectTo: ${appUrl}/api/auth/callback?redirect=/reset-password`)

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${appUrl}/api/auth/callback?redirect=/reset-password`,
      },
    })

    if (error) {
      console.error('[ResetPassword] Generate link error:', error.message)

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a few minutes before trying again.' },
          { status: 429 }
        )
      }

      // Don't reveal whether user exists — always return success
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
      })
    }

    if (!data?.properties?.action_link) {
      console.log('[ResetPassword] No action_link returned — user may not exist')
      // User may not exist — return generic success (don't reveal)
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
      })
    }

    console.log(`[ResetPassword] Generated action_link successfully, sending email via Resend`)

    // Send the reset email via Resend
    try {
      const emailResult = await sendEmail({
        to: email,
        subject: 'Reset your ChainLinked password',
        react: PasswordResetEmail({
          email,
          resetLink: data.properties.action_link,
          expiresInHours: 1,
        }),
      })

      if (!emailResult.success) {
        console.error('[ResetPassword] Email send failed:', emailResult.error)
        return NextResponse.json(
          { error: 'Failed to send reset email. Please try again later.' },
          { status: 500 }
        )
      }

      console.log(`[ResetPassword] Reset email sent successfully to ${email}`)
    } catch (emailErr) {
      console.error('[ResetPassword] Email send exception:', emailErr)
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.',
    })
  } catch (err) {
    console.error('[ResetPassword] Unhandled exception:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
