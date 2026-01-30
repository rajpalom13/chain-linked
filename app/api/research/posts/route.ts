/**
 * Generated Posts API
 * @description Fetches AI-generated LinkedIn posts from research sessions
 * @module app/api/research/posts
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/research/posts
 * Fetches generated posts for a user, optionally filtered by session
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")
    const status = searchParams.get("status") // draft, scheduled, posted, archived
    const postType = searchParams.get("postType")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")

    // Build query
    let query = supabase
      .from("generated_posts")
      .select(
        `
        id,
        content,
        post_type,
        hook,
        cta,
        word_count,
        estimated_read_time,
        status,
        source_url,
        source_title,
        source_snippet,
        research_session_id,
        discover_post_id,
        created_at,
        updated_at
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (sessionId) {
      query = query.eq("research_session_id", sessionId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (postType) {
      query = query.eq("post_type", postType)
    }

    const { data: posts, error } = await query

    if (error) {
      console.error("[Research/Posts] Failed to fetch generated posts:", error)
      return NextResponse.json(
        { error: "Failed to fetch generated posts" },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("generated_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (sessionId) {
      countQuery = countQuery.eq("research_session_id", sessionId)
    }
    if (status) {
      countQuery = countQuery.eq("status", status)
    }
    if (postType) {
      countQuery = countQuery.eq("post_type", postType)
    }

    const { count } = await countQuery

    return NextResponse.json({
      posts: posts || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error("[Research/Posts] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/research/posts
 * Updates a generated post (e.g., change status, edit content)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { postId, content, status } = body

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (content !== undefined) {
      updates.content = content
      updates.word_count = content.split(/\s+/).length
      // Update hook (first line)
      const firstLine = content.split("\n")[0]?.trim() || ""
      updates.hook = firstLine.length > 100 ? firstLine.slice(0, 100) + "..." : firstLine
    }

    if (status !== undefined) {
      const validStatuses = ["draft", "scheduled", "posted", "archived"]
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        )
      }
      updates.status = status
    }

    // Update the post
    const { data: post, error } = await supabase
      .from("generated_posts")
      .update(updates)
      .eq("id", postId)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("[Research/Posts] Failed to update post:", error)
      return NextResponse.json(
        { error: "Failed to update post" },
        { status: 500 }
      )
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error("[Research/Posts] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/research/posts
 * Deletes a generated post
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get("postId")

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("generated_posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", user.id)

    if (error) {
      console.error("[Research/Posts] Failed to delete post:", error)
      return NextResponse.json(
        { error: "Failed to delete post" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Research/Posts] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
