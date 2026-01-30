/**
 * Website Scraper
 * @description Scrapes website content using Firecrawl for company analysis
 * @module lib/firecrawl/scraper
 */

import { createFirecrawlClient, normalizeUrl } from './client'
import { extractBrand } from './brand-extractor'

/**
 * Scraped website data for company analysis
 */
export interface ScrapedWebsiteData {
  /** Main page content (markdown or text) */
  content: string
  /** Page title */
  title?: string
  /** Meta description */
  description?: string
  /** Extracted brand colors (hex codes) */
  brandColors: string[]
  /** Additional metadata */
  metadata?: Record<string, unknown>
  /** Whether scraping was successful */
  success: boolean
  /** Error message if failed */
  error?: string
}

/**
 * Scrape a website for company information
 * Uses the existing Firecrawl client to extract content and brand elements
 * @param websiteUrl - URL to scrape
 * @returns Scraped website data with content and brand colors
 */
export async function scrapeWebsiteForAnalysis(websiteUrl: string): Promise<ScrapedWebsiteData> {
  const client = createFirecrawlClient()

  if (!client) {
    return {
      content: '',
      brandColors: [],
      success: false,
      error: 'Firecrawl API key not configured',
    }
  }

  try {
    const normalizedUrl = normalizeUrl(websiteUrl)

    // Scrape with both markdown and HTML for content and brand extraction
    const result = await client.scrape({
      url: normalizedUrl,
      formats: ['markdown', 'html'],
      onlyMainContent: false, // Get full page for brand extraction
      waitFor: 3000,
    })

    if (!result.success || !result.data) {
      return {
        content: '',
        brandColors: [],
        success: false,
        error: result.error || 'Failed to scrape website',
      }
    }

    const { data } = result

    // Extract brand elements from HTML
    const brandResult = extractBrand(data, normalizedUrl)

    // Collect brand colors
    const brandColors: string[] = []
    if (brandResult.primaryColor) brandColors.push(brandResult.primaryColor)
    if (brandResult.secondaryColor) brandColors.push(brandResult.secondaryColor)
    if (brandResult.accentColor) brandColors.push(brandResult.accentColor)

    return {
      content: data.markdown || '',
      title: data.metadata?.title,
      description: data.metadata?.description,
      brandColors: brandColors.filter(Boolean),
      metadata: data.metadata as Record<string, unknown>,
      success: true,
    }
  } catch (error) {
    console.error('[Firecrawl] Scraping error:', error)
    return {
      content: '',
      brandColors: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown scraping error',
    }
  }
}
