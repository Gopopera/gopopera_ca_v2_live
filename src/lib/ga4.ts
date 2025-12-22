/**
 * GA4 Analytics Utility
 * Measurement ID: G-2YRPWD6C0G
 * 
 * Provides page_view tracking for SPA navigation.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const GA_MEASUREMENT_ID = 'G-2YRPWD6C0G';

/**
 * Track a page view in GA4.
 * Call this whenever the SPA route/view changes.
 * 
 * @param pathname - The path to track (e.g., "/explore", "/event/abc123")
 * @param pageTitle - Optional page title
 */
export function trackPageView(pathname: string, pageTitle?: string): void {
  // Guard against SSR or missing gtag
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: pathname,
    page_title: pageTitle,
  });
}

/**
 * Track a custom event in GA4.
 * 
 * @param eventName - The event name (e.g., "sign_up", "purchase")
 * @param params - Optional event parameters
 */
export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  // Guard against SSR or missing gtag
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', eventName, params);
}

