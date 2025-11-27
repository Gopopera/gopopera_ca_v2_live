/**
 * Diagnostic utility to check why events aren't showing
 * Run this in the browser console to diagnose event loading issues
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function diagnoseEvents(): Promise<void> {
  console.log('[DIAGNOSE_EVENTS] Starting diagnostic...');
  
  const db = getDbSafe();
  if (!db) {
    console.error('[DIAGNOSE_EVENTS] ❌ Firestore not available');
    return;
  }
  
  try {
    // Get all events from Firestore
    const eventsCol = collection(db, 'events');
    const snapshot = await getDocs(eventsCol);
    
    console.log(`[DIAGNOSE_EVENTS] Found ${snapshot.docs.length} events in Firestore`);
    
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Untitled',
        city: data.city || 'Unknown',
        hostId: data.hostId || 'Unknown',
        isPublic: data.isPublic,
        isDraft: data.isDraft,
        price: data.price || 'Unknown',
        category: data.category || 'Unknown',
      };
    });
    
    console.log('[DIAGNOSE_EVENTS] All events:', events);
    
    // Check filtering
    const publicEvents = events.filter(e => e.isPublic !== false && e.isDraft !== true);
    const privateEvents = events.filter(e => e.isPublic === false);
    const draftEvents = events.filter(e => e.isDraft === true);
    
    console.log('[DIAGNOSE_EVENTS] Event breakdown:', {
      total: events.length,
      public: publicEvents.length,
      private: privateEvents.length,
      draft: draftEvents.length,
    });
    
    console.log('[DIAGNOSE_EVENTS] Public events (should be visible):', publicEvents);
    
    if (privateEvents.length > 0) {
      console.warn('[DIAGNOSE_EVENTS] ⚠️ Found private events:', privateEvents);
    }
    
    if (draftEvents.length > 0) {
      console.warn('[DIAGNOSE_EVENTS] ⚠️ Found draft events:', draftEvents);
    }
    
    // Check event store state
    const { useEventStore } = await import('../stores/eventStore');
    const storeState = useEventStore.getState();
    
    console.log('[DIAGNOSE_EVENTS] Event store state:', {
      eventsInStore: storeState.events.length,
      isLoading: storeState.isLoading,
      error: storeState.error,
      eventIds: storeState.events.map(e => e.id),
      eventTitles: storeState.events.map(e => e.title),
    });
    
    if (storeState.events.length === 0 && !storeState.isLoading) {
      console.error('[DIAGNOSE_EVENTS] ❌ Event store is empty but not loading!');
      console.error('[DIAGNOSE_EVENTS] Error:', storeState.error);
    }
    
    if (storeState.error) {
      console.error('[DIAGNOSE_EVENTS] ❌ Event store has error:', storeState.error);
    }
    
  } catch (error: any) {
    console.error('[DIAGNOSE_EVENTS] ❌ Error:', error);
    if (error?.code === 'permission-denied') {
      console.error('[DIAGNOSE_EVENTS] ❌ Permission denied - check Firestore security rules');
    }
  }
}

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).diagnoseEvents = diagnoseEvents;
  console.log('[DIAGNOSE_EVENTS] Available in console as: diagnoseEvents()');
}

