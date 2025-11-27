/**
 * Browser Detection Utilities
 * Detects iOS/Safari private mode and other browser-specific issues
 */

/**
 * Check if sessionStorage is available (fails in Safari private mode)
 */
export function isSessionStorageAvailable(): boolean {
  try {
    const test = '__sessionStorage_test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if running on iOS/Safari
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Check if running in Safari
 */
export function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Check if likely in private/incognito mode
 */
export function isPrivateMode(): boolean {
  return isIOS() && isSafari() && !isSessionStorageAvailable();
}

/**
 * Get user-friendly message for private mode
 */
export function getPrivateModeMessage(): string {
  if (isPrivateMode()) {
    return 'Safari Private Mode is not fully supported. Please disable Private Mode or use a different browser for the best experience.';
  }
  return '';
}

