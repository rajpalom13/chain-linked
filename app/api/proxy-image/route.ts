/**
 * Image Proxy API Route
 * @description Proxies external images to bypass CORS restrictions for canvas rendering
 * @module app/api/proxy-image/route
 */

import { NextRequest, NextResponse } from 'next/server'

/** Allowed image content types */
const ALLOWED_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
]

/** Maximum image size: 10MB */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

/**
 * GET /api/proxy-image?url=<encoded-url>
 * Fetches an external image and serves it with proper CORS headers
 * @param request - Next.js request with url query parameter
 * @returns Proxied image response with CORS headers
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      )
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      )
    }

    // Only allow http(s) protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP(S) URLs are allowed' },
        { status: 400 }
      )
    }

    // Fetch the image
    const imageResponse = await fetch(url, {
      headers: {
        'Accept': 'image/*',
      },
    })

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${imageResponse.status}` },
        { status: imageResponse.status }
      )
    }

    // Validate content type
    const contentType = imageResponse.headers.get('content-type') || ''
    const isImage = ALLOWED_CONTENT_TYPES.some(type => contentType.startsWith(type))
    if (!isImage) {
      return NextResponse.json(
        { error: 'URL does not point to a valid image' },
        { status: 400 }
      )
    }

    // Validate content length if available
    const contentLength = imageResponse.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: 'Image too large (max 10MB)' },
        { status: 413 }
      )
    }

    const imageBuffer = await imageResponse.arrayBuffer()

    // Double check size after download
    if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: 'Image too large (max 10MB)' },
        { status: 413 }
      )
    }

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('[API] Image proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    )
  }
}
