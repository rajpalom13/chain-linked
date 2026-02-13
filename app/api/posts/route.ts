/**
 * Posts API Route
 * @description Handles user posts and scheduled posts operations
 * @module app/api/posts
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET user's posts
 * @returns User's own posts with analytics
 */
export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const type = searchParams.get('type') || 'my_posts' // my_posts, feed_posts, scheduled

  let query
  if (type === 'scheduled') {
    query = supabase
      .from('scheduled_posts')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('scheduled_for', { ascending: true })
  } else if (type === 'feed_posts') {
    query = supabase
      .from('feed_posts')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('captured_at', { ascending: false })
  } else if (type === 'team_posts') {
    // Fetch posts from all team members
    let teamMemberIds: string[] = [user.id]

    try {
      const { data: teamMembership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (teamMembership?.team_id) {
        const { data: teamMembersData } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', teamMembership.team_id)

        if (teamMembersData && teamMembersData.length > 0) {
          teamMemberIds = teamMembersData.map(m => m.user_id)
        }
      }
    } catch {
      // Continue with solo user if team lookup fails
    }

    // Fetch posts from all team members
    const { data: teamPosts, error: teamError, count: teamCount } = await supabase
      .from('my_posts')
      .select('*', { count: 'exact' })
      .in('user_id', teamMemberIds)
      .order('posted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (teamError) {
      console.error('Team posts fetch error:', teamError)
      return NextResponse.json({ error: 'Failed to fetch team posts' }, { status: 500 })
    }

    // Fetch author profiles for each post
    const uniqueUserIds = [...new Set((teamPosts || []).map(p => p.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, linkedin_avatar_url')
      .in('id', uniqueUserIds)

    // Prefer LinkedIn avatar over default avatar
    const profileMap = new Map(
      (profiles || []).map(p => [p.id, {
        ...p,
        avatar_url: p.linkedin_avatar_url || p.avatar_url,
      }])
    )

    // Enrich posts with author info
    const enrichedPosts = (teamPosts || []).map(post => ({
      ...post,
      author: profileMap.get(post.user_id) || null,
    }))

    return NextResponse.json({ posts: enrichedPosts, total: teamCount })
  } else {
    query = supabase
      .from('my_posts')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('posted_at', { ascending: false })
  }

  const { data: posts, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('Posts fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }

  return NextResponse.json({ posts, total: count })
}

/**
 * POST create new scheduled post
 * @param request - Post content and schedule time
 * @returns Created scheduled post
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { content, scheduled_for, timezone, media_urls } = body

    if (!content || !scheduled_for) {
      return NextResponse.json({ error: 'Content and scheduled_for are required' }, { status: 400 })
    }

    const { data: post, error: insertError } = await supabase
      .from('scheduled_posts')
      .insert({
        user_id: user.id,
        content,
        scheduled_for,
        timezone: timezone || 'UTC',
        media_urls: media_urls || null,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create scheduled post' }, { status: 500 })
    }

    return NextResponse.json({ post })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

/**
 * DELETE scheduled post
 * @param request - Post ID to delete
 * @returns Success message
 */
export async function DELETE(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const postId = searchParams.get('id')

  if (!postId) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
  }

  const { error: deleteError } = await supabase
    .from('scheduled_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('Delete error:', deleteError)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
