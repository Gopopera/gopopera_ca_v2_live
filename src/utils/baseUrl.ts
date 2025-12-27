/**
 * Get the base URL for the application.
 * Used for QR codes, share links, and email CTAs.
 * 
 * SAFETY: Never returns vercel.app or vercel.com URLs to avoid
 * QR codes leading to Vercel login screens or preview deployments.
 * 
 * Priority:
 * 1. VITE_BASE_URL environment variable (if valid and not Vercel)
 * 2. window.location.origin (if valid and not Vercel)
 * 3. https://gopopera.ca (production fallback)
 */
export function getBaseUrl(): string {
  const PRODUCTION_FALLBACK = 'https://gopopera.ca';
  
  // Helper to check if URL contains Vercel domains
  const isVercelUrl = (url: string): boolean => {
    const lower = url.toLowerCase();
    return lower.includes('vercel.app') || 
           lower.includes('vercel.com') || 
           lower.includes('.vercel.');
  };
  
  // Helper to validate URL format
  const isValidHttpsUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // 1. Check VITE_BASE_URL first (most reliable for deployed environments)
  const envBaseUrl = import.meta.env.VITE_BASE_URL;
  if (envBaseUrl && typeof envBaseUrl === 'string' && envBaseUrl.length > 0) {
    const cleaned = envBaseUrl.replace(/\/$/, ''); // Remove trailing slash
    if (isValidHttpsUrl(cleaned) && !isVercelUrl(cleaned)) {
      return cleaned;
    }
    // If env var is set but invalid/Vercel, fall through to next check
  }

  // 2. Use window.location.origin, but ONLY if it's not a Vercel URL
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (isValidHttpsUrl(origin) && !isVercelUrl(origin) && !origin.includes('localhost')) {
      return origin;
    }
  }

  // 3. Fallback to production domain (always safe)
  return PRODUCTION_FALLBACK;
}
