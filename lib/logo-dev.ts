/**
 * Logo.dev Integration
 * @description Utility for fetching company logos via logo.dev API with favicon fallback.
 * Uses fallback=404 so that missing logos trigger onError for proper fallback chains.
 * @see https://docs.logo.dev/logo-images/introduction
 * @module lib/logo-dev
 */

/**
 * Extract domain from a URL or website string
 * @param website - URL or website string
 * @returns Domain string or null
 */
export function extractDomain(website: string): string | null {
  try {
    const url = website.includes('://') ? website : `https://${website}`
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * Build a logo.dev CDN URL for a given domain.
 * Always sets fallback=404 so missing logos return HTTP 404 instead of
 * a monogram placeholder — this lets img onError fire correctly.
 * @param domain - Domain name (e.g. "higherops.io")
 * @param token - logo.dev publishable key
 * @param size - Image size in pixels
 * @returns Fully-formed logo.dev URL
 */
function buildLogoDevUrl(domain: string, token: string, size: number): string {
  return `https://img.logo.dev/${domain}?token=${token}&size=${size}&format=png&fallback=404`
}

/**
 * Build an unavatar.io URL for a given domain.
 * Unavatar aggregates logos from multiple sources (Clearbit, DuckDuckGo, etc.)
 * fallback=false ensures a 404 on miss so our onError chain continues.
 * @param domain - Domain name
 * @returns Unavatar URL
 */
function buildUnavatarUrl(domain: string): string {
  return `https://unavatar.io/${domain}?fallback=false`
}

/**
 * Get a logo.dev URL for a company
 * @param options - Logo options
 * @param options.website - Company website URL
 * @param options.companyName - Company name (used as fallback domain guess)
 * @param options.size - Logo size in pixels (default: 200)
 * @returns logo.dev URL or null if no token configured
 */
export function getLogoDevUrl(options: {
  website?: string | null
  companyName?: string | null
  size?: number
}): string | null {
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN
  if (!token) return null

  const { website, companyName, size = 200 } = options

  if (website) {
    const domain = extractDomain(website)
    if (domain) {
      return buildLogoDevUrl(domain, token, size)
    }
  }

  if (companyName) {
    const guessedDomain = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .concat('.com')
    return buildLogoDevUrl(guessedDomain, token, size)
  }

  return null
}

/**
 * Get ordered list of logo URLs to try with fallbacks.
 * Priority: logo.dev (actual domain, best quality) → logo.dev (guessed domain)
 *           → unavatar.io (Clearbit, DuckDuckGo aggregator)
 *           → Google favicon (reliable) → direct favicon
 *
 * logo.dev URLs use fallback=404 so that unknown domains trigger img onError
 * instead of silently returning a monogram placeholder image.
 *
 * @param options - Logo options
 * @param options.website - Company website URL
 * @param options.companyName - Company name
 * @param options.size - Logo size in pixels (default: 200)
 * @returns Array of URLs to try in priority order
 */
export function getLogoUrlsWithFallback(options: {
  website?: string | null
  companyName?: string | null
  size?: number
}): string[] {
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN
  const { website, companyName, size = 200 } = options
  const urls: string[] = []

  const domain = website ? extractDomain(website) : null

  // 1. logo.dev with actual domain (best quality when available)
  if (token && domain) {
    urls.push(buildLogoDevUrl(domain, token, size))
  }

  // 2. logo.dev with guessed domain from company name
  if (token && companyName) {
    const guessedDomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '').concat('.com')
    if (!domain || guessedDomain !== domain) {
      urls.push(buildLogoDevUrl(guessedDomain, token, size))
    }
  }

  // 3. Unavatar.io with actual domain (aggregates Clearbit, DuckDuckGo, etc.)
  if (domain) {
    urls.push(buildUnavatarUrl(domain))
  }

  // 4. Unavatar.io with guessed domain
  if (companyName) {
    const guessedDomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '').concat('.com')
    if (!domain || guessedDomain !== domain) {
      urls.push(buildUnavatarUrl(guessedDomain))
    }
  }

  // 5. Google favicon service (reliable, always returns something)
  if (domain) {
    urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`)
  }

  // 6. Google favicon with guessed domain (if no website provided)
  if (!domain && companyName) {
    const guessedDomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '').concat('.com')
    urls.push(`https://www.google.com/s2/favicons?domain=${guessedDomain}&sz=128`)
  }

  // 7. Direct favicon from the website
  if (domain) {
    urls.push(`https://${domain}/favicon.ico`)
  }

  return urls
}
