/**
 * Company Context API Route
 * @description Get/Update company context for the authenticated user
 * @module app/api/company-context/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/company-context
 * Returns the company context for the authenticated user
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

    const { data, error } = await supabase
      .from('company_context')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[API] Error fetching company context:', error)
      return NextResponse.json(
        { error: 'Failed to fetch company context' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || null)
  } catch (error) {
    console.error('[API] Company context error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/company-context
 * Updates the company context for the authenticated user
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.companyName) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    // Check if record exists
    const { data: existing } = await supabase
      .from('company_context')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let result
    if (existing) {
      // Update existing record
      result = await supabase
        .from('company_context')
        .update({
          company_name: body.companyName,
          website_url: body.websiteUrl,
          industry: body.industry,
          target_audience_input: body.targetAudienceInput,
          value_proposition: body.valueProposition,
          company_summary: body.companySummary,
          products_and_services: body.productsAndServices,
          target_audience: body.targetAudience,
          tone_of_voice: body.toneOfVoice,
          brand_colors: body.brandColors,
        })
        .eq('user_id', user.id)
        .select()
        .single()
    } else {
      // Insert new record
      result = await supabase
        .from('company_context')
        .insert({
          user_id: user.id,
          company_name: body.companyName,
          website_url: body.websiteUrl,
          industry: body.industry,
          target_audience_input: body.targetAudienceInput,
          value_proposition: body.valueProposition,
          company_summary: body.companySummary,
          products_and_services: body.productsAndServices,
          target_audience: body.targetAudience,
          tone_of_voice: body.toneOfVoice,
          brand_colors: body.brandColors,
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('[API] Error updating company context:', result.error)
      return NextResponse.json(
        { error: 'Failed to update company context' },
        { status: 500 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('[API] Company context update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
