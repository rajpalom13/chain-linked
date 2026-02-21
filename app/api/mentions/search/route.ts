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
 * Search local connections raw_data for matching profiles
 * @param supabase - Supabase client
 * @param userId - Current user ID
 * @param query - Search query
 * @returns Array of matching local profiles
 */
async function searchLocalConnections(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  query: string
): Promise<MentionResult[]> {
  // connections table exists in DB but not in generated types — use type assertion
  const { data: connections } = await (supabase
    .from('connections' as 'profiles')
    .select('raw_data')
    .eq('user_id', userId) as unknown as Promise<{ data: Array<{ raw_data: unknown }> | null }>)

  if (!connections?.length) return []

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() || ''

  const results = await searchLocalConnections(supabase, user.id, query)
  return NextResponse.json({ results })
}
