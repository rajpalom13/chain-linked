/**
 * Background Removal Utility
 * @description Client-side background removal using @imgly/background-removal (ONNX/WASM).
 * Runs entirely in the browser — no API key or server round-trip required.
 * External URLs are automatically proxied to avoid CORS issues.
 * @module lib/image/background-removal
 */

import { removeBackground, type Config } from '@imgly/background-removal';

/** Status updates emitted during processing */
export type RemovalProgress = {
  phase: 'downloading' | 'processing' | 'done';
  progress: number; // 0-1
};

/**
 * Converts an image source to a Blob, proxying external URLs to avoid CORS.
 * Data-URLs and same-origin URLs are fetched directly.
 * @param src - Image URL or data-URL
 * @returns Blob of the image
 */
async function resolveImageToBlob(src: string): Promise<Blob> {
  // Data-URLs can be fetched directly
  if (src.startsWith('data:')) {
    const res = await fetch(src);
    return res.blob();
  }

  // Check if the URL is external (different host)
  const isExternal =
    src.startsWith('http') &&
    typeof window !== 'undefined' &&
    !src.includes(window.location.host);

  const fetchUrl = isExternal
    ? `/api/proxy-image?url=${encodeURIComponent(src)}`
    : src;

  const res = await fetch(fetchUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  }
  return res.blob();
}

/**
 * Removes the background from an image source.
 * Accepts a URL (including data-URLs), Blob, or File.
 * External URLs are automatically proxied through /api/proxy-image.
 *
 * @param source - Image URL, data-URL string, Blob, or File
 * @param onProgress - Optional progress callback
 * @returns Data-URL of the resulting transparent PNG
 */
export async function removeImageBackground(
  source: string | Blob,
  onProgress?: (p: RemovalProgress) => void,
): Promise<string> {
  // Resolve external URLs to Blobs to avoid CORS in the ONNX runtime
  let resolvedSource: Blob | string = source;
  if (typeof source === 'string' && !source.startsWith('data:')) {
    resolvedSource = await resolveImageToBlob(source);
  }

  const config: Config = {
    output: {
      format: 'image/png',
      quality: 0.9,
    },
    progress: (key: string, current: number, total: number) => {
      if (!onProgress) return;
      const pct = total > 0 ? current / total : 0;
      if (key.includes('download')) {
        onProgress({ phase: 'downloading', progress: pct });
      } else {
        onProgress({ phase: 'processing', progress: pct });
      }
    },
  };

  const blob = await removeBackground(resolvedSource, config);

  onProgress?.({ phase: 'done', progress: 1 });

  // Convert Blob → data-URL so it can be used directly as an image src
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
