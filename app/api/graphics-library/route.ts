/**
 * Graphics Library API Route
 * Proxies search requests to the Unsplash API for free stock photos.
 * Handles missing API keys gracefully by returning empty results with an error message.
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchUnsplashPhotos } from '@/lib/graphics-library/unsplash';

/**
 * Handle GET requests for photo search
 * @param request - Incoming request with search parameters
 * @returns JSON response with search results or error information
 *
 * @example
 * GET /api/graphics-library?q=business&page=1&per_page=20
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'business';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = parseInt(searchParams.get('per_page') || '20', 10);

  try {
    const data = await searchUnsplashPhotos(query, page, perPage);
    return NextResponse.json(data);
  } catch (error) {
    // Gracefully handle missing API key by returning empty results
    if (error instanceof Error && error.message.includes('not configured')) {
      return NextResponse.json(
        {
          results: [],
          total: 0,
          total_pages: 0,
          error: 'Unsplash API not configured. Add UNSPLASH_ACCESS_KEY to your environment.',
        },
        { status: 200 }
      );
    }

    console.error('Graphics library API error:', error);
    return NextResponse.json(
      { error: 'Failed to search photos' },
      { status: 500 }
    );
  }
}
