/**
 * Wishlist Item Schedule API Route
 * @description POST endpoint to schedule a wishlist item for posting
 * @module app/api/swipe/wishlist/[id]/schedule/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/swipe/wishlist/[id]/schedule
 * Schedules a wishlist item for posting to LinkedIn
 * @param request - Next.js request object with body
 * @param context - Route context with params
 * @returns JSON response with success status and scheduled post ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: wishlistItemId } = await params

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate wishlistItemId
    if (!wishlistItemId) {
      return NextResponse.json(
        { error: 'Wishlist item ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { scheduledFor, timezone, visibility } = body

    // Validate required fields
    if (!scheduledFor) {
      return NextResponse.json(
        { error: 'scheduledFor is required' },
        { status: 400 }
      )
    }

    // Validate scheduledFor is a valid date and is in the future
    const scheduledDate = new Date(scheduledFor)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'scheduledFor must be a valid date' },
        { status: 400 }
      )
    }

    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'scheduledFor must be in the future' },
        { status: 400 }
      )
    }

    // Validate visibility if provided
    const validVisibilities = ['PUBLIC', 'CONNECTIONS']
    const postVisibility = visibility || 'PUBLIC'
    if (!validVisibilities.includes(postVisibility)) {
      return NextResponse.json(
        { error: 'visibility must be either PUBLIC or CONNECTIONS' },
        { status: 400 }
      )
    }

    // Fetch wishlist item and verify ownership
    const { data: wishlistItem, error: fetchError } = await supabase
      .from('swipe_wishlist')
      .select('*')
      .eq('id', wishlistItemId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Wishlist item not found' },
          { status: 404 }
        )
      }
      console.error('[API] Error fetching wishlist item:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch wishlist item' },
        { status: 500 }
      )
    }

    // Check if already scheduled
    if (wishlistItem.is_scheduled) {
      return NextResponse.json(
        {
          error: 'Already scheduled',
          message: 'This wishlist item has already been scheduled',
          scheduledPostId: wishlistItem.scheduled_post_id
        },
        { status: 409 }
      )
    }

    // Check if item is in valid status
    if (wishlistItem.status !== 'saved') {
      return NextResponse.json(
        {
          error: 'Invalid item status',
          message: `Cannot schedule an item with status "${wishlistItem.status}". Only saved items can be scheduled.`
        },
        { status: 400 }
      )
    }

    // Create scheduled_posts record
    const { data: scheduledPost, error: insertError } = await supabase
      .from('scheduled_posts')
      .insert({
        user_id: user.id,
        content: wishlistItem.content,
        scheduled_for: scheduledDate.toISOString(),
        timezone: timezone || 'UTC',
        status: 'scheduled',
        visibility: postVisibility
      })
      .select()
      .single()

    if (insertError) {
      console.error('[API] Error creating scheduled post:', insertError)
      return NextResponse.json(
        { error: 'Failed to create scheduled post' },
        { status: 500 }
      )
    }

    // Update wishlist item: is_scheduled=true, scheduled_post_id, status='scheduled'
    const { error: updateError } = await supabase
      .from('swipe_wishlist')
      .update({
        is_scheduled: true,
        scheduled_post_id: scheduledPost.id,
        status: 'scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', wishlistItemId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[API] Error updating wishlist item:', updateError)
      // Attempt to rollback the scheduled post
      await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', scheduledPost.id)
        .eq('user_id', user.id)

      return NextResponse.json(
        { error: 'Failed to update wishlist item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      scheduledPostId: scheduledPost.id,
      scheduledFor: scheduledPost.scheduled_for,
      visibility: scheduledPost.visibility,
      timezone: scheduledPost.timezone
    })
  } catch (error) {
    console.error('[API] Wishlist schedule error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
