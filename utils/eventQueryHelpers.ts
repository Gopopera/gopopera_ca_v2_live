/**
 * Shared event query helpers - single source of truth for event filtering
 * Ensures consistency between Explore page and Host Profile page
 */

import { Event } from '../types';

/**
 * Filter events by host - single source of truth
 * Used by both Explore (when filtering by host) and Host Profile page
 * 
 * @param events - Array of events to filter
 * @param hostId - Host's user ID (primary match)
 * @param hostName - Host's display name (fallback match)
 * @returns Events belonging to the specified host
 */
export function filterEventsByHost(
  events: Event[],
  hostId: string | null | undefined,
  hostName: string
): Event[] {
  return events.filter(e => {
    // Primary: Match by hostId if available (most reliable)
    if (hostId && e.hostId) {
      return e.hostId === hostId;
    }
    // Fallback: Match by hostName or host field (backward compatibility)
    return e.hostName === hostName || e.host === hostName;
  });
}

/**
 * Check if an event should be visible (not private, not draft)
 * This mirrors the logic in eventStore.ts for consistency
 * 
 * @param event - Event to check
 * @returns true if event should be visible
 */
export function isEventVisible(event: Event): boolean {
  // Events are visible unless explicitly marked otherwise
  const isExplicitlyPrivate = (event as any).isPublic === false;
  const isExplicitlyDraft = event.isDraft === true;
  return !isExplicitlyPrivate && !isExplicitlyDraft;
}

/**
 * Get public, non-draft events from a list
 * 
 * @param events - Array of events to filter
 * @returns Only visible events
 */
export function getVisibleEvents(events: Event[]): Event[] {
  return events.filter(isEventVisible);
}

