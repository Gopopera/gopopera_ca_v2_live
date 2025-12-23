/**
 * Reddit Pixel Utility
 * Pixel ID: a2_hgtx9a7083va
 * 
 * Provides PageVisit tracking for SPA navigation.
 */

declare global {
  interface Window {
    rdt?: (...args: unknown[]) => void;
  }
}

/**
 * Track a PageVisit event in Reddit Pixel.
 * Call this whenever the SPA route/view changes.
 */
export function trackRedditPageVisit(): void {
  // Guard against SSR or missing rdt
  if (typeof window === 'undefined' || !window.rdt) {
    return;
  }

  window.rdt('track', 'PageVisit');
}

