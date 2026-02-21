/**
 * Template Categories API Route
 * @description Endpoints for managing user-defined template categories
 * Categories persist in Supabase so users can create them before assigning templates
 * @module app/api/carousel-templates/categories
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Shape of a row in the template_categories table
 */
interface TemplateCategoryRow {
  id: string
  user_id: string
  name: string
  created_at: string
}

/**
 * GET handler for fetching the authenticated user's template categories
 * @returns JSON with an array of category objects
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

    const { data: categories, error: fetchError } = await supabase
      .from('template_categories')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Failed to fetch template categories:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch template categories' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      categories: (categories as Pick<TemplateCategoryRow, 'id' | 'name' | 'created_at'>[]) ?? [],
    })
  } catch (error) {
    console.error('Template categories GET error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * Request body for creating a template category
 */
interface CreateCategoryBody {
  name: string
}

/**
 * POST handler for creating a new template category
 * @param request - Request containing { name: string }
 * @returns JSON with the created category or error
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

    let body: CreateCategoryBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const name = body.name?.trim()
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: 'Category name must be 50 characters or less' },
        { status: 400 }
      )
    }

    const { data: category, error: insertError } = await supabase
      .from('template_categories')
      .upsert(
        { user_id: user.id, name },
        { onConflict: 'user_id,name' }
      )
      .select('id, name, created_at')
      .single()

    if (insertError) {
      console.error('Failed to create template category:', insertError)
      return NextResponse.json(
        { error: 'Failed to create template category' },
        { status: 500 }
      )
    }

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Template categories POST error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE handler for removing a template category
 * @param request - Request with id as a query parameter
 * @returns JSON with success: true or error
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('template_categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Failed to delete template category:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete template category' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Template categories DELETE error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
