/**
 * Firebase Authentication Monitoring
 * 
 * This module tracks authentication failures and redirect issues,
 * particularly on mobile devices where failures often happen silently.
 * 
 * Usage: Import and call initAuthMonitoring() in App.tsx or main entry point
 */

import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { getAppSafe } from './firebase';

let monitoringInitialized = false;
let authFailureCount = 0;
const MAX_FAILURES_PER_SESSION = 10; // Prevent spam

interface AuthFailureLog {
  type: string;
  details: any;
  userAgent: string;
  time: string;
  url: string;
  viewport: { width: number; height: number };
  isMobile: boolean;
  isPrivateMode?: boolean;
  sessionId: string;
}

// Generate a session ID for this browser session
const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Detect if browser is in private/incognito mode
 * Note: This is not 100% reliable but works for most cases
 */
function isPrivateMode(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const db = indexedDB.open('test');
      db.onerror = () => resolve(true);
      db.onsuccess = () => {
        db.result.close();
        resolve(false);
      };
    } catch {
      resolve(true);
    }
  });
}

/**
 * Detect if device is mobile based on user agent
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Log an authentication failure to Firestore
 */
async function logFailure(type: string, details: any): Promise<void> {
  // Prevent spam
  authFailureCount++;
  if (authFailureCount > MAX_FAILURES_PER_SESSION) {
    console.warn('[AUTH_MONITOR] Too many failures in this session, skipping log');
    return;
  }

  try {
    const app = getAppSafe();
    if (!app) {
      console.warn('[AUTH_MONITOR] Firebase not initialized, cannot log failure');
      return;
    }

    const db = getFirestore(app);
    const isPrivate = await isPrivateMode();

    const logEntry: AuthFailureLog = {
      type,
      details: {
        ...details,
        // Sanitize error objects
        message: details?.message || details?.toString(),
        code: details?.code,
        stack: details?.stack?.substring(0, 500), // Limit stack trace length
      },
      userAgent: navigator.userAgent,
      time: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      viewport: {
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
      },
      isMobile: isMobileDevice(),
      isPrivateMode: isPrivate,
      sessionId: SESSION_ID,
    };

    // Use addDoc instead of setDoc to allow multiple logs per session
    await addDoc(collection(db, 'auth_failures'), logEntry);
    
    console.log('[AUTH_MONITOR] Logged failure:', type, logEntry);
  } catch (err) {
    // Don't throw - monitoring should never break the app
    console.error('[AUTH_MONITOR] Failed to write failure log:', err);
  }
}

/**
 * Initialize authentication monitoring
 * 
 * This sets up listeners for:
 * - Unhandled promise rejections (redirect errors, popup errors)
 * - Firebase auth state errors
 * - Missing user UID after authentication
 */
export function initAuthMonitoring(): void {
  if (monitoringInitialized) {
    console.warn('[AUTH_MONITOR] Already initialized, skipping');
    return;
  }

  if (typeof window === 'undefined') {
    console.warn('[AUTH_MONITOR] Not in browser environment, skipping');
    return;
  }

  monitoringInitialized = true;
  console.log('[AUTH_MONITOR] Initializing authentication monitoring');

  // Track unhandled promise rejections (common for redirect/popup errors)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const errorMessage = reason?.message || reason?.toString() || '';
    const errorCode = reason?.code || '';

    // Check if this is an auth-related error
    const isAuthError =
      errorMessage.includes('redirect') ||
      errorMessage.includes('popup') ||
      errorMessage.includes('auth/') ||
      errorCode.includes('auth/') ||
      errorMessage.includes('Firebase') ||
      errorMessage.includes('authentication');

    if (isAuthError) {
      console.warn('[AUTH_MONITOR] Unhandled auth promise rejection:', reason);
      void logFailure('UNHANDLED_PROMISE_REJECTION', {
        error: errorMessage,
        code: errorCode,
        reason: reason,
      });
    }
  });

  // Track Firebase auth state errors
  try {
    const app = getAppSafe();
    if (app) {
      const auth = getAuth(app);
      
      // Monitor auth state changes for anomalies
      onAuthStateChanged(auth, async (user: User | null) => {
        if (user) {
          // Check for missing UID (should never happen but indicates corruption)
          if (!user.uid) {
            console.error('[AUTH_MONITOR] User object missing UID!');
            await logFailure('AUTH_STATE_ERROR', {
              uidMissing: true,
              userEmail: user.email,
              userDisplayName: user.displayName,
            });
          }

          // Check for missing email (might indicate incomplete auth)
          if (!user.email && !user.phoneNumber) {
            console.warn('[AUTH_MONITOR] User authenticated but no email or phone');
            await logFailure('AUTH_STATE_WARNING', {
              missingCredentials: true,
              providers: user.providerData.map((p) => p.providerId),
            });
          }
        }
      });
    }
  } catch (err) {
    console.error('[AUTH_MONITOR] Failed to set up auth state monitoring:', err);
  }

  // Track redirect-specific errors
  if (typeof window !== 'undefined') {
    // Monitor for redirect-related errors in console (if available)
    const originalError = console.error;
    console.error = function (...args: any[]) {
      const message = args.join(' ');
      if (
        message.includes('redirect') ||
        message.includes('auth/') ||
        message.includes('popup')
      ) {
        void logFailure('CONSOLE_AUTH_ERROR', {
          message,
          args: args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))),
        });
      }
      originalError.apply(console, args);
    };
  }

  console.log('[AUTH_MONITOR] Monitoring initialized successfully');
}

/**
 * Manually log an authentication failure
 * Use this in catch blocks where you want to track specific failures
 */
export async function logAuthFailure(type: string, details: any): Promise<void> {
  await logFailure(type, details);
}

/**
 * Check if monitoring is enabled
 */
export function isMonitoringEnabled(): boolean {
  return monitoringInitialized;
}

