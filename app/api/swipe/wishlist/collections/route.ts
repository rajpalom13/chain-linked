/**
 * Wishlist Collections API Route
 * @description CRUD operations for managing user's wishlist collections (like Instagram save folders)
 * @module app/api/swipe/wishlist/collections/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/swipe/wishlist/collections
 * Fetches the user's wishlist collections
 * @param request - Next.js request object
 * @returns JSON response with collections array
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

    // Fetch user's collections
    const { data: collections, error: fetchError } = await supabase
      .from('wishlist_collections')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false }) // Default collection first
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('[API] Error fetching collections:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch collections' },
        { status: 500 }
      )
    }

    // Also get total item count across all collections (including uncategorized)
    const { count: totalItems, error: countError } = await supabase
      .from('swipe_wishlist')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('status', 'removed')

    if (countError) {
      console.error('[API] Error counting total items:', countError)
    }

    // Get count of uncategorized items
    const { count: uncategorizedCount, error: uncatError } = await supabase
      .from('swipe_wishlist')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('status', 'removed')
      .is('collection_id', null)

    if (uncatError) {
      console.error('[API] Error counting uncategorized items:', uncatError)
    }

    return NextResponse.json({
      collections: collections ?? [],
      totalItems: totalItems ?? 0,
      uncategorizedCount: uncategorizedCount ?? 0
    })
  } catch (error) {
    console.error('[API] Collections GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/swipe/wishlist/collections
 * Creates a new wishlist collection
 * @param request - Next.js request object with body
 * @returns JSON response with created collection
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
    const { name, description, emojiIcon, color } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      )
    }

    if (name.trim().length > 50) {
      return NextResponse.json(
        { error: 'Collection name must be 50 characters or less' },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const { data: existing, error: duplicateError } = await supabase
      .from('wishlist_collections')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
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

    // Create collection
    const { data: newCollection, error: insertError } = await supabase
      .from('wishlist_collections')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        emoji_icon: emojiIcon || '📁',
        color: color || '#6366f1',
        is_default: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('[API] Error creating collection:', insertError)
      return NextResponse.json(
        { error: 'Failed to create collection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      collection: newCollection
    })
  } catch (error) {
    console.error('[API] Collections POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
