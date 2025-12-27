/**
 * Get the base URL for the application.
 * Used for QR codes, share links, and email CTAs.
 * 
 * SAFETY: Never returns vercel.app or vercel.com URLs to avoid
 * QR codes leading to Vercel login screens or preview deployments.
 * 
 * Priority (browser context on production domains):
 * 1. window.location.origin (when hostname is gopopera.ca/gopopera.com)
 *    This ensures US users on gopopera.com get .com links, not .ca links.
 * 
 * Priority (all other contexts):
 * 1. VITE_BASE_URL environment variable (if valid and not Vercel)
 * 2. window.location.origin (if valid and not Vercel/localhost)
 * 3. https://gopopera.ca (production fallback)
 */
export function getBaseUrl(): string {
  const PRODUCTION_FALLBACK = 'https://gopopera.ca';
  
  // Production hostnames where we should use window.location.origin directly
  // This ensures US users on gopopera.com get .com links, not .ca links
  const PRODUCTION_HOSTNAMES = [
    'gopopera.ca',
    'www.gopopera.ca',
    'gopopera.com',
    'www.gopopera.com',
  ];
  
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

  // BROWSER-FIRST: On production domains, always use window.location.origin
  // This ensures share links match the domain the user is currently on
  // (e.g., US users on gopopera.com get .com links, not .ca links)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    if (PRODUCTION_HOSTNAMES.includes(hostname)) {
      return window.location.origin;
    }
  }

  // 1. Check VITE_BASE_URL (for non-production browser contexts and server)
  const envBaseUrl = import.meta.env.VITE_BASE_URL;
  if (envBaseUrl && typeof envBaseUrl === 'string' && envBaseUrl.length > 0) {
    const cleaned = envBaseUrl.replace(/\/$/, ''); // Remove trailing slash
    if (isValidHttpsUrl(cleaned) && !isVercelUrl(cleaned)) {
      return cleaned;
    }
    // If env var is set but invalid/Vercel, fall through to next check
  }

  // 2. Use window.location.origin, but ONLY if it's not a Vercel URL or localhost
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (isValidHttpsUrl(origin) && !isVercelUrl(origin) && !origin.includes('localhost')) {
      return origin;
    }
  }

  // 3. Fallback to production domain (always safe)
  return PRODUCTION_FALLBACK;
}
