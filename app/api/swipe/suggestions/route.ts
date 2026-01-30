/**
 * Swipe Suggestions API Route
 * @description GET endpoint to fetch AI-generated suggestions for the swipe feature
 * @module app/api/swipe/suggestions/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SuggestionStatus } from '@/types/database'

/** Maximum number of active suggestions allowed */
const MAX_ACTIVE_SUGGESTIONS = 10

/** Valid suggestion status values */
const VALID_STATUSES: SuggestionStatus[] = ['active', 'used', 'dismissed', 'expired']

/** Default number of suggestions to return per page */
const DEFAULT_LIMIT = 10

/**
 * GET /api/swipe/suggestions
 * Fetches AI-generated suggestions for the authenticated user
 * @param request - Next.js request object with query params
 * @returns JSON response with suggestions array and metadata
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
    const status = searchParams.get('status') || 'active'
    const limit = Math.min(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate status parameter
    if (!VALID_STATUSES.includes(status as SuggestionStatus)) {
      return NextResponse.json(
        { error: 'Invalid status parameter. Must be one of: active, used, dismissed, expired' },
        { status: 400 }
      )
    }

    const typedStatus = status as SuggestionStatus

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('generated_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', typedStatus)

    if (countError) {
      console.error('[API] Error counting suggestions:', countError)
      return NextResponse.json(
        { error: 'Failed to count suggestions' },
        { status: 500 }
      )
    }

    // Fetch suggestions
    const { data: suggestions, error: fetchError } = await supabase
      .from('generated_suggestions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', typedStatus)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fetchError) {
      console.error('[API] Error fetching suggestions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch suggestions' },
        { status: 500 }
      )
    }

    // Get active count separately for canGenerate check
    const { count: activeCount, error: activeCountError } = await supabase
      .from('generated_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (activeCountError) {
      console.error('[API] Error counting active suggestions:', activeCountError)
      // Don't fail the request, just default canGenerate to false
    }

    const total = totalCount ?? 0
    const hasMore = offset + limit < total
    const canGenerate = (activeCount ?? 0) < MAX_ACTIVE_SUGGESTIONS

    return NextResponse.json({
      suggestions: suggestions ?? [],
      total,
      hasMore,
      canGenerate,
      activeCount: activeCount ?? 0,
      maxActive: MAX_ACTIVE_SUGGESTIONS
    })
  } catch (error) {
    console.error('[API] Swipe suggestions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/swipe/suggestions
 * Updates the status of a suggestion (dismiss, mark as used, etc.)
 * @param request - Next.js request object with body
 * @returns JSON response with updated suggestion
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
    const { suggestionId, status } = body

    // Validate required fields
    if (!suggestionId) {
      return NextResponse.json(
        { error: 'suggestionId is required' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      )
    }

    // Validate status value
    if (!VALID_STATUSES.includes(status as SuggestionStatus)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: active, used, dismissed, expired' },
        { status: 400 }
      )
    }

    const typedStatus = status as SuggestionStatus

    // Verify ownership and update
    const updateData: { status: SuggestionStatus; used_at?: string } = { status: typedStatus }
    if (typedStatus === 'used') {
      updateData.used_at = new Date().toISOString()
    }

    const { data: updated, error: updateError } = await supabase
      .from('generated_suggestions')
      .update(updateData)
      .eq('id', suggestionId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Suggestion not found' },
          { status: 404 }
        )
      }
      console.error('[API] Error updating suggestion:', updateError)
      return NextResponse.json(
        { error: 'Failed to update suggestion' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      suggestion: updated
    })
  } catch (error) {
    console.error('[API] Swipe suggestions PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
