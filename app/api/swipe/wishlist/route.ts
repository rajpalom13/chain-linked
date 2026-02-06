/**
 * Swipe Wishlist API Route
 * @description CRUD operations for managing user's wishlist of liked suggestions
 * @module app/api/swipe/wishlist/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { WishlistStatus } from '@/types/database'

/** Default number of wishlist items to return per page */
const DEFAULT_LIMIT = 20

/** Valid wishlist status values */
const VALID_STATUSES: WishlistStatus[] = ['saved', 'scheduled', 'posted', 'removed']

/**
 * GET /api/swipe/wishlist
 * Fetches the user's wishlist items
 * @param request - Next.js request object with query params
 * @returns JSON response with wishlist items array and metadata
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'saved'
    const collectionId = searchParams.get('collection_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate status parameter
    if (!VALID_STATUSES.includes(status as WishlistStatus)) {
      return NextResponse.json(
        { error: 'Invalid status parameter. Must be one of: saved, scheduled, posted, removed' },
        { status: 400 }
      )
    }

    const typedStatus = status as WishlistStatus

    // Build count query with optional collection filter
    let countQuery = supabase
      .from('swipe_wishlist')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', typedStatus)

    // Add collection filter if provided
    if (collectionId) {
      if (collectionId === 'uncategorized') {
        countQuery = countQuery.is('collection_id', null)
      } else {
        countQuery = countQuery.eq('collection_id', collectionId)
      }
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.error('[API] Error counting wishlist items:', countError)
      return NextResponse.json(
        { error: 'Failed to count wishlist items' },
        { status: 500 }
      )
    }

    // Build fetch query with optional collection filter
    let fetchQuery = supabase
      .from('swipe_wishlist')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', typedStatus)

    // Add collection filter if provided
    if (collectionId) {
      if (collectionId === 'uncategorized') {
        fetchQuery = fetchQuery.is('collection_id', null)
      } else {
        fetchQuery = fetchQuery.eq('collection_id', collectionId)
      }
    }

    // Fetch wishlist items
    const { data: items, error: fetchError } = await fetchQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fetchError) {
      console.error('[API] Error fetching wishlist items:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch wishlist items' },
        { status: 500 }
      )
    }

    const total = totalCount ?? 0
    const hasMore = offset + limit < total

    return NextResponse.json({
      items: items ?? [],
      total,
      hasMore
    })
  } catch (error) {
    console.error('[API] Wishlist GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/swipe/wishlist
 * Adds a new item to the user's wishlist
 * @param request - Next.js request object with body
 * @returns JSON response with success status and wishlist item ID
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { suggestionId, content, postType, category, notes, collectionId } = body

    // Validate required fields
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Determine which collection to use
    let targetCollectionId = collectionId

    // If collectionId provided, verify it belongs to the user
    if (collectionId) {
      const { data: collection, error: collectionError } = await supabase
        .from('wishlist_collections')
        .select('id')
        .eq('id', collectionId)
        .eq('user_id', user.id)
        .single()

      if (collectionError || !collection) {
        return NextResponse.json(
          { error: 'Collection not found or unauthorized' },
          { status: 404 }
        )
      }
    } else {
      // No collection specified - assign to user's default collection
      const { data: defaultCollection } = await supabase
        .from('wishlist_collections')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single()

      if (defaultCollection) {
        targetCollectionId = defaultCollection.id
      }
    }

    // Check for duplicate (user_id, content)
    const { data: existing, error: duplicateError } = await supabase
      .from('swipe_wishlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('content', content.trim())
      .eq('status', 'saved')
      .single()

    if (duplicateError && duplicateError.code !== 'PGRST116') {
      console.error('[API] Error checking for duplicates:', duplicateError)
      return NextResponse.json(
        { error: 'Failed to check for duplicates' },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        {
          error: 'Duplicate item',
          message: 'This content is already in your wishlist',
          existingId: existing.id
        },
        { status: 409 }
      )
    }

    // Insert into swipe_wishlist
    const { data: newItem, error: insertError } = await supabase
      .from('swipe_wishlist')
      .insert({
        user_id: user.id,
        suggestion_id: suggestionId || null,
        collection_id: targetCollectionId || null,
        content: content.trim(),
        post_type: postType || null,
        category: category || null,
        notes: notes || null,
        status: 'saved',
        is_scheduled: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('[API] Error inserting wishlist item:', insertError)
      return NextResponse.json(
        { error: 'Failed to add item to wishlist' },
        { status: 500 }
      )
    }

    // Mark suggestion as 'used' if suggestionId provided
    if (suggestionId) {
      const { error: updateError } = await supabase
        .from('generated_suggestions')
        .update({
          status: 'used',
          used_at: new Date().toISOString()
        })
        .eq('id', suggestionId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[API] Error marking suggestion as used:', updateError)
        // Don't fail the request, the wishlist item was created successfully
      }
    }

    return NextResponse.json({
      success: true,
      wishlistItemId: newItem.id,
      item: newItem
    })
  } catch (error) {
    console.error('[API] Wishlist POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/swipe/wishlist
 * Removes an item from the user's wishlist (soft delete)
 * @param request - Next.js request object with body
 * @returns JSON response with success status
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { itemId } = body

    // Validate required fields
    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      )
    }

    // Update status to 'removed' (soft delete)
    const { data: updated, error: updateError } = await supabase
      .from('swipe_wishlist')
      .update({
        status: 'removed',
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Wishlist item not found' },
          { status: 404 }
        )
      }
      console.error('[API] Error removing wishlist item:', updateError)
      return NextResponse.json(
        { error: 'Failed to remove wishlist item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      itemId: updated.id
    })
  } catch (error) {
    console.error('[API] Wishlist DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/swipe/wishlist
 * Updates a wishlist item (notes, category, etc.)
 * @param request - Next.js request object with body
 * @returns JSON response with updated item
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { itemId, notes, category, content, collectionId } = body

    // Validate required fields
    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      )
    }

    // If collectionId provided (including null to remove from collection), verify ownership
    if (collectionId !== undefined && collectionId !== null) {
      const { data: collection, error: collectionError } = await supabase
        .from('wishlist_collections')
        .select('id')
        .eq('id', collectionId)
        .eq('user_id', user.id)
        .single()

      if (collectionError || !collection) {
        return NextResponse.json(
          { error: 'Collection not found or unauthorized' },
          { status: 404 }
        )
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (category !== undefined) {
      updateData.category = category
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json(
          { error: 'Content cannot be empty' },
          { status: 400 }
        )
      }
      updateData.content = content.trim()
    }

    // Allow moving to a collection or removing from collection (null)
    if (collectionId !== undefined) {
      updateData.collection_id = collectionId
    }

    // Update the item
    const { data: updated, error: updateError } = await supabase
      .from('swipe_wishlist')
      .update(updateData)
      .eq('id', itemId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Wishlist item not found' },
          { status: 404 }
        )
      }
      console.error('[API] Error updating wishlist item:', updateError)
      return NextResponse.json(
        { error: 'Failed to update wishlist item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      item: updated
    })
  } catch (error) {
    console.error('[API] Wishlist PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
