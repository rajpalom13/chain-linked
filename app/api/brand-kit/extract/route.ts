/**
 * Brand Kit Extraction API Route
 * @description POST endpoint to extract brand elements from a website URL.
 * Uses both Firecrawl (CSS/HTML analysis) and Brandfetch (brand asset API)
 * for comprehensive brand extraction, then merges results.
 * @module app/api/brand-kit/extract
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFirecrawlClient, normalizeUrl, isValidUrl } from '@/lib/firecrawl/client'
import { extractBrand, type BrandExtractionResult } from '@/lib/firecrawl/brand-extractor'
import { extractBrandFromBrandfetch } from '@/lib/brandfetch/client'
import type { BrandfetchExtractedData } from '@/lib/brandfetch/types'
import type { ExtractBrandKitResponse } from '@/types/brand-kit'

/**
 * Merges Firecrawl and Brandfetch results, preferring Brandfetch for logos
 * and brand colors, Firecrawl for CSS-level details like background/text colors.
 * @param firecrawl - Firecrawl extraction result (may be null if scraping failed)
 * @param brandfetch - Brandfetch extraction result (may be null if API unavailable)
 * @param url - Source URL
 * @returns Merged brand kit data
 */
function mergeBrandResults(
  firecrawl: BrandExtractionResult | null,
  brandfetch: BrandfetchExtractedData | null,
  url: string
) {
  // Start with Firecrawl as base (has CSS-level detail)
  const base = firecrawl || {
    success: false,
    primaryColor: '#0066CC',
    secondaryColor: null,
    accentColor: null,
    backgroundColor: null,
    textColor: null,
    fontPrimary: null,
    fontSecondary: null,
    logoUrl: null,
    rawExtraction: {
      colors: [],
      fonts: [],
      logos: [],
      cssVariables: {},
      metaTags: {},
      extractedAt: new Date().toISOString(),
      sourceUrl: url,
    },
  }

  if (!brandfetch) return base

  // Brandfetch has higher-quality curated brand data — prefer it where available
  return {
    ...base,
    success: true,
    primaryColor: brandfetch.primaryColor || base.primaryColor,
    secondaryColor: brandfetch.secondaryColor || base.secondaryColor,
    accentColor: base.accentColor || brandfetch.secondaryColor,
    backgroundColor: base.backgroundColor || brandfetch.lightColor,
    textColor: base.textColor || brandfetch.darkColor,
    fontPrimary: brandfetch.fontPrimary || base.fontPrimary,
    fontSecondary: brandfetch.fontSecondary || base.fontSecondary,
    // Prefer Brandfetch logo (higher quality, proper brand asset)
    logoUrl: brandfetch.logoUrl || brandfetch.iconUrl || base.logoUrl,
    rawExtraction: {
      ...base.rawExtraction,
      // Append Brandfetch colors to the extraction data for reference
      brandfetchColors: brandfetch.allColors,
      brandfetchFonts: brandfetch.allFonts,
      brandfetchLogo: brandfetch.logoUrl,
      brandfetchIcon: brandfetch.iconUrl,
      brandfetchName: brandfetch.name,
      brandfetchDescription: brandfetch.description,
    },
  }
}

/**
 * POST handler for brand kit extraction
 * Runs Firecrawl and Brandfetch in parallel, then merges results
 * @param request - Request containing { url: string }
 * @returns Extracted brand kit data or error
 */
export async function POST(request: Request): Promise<NextResponse<ExtractBrandKitResponse>> {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please sign in to extract brand kits.',
        },
        { status: 401 }
      )
    }

    // Parse request body
    let body: { url?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON with url field.',
        },
        { status: 400 }
      )
    }

    // Validate URL
    const rawUrl = body.url
    if (!rawUrl || typeof rawUrl !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'URL is required.',
        },
        { status: 400 }
      )
    }

    const url = normalizeUrl(rawUrl)
    if (!isValidUrl(url)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid URL format. Please enter a valid website URL.',
        },
        { status: 400 }
      )
    }

    // Run Firecrawl and Brandfetch in parallel
    const [firecrawlResult, brandfetchResult] = await Promise.all([
      // Firecrawl: scrape HTML and extract CSS-level brand data
      (async (): Promise<BrandExtractionResult | null> => {
        const firecrawl = createFirecrawlClient()
        if (!firecrawl) {
          console.warn('[BrandKit] Firecrawl not configured, skipping HTML extraction')
          return null
        }
        try {
          const scrapeResult = await firecrawl.scrapeForBrand(url)
          if (!scrapeResult.success || !scrapeResult.data) {
            console.warn('[BrandKit] Firecrawl scrape failed:', scrapeResult.error)
            return null
          }
          return extractBrand(scrapeResult.data, url)
        } catch (err) {
          console.error('[BrandKit] Firecrawl error:', err)
          return null
        }
      })(),

      // Brandfetch: fetch curated brand assets from API
      (async (): Promise<BrandfetchExtractedData | null> => {
        try {
          return await extractBrandFromBrandfetch(url)
        } catch (err) {
          console.error('[BrandKit] Brandfetch error:', err)
          return null
        }
      })(),
    ])

    // If both failed, return error
    if (!firecrawlResult?.success && !brandfetchResult) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to extract brand elements from the website.',
          details:
            'Neither website scraping nor brand API returned usable results. The website may be unavailable or blocking automated access.',
        },
        { status: 422 }
      )
    }

    // Merge results from both sources
    const merged = mergeBrandResults(firecrawlResult, brandfetchResult, url)

    return NextResponse.json({
      success: true,
      brandKit: {
        websiteUrl: url,
        primaryColor: merged.primaryColor,
        secondaryColor: merged.secondaryColor,
        accentColor: merged.accentColor,
        backgroundColor: merged.backgroundColor,
        textColor: merged.textColor,
        fontPrimary: merged.fontPrimary,
        fontSecondary: merged.fontSecondary,
        logoUrl: merged.logoUrl,
        rawExtraction: merged.rawExtraction,
      },
    })
  } catch (error) {
    console.error('Brand kit extraction error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred during brand extraction.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
