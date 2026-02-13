/**
 * Logo.dev Integration
 * @description Utility for fetching company logos via logo.dev API
 * @module lib/logo-dev
 */

/**
 * Extract domain from a URL or website string
 * @param website - URL or website string
 * @returns Domain string or null
 */
function extractDomain(website: string): string | null {
  try {
    // If it already looks like a domain (no protocol), add https://
    const url = website.includes('://') ? website : `https://${website}`
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * Get a logo.dev URL for a company
 * @param options - Logo options
 * @param options.website - Company website URL
 * @param options.companyName - Company name (used as fallback domain guess)
 * @param options.size - Logo size in pixels (default: 128)
 * @returns logo.dev URL or null if no token configured
 */
export function getLogoDevUrl(options: {
  website?: string | null
  companyName?: string | null
  size?: number
}): string | null {
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN
  if (!token) return null

  const { website, companyName, size = 128 } = options

  // Try to extract domain from website first
  if (website) {
    const domain = extractDomain(website)
    if (domain) {
      return `https://img.logo.dev/${domain}?token=${token}&size=${size}&format=png`
    }
  }

  // Fallback: try to guess domain from company name
  if (companyName) {
    const guessedDomain = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .concat('.com')
    return `https://img.logo.dev/${guessedDomain}?token=${token}&size=${size}&format=png`
  }

  return null
}
