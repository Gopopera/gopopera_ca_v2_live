/**
 * Utility to detect Instagram/Facebook in-app browsers (WebViews)
 * These browsers have performance issues with heavy CSS effects like backdrop-filter
 */

/**
 * Detects if the current browser is Instagram's in-app browser (WebView)
 * Also detects Facebook in-app browser since they share similar WebView limitations
 * 
 * @returns true if running inside Instagram or Facebook in-app browser
 */
export function isInstagramInAppBrowser(): boolean {
  // Only run in browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent || '';
  
  // Instagram in-app browser identifiers
  // FBAN = Facebook App Name (used by both FB and IG apps)
  // FBAV = Facebook App Version
  // Instagram = explicit Instagram identifier
  return (
    ua.includes('Instagram') ||
    ua.includes('FBAN') ||
    ua.includes('FBAV')
  );
}

/**
 * Applies the in-app browser class to the document element
 * Should be called once at app startup
 */
export function applyInAppBrowserClass(): void {
  if (isInstagramInAppBrowser()) {
    document.documentElement.classList.add('inapp-ig');
  }
}

