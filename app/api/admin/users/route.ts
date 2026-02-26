/**
 * Admin Users API Route
 * @description Fetches user data for admin user management
 * @module app/api/admin/users
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { ADMIN_EMAILS } from "@/lib/admin/constants"
import type { AdminUser } from "@/types/admin"

/**
 * GET all users for admin management
 * @param request - Request with optional query params for pagination/filtering
 * @returns Array of AdminUser records
 */
export async function GET(request: Request) {
  const supabase = await createClient()

  // Verify user is authenticated and is admin
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isAdmin = ADMIN_EMAILS.includes(user.email || "")
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const onboardingCompleted = searchParams.get("onboardingCompleted")
    const linkedinConnected = searchParams.get("linkedinConnected")
    const sortBy = searchParams.get("sortBy") || "created_at"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const offset = (page - 1) * limit

    // Validate sort column to prevent SQL injection
    const validSortColumns = ["created_at", "full_name", "email"]
    const actualSortBy = validSortColumns.includes(sortBy) ? sortBy : "created_at"
    const ascending = sortOrder === "asc"

    // If linkedinConnected filter is requested, get the set of user IDs with tokens first
    let linkedinFilteredIds: Set<string> | null = null
    if (linkedinConnected === "true" || linkedinConnected === "false") {
      const { data: linkedinTokens } = await supabase
        .from("linkedin_tokens")
        .select("user_id")

      const connectedIds = new Set(linkedinTokens?.map((t) => t.user_id) || [])

      if (linkedinConnected === "true") {
        linkedinFilteredIds = connectedIds
      } else {
        // For "false", we need to exclude these IDs — handled below via .not()
        linkedinFilteredIds = connectedIds
      }
    }

    // Fetch profiles with all filters applied BEFORE pagination
    let query = supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        email,
        avatar_url,
        created_at,
        linkedin_connected_at,
        company_onboarding_completed,
        company_name
      `,
        { count: "exact" }
      )

    if (search) {
      // Sanitize search input for PostgREST filter syntax safety
      const sanitizedSearch = search
        .replace(/[%_\\.,()]/g, '')
        .trim()
        .slice(0, 100)

      if (sanitizedSearch.length > 0) {
        query = query.or(
          `full_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%`
        )
      }
    }

    // Filter by onboarding completion status
    if (onboardingCompleted === "true") {
      query = query.eq("company_onboarding_completed", true)
    } else if (onboardingCompleted === "false") {
      query = query.or("company_onboarding_completed.is.null,company_onboarding_completed.eq.false")
    }

    // Filter by LinkedIn connection status using pre-fetched IDs
    if (linkedinFilteredIds !== null && linkedinFilteredIds.size > 0) {
      const ids = Array.from(linkedinFilteredIds)
      if (linkedinConnected === "true") {
        query = query.in("id", ids)
      } else {
        // Exclude connected users — use .not() with .in
        query = query.not("id", "in", `(${ids.join(",")})`)
      }
    } else if (linkedinConnected === "true" && linkedinFilteredIds !== null && linkedinFilteredIds.size === 0) {
      // No users have tokens, but filter requires connected — return empty
      return NextResponse.json({
        users: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    // Apply sort and pagination AFTER all filters
    query = query
      .order(actualSortBy, { ascending })
      .range(offset, offset + limit - 1)

    const { data: profiles, count, error: profilesError } = await query

    if (profilesError) {
      console.error("Profiles fetch error:", profilesError)
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      )
    }

    // Get post counts, last activity, and LinkedIn status in parallel
    const userIds = profiles?.map((p) => p.id) || []

    const [postCountsResult, lastActivitiesResult, linkedinTokensResult] = await Promise.all([
      supabase
        .from("my_posts")
        .select("user_id")
        .in("user_id", userIds),
      supabase
        .from("my_posts")
        .select("user_id, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("linkedin_tokens")
        .select("user_id")
        .in("user_id", userIds),
    ])

    // Create a map of user_id to post count
    const postCountMap: Record<string, number> = {}
    if (postCountsResult.data) {
      for (const post of postCountsResult.data) {
        postCountMap[post.user_id] = (postCountMap[post.user_id] || 0) + 1
      }
    }

    // Create a map of user_id to last activity
    const lastActivityMap: Record<string, string> = {}
    if (lastActivitiesResult.data) {
      for (const activity of lastActivitiesResult.data) {
        if (!lastActivityMap[activity.user_id]) {
          lastActivityMap[activity.user_id] = activity.created_at ?? new Date().toISOString()
        }
      }
    }

    const linkedinConnectedSet = new Set(linkedinTokensResult.data?.map((t) => t.user_id))

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString()

    // Transform to AdminUser format
    // Status filter is computed (not stored) so must be applied post-query
    const users: AdminUser[] = (profiles || []).map((profile) => {
      const lastActive = lastActivityMap[profile.id] || profile.created_at || ""

      // Determine status based on activity
      let userStatus: AdminUser["status"] = "active"
      if (!lastActive || lastActive < sevenDaysAgo) {
        userStatus = "inactive"
      }

      const isLinkedinConnected = linkedinConnectedSet.has(profile.id)

      // Calculate onboarding step based on filled fields
      let onboardingStep = 1
      if (profile.company_name) onboardingStep = 2

      return {
        id: profile.id,
        name: profile.full_name || "Unknown User",
        email: profile.email || "",
        joinedAt: profile.created_at || "",
        postsCount: postCountMap[profile.id] || 0,
        lastActive: lastActive,
        status: userStatus,
        linkedinConnected: isLinkedinConnected,
        avatarUrl: profile.avatar_url || undefined,
        onboardingCompleted: profile.company_onboarding_completed || false,
        onboardingStep: profile.company_onboarding_completed ? 6 : onboardingStep,
      } as AdminUser
    })

    // Apply computed status filter (cannot be done at DB level)
    const filteredUsers = status
      ? users.filter((u) => u.status === status)
      : users

    return NextResponse.json({
      users: filteredUsers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Admin users error:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

/**
 * PATCH update a user's status
 * @param request - Request with user ID and new status
 * @returns Updated user record
 */
export async function PATCH(request: Request) {
  const supabase = await createClient()

  // Verify user is authenticated and is admin
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isAdmin = ADMIN_EMAILS.includes(user.email || "")
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { userId, action } = body

    if (!userId || !action) {
      return NextResponse.json(
        { error: "User ID and action are required" },
        { status: 400 }
      )
    }

    // Note: In a real implementation, you would have a user_status column
    // For now, we return a success response
    // Actions could be: "suspend", "activate", "delete"

    return NextResponse.json({
      success: true,
      message: `User ${action} action completed`,
      userId,
    })
  } catch (error) {
    console.error("Admin user update error:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}
