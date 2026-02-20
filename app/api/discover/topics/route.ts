/**
 * Discover Topics API Route
 * @description Manages user discover topic preferences stored in the profiles table
 * @module app/api/discover/topics
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * GET /api/discover/topics
 * @description Retrieves the authenticated user's selected discover topics
 * @returns JSON with topics array and selected boolean indicating whether topics have been chosen
 */
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("discover_topics, discover_topics_selected")
      .eq("id", user.id)
      .single()

    if (profileError) {
      // If no profile row exists, return empty defaults
      if (profileError.code === "PGRST116") {
        return NextResponse.json({ topics: [], selected: false })
      }
      throw profileError
    }

    return NextResponse.json({
      topics: profile?.discover_topics ?? [],
      selected: profile?.discover_topics_selected ?? false,
    })
  } catch (error) {
    console.error("Error fetching discover topics:", error)
    return NextResponse.json(
      { error: "Failed to fetch discover topics" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/discover/topics
 * @description Saves the user's selected discover topics to their profile
 * @param request - Request body containing `{ topics: string[] }` with 3-10 topic slugs
 * @returns JSON with success status and the saved topics array
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { topics } = body

    // Validate that topics is an array
    if (!Array.isArray(topics)) {
      return NextResponse.json(
        { error: "Topics must be an array" },
        { status: 400 }
      )
    }

    // Validate item count: at least 1 topic required
    if (topics.length < 1 || topics.length > 20) {
      return NextResponse.json(
        { error: "You must have between 1 and 20 topics" },
        { status: 400 }
      )
    }

    // Validate that every item is a string
    if (!topics.every((t: unknown) => typeof t === "string")) {
      return NextResponse.json(
        { error: "Each topic must be a string" },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        discover_topics: topics,
        discover_topics_selected: true,
      })
      .eq("id", user.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true, topics })
  } catch (error) {
    // Handle JSON parse errors separately from database errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }

    console.error("Error saving discover topics:", error)
    return NextResponse.json(
      { error: "Failed to save discover topics" },
      { status: 500 }
    )
  }
}
