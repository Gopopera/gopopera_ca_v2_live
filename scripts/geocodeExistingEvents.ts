/**
 * Script to geocode existing events that don't have coordinates
 * Run this once to add lat/lng to all existing events
 * 
 * Usage: This can be run from the browser console or as a one-time migration script
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { geocodeAddress } from '../utils/geocoding';

interface EventDoc {
  id: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  title?: string;
}

/**
 * Geocode all events that don't have coordinates
 */
export async function geocodeExistingEvents(): Promise<{
  total: number;
  geocoded: number;
  failed: number;
  skipped: number;
}> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  console.log('[GEOCODE_EVENTS] Starting to geocode existing events...');

  // Get all events
  const eventsRef = collection(db, 'events');
  const snapshot = await getDocs(eventsRef);
  
  const events: EventDoc[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    events.push({
      id: doc.id,
      address: data.address,
      city: data.city,
      lat: data.lat,
      lng: data.lng,
      title: data.title,
    });
  });

  console.log(`[GEOCODE_EVENTS] Found ${events.length} total events`);

  let geocoded = 0;
  let failed = 0;
  let skipped = 0;

  // Process each event
  for (const event of events) {
    // Skip if already has coordinates
    if (event.lat && event.lng) {
      console.log(`[GEOCODE_EVENTS] Skipping ${event.title || event.id} - already has coordinates`);
      skipped++;
      continue;
    }

    // Skip if missing address or city
    if (!event.address || !event.city) {
      console.log(`[GEOCODE_EVENTS] Skipping ${event.title || event.id} - missing address or city`);
      skipped++;
      continue;
    }

    try {
      console.log(`[GEOCODE_EVENTS] Geocoding: ${event.address}, ${event.city}`);
      
      const result = await geocodeAddress(event.address, event.city);
      
      if (result) {
        // Update event in Firestore
        const eventRef = doc(db, 'events', event.id);
        await updateDoc(eventRef, {
          lat: result.lat,
          lng: result.lng,
        });

        console.log(`[GEOCODE_EVENTS] ✅ Successfully geocoded: ${event.title || event.id} -> (${result.lat}, ${result.lng})`);
        geocoded++;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.warn(`[GEOCODE_EVENTS] ⚠️ Failed to geocode: ${event.title || event.id}`);
        failed++;
      }
    } catch (error) {
      console.error(`[GEOCODE_EVENTS] ❌ Error geocoding ${event.title || event.id}:`, error);
      failed++;
    }
  }

  const summary = {
    total: events.length,
    geocoded,
    failed,
    skipped,
  };

  console.log('[GEOCODE_EVENTS] Summary:', summary);
  return summary;
}

/**
 * Run from browser console or as a one-time script
 * 
 * Example usage in browser console:
 * import { geocodeExistingEvents } from './scripts/geocodeExistingEvents';
 * geocodeExistingEvents().then(console.log);
 */
if (typeof window !== 'undefined') {
  // Make it available globally for browser console
  (window as any).geocodeExistingEvents = geocodeExistingEvents;
}

