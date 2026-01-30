/**
 * Resend Verification Email API Route
 * @description Handles resending email verification using Supabase Auth or custom Resend
 * @module app/api/auth/resend-verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST handler for resending verification email
 * Uses Supabase Auth's built-in resend functionality
 * (Configure SMTP in Supabase dashboard to use Resend as provider)
 *
 * @param request - Request with email in body
 * @returns JSON response with success status
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Use Supabase Auth's built-in resend functionality
    // This will use whatever email provider is configured in Supabase dashboard
    // (Can be configured to use Resend SMTP)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback`,
      },
    })

    if (error) {
      console.error('Resend verification error:', error)

      // Handle specific errors
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a few minutes before trying again.' },
          { status: 429 }
        )
      }

      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return NextResponse.json(
          { error: 'No account found with this email address.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to resend verification email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    })
  } catch (err) {
    console.error('Resend verification exception:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
