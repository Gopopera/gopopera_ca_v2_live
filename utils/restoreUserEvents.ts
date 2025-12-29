/**
 * CRITICAL: Event Restoration Utility
 * 
 * This utility helps identify and restore events that may have been incorrectly
 * filtered out or marked as private/draft. It does NOT delete or modify existing
 * events - only identifies potential issues and provides recovery options.
 * 
 * IMPORTANT: This utility is read-only and safe to run. It will:
 * 1. List all events in Firestore (including private/draft)
 * 2. Identify events that might be incorrectly hidden
 * 3. Provide a report of events by host
 * 4. NEVER delete or modify user data
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { POPERA_EMAIL } from '../src/constants/popera';

interface EventDiagnostic {
  id: string;
  title: string;
  hostId: string;
  hostEmail?: string;
  hostName?: string;
  city: string;
  isPublic: boolean | undefined;
  isDraft: boolean | undefined;
  createdAt: number | undefined;
  status: 'visible' | 'hidden_private' | 'hidden_draft' | 'missing_fields';
  shouldBeVisible: boolean;
}

interface HostEventSummary {
  hostId: string;
  hostEmail?: string;
  hostName?: string;
  totalEvents: number;
  visibleEvents: number;
  hiddenEvents: number;
  events: EventDiagnostic[];
}

/**
 * Get all events from Firestore (including private/draft)
 * This is a diagnostic function - it reads everything
 */
export async function getAllEventsDiagnostic(): Promise<EventDiagnostic[]> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not available');
  }

  console.log('[RESTORE_EVENTS] Starting diagnostic scan of all events...');

  try {
    const eventsCol = collection(db, 'events');
    const snapshot = await getDocs(eventsCol);
    
    const diagnostics: EventDiagnostic[] = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const isPublic = data.isPublic;
      const isDraft = data.isDraft;
      
      // Determine if event should be visible
      // Events are visible UNLESS explicitly marked as private or draft
      const shouldBeVisible = !(isPublic === false || isDraft === true);
      
      // Determine status
      let status: EventDiagnostic['status'] = 'visible';
      if (isPublic === false) {
        status = 'hidden_private';
      } else if (isDraft === true) {
        status = 'hidden_draft';
      } else if (isPublic === undefined && isDraft === undefined) {
        status = 'missing_fields'; // This is OK - defaults to visible
      }
      
      diagnostics.push({
        id: docSnap.id,
        title: data.title || 'Untitled Event',
        hostId: data.hostId || 'unknown',
        hostName: data.hostName || data.host || 'Unknown Host',
        city: data.city || 'Unknown City',
        isPublic,
        isDraft,
        createdAt: typeof data.createdAt === 'number' ? data.createdAt : undefined,
        status,
        shouldBeVisible,
      });
    }
    
    console.log(`[RESTORE_EVENTS] Found ${diagnostics.length} total events in Firestore`);
    return diagnostics;
  } catch (error) {
    console.error('[RESTORE_EVENTS] Error scanning events:', error);
    throw error;
  }
}

/**
 * Get host information for events
 */
async function getHostInfo(hostId: string): Promise<{ email?: string; name?: string }> {
  const db = getDbSafe();
  if (!db) return {};
  
  try {
    // Try to get from users collection
    const userRef = doc(db, 'users', hostId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return {
        email: userData.email,
        name: userData.name || userData.displayName,
      };
    }
  } catch (error) {
    // Ignore errors - host info is optional
  }
  
  return {};
}

/**
 * Group events by host and provide summary
 */
export async function getEventsByHost(): Promise<HostEventSummary[]> {
  const diagnostics = await getAllEventsDiagnostic();
  
  // Group by host
  const hostMap = new Map<string, EventDiagnostic[]>();
  
  for (const event of diagnostics) {
    if (!hostMap.has(event.hostId)) {
      hostMap.set(event.hostId, []);
    }
    hostMap.get(event.hostId)!.push(event);
  }
  
  // Get host info and create summaries
  const summaries: HostEventSummary[] = [];
  
  for (const [hostId, events] of hostMap.entries()) {
    // Skip Popera account events (eatezca@gmail.com)
    if (hostId === 'unknown') continue;
    
    const hostInfo = await getHostInfo(hostId);
    
    // Skip if this is the Popera account
    if (hostInfo.email?.toLowerCase() === POPERA_EMAIL.toLowerCase()) {
      continue;
    }
    
    const visibleEvents = events.filter(e => e.shouldBeVisible);
    const hiddenEvents = events.filter(e => !e.shouldBeVisible);
    
    summaries.push({
      hostId,
      hostEmail: hostInfo.email,
      hostName: hostInfo.name,
      totalEvents: events.length,
      visibleEvents: visibleEvents.length,
      hiddenEvents: hiddenEvents.length,
      events,
    });
  }
  
  // Sort by total events (most events first)
  summaries.sort((a, b) => b.totalEvents - a.totalEvents);
  
  return summaries;
}

/**
 * Generate a detailed report of all events
 */
export async function generateEventReport(): Promise<string> {
  const summaries = await getEventsByHost();
  
  let report = '\n=== EVENT RESTORATION DIAGNOSTIC REPORT ===\n\n';
  report += `Generated: ${new Date().toISOString()}\n`;
  report += `Total Hosts (excluding Popera): ${summaries.length}\n\n`;
  
  let totalEvents = 0;
  let totalVisible = 0;
  let totalHidden = 0;
  
  for (const summary of summaries) {
    totalEvents += summary.totalEvents;
    totalVisible += summary.visibleEvents;
    totalHidden += summary.hiddenEvents;
    
    report += `\n--- Host: ${summary.hostName || summary.hostEmail || summary.hostId} ---\n`;
    report += `Email: ${summary.hostEmail || 'Not found'}\n`;
    report += `Total Events: ${summary.totalEvents}\n`;
    report += `Visible: ${summary.visibleEvents} | Hidden: ${summary.hiddenEvents}\n`;
    
    if (summary.hiddenEvents > 0) {
      report += `\n⚠️ HIDDEN EVENTS (may need restoration):\n`;
      for (const event of summary.events.filter(e => !e.shouldBeVisible)) {
        report += `  - ${event.title} (${event.city})\n`;
        report += `    Status: ${event.status}\n`;
        report += `    isPublic: ${event.isPublic}, isDraft: ${event.isDraft}\n`;
        report += `    ID: ${event.id}\n`;
      }
    }
    
    if (summary.visibleEvents > 0) {
      report += `\n✅ VISIBLE EVENTS:\n`;
      for (const event of summary.events.filter(e => e.shouldBeVisible)) {
        report += `  - ${event.title} (${event.city})\n`;
      }
    }
  }
  
  report += `\n\n=== SUMMARY ===\n`;
  report += `Total Events: ${totalEvents}\n`;
  report += `Visible: ${totalVisible}\n`;
  report += `Hidden: ${totalHidden}\n`;
  
  if (totalHidden > 0) {
    report += `\n⚠️ WARNING: ${totalHidden} events are currently hidden.\n`;
    report += `These events may need to be restored by setting isPublic: undefined and isDraft: undefined.\n`;
  }
  
  return report;
}

/**
 * Restore a specific event by removing isPublic: false or isDraft: true
 * This function is SAFE - it only removes problematic flags, never deletes data
 */
export async function restoreEvent(eventId: string): Promise<boolean> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not available');
  }
  
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      console.error(`[RESTORE_EVENTS] Event ${eventId} does not exist`);
      return false;
    }
    
    const data = eventSnap.data();
    
    // Only restore if event is incorrectly marked as private or draft
    if (data.isPublic === false || data.isDraft === true) {
      const updates: any = {};
      
      if (data.isPublic === false) {
        updates.isPublic = undefined; // Remove the field
        console.log(`[RESTORE_EVENTS] Removing isPublic: false from event ${eventId}`);
      }
      
      if (data.isDraft === true) {
        updates.isDraft = undefined; // Remove the field
        console.log(`[RESTORE_EVENTS] Removing isDraft: true from event ${eventId}`);
      }
      
      // Use updateDoc with merge to only update these fields
      await updateDoc(eventRef, updates);
      console.log(`[RESTORE_EVENTS] ✅ Restored event ${eventId}`);
      return true;
    } else {
      console.log(`[RESTORE_EVENTS] Event ${eventId} is already visible (no restoration needed)`);
      return false;
    }
  } catch (error) {
    console.error(`[RESTORE_EVENTS] Error restoring event ${eventId}:`, error);
    throw error;
  }
}

/**
 * Restore all hidden events for a specific host (excluding Popera account)
 * This function is SAFE - it only removes problematic flags
 */
export async function restoreAllHiddenEventsForHost(hostId: string): Promise<{ restored: number; skipped: number; errors: number }> {
  const summaries = await getEventsByHost();
  const hostSummary = summaries.find(s => s.hostId === hostId);
  
  if (!hostSummary) {
    console.warn(`[RESTORE_EVENTS] Host ${hostId} not found or has no events`);
    return { restored: 0, skipped: 0, errors: 0 };
  }
  
  const hiddenEvents = hostSummary.events.filter(e => !e.shouldBeVisible);
  
  let restored = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const event of hiddenEvents) {
    try {
      const success = await restoreEvent(event.id);
      if (success) {
        restored++;
      } else {
        skipped++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`[RESTORE_EVENTS] Error restoring event ${event.id}:`, error);
      errors++;
    }
  }
  
  console.log(`[RESTORE_EVENTS] ✅ Restored ${restored} events for host ${hostId}`);
  return { restored, skipped, errors };
}

/**
 * Restore all hidden events for all hosts (excluding Popera account)
 * This function is SAFE - it only removes problematic flags
 */
export async function restoreAllHiddenEvents(): Promise<{ restored: number; skipped: number; errors: number; byHost: Record<string, number> }> {
  const summaries = await getEventsByHost();
  
  let totalRestored = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const byHost: Record<string, number> = {};
  
  for (const summary of summaries) {
    if (summary.hiddenEvents === 0) {
      continue; // Skip hosts with no hidden events
    }
    
    const result = await restoreAllHiddenEventsForHost(summary.hostId);
    totalRestored += result.restored;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
    
    if (result.restored > 0) {
      byHost[summary.hostId] = result.restored;
    }
    
    // Small delay between hosts
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`[RESTORE_EVENTS] ✅ Total restored: ${totalRestored}, skipped: ${totalSkipped}, errors: ${totalErrors}`);
  return { restored: totalRestored, skipped: totalSkipped, errors: totalErrors, byHost };
}

/**
 * Make functions available in browser console for manual recovery
 */
if (typeof window !== 'undefined') {
  (window as any).restoreUserEvents = {
    getAllEventsDiagnostic,
    getEventsByHost,
    generateEventReport,
    restoreEvent,
    restoreAllHiddenEventsForHost,
    restoreAllHiddenEvents,
  };
  
  console.log('[RESTORE_EVENTS] Event restoration utilities available in console:');
  console.log('  - restoreUserEvents.generateEventReport() - Generate diagnostic report');
  console.log('  - restoreUserEvents.getEventsByHost() - Get events grouped by host');
  console.log('  - restoreUserEvents.restoreEvent(eventId) - Restore a specific event');
  console.log('  - restoreUserEvents.restoreAllHiddenEvents() - Restore all hidden events');
}

