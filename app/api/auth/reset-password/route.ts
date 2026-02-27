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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

/**
 * POST /api/auth/reset-password
 * @description Sends a password reset email via Resend
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Generate a password reset link via Supabase admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${appUrl}/reset-password`,
      },
    })

    if (error) {
      console.error('Generate reset link error:', error)

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
      // User may not exist — return generic success (don't reveal)
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
      })
    }

    // Send the reset email via Resend
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
      console.error('Reset email send error:', emailResult.error)
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
    console.error('Password reset exception:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
