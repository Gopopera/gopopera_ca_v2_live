/**
 * Auth Helper Functions
 * Utilities for authentication flows, especially Google Sign-In
 */

/**
 * Determines if the current environment should use redirect-based auth
 * instead of popup-based auth.
 * 
 * Returns true for:
 * - iOS devices (iPhone, iPad, iPod)
 * - Android WebViews
 * - Mobile devices in general
 * 
 * Returns false for desktop browsers (where popup is preferred)
 */
export function shouldUseRedirect(): boolean {
  if (typeof window === 'undefined' || !navigator) {
    return false; // SSR or no navigator
  }

  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroidWebView = /\bwv\b/.test(ua);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

  return isIOS || isAndroidWebView || isMobile;
}

