/**
 * Utility to geocode all existing events that don't have coordinates
 * Can be called from browser console or as a one-time migration
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { geocodeAddress } from './geocoding';

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
 * @returns Summary of geocoding results
 */
export async function geocodeAllEvents(): Promise<{
  total: number;
  geocoded: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  console.log('[GEOCODE_ALL_EVENTS] Starting to geocode all existing events...');

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

  console.log(`[GEOCODE_ALL_EVENTS] Found ${events.length} total events`);

  let geocoded = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Process each event
  for (const event of events) {
    // Skip if already has coordinates
    if (event.lat && event.lng) {
      console.log(`[GEOCODE_ALL_EVENTS] ✓ ${event.title || event.id} - already has coordinates`);
      skipped++;
      continue;
    }

    // Skip if missing city (required for geocoding)
    if (!event.city) {
      console.log(`[GEOCODE_ALL_EVENTS] ⚠️ ${event.title || event.id} - missing city, skipping`);
      skipped++;
      continue;
    }

    // Use address if available, otherwise use city name
    const addressToGeocode = event.address || event.city.split(',')[0];
    const cityToGeocode = event.city;

    try {
      console.log(`[GEOCODE_ALL_EVENTS] Geocoding: "${addressToGeocode}", "${cityToGeocode}"`);
      
      const result = await geocodeAddress(addressToGeocode, cityToGeocode);
      
      if (result) {
        // Update event in Firestore
        const eventRef = doc(db, 'events', event.id);
        await updateDoc(eventRef, {
          lat: result.lat,
          lng: result.lng,
        });

        console.log(`[GEOCODE_ALL_EVENTS] ✅ ${event.title || event.id} -> (${result.lat}, ${result.lng})`);
        geocoded++;

        // Add a small delay to avoid rate limiting (200ms between requests)
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        const errorMsg = `Failed to geocode: ${event.title || event.id}`;
        console.warn(`[GEOCODE_ALL_EVENTS] ⚠️ ${errorMsg}`);
        errors.push(errorMsg);
        failed++;
      }
    } catch (error: any) {
      // Handle permission errors gracefully
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        const errorMsg = `Permission denied geocoding ${event.title || event.id}`;
        console.warn(`[GEOCODE_ALL_EVENTS] ⚠️ ${errorMsg}`);
        errors.push(errorMsg);
        failed++;
      } else {
        const errorMsg = `Error geocoding ${event.title || event.id}: ${error.message || error}`;
        console.error(`[GEOCODE_ALL_EVENTS] ❌ ${errorMsg}`);
        errors.push(errorMsg);
        failed++;
      }
    }
  }

  const summary = {
    total: events.length,
    geocoded,
    failed,
    skipped,
    errors,
  };

  console.log('[GEOCODE_ALL_EVENTS] Summary:', summary);
  return summary;
}

/**
 * Make it available globally for browser console usage
 */
if (typeof window !== 'undefined') {
  (window as any).geocodeAllEvents = geocodeAllEvents;
  console.log('[GEOCODE_ALL_EVENTS] Available in console as: geocodeAllEvents()');
}

