/**
 * Mention Search API Route (Local Connections Fallback)
 * @description Searches local connections data to power the @mention autocomplete
 * when the Chrome extension is not available. The extension handles live LinkedIn-wide
 * search directly — this route only provides the fallback using stored connection data.
 * @module app/api/mentions/search
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Mentionable person result
 */
interface MentionResult {
  /** Display name */
  name: string
  /** LinkedIn URN (urn:li:person:xxx) */
  urn: string
  /** Professional headline */
  headline: string | null
  /** Profile picture URL */
  avatarUrl: string | null
  /** Public profile identifier (vanity URL slug) */
  publicIdentifier: string | null
}

/**
 * Voyager MiniProfile shape from stored raw_data
 */
interface VoyagerMiniProfile {
  $type?: string
  firstName?: string
  lastName?: string
  occupation?: string
  entityUrn?: string
  publicIdentifier?: string
  picture?: {
    rootUrl?: string
    artifacts?: Array<{
      width?: number
      height?: number
      fileIdentifyingUrlPathSegment?: string
    }>
  }
}

/**
 * Build a profile picture URL from a Voyager MiniProfile picture object
 * @param picture - Voyager picture object with rootUrl and artifacts
 * @returns Full image URL or null
 */
function buildAvatarUrl(picture?: VoyagerMiniProfile['picture']): string | null {
  if (!picture?.rootUrl || !picture.artifacts?.length) return null

  const artifact =
    picture.artifacts.find(a => a.width === 100 && a.height === 100) ||
    picture.artifacts[0]

  if (!artifact?.fileIdentifyingUrlPathSegment) return null
  return `${picture.rootUrl}${artifact.fileIdentifyingUrlPathSegment}`
}

/**
 * Convert a Voyager entityUrn to a person URN
 * @param entityUrn - Voyager entity URN (urn:li:fs_miniProfile:xxx)
 * @returns LinkedIn person URN (urn:li:person:xxx)
 */
function toPersonUrn(entityUrn: string): string {
  const id = entityUrn.split(':').pop() || entityUrn
  return `urn:li:person:${id}`
}

/**
 * Search local connections using efficient SQL jsonb extraction.
 * Pushes filtering to PostgreSQL instead of pulling all raw_data client-side.
 * @param supabase - Supabase client
 * @param userId - Current user ID
 * @param query - Search query
 * @returns Array of matching local profiles
 */
async function searchLocalConnectionsSQL(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  query: string
): Promise<MentionResult[]> {
  if (!query) return []

  // Use PostgreSQL jsonb_array_elements to search MiniProfiles inside raw_data
  const { data: rows, error } = await supabase.rpc('search_connections_mentions' as never, {
    p_user_id: userId,
    p_query: query,
  } as never) as { data: Array<{ name: string; entity_urn: string; headline: string | null; public_identifier: string | null; root_url: string | null; artifact_path: string | null }> | null; error: unknown }

  if (!error && rows?.length) {
    console.log(`[MentionAPI] SQL search returned ${rows.length} results`)
    return rows.map(r => ({
      name: r.name,
      urn: toPersonUrn(r.entity_urn),
      headline: r.headline,
      avatarUrl: r.root_url && r.artifact_path ? `${r.root_url}${r.artifact_path}` : null,
      publicIdentifier: r.public_identifier,
    }))
  }

  if (error) {
    console.log(`[MentionAPI] SQL RPC not available (${error}), falling back to JS-based search`)
  }

  // Fallback: JS-based search for when the RPC doesn't exist yet
  return searchLocalConnectionsJS(supabase, userId, query)
}

/**
 * JS-based fallback: search local connections raw_data for matching profiles
 * @param supabase - Supabase client
 * @param userId - Current user ID
 * @param query - Search query
 * @returns Array of matching local profiles
 */
async function searchLocalConnectionsJS(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  query: string
): Promise<MentionResult[]> {
  // connections table exists in DB but not in generated types — use type assertion
  const { data: connections } = await (supabase
    .from('connections' as 'profiles')
    .select('raw_data')
    .eq('user_id', userId) as unknown as Promise<{ data: Array<{ raw_data: unknown }> | null }>)

  if (!connections?.length) {
    console.log('[MentionAPI] No connections found in database')
    return []
  }

  console.log(`[MentionAPI] Found ${connections.length} connection rows to search through`)
  const profiles: MentionResult[] = []
  const seen = new Set<string>()

  for (const conn of connections) {
    const rawData = conn.raw_data as Record<string, unknown> | null
    if (!rawData) continue

    const data = rawData.data as Record<string, unknown> | undefined
    const included = (data?.included || rawData.included) as VoyagerMiniProfile[] | undefined
    if (!included?.length) continue

    for (const item of included) {
      if (
        item.$type === 'com.linkedin.voyager.identity.shared.MiniProfile' &&
        item.entityUrn &&
        item.firstName
      ) {
        const urn = toPersonUrn(item.entityUrn)
        if (seen.has(urn)) continue

        const name = [item.firstName, item.lastName].filter(Boolean).join(' ')

        if (query) {
          const q = query.toLowerCase()
          const nameMatch = name.toLowerCase().includes(q)
          const headlineMatch = item.occupation?.toLowerCase().includes(q) || false
          if (!nameMatch && !headlineMatch) continue
        }

        seen.add(urn)
        profiles.push({
          name,
          urn,
          headline: item.occupation || null,
          avatarUrl: buildAvatarUrl(item.picture),
          publicIdentifier: item.publicIdentifier || null,
        })
      }
    }
  }

  return profiles.slice(0, 10)
}

/**
 * GET - Search for mentionable LinkedIn users from local connections
 * This is the fallback when the Chrome extension is not installed.
 * Live LinkedIn-wide search is handled client-side via the extension.
 * @param request - Search query via ?q= parameter
 * @returns Array of matching people with LinkedIn URNs
 */
export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.log('[MentionAPI] Unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() || ''

  console.log(`[MentionAPI] Local connections search: query="${query}", userId=${user.id}`)
  const results = await searchLocalConnectionsSQL(supabase, user.id, query)
  console.log(`[MentionAPI] Returning ${results.length} results from local connections`)
  return NextResponse.json({ results })
}
