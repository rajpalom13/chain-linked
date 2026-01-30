/**
 * User API Route
 * @description Handles user profile operations
 * @module app/api/user
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET current user profile
 * @returns User data with LinkedIn profile if available
 */
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user profile with LinkedIn data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      *,
      linkedin_profiles (*)
    `)
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Profile fetch error:', profileError)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }

  return NextResponse.json({ user: profile })
}

/**
 * PATCH update user profile
 * @param request - Request with profile updates
 * @returns Updated user data
 */
export async function PATCH(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, linkedin_profile_url } = body

    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: name,
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ user: updatedUser })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
