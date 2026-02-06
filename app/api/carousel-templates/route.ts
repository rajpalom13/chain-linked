/**
 * Carousel Templates API Route
 * @description CRUD endpoints for saving and managing custom carousel templates
 * @module app/api/carousel-templates
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CanvasSlide } from '@/types/canvas-editor'

/**
 * Shape of the raw row returned from the carousel_templates table
 */
interface CarouselTemplateRow {
  id: string
  user_id: string
  team_id: string | null
  name: string
  description: string | null
  category: string
  slides: unknown
  brand_colors: unknown
  fonts: unknown
  thumbnail: string | null
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

/**
 * CamelCase response shape for carousel templates
 */
interface CarouselTemplateResponse {
  id: string
  userId: string
  teamId: string | null
  name: string
  description: string | null
  category: string
  slides: CanvasSlide[]
  brandColors: string[]
  fonts: string[]
  thumbnail: string | null
  isPublic: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

/**
 * Transform a snake_case database row to a camelCase response object
 * @param row - Raw database row
 * @returns Transformed camelCase template object
 */
function transformRow(row: CarouselTemplateRow): CarouselTemplateResponse {
  return {
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id,
    name: row.name,
    description: row.description,
    category: row.category,
    slides: row.slides as CanvasSlide[],
    brandColors: (row.brand_colors ?? []) as string[],
    fonts: (row.fonts ?? []) as string[],
    thumbnail: row.thumbnail,
    isPublic: row.is_public,
    usageCount: row.usage_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * GET handler for fetching user's saved carousel templates
 * @returns Array of carousel templates belonging to the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: templates, error: fetchError } = await supabase
      .from('carousel_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Failed to fetch carousel templates:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch carousel templates' },
        { status: 500 }
      )
    }

    const transformed: CarouselTemplateResponse[] = (templates || []).map(
      (row) => transformRow(row as CarouselTemplateRow)
    )

    return NextResponse.json({ templates: transformed })
  } catch (error) {
    console.error('Carousel templates GET error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * Request body for creating a new carousel template
 */
interface CreateTemplateBody {
  name: string
  description?: string
  category?: string
  slides: CanvasSlide[]
  brandColors?: string[]
  fonts?: string[]
  thumbnail?: string
  isPublic?: boolean
  teamId?: string
}

/**
 * POST handler for creating a new carousel template
 * @param request - Request containing template data (name and slides required)
 * @returns Created carousel template or error
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let body: CreateTemplateBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }

    if (!body.slides || !Array.isArray(body.slides) || body.slides.length === 0) {
      return NextResponse.json(
        { error: 'At least one slide is required' },
        { status: 400 }
      )
    }

    const insertData = {
      user_id: user.id,
      team_id: body.teamId || null,
      name: body.name.trim(),
      description: body.description || null,
      category: body.category || 'custom',
      slides: JSON.parse(JSON.stringify(body.slides)),
      brand_colors: body.brandColors || [],
      fonts: body.fonts || [],
      thumbnail: body.thumbnail || null,
      is_public: body.isPublic ?? false,
    }

    const { data: template, error: insertError } = await supabase
      .from('carousel_templates')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create carousel template:', insertError)
      return NextResponse.json(
        { error: 'Failed to create carousel template' },
        { status: 500 }
      )
    }

    const transformed = transformRow(template as CarouselTemplateRow)

    return NextResponse.json({ template: transformed }, { status: 201 })
  } catch (error) {
    console.error('Carousel templates POST error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * Request body for updating an existing carousel template
 */
interface UpdateTemplateBody {
  id: string
  name?: string
  description?: string
  category?: string
  slides?: CanvasSlide[]
  brandColors?: string[]
  fonts?: string[]
  thumbnail?: string
  isPublic?: boolean
  usageCount?: number
}

/**
 * PUT handler for updating an existing carousel template
 * @param request - Request containing template ID and fields to update
 * @returns Updated carousel template or error
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let body: UpdateTemplateBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    if (!body.id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category
    if (body.slides !== undefined) updateData.slides = JSON.parse(JSON.stringify(body.slides))
    if (body.brandColors !== undefined) updateData.brand_colors = body.brandColors
    if (body.fonts !== undefined) updateData.fonts = body.fonts
    if (body.thumbnail !== undefined) updateData.thumbnail = body.thumbnail
    if (body.isPublic !== undefined) updateData.is_public = body.isPublic
    if (body.usageCount !== undefined) updateData.usage_count = body.usageCount

    const { data: template, error: updateError } = await supabase
      .from('carousel_templates')
      .update(updateData)
      .eq('id', body.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update carousel template:', updateError)
      return NextResponse.json(
        { error: 'Failed to update carousel template' },
        { status: 500 }
      )
    }

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    const transformed = transformRow(template as CarouselTemplateRow)

    return NextResponse.json({ template: transformed })
  } catch (error) {
    console.error('Carousel templates PUT error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE handler for removing a carousel template
 * @param request - Request containing template ID as query parameter
 * @returns Success response or error
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('carousel_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Failed to delete carousel template:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete carousel template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Carousel templates DELETE error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
