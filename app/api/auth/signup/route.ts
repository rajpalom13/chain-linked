/**
 * Server-side Signup API Route
 * @description Creates a new user with auto-confirmation using the Supabase admin client.
 * Bypasses email verification and rate limits on confirmation emails.
 * @module app/api/auth/signup
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client with the service role key
 * @returns Supabase client with admin privileges
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

/**
 * POST handler for user signup
 * Creates a user with email_confirm: true to skip email verification
 *
 * @param request - Request with email, password, and optional name in body
 * @returns JSON response with user data or error
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
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

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Create user with auto-confirmation (no email verification needed)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || email.split('@')[0],
      },
    })

    if (error) {
      console.error('Admin signup error:', error)

      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: error.message || 'Failed to create account' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    })
  } catch (err) {
    console.error('Signup exception:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
