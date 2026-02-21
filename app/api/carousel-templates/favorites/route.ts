/**
 * Template Favorites API Route
 * @description Endpoints for managing template favorites persisted in Supabase
 * Supports both built-in template IDs and user-saved template UUIDs
 * @module app/api/carousel-templates/favorites
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Shape of a row in the template_favorites table
 */
interface TemplateFavoriteRow {
  id: string
  user_id: string
  template_id: string
  created_at: string
}

/**
 * GET handler for fetching the authenticated user's favorite template IDs
 * @returns JSON with an array of favorited template IDs
 * @example
 * GET /api/carousel-templates/favorites
 * Response: { favoriteIds: ["template-1", "template-2"] }
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: favorites, error: fetchError } = await supabase
      .from('template_favorites')
      .select('template_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Failed to fetch template favorites:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch template favorites' },
        { status: 500 }
      )
    }

    const favoriteIds = (favorites as Pick<TemplateFavoriteRow, 'template_id'>[] || []).map(
      (row) => row.template_id
    )

    return NextResponse.json({ favoriteIds })
  } catch (error) {
    console.error('Template favorites GET error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * Request body for adding a template favorite
 */
interface AddFavoriteBody {
  templateId: string
}

/**
 * POST handler for adding a template to the user's favorites
 * @param request - Request containing { templateId: string }
 * @returns JSON with the added templateId or error
 * @example
 * POST /api/carousel-templates/favorites
 * Body: { "templateId": "template-professional-1" }
 * Response: { templateId: "template-professional-1" }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: AddFavoriteBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    if (!body.templateId || typeof body.templateId !== 'string') {
      return NextResponse.json(
        { error: 'templateId is required and must be a string' },
        { status: 400 }
      )
    }

    const { error: insertError } = await supabase
      .from('template_favorites')
      .upsert(
        { user_id: user.id, template_id: body.templateId },
        { onConflict: 'user_id,template_id' }
      )

    if (insertError) {
      console.error('Failed to add template favorite:', insertError)
      return NextResponse.json(
        { error: 'Failed to add template favorite' },
        { status: 500 }
      )
    }

    return NextResponse.json({ templateId: body.templateId }, { status: 201 })
  } catch (error) {
    console.error('Template favorites POST error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE handler for removing a template from the user's favorites
 * @param request - Request with templateId as a query parameter
 * @returns JSON with success: true or error
 * @example
 * DELETE /api/carousel-templates/favorites?templateId=template-professional-1
 * Response: { success: true }
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')

    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId query parameter is required' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('template_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('template_id', templateId)

    if (deleteError) {
      console.error('Failed to remove template favorite:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove template favorite' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Template favorites DELETE error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
