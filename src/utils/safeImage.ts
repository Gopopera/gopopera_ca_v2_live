/**
 * Safely convert an image URL to a data URL to avoid CORS tainting in canvas exports.
 * Returns null if conversion fails.
 */
export async function getSafeDataUrl(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;

  try {
    // Check if same-origin - can use directly
    const imgOrigin = new URL(imageUrl, window.location.origin).origin;
    const isSameOrigin = imgOrigin === window.location.origin;
    
    if (isSameOrigin) {
      // For same-origin images, verify they load before returning
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(imageUrl);
        img.onerror = () => resolve(null);
        img.src = imageUrl;
      });
    }

    // For cross-origin images (like Firebase Storage), try to fetch and convert to data URL
    const response = await fetch(imageUrl, { 
      mode: 'cors',
      credentials: 'omit', // Don't send cookies
    });
    
    if (!response.ok) {
      console.warn('[safeImage] Failed to fetch image:', response.status);
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
    console.warn('[safeImage] Error converting image:', error);
    return null;
  }
}

