/**
 * Copy Team Context Utility
 * @description Copies company context and brand kit from team owner to a new member.
 * Uses a service-role client for write operations so that an admin approving a
 * join request can write to the new member's rows without being blocked by RLS.
 * @module lib/team/copy-context
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client that bypasses RLS.
 * Required because this function writes to rows owned by a different user
 * (the new member) than the one who may be authenticated (the team admin).
 * @returns Supabase client with service-role privileges
 */
function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

/**
 * Copy company context (profile fields + brand kit) from team owner to a new member.
 * Called when a user joins a team via join request approval or invite acceptance.
 *
 * Uses a service-role client for all database operations because the caller may
 * be a team admin (approving a join request) who doesn't have RLS access to the
 * new member's rows.
 *
 * Copies:
 * - Profile fields: company_name, company_website, company_description, company_icp,
 *   company_products, company_value_props, discover_topics, discover_topics_selected
 * - Sets company_onboarding_completed and onboarding_completed to true
 * - Replaces the new member's active brand kit with the owner's
 *
 * @param _supabase - Supabase client instance (unused, kept for API compatibility)
 * @param teamId - Team the user is joining
 * @param newUserId - The user who just joined
 */
export async function copyTeamContextToMember(
  _supabase: SupabaseClient,
  teamId: string,
  newUserId: string
) {
  try {
    const supabase = getAdminClient()

    // Find the team owner
    const { data: ownerMembership } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('role', 'owner')
      .limit(1)
      .single()

    if (!ownerMembership) {
      console.warn('[copyTeamContext] No owner found for team:', teamId)
      return
    }

    const ownerId = ownerMembership.user_id

    // Fetch owner's profile (company context fields)
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('company_name, company_website, company_description, company_icp, company_products, company_value_props, discover_topics, discover_topics_selected')
      .eq('id', ownerId)
      .single()

    if (ownerProfile) {
      // Copy company context to new member's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company_name: ownerProfile.company_name,
          company_website: ownerProfile.company_website,
          company_description: ownerProfile.company_description,
          company_icp: ownerProfile.company_icp,
          company_products: ownerProfile.company_products,
          company_value_props: ownerProfile.company_value_props,
          discover_topics: ownerProfile.discover_topics,
          discover_topics_selected: ownerProfile.discover_topics_selected,
          company_onboarding_completed: true,
          onboarding_completed: true,
        })
        .eq('id', newUserId)

      if (profileError) {
        console.error('[copyTeamContext] Failed to copy profile context:', profileError)
      } else {
        console.log(`[copyTeamContext] Copied company context from owner ${ownerId} to member ${newUserId}`)
      }
    }

    // Copy owner's company_context to the new member
    // This is where the actual company data lives (from onboarding step 2)
    const { data: ownerContext } = await supabase
      .from('company_context')
      .select('company_name, website_url, industry, target_audience_input, value_proposition, company_summary, products_and_services, target_audience, tone_of_voice, brand_colors, status')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (ownerContext) {
      // Check if the new user already has a company_context
      const { data: existingContext } = await supabase
        .from('company_context')
        .select('id')
        .eq('user_id', newUserId)
        .limit(1)
        .maybeSingle()

      const ownerContextFields = {
        company_name: ownerContext.company_name,
        website_url: ownerContext.website_url,
        industry: ownerContext.industry,
        target_audience_input: ownerContext.target_audience_input,
        value_proposition: ownerContext.value_proposition,
        company_summary: ownerContext.company_summary,
        products_and_services: ownerContext.products_and_services,
        target_audience: ownerContext.target_audience,
        tone_of_voice: ownerContext.tone_of_voice,
        brand_colors: ownerContext.brand_colors,
        status: ownerContext.status,
      }

      if (existingContext) {
        // Update existing company_context with team owner's data
        const { error: contextError } = await supabase
          .from('company_context')
          .update(ownerContextFields)
          .eq('id', existingContext.id)

        if (contextError) {
          console.error('[copyTeamContext] Failed to update company_context:', contextError)
        } else {
          console.log(`[copyTeamContext] Updated company_context for member ${newUserId} with team data`)
        }
      } else {
        // Insert new company_context for the member
        const { error: contextError } = await supabase
          .from('company_context')
          .insert({
            user_id: newUserId,
            ...ownerContextFields,
          })

        if (contextError) {
          console.error('[copyTeamContext] Failed to insert company_context:', contextError)
        } else {
          console.log(`[copyTeamContext] Inserted company_context for member ${newUserId}`)
        }
      }
    }

    // Copy owner's active brand kit to the new member
    const { data: ownerBrandKit } = await supabase
      .from('brand_kits')
      .select('*')
      .eq('user_id', ownerId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (ownerBrandKit) {
      // Deactivate all existing brand kits for the new user
      const { error: deactivateError } = await supabase
        .from('brand_kits')
        .update({ is_active: false })
        .eq('user_id', newUserId)

      if (deactivateError) {
        console.error('[copyTeamContext] Failed to deactivate existing brand kits:', deactivateError)
      } else {
        console.log(`[copyTeamContext] Deactivated existing brand kits for member ${newUserId}`)
      }

      // Always insert the owner's active brand kit as a new active kit for the member
      const { error: brandKitError } = await supabase
        .from('brand_kits')
        .insert({
          user_id: newUserId,
          team_id: teamId,
          website_url: ownerBrandKit.website_url,
          primary_color: ownerBrandKit.primary_color,
          secondary_color: ownerBrandKit.secondary_color,
          accent_color: ownerBrandKit.accent_color,
          background_color: ownerBrandKit.background_color,
          text_color: ownerBrandKit.text_color,
          font_primary: ownerBrandKit.font_primary,
          font_secondary: ownerBrandKit.font_secondary,
          logo_url: ownerBrandKit.logo_url,
          logo_storage_path: ownerBrandKit.logo_storage_path,
          raw_extraction: ownerBrandKit.raw_extraction,
          is_active: true,
        })

      if (brandKitError) {
        console.error('[copyTeamContext] Failed to copy brand kit:', brandKitError)
      } else {
        console.log(`[copyTeamContext] Copied team brand kit to member ${newUserId}`)
      }
    }
  } catch (err) {
    // Don't fail the approval if context copy fails
    console.error('[copyTeamContext] Error copying team context:', err)
  }
}
