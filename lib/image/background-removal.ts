/**
 * Background Removal Utility
 * @description Removes image backgrounds via the server-side remove.bg API route.
 * Sends the image to /api/image/remove-background and returns a transparent PNG data-URL.
 * @module lib/image/background-removal
 */

/** Status updates emitted during processing */
export type RemovalProgress = {
  phase: 'uploading' | 'processing' | 'done';
  progress: number; // 0-1
};

/**
 * Converts an image source (URL or data-URL) to a Blob for upload.
 * External URLs are proxied through /api/proxy-image to avoid CORS issues.
 * @param src - Image URL or data-URL
 * @returns Blob of the image
 */
async function resolveImageToBlob(src: string): Promise<Blob> {
  if (src.startsWith('data:')) {
    const res = await fetch(src);
    return res.blob();
  }

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
 * Removes the background from an image source using the remove.bg API.
 * Accepts a URL (including data-URLs), Blob, or File.
 * External URLs are automatically proxied through /api/proxy-image before upload.
 *
 * @param source - Image URL, data-URL string, Blob, or File
 * @param onProgress - Optional progress callback with uploading/processing phases
 * @returns Data-URL of the resulting transparent PNG
 * @example
 * const result = await removeImageBackground(imageUrl, (p) => {
 *   console.log(p.phase, p.progress);
 * });
 */
export async function removeImageBackground(
  source: string | Blob,
  onProgress?: (p: RemovalProgress) => void,
): Promise<string> {
  // Phase 1: Resolve to a Blob for upload
  onProgress?.({ phase: 'uploading', progress: 0 });

  let imageBlob: Blob;
  if (typeof source === 'string') {
    imageBlob = await resolveImageToBlob(source);
  } else {
    imageBlob = source;
  }

  onProgress?.({ phase: 'uploading', progress: 0.3 });

  // Phase 2: Upload to our API route
  const formData = new FormData();
  formData.append('image_file', imageBlob, 'image.png');

  onProgress?.({ phase: 'uploading', progress: 0.5 });

  const response = await fetch('/api/image/remove-background', {
    method: 'POST',
    body: formData,
  });

  onProgress?.({ phase: 'processing', progress: 0.7 });

  if (!response.ok) {
    let errorMessage = 'Background removal failed';
    try {
      const errorData = (await response.json()) as { error?: string };
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Response wasn't JSON; use the default message
    }
    throw new Error(errorMessage);
  }

  onProgress?.({ phase: 'processing', progress: 0.9 });

  // Phase 3: Convert the response PNG blob to a data-URL
  const resultBlob = await response.blob();

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(resultBlob);
  });

  onProgress?.({ phase: 'done', progress: 1 });

  return dataUrl;
}
