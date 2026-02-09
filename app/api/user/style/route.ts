/**
 * Writing Style API Route
 * @description Manages user writing style profiles derived from their posts and saved content
 * @module app/api/user/style/route
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeWritingStyle, shouldRefreshStyle } from '@/lib/ai/style-analyzer'
import type { Json } from '@/types/database'

/**
 * GET /api/user/style
 * Fetches the user's writing style profile
 * @returns Writing style profile with needsRefresh flag
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: style, error } = await supabase
      .from('writing_style_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[Style API] Failed to fetch style:', error)
      return NextResponse.json({ error: 'Failed to fetch style profile' }, { status: 500 })
    }

    if (!style) {
      return NextResponse.json({ style: null, needsRefresh: true })
    }

    // Check if style needs refresh
    const { count: postCount } = await supabase
      .from('my_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const needsRefresh = shouldRefreshStyle(style, postCount || 0)

    return NextResponse.json({ style, needsRefresh })
  } catch (error) {
    console.error('[Style API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/user/style
 * Analyzes the user's writing style from their posts and saved content,
 * then upserts the result into writing_style_profiles
 * @returns Updated writing style profile
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch last 50 own posts
    const { data: ownPosts } = await supabase
      .from('my_posts')
      .select('content')
      .eq('user_id', user.id)
      .order('posted_at', { ascending: false })
      .limit(50)

    // Fetch last 30 wishlisted/saved posts
    const { data: savedItems } = await supabase
      .from('swipe_wishlist')
      .select('content')
      .eq('user_id', user.id)
      .eq('status', 'saved')
      .order('created_at', { ascending: false })
      .limit(30)

    const ownTexts = (ownPosts || [])
      .map((p) => p.content)
      .filter((c): c is string => c !== null && c.trim().length > 0)

    const savedTexts = (savedItems || [])
      .map((s) => s.content)
      .filter((c): c is string => c !== null && c.trim().length > 0)

    if (ownTexts.length === 0 && savedTexts.length === 0) {
      return NextResponse.json(
        { error: 'No posts found to analyze. Write some posts or save content first.' },
        { status: 400 }
      )
    }

    // Run analysis
    const analysis = analyzeWritingStyle(ownTexts, savedTexts)

    // Upsert the style profile
    const styleData = {
      user_id: user.id,
      avg_sentence_length: analysis.avgSentenceLength,
      vocabulary_level: analysis.vocabularyLevel,
      tone: analysis.tone,
      formatting_style: analysis.formattingStyle as unknown as Json,
      hook_patterns: analysis.hookPatterns,
      emoji_usage: analysis.emojiUsage,
      cta_patterns: analysis.ctaPatterns,
      signature_phrases: analysis.signaturePhrases,
      content_themes: analysis.contentThemes,
      raw_analysis: analysis as unknown as Json,
      posts_analyzed_count: ownTexts.length,
      wishlisted_analyzed_count: savedTexts.length,
      updated_at: new Date().toISOString(),
      last_refreshed_at: new Date().toISOString(),
    }

    const { data: result, error: upsertError } = await supabase
      .from('writing_style_profiles')
      .upsert(styleData, { onConflict: 'user_id' })
      .select()
      .single()

    if (upsertError) {
      console.error('[Style API] Failed to upsert style:', upsertError)
      return NextResponse.json({ error: 'Failed to save style profile' }, { status: 500 })
    }

    return NextResponse.json({ style: result, needsRefresh: false })
  } catch (error) {
    console.error('[Style API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
