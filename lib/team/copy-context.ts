/**
 * Copy Team Context Utility
 * @description Copies company context and brand kit from team owner to a new member
 * @module lib/team/copy-context
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Copy company context (profile fields + brand kit) from team owner to a new member.
 * Called when a user joins a team via join request approval or invite acceptance.
 *
 * Copies:
 * - Profile fields: company_name, company_website, company_description, company_icp,
 *   company_products, company_value_props, discover_topics, discover_topics_selected
 * - Sets company_onboarding_completed and onboarding_completed to true
 * - Clones the owner's active brand kit for the new user
 *
 * @param supabase - Supabase client instance
 * @param teamId - Team the user is joining
 * @param newUserId - The user who just joined
 */
export async function copyTeamContextToMember(
  supabase: SupabaseClient,
  teamId: string,
  newUserId: string
) {
  try {
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

    // Copy owner's active brand kit to the new member
    const { data: ownerBrandKit } = await supabase
      .from('brand_kits')
      .select('*')
      .eq('user_id', ownerId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (ownerBrandKit) {
      // Check if the new user already has a brand kit
      const { data: existingKit } = await supabase
        .from('brand_kits')
        .select('id')
        .eq('user_id', newUserId)
        .limit(1)
        .maybeSingle()

      if (!existingKit) {
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
          console.log(`[copyTeamContext] Copied brand kit to member ${newUserId}`)
        }
      }
    }
  } catch (err) {
    // Don't fail the approval if context copy fails
    console.error('[copyTeamContext] Error copying team context:', err)
  }
}
