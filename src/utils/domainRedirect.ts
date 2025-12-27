/**
 * domainRedirect.ts
 * 
 * Geo-based domain redirect utility for Popera.
 * 
 * SAFETY RULES:
 * - Only redirect if hostname is exactly "gopopera.ca" or "www.gopopera.ca"
 * - Only redirect if geo country == "US"
 * - Preserve full pathname + search + hash
 * - NO redirect on localhost
 * - NO redirect on *.vercel.app domains
 * - NO redirect on staging/preview domains
 * - Escape hatch: ?noredirect=1 skips redirect
 * - Loop protection: sessionStorage flag prevents multiple redirects
 * - Fail open: if geo lookup fails/times out, no redirect
 */

const REDIRECT_SESSION_KEY = 'popera:redirectedToCom';
const GEO_TIMEOUT_MS = 2000; // 2 seconds max for geo lookup

/**
 * Check if we should skip redirect based on hostname.
 * Returns true if redirect should be skipped.
 */
function shouldSkipBasedOnHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  
  // Skip localhost
  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '::1') {
    return true;
  }
  
  // Skip any *.vercel.app domain (preview/staging)
  if (lower.endsWith('.vercel.app')) {
    return true;
  }
  
  // Skip if not exactly gopopera.ca or www.gopopera.ca
  if (lower !== 'gopopera.ca' && lower !== 'www.gopopera.ca') {
    return true;
  }
  
  return false;
}

/**
 * Check if redirect should be skipped based on URL params or session state.
 * Returns true if redirect should be skipped.
 */
function shouldSkipBasedOnState(search: string): boolean {
  // Escape hatch: ?noredirect=1
  const params = new URLSearchParams(search);
  if (params.get('noredirect') === '1') {
    return true;
  }
  
  // Loop protection: check if we already redirected this session
  try {
    if (sessionStorage.getItem(REDIRECT_SESSION_KEY) === '1') {
      return true;
    }
  } catch {
    // sessionStorage not available, continue
  }
  
  return false;
}

/**
 * Fetch geo data with timeout. Returns country code or null on failure.
 */
async function fetchCountryWithTimeout(timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch('/api/geo', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    // country is 2-letter code (e.g., "US", "CA")
    return data.country || null;
  } catch {
    clearTimeout(timeoutId);
    // Timeout, network error, or abort - fail open (no redirect)
    return null;
  }
}

/**
 * Perform the redirect to gopopera.com preserving path, search, and hash.
 */
function performRedirect(pathname: string, search: string, hash: string): void {
  // Mark that we've redirected to prevent loops
  try {
    sessionStorage.setItem(REDIRECT_SESSION_KEY, '1');
  } catch {
    // sessionStorage not available, continue anyway
  }
  
  const targetUrl = `https://gopopera.com${pathname}${search}${hash}`;
  window.location.replace(targetUrl);
}

/**
 * Main entry point: check if we should redirect US visitors from gopopera.ca to gopopera.com.
 * Call this as early as possible on app startup, BEFORE rendering.
 * 
 * This function is async but returns quickly if conditions aren't met.
 * If geo lookup times out, we fail open (no redirect).
 */
export async function maybeRedirectToCom(): Promise<void> {
  // Only run in browser
  if (typeof window === 'undefined') {
    return;
  }
  
  const { hostname, pathname, search, hash } = window.location;
  
  // Check hostname-based skip conditions
  if (shouldSkipBasedOnHostname(hostname)) {
    return;
  }
  
  // Check URL param and session-based skip conditions
  if (shouldSkipBasedOnState(search)) {
    return;
  }
  
  // Lookup geo with timeout (fail open if it fails)
  const country = await fetchCountryWithTimeout(GEO_TIMEOUT_MS);
  
  // Only redirect if country is US
  if (country === 'US') {
    performRedirect(pathname, search, hash);
  }
}

