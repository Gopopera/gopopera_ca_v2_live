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
 * - Safari browsers
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
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

  return isIOS || isSafari || isMobile;
}

/**
 * Universal Google Sign-In handler
 * Prevents popup-blocked errors and handles mobile/iOS properly
 */
export async function handleGoogleSignIn() {
  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth');
  const { auth } = await import('./firebase');
  
  const provider = new GoogleAuthProvider();
  
  if (shouldUseRedirect()) {
    return signInWithRedirect(auth, provider);
  }
  
  try {
    await signInWithPopup(auth, provider);
  } catch (err: any) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      return signInWithRedirect(auth, provider);
    }
    throw err;
  }
}

