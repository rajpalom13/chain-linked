/**
 * Remove Background API Route
 * @description Server-side proxy to the remove.bg API for background removal.
 * Accepts an image as FormData (file upload) or a JSON body with a base64 string,
 * forwards it to remove.bg, and returns the processed transparent PNG.
 * @module app/api/image/remove-background/route
 */

import { NextRequest, NextResponse } from 'next/server';

/** Maximum allowed image size: 12MB (remove.bg accepts up to 12MB) */
const MAX_IMAGE_SIZE = 12 * 1024 * 1024;

/** remove.bg API endpoint */
const REMOVE_BG_URL = 'https://api.remove.bg/v1.0/removebg';

/**
 * POST /api/image/remove-background
 * Removes the background from an uploaded image using the remove.bg API.
 *
 * Accepts either:
 * - FormData with an `image_file` field (File/Blob)
 * - JSON body with `{ image_base64: string }` (base64-encoded image data)
 *
 * @param request - Incoming Next.js request
 * @returns PNG image blob with transparent background, or JSON error
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      console.error('[RemoveBG] REMOVE_BG_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Background removal service is not configured' },
        { status: 503 },
      );
    }

    const contentType = request.headers.get('content-type') || '';

    // Build the FormData to send to remove.bg
    const removeBgForm = new FormData();
    removeBgForm.append('size', 'auto');

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData upload
      const formData = await request.formData();
      const imageFile = formData.get('image_file');

      if (!imageFile || !(imageFile instanceof Blob)) {
        return NextResponse.json(
          { error: 'Missing image_file in form data' },
          { status: 400 },
        );
      }

      if (imageFile.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: 'Image too large (max 12MB)' },
          { status: 413 },
        );
      }

      removeBgForm.append('image_file', imageFile);
    } else if (contentType.includes('application/json')) {
      // Handle JSON with base64 image
      const body = (await request.json()) as { image_base64?: string };

      if (!body.image_base64 || typeof body.image_base64 !== 'string') {
        return NextResponse.json(
          { error: 'Missing image_base64 in JSON body' },
          { status: 400 },
        );
      }

      // Strip data URL prefix if present (e.g., "data:image/png;base64,...")
      const base64Data = body.image_base64.includes(',')
        ? body.image_base64.split(',')[1]
        : body.image_base64;

      // Validate base64 size (each base64 char ~ 0.75 bytes)
      const estimatedBytes = Math.ceil((base64Data.length * 3) / 4);
      if (estimatedBytes > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: 'Image too large (max 12MB)' },
          { status: 413 },
        );
      }

      // Convert base64 to a Blob for the FormData
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const imageBlob = new Blob([bytes], { type: 'image/png' });
      removeBgForm.append('image_file', imageBlob, 'image.png');
    } else {
      return NextResponse.json(
        { error: 'Unsupported content type. Use multipart/form-data or application/json.' },
        { status: 415 },
      );
    }

    // Call the remove.bg API
    const response = await fetch(REMOVE_BG_URL, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: removeBgForm,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[RemoveBG] API error ${response.status}:`,
        errorBody,
      );

      // Map common remove.bg errors to user-friendly messages
      if (response.status === 402) {
        return NextResponse.json(
          { error: 'Background removal credits exhausted. Please try again later.' },
          { status: 402 },
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment and try again.' },
          { status: 429 },
        );
      }
      if (response.status === 400) {
        return NextResponse.json(
          { error: 'Invalid image. Please try a different image file.' },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: 'Background removal failed. Please try again.' },
        { status: response.status },
      );
    }

    const resultBuffer = await response.arrayBuffer();

    return new NextResponse(resultBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('[RemoveBG] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during background removal' },
      { status: 500 },
    );
  }
}
