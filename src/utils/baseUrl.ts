/**
 * Get the base URL for the application.
 * Priority:
 * 1. VITE_BASE_URL environment variable (set in Vercel for each environment)
 * 2. window.location.origin (only if it's NOT a vercel.app URL)
 * 3. https://gopopera.ca (production fallback)
 */
export function getBaseUrl(): string {
  // 1. Check VITE_BASE_URL first (most reliable for deployed environments)
  const envBaseUrl = import.meta.env.VITE_BASE_URL;
  if (envBaseUrl && typeof envBaseUrl === 'string' && envBaseUrl.length > 0) {
    return envBaseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  // 2. Use window.location.origin, but ONLY if it's not a vercel.app preview URL
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Reject vercel.app preview URLs - these should never be in QR codes
    if (!origin.includes('vercel.app') && !origin.includes('localhost')) {
      return origin;
    }
  }

  // 3. Fallback to production domain
  return 'https://gopopera.ca';
}

