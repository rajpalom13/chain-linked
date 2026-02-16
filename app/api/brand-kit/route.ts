/**
 * Brand Kit API Route
 * @description CRUD endpoints for brand kit management
 * @module app/api/brand-kit
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { BrandKit, BrandKitInsert, BrandKitUpdate, RawExtractionData } from '@/types/brand-kit'
import type { Json } from '@/types/database'

/**
 * GET handler for fetching user's brand kits
 * @returns User's brand kit(s) or error
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

    // Fetch user's brand kits
    const { data: brandKits, error: fetchError } = await supabase
      .from('brand_kits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Failed to fetch brand kits:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch brand kits' },
        { status: 500 }
      )
    }

    // Transform to camelCase
    const transformedKits: BrandKit[] = (brandKits || []).map(kit => ({
      id: kit.id,
      userId: kit.user_id,
      teamId: kit.team_id,
      websiteUrl: kit.website_url,
      primaryColor: kit.primary_color,
      secondaryColor: kit.secondary_color,
      accentColor: kit.accent_color,
      backgroundColor: kit.background_color,
      textColor: kit.text_color,
      fontPrimary: kit.font_primary,
      fontSecondary: kit.font_secondary,
      logoUrl: kit.logo_url,
      logoStoragePath: kit.logo_storage_path,
      rawExtraction: kit.raw_extraction as RawExtractionData | null,
      isActive: kit.is_active,
      createdAt: kit.created_at,
      updatedAt: kit.updated_at,
    }))

    return NextResponse.json({ brandKits: transformedKits })
  } catch (error) {
    console.error('Brand kit GET error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST handler for creating a new brand kit
 * @param request - Request containing brand kit data
 * @returns Created brand kit or error
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

    // Parse request body
    let body: Partial<BrandKitInsert>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.websiteUrl || !body.primaryColor) {
      return NextResponse.json(
        { error: 'websiteUrl and primaryColor are required' },
        { status: 400 }
      )
    }

    // Create brand kit first (inactive), then atomically activate it
    const shouldBeActive = body.isActive !== false

    const insertData = {
      user_id: user.id,
      team_id: body.teamId || null,
      website_url: body.websiteUrl,
      primary_color: body.primaryColor,
      secondary_color: body.secondaryColor || null,
      accent_color: body.accentColor || null,
      background_color: body.backgroundColor || null,
      text_color: body.textColor || null,
      font_primary: body.fontPrimary || null,
      font_secondary: body.fontSecondary || null,
      logo_url: body.logoUrl || null,
      logo_storage_path: body.logoStoragePath || null,
      raw_extraction: (body.rawExtraction || null) as Json,
      is_active: false, // Insert as inactive first to avoid race condition
    }

    const { data: brandKit, error: insertError } = await supabase
      .from('brand_kits')
      .insert(insertData)
      .select()
      .single()

    if (!insertError && brandKit && shouldBeActive) {
      // Deactivate all OTHER kits for this user, then activate this one
      // Using neq to exclude the newly created kit avoids the race condition
      // where deactivate-then-insert could leave no active kit on failure
      await supabase
        .from('brand_kits')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .neq('id', brandKit.id)

      await supabase
        .from('brand_kits')
        .update({ is_active: true })
        .eq('id', brandKit.id)
        .eq('user_id', user.id)

      brandKit.is_active = true
    }

    if (insertError) {
      console.error('Failed to create brand kit:', insertError)
      return NextResponse.json(
        { error: 'Failed to create brand kit' },
        { status: 500 }
      )
    }

    // Transform to camelCase
    const transformedKit: BrandKit = {
      id: brandKit.id,
      userId: brandKit.user_id,
      teamId: brandKit.team_id,
      websiteUrl: brandKit.website_url,
      primaryColor: brandKit.primary_color,
      secondaryColor: brandKit.secondary_color,
      accentColor: brandKit.accent_color,
      backgroundColor: brandKit.background_color,
      textColor: brandKit.text_color,
      fontPrimary: brandKit.font_primary,
      fontSecondary: brandKit.font_secondary,
      logoUrl: brandKit.logo_url,
      logoStoragePath: brandKit.logo_storage_path,
      rawExtraction: brandKit.raw_extraction as RawExtractionData | null,
      isActive: brandKit.is_active,
      createdAt: brandKit.created_at,
      updatedAt: brandKit.updated_at,
    }

    return NextResponse.json({ brandKit: transformedKit }, { status: 201 })
  } catch (error) {
    console.error('Brand kit POST error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * PUT handler for updating an existing brand kit
 * @param request - Request containing brand kit ID and updates
 * @returns Updated brand kit or error
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

    // Parse request body
    let body: { id: string } & Partial<BrandKitUpdate>
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
        { error: 'Brand kit ID is required' },
        { status: 400 }
      )
    }

    // If making this kit active, deactivate others first
    if (body.isActive === true) {
      await supabase
        .from('brand_kits')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .neq('id', body.id)
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.websiteUrl !== undefined) updateData.website_url = body.websiteUrl
    if (body.primaryColor !== undefined) updateData.primary_color = body.primaryColor
    if (body.secondaryColor !== undefined) updateData.secondary_color = body.secondaryColor
    if (body.accentColor !== undefined) updateData.accent_color = body.accentColor
    if (body.backgroundColor !== undefined) updateData.background_color = body.backgroundColor
    if (body.textColor !== undefined) updateData.text_color = body.textColor
    if (body.fontPrimary !== undefined) updateData.font_primary = body.fontPrimary
    if (body.fontSecondary !== undefined) updateData.font_secondary = body.fontSecondary
    if (body.logoUrl !== undefined) updateData.logo_url = body.logoUrl
    if (body.logoStoragePath !== undefined) updateData.logo_storage_path = body.logoStoragePath
    if (body.isActive !== undefined) updateData.is_active = body.isActive

    // Update brand kit (ensure user owns it)
    const { data: brandKit, error: updateError } = await supabase
      .from('brand_kits')
      .update(updateData)
      .eq('id', body.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update brand kit:', updateError)
      return NextResponse.json(
        { error: 'Failed to update brand kit' },
        { status: 500 }
      )
    }

    if (!brandKit) {
      return NextResponse.json(
        { error: 'Brand kit not found' },
        { status: 404 }
      )
    }

    // Transform to camelCase
    const transformedKit: BrandKit = {
      id: brandKit.id,
      userId: brandKit.user_id,
      teamId: brandKit.team_id,
      websiteUrl: brandKit.website_url,
      primaryColor: brandKit.primary_color,
      secondaryColor: brandKit.secondary_color,
      accentColor: brandKit.accent_color,
      backgroundColor: brandKit.background_color,
      textColor: brandKit.text_color,
      fontPrimary: brandKit.font_primary,
      fontSecondary: brandKit.font_secondary,
      logoUrl: brandKit.logo_url,
      logoStoragePath: brandKit.logo_storage_path,
      rawExtraction: brandKit.raw_extraction as RawExtractionData | null,
      isActive: brandKit.is_active,
      createdAt: brandKit.created_at,
      updatedAt: brandKit.updated_at,
    }

    return NextResponse.json({ brandKit: transformedKit })
  } catch (error) {
    console.error('Brand kit PUT error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE handler for removing a brand kit
 * @param request - Request containing brand kit ID
 * @returns Success message or error
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

    // Get ID from query params
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Brand kit ID is required' },
        { status: 400 }
      )
    }

    // Delete brand kit (ensure user owns it)
    const { error: deleteError } = await supabase
      .from('brand_kits')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Failed to delete brand kit:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete brand kit' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Brand kit DELETE error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
