/**
 * Brandfetch API Client
 * @description Client for fetching brand assets (logos, colors, fonts) via Brandfetch API
 * @module lib/brandfetch/client
 */

import type {
  BrandfetchBrandResponse,
  BrandfetchExtractedData,
  BrandfetchLogo,
  BrandfetchLogoFormat,
} from './types'

/** Brandfetch API base URL */
const BRANDFETCH_API_URL = 'https://api.brandfetch.io/v2/brands'

/** Default request timeout in milliseconds */
const DEFAULT_TIMEOUT = 15000

/**
 * Extracts the domain from a URL string
 * @param url - Full URL or domain string
 * @returns Clean domain without protocol or www prefix
 */
function extractDomain(url: string): string {
  try {
    const withProtocol = url.includes('://') ? url : `https://${url}`
    const parsed = new URL(withProtocol)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
  }
}

/**
 * Picks the best logo URL from a Brandfetch logo entry.
 * Prefers SVG, then largest PNG/JPEG.
 * @param logo - Brandfetch logo entry
 * @returns Best format URL or null
 */
function pickBestLogoFormat(logo: BrandfetchLogo): string | null {
  if (!logo.formats || logo.formats.length === 0) return null

  const svg = logo.formats.find((f) => f.format === 'svg')
  if (svg) return svg.src

  const sorted = [...logo.formats]
    .filter((f): f is BrandfetchLogoFormat & { width: number } => f.width !== null)
    .sort((a, b) => b.width - a.width)

  return sorted[0]?.src || logo.formats[0]?.src || null
}

/**
 * Fetches brand data from Brandfetch API
 * @param domain - Domain name to look up
 * @param apiKey - Brandfetch API key
 * @returns Raw Brandfetch response or null on failure
 */
async function fetchBrand(
  domain: string,
  apiKey: string
): Promise<BrandfetchBrandResponse | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)

    const response = await fetch(`${BRANDFETCH_API_URL}/${domain}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(
        `[Brandfetch] Failed to fetch brand for ${domain}: ${response.status}`
      )
      return null
    }

    return (await response.json()) as BrandfetchBrandResponse
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Brandfetch] Request timed out for ${domain}`)
    } else {
      console.warn(`[Brandfetch] Error fetching brand for ${domain}:`, error)
    }
    return null
  }
}

/**
 * Normalizes raw Brandfetch response into a structured extracted data object
 * @param brand - Raw Brandfetch brand response
 * @returns Normalized brand data
 */
function normalizeBrandData(brand: BrandfetchBrandResponse): BrandfetchExtractedData {
  // Find best logo (prefer "logo" tag on light theme)
  const primaryLogo =
    brand.logos.find((l) => l.tags?.includes('logo') && l.theme === 'light') ||
    brand.logos.find((l) => l.tags?.includes('logo')) ||
    brand.logos[0]

  const iconLogo =
    brand.logos.find((l) => l.tags?.includes('icon') && l.theme === 'light') ||
    brand.logos.find((l) => l.tags?.includes('icon'))

  // Extract colors by type
  const brandColor = brand.colors.find((c) => c.type === 'brand')
  const accentColor = brand.colors.find((c) => c.type === 'accent')
  const darkColor = brand.colors.find((c) => c.type === 'dark' || c.type === 'customDark')
  const lightColor = brand.colors.find((c) => c.type === 'light' || c.type === 'customLight')

  // Use brand or accent as primary, the other as secondary
  const primaryColor = brandColor || accentColor || brand.colors[0]
  const secondaryColor = primaryColor === brandColor ? accentColor : brandColor

  // Extract fonts by role
  const titleFont = brand.fonts.find((f) => f.type === 'title')
  const bodyFont = brand.fonts.find((f) => f.type === 'body')

  return {
    name: brand.name || null,
    logoUrl: primaryLogo ? pickBestLogoFormat(primaryLogo) : null,
    iconUrl: iconLogo ? pickBestLogoFormat(iconLogo) : null,
    primaryColor: primaryColor?.hex || null,
    secondaryColor: secondaryColor?.hex || null,
    darkColor: darkColor?.hex || null,
    lightColor: lightColor?.hex || null,
    allColors: brand.colors,
    fontPrimary: titleFont?.name || null,
    fontSecondary: bodyFont?.name || null,
    allFonts: brand.fonts,
    description: brand.description || null,
  }
}

/**
 * Fetches and extracts brand data from Brandfetch for a given URL
 * @param url - Website URL or domain to extract brand from
 * @returns Normalized brand data or null if Brandfetch is unavailable or fails
 * @example
 * const data = await extractBrandFromBrandfetch('https://stripe.com')
 * console.log(data?.primaryColor) // '#635BFF'
 */
export async function extractBrandFromBrandfetch(
  url: string
): Promise<BrandfetchExtractedData | null> {
  const apiKey = process.env.BRANDFETCH_API_KEY
  if (!apiKey) {
    console.warn('[Brandfetch] BRANDFETCH_API_KEY not set, skipping')
    return null
  }

  const domain = extractDomain(url)
  if (!domain) {
    console.warn('[Brandfetch] Could not extract domain from URL:', url)
    return null
  }

  const brand = await fetchBrand(domain, apiKey)
  if (!brand) return null

  return normalizeBrandData(brand)
}
