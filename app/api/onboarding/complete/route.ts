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

    // Update with .select() to verify the write actually happened
    // Also set company_onboarding_completed since step-based flow covers company analysis
    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        onboarding_current_step: 4,
        company_onboarding_completed: true,
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

    return NextResponse.json({
      success: true,
      onboarding_completed: updated.onboarding_completed,
      onboarding_current_step: updated.onboarding_current_step,
    })
  } catch (error) {
    console.error("[onboarding/complete] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
