/**
 * Onboarding Complete API Route
 * @description Server-side endpoint to mark onboarding as complete.
 * Uses server-side Supabase client for reliable database writes.
 * @module app/api/onboarding/complete
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * POST - Mark onboarding as complete
 * Sets onboarding_completed to true and onboarding_current_step to 4
 * @returns JSON with success status and updated profile data
 */
export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Fetch the user's onboarding type
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_type")
      .eq("id", user.id)
      .single()

    const isOwner = profile?.onboarding_type === "owner"

    // Update with .select() to verify the write actually happened
    // Only set company_onboarding_completed for owner-path users who actually did company onboarding
    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        onboarding_current_step: 4,
        ...(isOwner ? { company_onboarding_completed: true } : {}),
      })
      .eq("id", user.id)
      .select("id, onboarding_completed, onboarding_current_step, company_onboarding_completed")
      .single()

    if (updateError) {
      console.error("[onboarding/complete] Update error:", updateError)
      return NextResponse.json(
        { error: "Failed to update profile", details: updateError.message },
        { status: 500 }
      )
    }

    if (!updated) {
      console.error("[onboarding/complete] No profile row returned after update for user:", user.id)
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      )
    }

    // Verify the write persisted correctly
    if (updated.onboarding_completed !== true) {
      console.error("[onboarding/complete] Write verification failed:", updated)
      return NextResponse.json(
        { error: "Write verification failed" },
        { status: 500 }
      )
    }

    // Auto-create company and team for owner-path users
    // Company info is stored in company_context table (from onboarding step 2), not in profiles
    let teamId: string | null = null
    if (isOwner) {
      try {
        // Get company info from company_context (populated during onboarding step 2)
        const { data: companyContext } = await supabase
          .from("company_context")
          .select("company_name, website_url, industry, company_summary")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        const companyName = companyContext?.company_name
        if (companyName) {
          // Check if user already has a company (idempotent)
          const { data: existingCompany } = await supabase
            .from("companies")
            .select("id")
            .eq("owner_id", user.id)
            .limit(1)
            .maybeSingle()

          let companyId = existingCompany?.id

          if (!companyId) {
            // Create company record
            const { data: company, error: companyError } = await supabase
              .from("companies")
              .insert({
                name: companyName,
                owner_id: user.id,
                website: companyContext.website_url || null,
                description: companyContext.company_summary || null,
              })
              .select("id")
              .single()

            if (companyError) {
              console.error("[onboarding/complete] Company creation error:", companyError)
              // Non-fatal: user can create team manually later
            } else {
              companyId = company.id
            }
          }

          if (companyId) {
            // Check if team already exists for this company (idempotent)
            const { data: existingTeam } = await supabase
              .from("teams")
              .select("id")
              .eq("company_id", companyId)
              .eq("owner_id", user.id)
              .limit(1)
              .maybeSingle()

            if (existingTeam) {
              teamId = existingTeam.id
            } else {
              // Create default team
              const { data: team, error: teamError } = await supabase
                .from("teams")
                .insert({
                  name: companyName,
                  owner_id: user.id,
                  company_id: companyId,
                })
                .select("id")
                .single()

              if (teamError) {
                console.error("[onboarding/complete] Team creation error:", teamError)
              } else {
                teamId = team.id

                // Add user as team owner
                const { error: memberError } = await supabase
                  .from("team_members")
                  .insert({
                    team_id: team.id,
                    user_id: user.id,
                    role: "owner",
                  })

                if (memberError) {
                  console.error("[onboarding/complete] Team member creation error:", memberError)
                  // Rollback team if member creation fails
                  await supabase.from("teams").delete().eq("id", team.id)
                  teamId = null
                }
              }
            }
          }
        } else {
          console.warn("[onboarding/complete] Owner user has no company_context — skipping auto team creation")
        }
      } catch (err) {
        // Non-fatal: team can be created manually later
        console.error("[onboarding/complete] Auto team creation error:", err)
      }
    }

    return NextResponse.json({
      success: true,
      onboarding_completed: updated.onboarding_completed,
      onboarding_current_step: updated.onboarding_current_step,
      ...(teamId ? { team_id: teamId } : {}),
    })
  } catch (error) {
    console.error("[onboarding/complete] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
