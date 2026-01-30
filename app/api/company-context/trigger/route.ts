/**
 * Company Context Trigger API Route
 * @description Triggers the company analysis workflow via Inngest
 * @module app/api/company-context/trigger/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

/**
 * POST /api/company-context/trigger
 * Creates a company context record and triggers the analysis workflow
 */
export async function POST(request: NextRequest) {
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

    // Check if record exists and upsert
    const { data: existing } = await supabase
      .from('company_context')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let companyContextId: string

    if (existing) {
      // Update existing record and reset status
      const { data, error } = await supabase
        .from('company_context')
        .update({
          company_name: body.companyName,
          website_url: body.websiteUrl,
          industry: body.industry,
          target_audience_input: body.targetAudienceInput,
          status: 'pending',
          error_message: null,
          completed_at: null,
          // Clear previous analysis results
          value_proposition: null,
          company_summary: null,
          products_and_services: [],
          target_audience: {},
          tone_of_voice: {},
          brand_colors: [],
          scraped_content: null,
          perplexity_research: null,
        })
        .eq('user_id', user.id)
        .select('id')
        .single()

      if (error) {
        console.error('[API] Error updating company context:', error)
        return NextResponse.json(
          { error: 'Failed to update company context' },
          { status: 500 }
        )
      }

      companyContextId = data.id
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('company_context')
        .insert({
          user_id: user.id,
          company_name: body.companyName,
          website_url: body.websiteUrl,
          industry: body.industry,
          target_audience_input: body.targetAudienceInput,
          status: 'pending',
        })
        .select('id')
        .single()

      if (error) {
        console.error('[API] Error creating company context:', error)
        return NextResponse.json(
          { error: 'Failed to create company context' },
          { status: 500 }
        )
      }

      companyContextId = data.id
    }

    // Trigger Inngest workflow
    await inngest.send({
      name: 'company/analyze',
      data: {
        userId: user.id,
        companyContextId,
        companyName: body.companyName,
        websiteUrl: body.websiteUrl,
        industry: body.industry,
        targetAudienceInput: body.targetAudienceInput,
      },
    })

    return NextResponse.json({
      success: true,
      companyContextId,
      status: 'pending',
    })
  } catch (error) {
    console.error('[API] Trigger error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
