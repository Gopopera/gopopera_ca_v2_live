/**
 * Reddit Pixel Utility
 * Pixel ID: a2_hgtx9a7083va
 * 
 * Provides PageVisit and conversion tracking for SPA navigation.
 * 
 * EVENT TAXONOMY:
 * - PageVisit: On every real pathname change
 * - ViewContent: When user opens an event detail page
 * - Lead: When user clicks "Sign Up" CTA or lands on /auth
 * - CompleteRegistration: When user successfully completes signup
 * - landing_cta_click: Custom event for landing CTAs
 * 
 * NO PII is ever sent (no email/phone/name).
 */

declare global {
  interface Window {
    rdt?: (...args: unknown[]) => void;
  }
}

/** Dev-only logger for Reddit Pixel events */
function logRedditEvent(eventName: string, params?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.log('[REDDIT_PIXEL]', eventName, params ?? {});
  }
}

/** Guard check for SSR and missing pixel */
function isPixelAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.rdt === 'function';
}

/**
 * Track a PageVisit event in Reddit Pixel.
 * Call this whenever the SPA route/view changes.
 * 
 * @param pathname - The current pathname (for logging only, Reddit doesn't use it)
 */
export function redditPageVisit(pathname?: string): void {
  if (!isPixelAvailable()) return;
  
  logRedditEvent('PageVisit', { pathname });
  window.rdt!('track', 'PageVisit');
}

/**
 * Track a custom event in Reddit Pixel.
 * 
 * @param eventName - The event name (e.g., 'ViewContent', 'Lead', 'CompleteRegistration')
 * @param params - Optional event parameters (no PII!)
 */
export function redditTrack(eventName: string, params?: Record<string, unknown>): void {
  if (!isPixelAvailable()) return;
  
  logRedditEvent(eventName, params);
  
  if (params && Object.keys(params).length > 0) {
    window.rdt!('track', eventName, params);
  } else {
    window.rdt!('track', eventName);
  }
}

/**
 * Track a landing CTA click with standardized params.
 * Also fires 'Lead' event if destination is /auth.
 * 
 * @param cta_id - Unique identifier for the CTA
 * @param cta_text - Display text of the CTA
 * @param section - Section of the page (e.g., 'hero', 'pillars')
 * @param destination - Target path (e.g., '/explore', '/auth')
 * @param extra - Additional params (no PII!)
 */
export function redditTrackCTA(
  cta_id: string,
  cta_text: string,
  section: string,
  destination: string,
  extra?: Record<string, unknown>
): void {
  if (!isPixelAvailable()) return;
  
  const params = {
    cta_id,
    cta_text,
    section,
    destination,
    is_external: false,
    ...extra,
  };
  
  // Fire custom landing_cta_click event
  redditTrack('landing_cta_click', params);
  
  // If destination is /auth, also fire Lead event
  if (destination === '/auth') {
    redditTrack('Lead', { source: section, cta_id });
  }
}

/**
 * Track ViewContent event when user views an event detail.
 * 
 * @param eventId - The event ID being viewed (for deduplication logging only)
 */
export function redditTrackViewContent(eventId?: string): void {
  if (!isPixelAvailable()) return;
  
  logRedditEvent('ViewContent', { event_id: eventId });
  window.rdt!('track', 'ViewContent');
}

/**
 * Track Lead event (user showing interest, e.g., landing on /auth).
 * 
 * @param source - Where the lead came from (e.g., 'landing', 'hero')
 */
export function redditTrackLead(source?: string): void {
  if (!isPixelAvailable()) return;
  
  logRedditEvent('Lead', { source });
  window.rdt!('track', 'Lead');
}

/**
 * Track CompleteRegistration event when user successfully signs up.
 * Deduplicated per browser session using sessionStorage.
 * 
 * @param method - Auth method used (e.g., 'google', 'email')
 */
export function redditTrackCompleteRegistration(method?: string): void {
  if (!isPixelAvailable()) return;
  
  // Dedupe: only fire once per session
  const SESSION_KEY = 'rd_complete_registration_fired';
  try {
    if (sessionStorage.getItem(SESSION_KEY)) {
      logRedditEvent('CompleteRegistration', { method, skipped: 'already_fired_this_session' });
      return;
    }
    sessionStorage.setItem(SESSION_KEY, 'true');
  } catch {
    // sessionStorage may be unavailable in private mode - proceed anyway
  }
  
  logRedditEvent('CompleteRegistration', { method });
  window.rdt!('track', 'CompleteRegistration');
}

// TODO: InitiateCheckout - Add when payment flow start point is clearly identified
// TODO: Purchase - Add when payment success point is clearly identified
