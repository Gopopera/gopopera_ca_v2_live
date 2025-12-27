/**
 * Safely convert an image URL to a data URL to avoid CORS tainting in canvas exports.
 * Returns null if conversion fails or times out.
 * Preserves PNG transparency.
 */
export async function getSafeDataUrl(imageUrl: string, timeoutMs: number = 8000): Promise<string | null> {
  if (!imageUrl) return null;

  try {
    // If already a data URL, return as-is
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // If relative URL (starts with /), make it absolute using current origin
    let absoluteUrl = imageUrl;
    if (imageUrl.startsWith('/') && typeof window !== 'undefined') {
      absoluteUrl = window.location.origin + imageUrl;
    }

    // Check if same-origin
    const isSameOrigin = (() => {
      try {
        if (typeof window === 'undefined') return false;
        const imgOrigin = new URL(absoluteUrl, window.location.origin).origin;
        return imgOrigin === window.location.origin;
      } catch {
        return false;
      }
    })();

    // Check if Firebase Storage URL
    const isFirebaseStorage = absoluteUrl.includes('firebasestorage.googleapis.com');

    // Create a timeout promise
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn('[safeImage] Timeout loading image:', imageUrl);
        resolve(null);
      }, timeoutMs);
    });

    if (isSameOrigin) {
      // For same-origin images, load and convert to data URL preserving format
      const loadPromise = new Promise<string | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              // Use PNG to preserve transparency (important for logos)
              const dataUrl = canvas.toDataURL('image/png');
              resolve(dataUrl);
            } else {
              resolve(absoluteUrl);
            }
          } catch (e) {
            console.warn('[safeImage] Failed to convert to data URL:', e);
            resolve(null);
          }
        };
        img.onerror = () => {
          console.warn('[safeImage] Failed to load same-origin image:', absoluteUrl);
          resolve(null);
        };
        img.src = absoluteUrl;
      });

      return await Promise.race([loadPromise, timeoutPromise]);
    }

    // For cross-origin images (Firebase Storage, etc.), fetch and convert to data URL
    const fetchPromise = (async (): Promise<string | null> => {
      try {
        // Use cache: 'no-store' for Firebase to avoid stale tokens
        const response = await fetch(absoluteUrl, {
          mode: 'cors',
          credentials: 'omit',
          cache: isFirebaseStorage ? 'no-store' : 'default',
        });

        if (!response.ok) {
          console.warn('[safeImage] Failed to fetch image:', response.status, absoluteUrl);
          return null;
        }

        const blob = await response.blob();

        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl);
          };
          reader.onerror = () => {
            console.warn('[safeImage] Failed to convert blob to data URL');
            resolve(null);
          };
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.warn('[safeImage] Error fetching cross-origin image:', error);
        return null;
      }
    })();

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    console.warn('[safeImage] Error converting image:', error);
    return null;
  }
}
