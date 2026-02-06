/**
 * Wishlist Collection API Route (Individual)
 * @description PATCH and DELETE operations for a specific wishlist collection
 * @module app/api/swipe/wishlist/collections/[id]/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/swipe/wishlist/collections/[id]
 * Updates a wishlist collection
 * @param request - Next.js request object with body
 * @param context - Route params containing collection ID
 * @returns JSON response with updated collection
 */
export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const supabase = await createClient()
    const { id } = await context.params

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify collection ownership
    const { data: collection, error: fetchError } = await supabase
      .from('wishlist_collections')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, description, emojiIcon, color } = body

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Collection name cannot be empty' },
          { status: 400 }
        )
      }
      if (name.trim().length > 50) {
        return NextResponse.json(
          { error: 'Collection name must be 50 characters or less' },
          { status: 400 }
        )
      }

      // Check for duplicate name (excluding current collection)
      const { data: existing, error: duplicateError } = await supabase
        .from('wishlist_collections')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', name.trim())
        .neq('id', id)
        .single()

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        console.error('[API] Error checking for duplicate collection:', duplicateError)
        return NextResponse.json(
          { error: 'Failed to check for duplicates' },
          { status: 500 }
        )
      }

      if (existing) {
        return NextResponse.json(
          { error: 'A collection with this name already exists' },
          { status: 409 }
        )
      }

      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (emojiIcon !== undefined) {
      updateData.emoji_icon = emojiIcon
    }

    if (color !== undefined) {
      updateData.color = color
    }

    // Update collection
    const { data: updated, error: updateError } = await supabase
      .from('wishlist_collections')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('[API] Error updating collection:', updateError)
      return NextResponse.json(
        { error: 'Failed to update collection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      collection: updated
    })
  } catch (error) {
    console.error('[API] Collection PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/swipe/wishlist/collections/[id]
 * Deletes a wishlist collection
 * @param request - Next.js request object
 * @param context - Route params containing collection ID
 * @returns JSON response with success status
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const supabase = await createClient()
    const { id } = await context.params

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify collection ownership and check if it's the default
    const { data: collection, error: fetchError } = await supabase
      .from('wishlist_collections')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    if (collection.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete the default collection' },
        { status: 400 }
      )
    }

    // Parse query params to determine what to do with items
    const searchParams = request.nextUrl.searchParams
    const moveToDefault = searchParams.get('move_to_default') === 'true'

    if (moveToDefault) {
      // Find user's default collection
      const { data: defaultCollection, error: defaultError } = await supabase
        .from('wishlist_collections')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single()

      if (defaultError || !defaultCollection) {
        // If no default collection, just set collection_id to null
        await supabase
          .from('swipe_wishlist')
          .update({ collection_id: null })
          .eq('collection_id', id)
      } else {
        // Move items to default collection
        await supabase
          .from('swipe_wishlist')
          .update({ collection_id: defaultCollection.id })
          .eq('collection_id', id)
      }
    } else {
      // Just remove the collection_id from items (they become uncategorized)
      await supabase
        .from('swipe_wishlist')
        .update({ collection_id: null })
        .eq('collection_id', id)
    }

    // Delete the collection
    const { error: deleteError } = await supabase
      .from('wishlist_collections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('[API] Error deleting collection:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete collection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deletedId: id
    })
  } catch (error) {
    console.error('[API] Collection DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
