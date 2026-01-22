/**
 * Mobile Debug Utility
 * Gates debug logging to localhost endpoints so they don't run on native platforms
 * 
 * Usage:
 * import { isDebugEnvironment, debugFetch } from '../utils/mobileDebug';
 * 
 * // Replace direct fetch calls:
 * // Before: fetch('http://127.0.0.1:7242/ingest/...', {...}).catch(()=>{});
 * // After: debugFetch('/ingest/...', { location: '...', message: '...' });
 */

/**
 * Check if we're in a native Capacitor environment
 * This is a safe check that works even if Capacitor isn't installed
 */
export const isNativePlatform = (): boolean => {
  try {
    // Check for Capacitor native platform indicator
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform) {
      return (window as any).Capacitor.isNativePlatform();
    }
    // Fallback: check for Capacitor bridge
    if (typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform) {
      const platform = (window as any).Capacitor.getPlatform();
      return platform === 'ios' || platform === 'android';
    }
  } catch {
    // If any error, assume not native
  }
  return false;
};

/**
 * Check if we're in a debug environment where localhost logging should work
 * Returns false on native platforms (iOS/Android) to prevent failed network requests
 */
export const isDebugEnvironment = (): boolean => {
  // Never log to localhost on native apps - it will fail
  if (isNativePlatform()) return false;
  
  // Only in development mode
  if (!import.meta.env.DEV) return false;
  
  // Check for browser environment
  if (typeof window === 'undefined') return false;
  
  // Only on localhost
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

/**
 * Debug fetch wrapper - only sends to localhost debug server in dev environment
 * Safe to call anywhere - silently no-ops on production and native platforms
 * 
 * @param endpoint - The endpoint path (e.g., '/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63')
 * @param data - Data to send in the request body
 */
export const debugFetch = (
  endpoint: string,
  data: Record<string, unknown>
): void => {
  if (!isDebugEnvironment()) return;
  
  fetch(`http://127.0.0.1:7242${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      ...data, 
      timestamp: Date.now(),
      sessionId: 'debug-session',
    }),
  }).catch(() => {
    // Silently ignore - debug server may not be running
  });
};

/**
 * Debug log wrapper - logs to console in debug environment
 * @param tag - Log tag for filtering
 * @param message - Message to log
 * @param data - Optional data object
 */
export const debugLog = (
  tag: string,
  message: string,
  data?: Record<string, unknown>
): void => {
  if (!isDebugEnvironment()) return;
  
  if (data) {
    console.log(`[${tag}] ${message}`, data);
  } else {
    console.log(`[${tag}] ${message}`);
  }
};

