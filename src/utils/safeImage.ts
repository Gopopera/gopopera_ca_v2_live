/**
 * Safely convert an image URL to a data URL to avoid CORS tainting in canvas exports.
 * Uses a two-phase approach:
 * 1. Try fetch() with CORS
 * 2. Fallback to <img> element with crossOrigin (works when redirects block fetch)
 * Returns null only if all attempts fail.
 */
export async function getSafeDataUrl(imageUrl: string, timeoutMs: number = 6000): Promise<string | null> {
  if (!imageUrl) return null;

  // If already a data URL, return as-is
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  // Build absolute URL
  let absoluteUrl = imageUrl;
  if (imageUrl.startsWith('/') && typeof window !== 'undefined') {
    absoluteUrl = window.location.origin + imageUrl;
  }

  // Determine if it's a logo/PNG (preserve transparency) vs photo (use JPEG)
  const isPng = absoluteUrl.toLowerCase().includes('.png') || absoluteUrl.includes('Popera');
  const outputFormat = isPng ? 'image/png' : 'image/jpeg';
  const outputQuality = isPng ? undefined : 0.92;

  // Helper: convert loaded image to data URL via canvas
  const imageToDataUrl = (img: HTMLImageElement): string | null => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 800;
      canvas.height = img.naturalHeight || img.height || 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL(outputFormat, outputQuality);
    } catch {
      return null;
    }
  };

  // PHASE 1: Try fetch() with CORS
  const tryFetch = async (): Promise<string | null> => {
    try {
      const response = await fetch(absoluteUrl, {
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store', // Avoid stale tokens for Firebase
      });

      if (!response.ok) return null;

      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // PHASE 2: Try <img> element (works when fetch fails due to redirects)
  const tryImage = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const dataUrl = imageToDataUrl(img);
        resolve(dataUrl);
      };
      
      img.onerror = () => resolve(null);
      
      // Add cache-busting for Firebase URLs to avoid stale responses
      const bustCache = absoluteUrl.includes('firebasestorage.googleapis.com');
      img.src = bustCache ? `${absoluteUrl}${absoluteUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : absoluteUrl;
    });
  };

  // Create timeout
  const withTimeout = <T>(promise: Promise<T>): Promise<T | null> => {
    return Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  };

  // Try Phase 1: fetch
  let result = await withTimeout(tryFetch());
  if (result) return result;

  // Try Phase 2: img element fallback
  result = await withTimeout(tryImage());
  if (result) return result;

  // All attempts failed
  return null;
}
