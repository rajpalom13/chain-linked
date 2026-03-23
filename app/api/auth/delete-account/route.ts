/**
 * Delete Account API Route
 * @description Permanently deletes a user's account and all associated data.
 * Uses the Supabase service role to delete the auth user, which cascades
 * to all related tables via foreign key ON DELETE CASCADE.
 * @module app/api/auth/delete-account
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * POST - Delete the authenticated user's account
 * @returns JSON with success status
 */
export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    // Use admin client to delete data and auth user
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Delete user data from tables that may not cascade from auth.users
    // Order matters: delete dependent records first
    const tablesToClean = [
      { table: 'team_members', column: 'user_id' },
      { table: 'team_join_requests', column: 'user_id' },
      { table: 'team_invitations', column: 'invited_by' },
      { table: 'sync_metadata', column: 'user_id' },
      { table: 'extension_settings', column: 'user_id' },
      { table: 'capture_stats', column: 'user_id' },
      { table: 'captured_apis', column: 'user_id' },
      { table: 'post_analytics_daily', column: 'user_id' },
      { table: 'post_analytics_accumulative', column: 'user_id' },
      { table: 'profile_analytics_daily', column: 'user_id' },
      { table: 'profile_analytics_accumulative', column: 'user_id' },
      { table: 'analytics_summary_cache', column: 'user_id' },
      { table: 'analytics_history', column: 'user_id' },
      { table: 'audience_history', column: 'user_id' },
      { table: 'audience_data', column: 'user_id' },
      { table: 'post_analytics', column: 'user_id' },
      { table: 'my_posts', column: 'user_id' },
      { table: 'feed_posts', column: 'user_id' },
      { table: 'comments', column: 'user_id' },
      { table: 'followers', column: 'user_id' },
      { table: 'connections', column: 'user_id' },
      { table: 'linkedin_analytics', column: 'user_id' },
      { table: 'linkedin_profiles', column: 'user_id' },
      { table: 'linkedin_tokens', column: 'user_id' },
      { table: 'company_context', column: 'user_id' },
      { table: 'brand_kits', column: 'user_id' },
      { table: 'drafts', column: 'user_id' },
      { table: 'templates', column: 'user_id' },
    ]

    for (const { table, column } of tablesToClean) {
      const { error } = await adminClient.from(table).delete().eq(column, userId)
      if (error) {
        // Log but continue — table may not exist or have no rows
        console.warn(`[delete-account] Failed to clean ${table}:`, error.message)
      }
    }

    // Delete teams owned by this user (and their members via cascade)
    const { data: ownedTeams } = await adminClient
      .from('teams')
      .select('id')
      .eq('owner_id', userId)

    if (ownedTeams?.length) {
      for (const team of ownedTeams) {
        await adminClient.from('team_members').delete().eq('team_id', team.id)
        await adminClient.from('team_join_requests').delete().eq('team_id', team.id)
        await adminClient.from('team_invitations').delete().eq('team_id', team.id)
      }
      await adminClient.from('teams').delete().eq('owner_id', userId)
    }

    // Delete companies owned by this user
    await adminClient.from('companies').delete().eq('owner_id', userId)

    // Delete profile
    await adminClient.from('profiles').delete().eq('id', userId)

    // Finally, delete the auth user (this is irreversible)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('[delete-account] Failed to delete auth user:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[delete-account] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
