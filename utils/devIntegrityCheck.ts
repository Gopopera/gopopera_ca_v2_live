/**
 * DEV ONLY: Integrity check utilities for detecting data consistency issues
 * These checks only run in development/staging environments
 */

import { Event } from '../types';
import { filterEventsByHost } from './eventQueryHelpers';

/**
 * DEV ONLY: Check for data consistency between Explore and Host Profile
 * Logs a warning if the events shown would differ between the two views
 * 
 * This helps detect bugs like the one where Host Profile showed 0 events
 * while Explore showed 2 for the same host (due to extra filtering)
 * 
 * @param allEvents - All events available (from eventStore)
 * @param hostId - Host's user ID
 * @param hostName - Host's display name
 * @param componentName - Name of the component calling this check (for logging)
 */
export function checkHostEventConsistency(
  allEvents: Event[],
  hostId: string | null | undefined,
  hostName: string,
  componentName: string
): void {
  // Only run in development
  if (!import.meta.env.DEV) return;
  
  // Get events that would show in Explore for this host (simple matching)
  const exploreEvents = allEvents.filter(e => 
    e.hostId === hostId || e.hostName === hostName || e.host === hostName
  );
  
  // Get events using the shared helper (what Host Profile should use)
  const profileEvents = filterEventsByHost(allEvents, hostId, hostName);
  
  // Compare counts
  if (exploreEvents.length !== profileEvents.length) {
    console.warn(`[INTEGRITY_CHECK] ⚠️ Event count mismatch for host "${hostName}"!`, {
      component: componentName,
      hostId,
      exploreCount: exploreEvents.length,
      profileCount: profileEvents.length,
      exploreTitles: exploreEvents.map(e => e.title),
      profileTitles: profileEvents.map(e => e.title),
      hint: 'Host Profile and Explore should show the same events for a host'
    });
  }
  
  // Check for events in one list but not the other
  const exploreIds = new Set(exploreEvents.map(e => e.id));
  const profileIds = new Set(profileEvents.map(e => e.id));
  
  const onlyInExplore = exploreEvents.filter(e => !profileIds.has(e.id));
  const onlyInProfile = profileEvents.filter(e => !exploreIds.has(e.id));
  
  if (onlyInExplore.length > 0) {
    console.warn(`[INTEGRITY_CHECK] ⚠️ Events in Explore but NOT in Host Profile:`, {
      component: componentName,
      hostName,
      events: onlyInExplore.map(e => ({ id: e.id, title: e.title }))
    });
  }
  
  if (onlyInProfile.length > 0) {
    console.warn(`[INTEGRITY_CHECK] ⚠️ Events in Host Profile but NOT in Explore:`, {
      component: componentName,
      hostName,
      events: onlyInProfile.map(e => ({ id: e.id, title: e.title }))
    });
  }
}

/**
 * DEV ONLY: Log event filtering diagnostics
 * Useful for debugging why events may or may not appear
 * 
 * @param events - Events being filtered
 * @param context - Description of what's being checked
 */
export function logEventDiagnostics(
  events: Event[],
  context: string
): void {
  if (!import.meta.env.DEV) return;
  
  console.log(`[EVENT_DIAGNOSTICS] ${context}:`, {
    count: events.length,
    events: events.map(e => ({
      id: e.id,
      title: e.title,
      hostId: e.hostId,
      hostName: e.hostName || e.host,
      isDemo: e.isDemo,
      isDraft: e.isDraft,
      isOfficialLaunch: e.isOfficialLaunch,
      demoType: e.demoType,
    }))
  });
}

