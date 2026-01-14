/**
 * Analytics API Route
 * @description Handles LinkedIn analytics data operations
 * @module app/api/analytics
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { TablesInsert } from '@/types/database'

/**
 * GET user analytics data
 * @returns Latest analytics with history for trends
 */
export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')

  // Get latest analytics
  const { data: analytics, error: analyticsError } = await supabase
    .from('linkedin_analytics')
    .select('*')
    .eq('user_id', user.id)
    .order('captured_at', { ascending: false })
    .limit(1)
    .single()

  // Get analytics history for trends
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: history, error: historyError } = await supabase
    .from('analytics_history')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (analyticsError && analyticsError.code !== 'PGRST116') {
    console.error('Analytics fetch error:', analyticsError)
  }

  if (historyError) {
    console.error('History fetch error:', historyError)
  }

  return NextResponse.json({
    current: analytics || null,
    history: history || [],
  })
}

/**
 * POST new analytics data (from extension sync)
 * @param request - Analytics data to save
 * @returns Saved analytics record
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      page_type,
      impressions,
      members_reached,
      engagements,
      new_followers,
      profile_views,
      search_appearances,
      top_posts,
      raw_data,
    } = body

    // Insert new analytics record
    const analyticsInsert: TablesInsert<'linkedin_analytics'> = {
      user_id: user.id,
      page_type: page_type || 'creator_analytics',
      impressions,
      members_reached,
      engagements,
      new_followers,
      profile_views,
      search_appearances,
      top_posts,
      raw_data,
    }

    const { data: analytics, error: insertError } = await supabase
      .from('linkedin_analytics')
      .insert(analyticsInsert)
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save analytics' }, { status: 500 })
    }

    // Also add to history for trend tracking
    const today = new Date().toISOString().split('T')[0]

    const historyInsert: TablesInsert<'analytics_history'> = {
      user_id: user.id,
      date: today,
      impressions,
      members_reached,
      engagements,
      followers: new_followers,
      profile_views,
    }

    await supabase
      .from('analytics_history')
      .upsert(historyInsert, {
        onConflict: 'user_id,date',
      })

    return NextResponse.json({ analytics })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
