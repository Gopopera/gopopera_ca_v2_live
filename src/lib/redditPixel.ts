/**
 * Reddit Pixel Utility
 * Pixel ID: a2_hgtx9a7083va
 * 
 * Provides PageVisit and conversion tracking for SPA navigation.
 * 
 * SUPPORTED REDDIT STANDARD EVENTS:
 * - PageVisit: On every real pathname change
 * - ViewContent: Browsing/discovery actions (e.g., /explore)
 * - Lead: Host-intent CTAs (e.g., "Become a Host")
 * - SignUp: Auth-intent CTAs (e.g., "Sign Up", destination /auth)
 * - CompleteRegistration: When user successfully completes signup
 * 
 * NO PII is ever sent (no email/phone/name).
 * NO custom event names (Reddit only supports standard events).
 */

declare global {
  interface Window {
    rdt?: (...args: unknown[]) => void;
  }
}

/** Reddit standard event types */
export type RedditEventType = 
  | 'PageVisit' 
  | 'ViewContent' 
  | 'Search' 
  | 'AddToCart' 
  | 'AddToWishlist' 
  | 'Purchase' 
  | 'Lead' 
  | 'SignUp';

/** Check if debug mode is enabled via localStorage */
function isDebugEnabled(): boolean {
  try {
    return typeof window !== 'undefined' && localStorage.getItem('DEBUG_REDDIT_PIXEL') === '1';
  } catch {
    return false;
  }
}

/** Debug logger for Reddit Pixel events (enabled via localStorage DEBUG_REDDIT_PIXEL=1) */
function logRedditEvent(eventName: string, params?: Record<string, unknown>, extra?: string): void {
  if (isDebugEnabled() || import.meta.env.DEV) {
    console.log('[REDDIT_PIXEL]', eventName, params ?? {}, extra ?? '');
  }
}

/** Guard check for SSR and missing pixel */
function isPixelAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.rdt === 'function';
}

/**
 * Track a standard Reddit Pixel event.
 * Only use Reddit-supported event types.
 * 
 * @param eventType - Must be a valid Reddit standard event type
 * @param payload - Optional event parameters (no PII!)
 */
export function trackReddit(
  eventType: RedditEventType, 
  payload?: Record<string, unknown>
): void {
  if (!isPixelAvailable()) {
    logRedditEvent(eventType, payload, '(skipped: pixel not available)');
    return;
  }
  
  logRedditEvent(eventType, payload);
  
  if (payload && Object.keys(payload).length > 0) {
    window.rdt!('track', eventType, payload);
  } else {
    window.rdt!('track', eventType);
  }
}

/**
 * Track a PageVisit event in Reddit Pixel.
 * Call this whenever the SPA route/view changes.
 * 
 * @param pathname - The current pathname (for logging only)
 */
export function redditPageVisit(pathname?: string): void {
  trackReddit('PageVisit', pathname ? { pathname } : undefined);
}

/**
 * Track a CTA click with proper Reddit event mapping.
 * Maps CTAs to valid Reddit standard events based on destination/intent.
 * 
 * Mapping logic:
 * - destination "/auth" OR cta_text contains "sign up" => SignUp
 * - cta_id contains "host" OR cta_text contains "host" => Lead
 * - destination "/explore" OR browsing/discovery intent => ViewContent
 * - destination "/terms", "/guidelines", "/privacy" => no Reddit event (low-value)
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
  
  const ctaTextLower = cta_text.toLowerCase();
  const ctaIdLower = cta_id.toLowerCase();
  const destinationLower = destination.toLowerCase();
  
  // Build payload with useful metadata
  const payload: Record<string, unknown> = {
    cta_id,
    cta_text,
    section,
    destination,
    is_external: false,
    pathname: typeof window !== 'undefined' ? window.location.pathname : undefined,
    ...extra,
  };
  
  // Skip low-value pages (no conversion intent)
  if (
    destinationLower === '/terms' || 
    destinationLower === '/guidelines' || 
    destinationLower === '/privacy' ||
    destinationLower === '/help' ||
    destinationLower === '/safety'
  ) {
    logRedditEvent('(skipped)', payload, 'low-value destination');
    return;
  }
  
  // Map to Reddit standard event based on intent
  let eventType: RedditEventType;
  
  if (
    destinationLower.includes('/auth') || 
    ctaTextLower.includes('sign up') ||
    ctaTextLower.includes('signup') ||
    ctaTextLower.includes('s\'inscrire') || // French
    ctaIdLower.includes('signup')
  ) {
    // Auth/signup intent => SignUp
    eventType = 'SignUp';
  } else if (
    ctaIdLower.includes('host') ||
    ctaTextLower.includes('host') ||
    ctaTextLower.includes('become') ||
    ctaTextLower.includes('devenir') || // French "become"
    destinationLower.includes('/create-event')
  ) {
    // Host intent => Lead
    eventType = 'Lead';
  } else if (
    destinationLower.includes('/explore') ||
    ctaIdLower.includes('browse') ||
    ctaTextLower.includes('browse') ||
    ctaTextLower.includes('view') ||
    ctaTextLower.includes('discover') ||
    ctaTextLower.includes('parcourir') // French "browse"
  ) {
    // Browsing/discovery intent => ViewContent
    eventType = 'ViewContent';
  } else {
    // Default fallback for other CTAs => ViewContent
    eventType = 'ViewContent';
  }
  
  trackReddit(eventType, payload);
}

/**
 * Track ViewContent event when user views an event detail.
 * 
 * @param eventId - The event ID being viewed (for logging only)
 */
export function redditTrackViewContent(eventId?: string): void {
  trackReddit('ViewContent', eventId ? { event_id: eventId } : undefined);
}

/**
 * Track Lead event (user showing interest, e.g., landing on /auth).
 * 
 * @param source - Where the lead came from (e.g., 'landing', 'hero')
 */
export function redditTrackLead(source?: string): void {
  trackReddit('Lead', source ? { source } : undefined);
}

/**
 * Track SignUp event when user lands on auth page or clicks signup CTA.
 * 
 * @param source - Where the signup intent came from
 */
export function redditTrackSignUp(source?: string): void {
  trackReddit('SignUp', source ? { source } : undefined);
}

/**
 * Track CompleteRegistration event when user successfully signs up.
 * Deduplicated per browser session using sessionStorage.
 * 
 * NOTE: Reddit uses "SignUp" for registration completion in some docs,
 * but we use the standard tracking approach here.
 * 
 * @param method - Auth method used (e.g., 'google', 'email')
 */
export function redditTrackCompleteRegistration(method?: string): void {
  if (!isPixelAvailable()) return;
  
  // Dedupe: only fire once per session
  const SESSION_KEY = 'rd_complete_registration_fired';
  try {
    if (sessionStorage.getItem(SESSION_KEY)) {
      logRedditEvent('SignUp', { method }, '(skipped: already_fired_this_session)');
      return;
    }
    sessionStorage.setItem(SESSION_KEY, 'true');
  } catch {
    // sessionStorage may be unavailable in private mode - proceed anyway
  }
  
  // Use SignUp for registration completion (Reddit standard)
  trackReddit('SignUp', { method, registration_complete: true });
}

// TODO: AddToCart - Add when RSVP/booking flow starts
// TODO: Purchase - Add when payment success point is clearly identified
