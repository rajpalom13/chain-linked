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
    const { name, linkedin_profile_url, avatar_url, company_name, company_website } = body

    /** Build update payload with only the fields provided in the request body */
    const updatePayload: Record<string, unknown> = {}
    if (name !== undefined) updatePayload.full_name = name
    if (linkedin_profile_url !== undefined) updatePayload.linkedin_profile_url = linkedin_profile_url
    if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url
    if (company_name !== undefined) updatePayload.company_name = company_name
    if (company_website !== undefined) updatePayload.company_website = company_website

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
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
