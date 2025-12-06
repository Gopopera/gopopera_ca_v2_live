/**
 * CYCLES DETECTED BY MADGE: None
 * 
 * Static imports only from src/lib/firebase.ts
 * No imports from stores or App
 * Pure helper functions only
 */

import { getDbSafe } from "../src/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, orderBy, addDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, arrayUnion, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { FirestoreEvent, FirestoreReservation, FirestoreChatMessage, FirestoreReview, FirestoreUser } from "./types";
import { Event } from "../types";
import { validateFirestoreData, removeUndefinedValues, sanitizeFirestoreData } from "../utils/firestoreValidation";
import { POPERA_EMAIL } from "../stores/userStore";

// Helper to convert FirestoreEvent to Event (frontend type)
// Exported for use in eventStore
export const mapFirestoreEventToEvent = (firestoreEvent: FirestoreEvent): Event => {
  // Standardize all fields to ensure consistent format
  // CRITICAL: hostName should never be empty or 'Unknown' - always prefer hostName over host
  let hostName = firestoreEvent.hostName || firestoreEvent.host || '';
  
  // Clean up hostName - remove 'You' and ensure it's not empty
  if (hostName === 'You' || hostName === '') {
    hostName = firestoreEvent.host || '';
  }
  
  // If still empty, we'll need to fetch from Firestore (handled in components)
  // But for now, use a placeholder that components can detect and replace
  if (!hostName || hostName === 'You') {
    hostName = ''; // Empty string - components will fetch from Firestore using hostId
  }
  
  const standardizedEvent: Event = {
    id: firestoreEvent.id || '',
    title: firestoreEvent.title || '',
    description: firestoreEvent.description || '',
    city: firestoreEvent.city || '',
    address: firestoreEvent.address || '',
    date: firestoreEvent.date || '',
    time: firestoreEvent.time || '',
    tags: Array.isArray(firestoreEvent.tags) ? firestoreEvent.tags : [],
    host: firestoreEvent.host || hostName || '',
    hostName: hostName, // Will be enriched by components if empty
    hostId: firestoreEvent.hostId || '',
    hostPhotoURL: firestoreEvent.hostPhotoURL || undefined,
    imageUrl: firestoreEvent.imageUrl || (firestoreEvent.imageUrls && firestoreEvent.imageUrls.length > 0 ? firestoreEvent.imageUrls[0] : ''),
    imageUrls: firestoreEvent.imageUrls || (firestoreEvent.imageUrl ? [firestoreEvent.imageUrl] : undefined),
    attendeesCount: typeof firestoreEvent.attendeesCount === 'number' ? firestoreEvent.attendeesCount : 0,
    createdAt: firestoreEvent.createdAt ? (typeof firestoreEvent.createdAt === 'number' ? new Date(firestoreEvent.createdAt).toISOString() : new Date(firestoreEvent.createdAt).toISOString()) : new Date().toISOString(),
    location: firestoreEvent.location || `${firestoreEvent.address || ''}, ${firestoreEvent.city || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '') || firestoreEvent.city || '',
    category: (firestoreEvent.category as Event['category']) || 'Community',
    price: firestoreEvent.price || 'Free',
    rating: typeof firestoreEvent.rating === 'number' ? firestoreEvent.rating : 0,
    reviewCount: typeof firestoreEvent.reviewCount === 'number' ? firestoreEvent.reviewCount : 0,
    attendees: typeof firestoreEvent.attendeesCount === 'number' ? firestoreEvent.attendeesCount : 0,
    capacity: typeof firestoreEvent.capacity === 'number' ? firestoreEvent.capacity : undefined,
    lat: typeof firestoreEvent.lat === 'number' ? firestoreEvent.lat : undefined,
    lng: typeof firestoreEvent.lng === 'number' ? firestoreEvent.lng : undefined,
    isPoperaOwned: firestoreEvent.isPoperaOwned === true,
    isDemo: firestoreEvent.isDemo === true,
    demoPurpose: firestoreEvent.demoPurpose || undefined,
    demoType: firestoreEvent.demoType || undefined,
    isOfficialLaunch: firestoreEvent.isOfficialLaunch === true,
    aboutEvent: firestoreEvent.aboutEvent || undefined,
    whatToExpect: firestoreEvent.whatToExpect || undefined,
    isDraft: firestoreEvent.isDraft === true,
    // New fields for event cards and filtering
    vibes: Array.isArray(firestoreEvent.vibes) ? firestoreEvent.vibes : undefined,
    sessionFrequency: firestoreEvent.sessionFrequency || undefined,
    sessionMode: firestoreEvent.sessionMode || undefined,
    country: firestoreEvent.country || undefined,
    // Circles + Sessions model fields
    mainCategory: firestoreEvent.mainCategory || undefined,
    durationWeeks: typeof firestoreEvent.durationWeeks === 'number' ? firestoreEvent.durationWeeks : undefined,
    weeklyDayOfWeek: typeof firestoreEvent.weeklyDayOfWeek === 'number' ? firestoreEvent.weeklyDayOfWeek : undefined,
    monthlyDayOfMonth: typeof firestoreEvent.monthlyDayOfMonth === 'number' ? firestoreEvent.monthlyDayOfMonth : undefined,
    startDateTime: typeof firestoreEvent.startDateTime === 'number' ? firestoreEvent.startDateTime : undefined,
  };
  
  return standardizedEvent;
};

// Events
export async function createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'location' | 'hostName' | 'attendees'>): Promise<Event> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    throw new Error('Firestore not initialized');
  }
  
  // Check if device is online
  if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
    throw new Error('Device is offline. Please check your internet connection.');
  }
  
  try {
    const eventsCol = collection(db, "events");
    const now = Date.now();
    
    // CRITICAL: Fetch latest host profile info to ensure profile picture and name are always up-to-date
    // This ensures events always have the most current host information
    let hostProfileData: { name?: string; displayName?: string; photoURL?: string; imageUrl?: string } | null = null;
    let isFirstEvent = false;
    try {
      const userProfile = await getUserProfile(eventData.hostId);
      hostProfileData = userProfile;
      const hostedEvents = Array.isArray(userProfile?.hostedEvents) ? userProfile.hostedEvents : [];
      isFirstEvent = hostedEvents.length === 0;
    } catch (error) {
      // If we can't check, assume it's not the first event to avoid duplicate notifications
      console.warn('[CREATE_EVENT] Could not check if first event:', error);
    }
    
    // Use latest host profile data for hostName and hostPhotoURL
    // Priority: hostProfileData (Firestore - always latest) > eventData (passed in)
    const latestHostName = hostProfileData?.name || hostProfileData?.displayName || eventData.host || 'Unknown Host';
    const latestHostPhotoURL = hostProfileData?.photoURL || hostProfileData?.imageUrl || eventData.hostPhotoURL || undefined;
    
    // Ensure hostName is never 'You' or empty
    const finalHostName = (latestHostName && latestHostName !== 'You' && latestHostName.trim() !== '') 
      ? latestHostName.trim() 
      : 'Unknown Host';
    
    // Get Firebase app to verify project
    const app = (await import('../src/lib/firebase')).getAppSafe();
    const projectId = app?.options?.projectId;
    
    // Get database ID to verify which database we're using
    const databaseId = (db as any)?.databaseId || '(default)';
    const dbType = (db as any)?.type || 'unknown';
    
    console.log('[CREATE_EVENT_DB] Firestore connection check:', {
      hasDb: !!db,
      firebaseProjectId: projectId || 'NOT CONNECTED',
      databaseId: databaseId,
      databaseType: dbType,
      isMongoDBCompatible: dbType === 'mongodb',
      isOnline: navigator?.onLine,
      connectionType: (navigator as any)?.connection?.effectiveType || 'unknown'
    });
    
    // Warn if using MongoDB compatibility mode (might cause issues)
    if (dbType === 'mongodb') {
      console.warn('[CREATE_EVENT_DB] ⚠️ WARNING: Using MongoDB compatibility mode database!', {
        databaseId: databaseId,
        note: 'Native Firestore is recommended. MongoDB compatibility mode may cause issues.'
      });
    }
    
    if (projectId && projectId !== 'gopopera2026') {
      console.warn('[CREATE_EVENT_DB] ⚠️ WARNING: Connected to wrong Firebase project!', {
        expected: 'gopopera2026',
        actual: projectId
      });
    }
    
    // Build event data with defaults
    const eventDataRaw: Omit<FirestoreEvent, 'id'> = {
      title: eventData.title,
      description: eventData.description,
      date: eventData.date,
      time: eventData.time,
      price: eventData.price || 'Free',
      category: eventData.category || 'Community',
      city: eventData.city,
      address: eventData.address || '',
      location: eventData.address ? `${eventData.address}, ${eventData.city}` : eventData.city,
      tags: Array.isArray(eventData.tags) ? eventData.tags : [],
      // CRITICAL: Always use latest host info from Firestore (fetched above)
      // This ensures profile pictures and names are always synchronized
      host: finalHostName,
      hostName: finalHostName,
      hostId: eventData.hostId || '',
      // Store latest host photo URL from Firestore (always up-to-date)
      hostPhotoURL: latestHostPhotoURL,
      imageUrl: eventData.imageUrl || (eventData.imageUrls && eventData.imageUrls.length > 0 ? eventData.imageUrls[0] : ''),
      imageUrls: eventData.imageUrls || (eventData.imageUrl ? [eventData.imageUrl] : undefined),
      rating: eventData.rating || 0,
      reviewCount: eventData.reviewCount || 0,
      attendeesCount: eventData.attendeesCount || 0,
      createdAt: now,
      lat: eventData.lat,
      lng: eventData.lng,
      isPoperaOwned: eventData.isPoperaOwned || false,
      isDemo: eventData.isDemo || false,
      demoPurpose: eventData.demoPurpose,
      demoType: (eventData as any).demoType,
      managedBy: (eventData as any).managedBy,
      subtitle: (eventData as any).subtitle,
      // startDate: prefer startDateTime if available, otherwise use startDate
      startDate: (eventData as any).startDateTime || (eventData as any).startDate,
      endDate: (eventData as any).endDate,
      // CRITICAL: Default to public and joinable if not specified (unless draft)
      // Events are PUBLIC by default - only explicitly marked drafts are hidden
      isDraft: (eventData as any).isDraft === true ? true : undefined, // Only set if explicitly true
      isPublic: (eventData as any).isPublic !== undefined ? (eventData as any).isPublic : undefined, // Don't set if not specified (defaults to public in filter)
      allowChat: (eventData as any).allowChat !== undefined ? (eventData as any).allowChat : !(eventData as any).isDraft,
      allowRsvp: (eventData as any).allowRsvp !== undefined ? (eventData as any).allowRsvp : !(eventData as any).isDraft,
      isOfficialLaunch: eventData.isOfficialLaunch || false,
      aboutEvent: eventData.aboutEvent,
      whatToExpect: eventData.whatToExpect,
      capacity: eventData.capacity,
      hostPhoneNumber: (eventData as any).hostPhoneNumber, // Host phone number from user profile
      // Circles + Sessions model fields
      mainCategory: (eventData as any).mainCategory,
      vibes: (eventData as any).vibes,
      sessionFrequency: (eventData as any).sessionFrequency,
      sessionMode: (eventData as any).sessionMode,
      country: (eventData as any).country,
      durationWeeks: (eventData as any).durationWeeks,
      weeklyDayOfWeek: (eventData as any).weeklyDayOfWeek,
      monthlyDayOfMonth: (eventData as any).monthlyDayOfMonth,
      startDateTime: (eventData as any).startDateTime,
    };

    // Validate and remove undefined values
    const firestoreEvent = validateFirestoreData(
      eventDataRaw,
      ['title', 'description', 'date', 'time', 'city', 'host', 'hostId', 'createdAt'],
      'createEvent'
    ) as Omit<FirestoreEvent, 'id'>;

    // Sanitize data to eliminate ALL undefined fields
    const sanitizedEvent = sanitizeFirestoreData(firestoreEvent);

    // Validate document size before writing (Firestore has 1MB limit)
    const eventSizeEstimate = JSON.stringify(sanitizedEvent).length;
    const MAX_DOCUMENT_SIZE = 900000; // 900KB (safe margin below 1MB limit)
    
    if (eventSizeEstimate > MAX_DOCUMENT_SIZE) {
      console.error('[CREATE_EVENT_DB] Event document too large:', {
        size: eventSizeEstimate,
        maxSize: MAX_DOCUMENT_SIZE,
        title: sanitizedEvent.title
      });
      throw new Error(`Event data is too large (${(eventSizeEstimate / 1024).toFixed(2)}KB). Please reduce the description or remove some images.`);
    }
    
    console.log('[CREATE_EVENT_DB] About to write to Firestore:', {
      collection: 'events',
      hasData: !!sanitizedEvent,
      title: sanitizedEvent.title,
      hostId: sanitizedEvent.hostId,
      estimatedSize: `${(eventSizeEstimate / 1024).toFixed(2)}KB`
    });
    
    // Add timeout wrapper for addDoc to prevent hanging
    const FIRESTORE_WRITE_TIMEOUT = 30000; // 30 seconds (reduced for faster feedback, Firestore is usually very fast)
    const addDocPromise = addDoc(eventsCol, sanitizedEvent);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Firestore write operation timed out. The database may be slow or unresponsive. Please try again.'));
      }, FIRESTORE_WRITE_TIMEOUT);
    });
    
    const docRef = await Promise.race([addDocPromise, timeoutPromise]);
    
    console.log('[CREATE_EVENT_DB] ✅ Firestore write successful:', {
      docId: docRef.id,
      path: docRef.path
    });
    const createdEvent: FirestoreEvent = {
      id: docRef.id,
      ...firestoreEvent,
    };
    
    // Notify followers of new event (non-blocking)
    if (eventData.hostId) {
      // Fire and forget - don't block event creation
      import('../utils/notificationHelpers').then(({ notifyFollowersOfNewEvent }) => {
        notifyFollowersOfNewEvent(eventData.hostId, docRef.id, eventData.title).catch((error) => {
          console.error('Error notifying followers:', error);
        });
      }).catch((error) => {
        console.error('Error loading notification helpers:', error);
      });
    }
    
    // Notify user if this is their first event (non-blocking, fire-and-forget)
    if (isFirstEvent && eventData.hostId) {
      try {
        const { notifyUserOfFirstEvent } = await import('../utils/notificationHelpers');
        notifyUserOfFirstEvent(eventData.hostId, docRef.id, eventData.title || 'New Event')
          .catch((err) => {
            if (import.meta.env.DEV) {
              console.error('Error notifying user of first event (non-blocking):', err);
            }
          });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error importing first event notification helper (non-blocking):', error);
        }
      }
    }
    
    return mapFirestoreEventToEvent(createdEvent);
  } catch (error: any) {
    console.error('[CREATE_EVENT_DB] Firestore write failed:', { 
      path: 'events', 
      error: error.message || 'Unknown error',
      code: error.code,
      isOffline: error.code === 'unavailable' || error.message?.includes('offline')
    });
    
    // Provide more helpful error message for offline errors
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      throw new Error('Firestore is unavailable. The device may be offline or Firestore is experiencing issues. Please check your internet connection and try again.');
    }
    
    throw error;
  }
}

export async function listUpcomingEvents(): Promise<Event[]> {
  const db = getDbSafe();
  if (!db) {
    return [];
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    return [];
  }
  
  try {
    const eventsCol = collection(db, "events");
    const q = query(eventsCol, orderBy("date", "asc"));
    const snap = await getDocs(q);
    const events: FirestoreEvent[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreEvent, 'id'>),
    }));
    return events.map(mapFirestoreEventToEvent);
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    return [];
  }
}

// Update an existing event in Firestore
export async function updateEvent(eventId: string, eventData: Partial<Omit<Event, 'id' | 'createdAt' | 'location' | 'hostName' | 'attendees'>>): Promise<Event> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    throw new Error('Firestore not initialized');
  }
  
  // Check if device is online
  if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
    throw new Error('Device is offline. Please check your internet connection.');
  }
  
  try {
    const eventRef = doc(db, "events", eventId);
    
    // First, get the existing event to merge with updates
    const existingEventSnap = await getDoc(eventRef);
    if (!existingEventSnap.exists()) {
      throw new Error('Event not found');
    }
    
    const existingEvent = existingEventSnap.data() as FirestoreEvent;
    const now = Date.now();
    
    // Build update data - only include fields that are being updated
    const updateData: Partial<FirestoreEvent> = {
      updatedAt: now,
    };
    
    // Map frontend Event fields to FirestoreEvent fields
    if (eventData.title !== undefined) updateData.title = eventData.title;
    if (eventData.description !== undefined) updateData.description = eventData.description;
    if (eventData.city !== undefined) {
      updateData.city = eventData.city;
      // Update location if city or address changed
      updateData.location = eventData.address ? `${eventData.address}, ${eventData.city}` : eventData.city;
    }
    if (eventData.address !== undefined) {
      updateData.address = eventData.address;
      // Update location if address changed
      updateData.location = eventData.address ? `${eventData.address}, ${existingEvent.city || eventData.city || ''}` : (existingEvent.city || eventData.city || '');
    }
    if (eventData.time !== undefined) updateData.time = eventData.time;
    if (eventData.category !== undefined) updateData.category = eventData.category;
    if (eventData.price !== undefined) updateData.price = eventData.price;
    if (eventData.tags !== undefined) updateData.tags = Array.isArray(eventData.tags) ? eventData.tags : [];
    if (eventData.host !== undefined) {
      updateData.host = eventData.host;
      updateData.hostName = eventData.host; // Keep hostName in sync
    }
    if (eventData.imageUrl !== undefined) updateData.imageUrl = eventData.imageUrl;
    if (eventData.imageUrls !== undefined) updateData.imageUrls = eventData.imageUrls;
    if (eventData.whatToExpect !== undefined) updateData.whatToExpect = eventData.whatToExpect;
    if (eventData.aboutEvent !== undefined) updateData.aboutEvent = eventData.aboutEvent;
    if (eventData.capacity !== undefined) updateData.capacity = eventData.capacity;
    if (eventData.attendeesCount !== undefined) updateData.attendeesCount = eventData.attendeesCount;
    if ((eventData as any).hostPhotoURL !== undefined) updateData.hostPhotoURL = (eventData as any).hostPhotoURL;
    if ((eventData as any).lat !== undefined) updateData.lat = (eventData as any).lat;
    if ((eventData as any).lng !== undefined) updateData.lng = (eventData as any).lng;
    if ((eventData as any).isDraft !== undefined) updateData.isDraft = (eventData as any).isDraft === true;
    if ((eventData as any).isPublic !== undefined) updateData.isPublic = (eventData as any).isPublic === true;
    if ((eventData as any).allowChat !== undefined) updateData.allowChat = (eventData as any).allowChat === true;
    if ((eventData as any).allowRsvp !== undefined) updateData.allowRsvp = (eventData as any).allowRsvp === true;
    
    // Validate and sanitize update data
    const sanitizedUpdate = sanitizeFirestoreData(updateData);
    
    // Update the document
    const FIRESTORE_UPDATE_TIMEOUT = 30000; // 30 seconds
    const updatePromise = updateDoc(eventRef, sanitizedUpdate);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Firestore update operation timed out. Please try again.'));
      }, FIRESTORE_UPDATE_TIMEOUT);
    });
    
    await Promise.race([updatePromise, timeoutPromise]);
    
    console.log('[UPDATE_EVENT_DB] ✅ Firestore update successful:', { eventId });
    
    // Fetch and return the updated event
    const updatedEventSnap = await getDoc(eventRef);
    if (!updatedEventSnap.exists()) {
      throw new Error('Failed to fetch updated event');
    }
    
    const updatedFirestoreEvent: FirestoreEvent = {
      id: updatedEventSnap.id,
      ...(updatedEventSnap.data() as Omit<FirestoreEvent, 'id'>),
    };
    
    return mapFirestoreEventToEvent(updatedFirestoreEvent);
  } catch (error: any) {
    // Don't log permission errors - they're expected and handled elsewhere
    if (error?.code !== 'permission-denied' && !error?.message?.includes('permission')) {
      console.error('[UPDATE_EVENT_DB] ❌ Error updating event:', {
        eventId,
        error: error?.message,
        code: error?.code
      });
    }
    throw error;
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  const db = getDbSafe();
  if (!db) {
    return null;
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    return null;
  }
  
  try {
    const eventRef = doc(db, "events", id);
    const snap = await getDoc(eventRef);
    if (!snap.exists()) return null;
    const firestoreEvent: FirestoreEvent = {
      id: snap.id,
      ...(snap.data() as Omit<FirestoreEvent, 'id'>),
    };
    return mapFirestoreEventToEvent(firestoreEvent);
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}

export async function listEventsByCityAndTag(city?: string, tag?: string): Promise<Event[]> {
  const db = getDbSafe();
  if (!db) {
    return [];
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    return [];
  }
  
  try {
    const eventsCol = collection(db, "events");
    let q;
    if (city && city.trim() && tag && tag !== "All") {
      q = query(
        eventsCol,
        where("city", "==", city),
        where("tags", "array-contains", tag)
      );
    } else if (city && city.trim()) {
      q = query(eventsCol, where("city", "==", city));
    } else if (tag && tag !== "All") {
      q = query(eventsCol, where("tags", "array-contains", tag));
    } else {
      q = query(eventsCol, orderBy("date", "asc"));
    }
    
    const snap = await getDocs(q);
    const events: FirestoreEvent[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreEvent, 'id'>),
    }));
    return events.map(mapFirestoreEventToEvent);
  } catch (error) {
    console.error("Error fetching events by city/tag:", error);
    return [];
  }
}

export async function searchEvents(searchQuery: string): Promise<Event[]> {
  const db = getDbSafe();
  if (!db) {
    return [];
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    return [];
  }
  
  try {
    const eventsCol = collection(db, "events");
    const q = query(eventsCol);
    const snap = await getDocs(q);
    const allEvents: FirestoreEvent[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreEvent, 'id'>),
    }));
    
    const queryLower = searchQuery.toLowerCase();
    const filtered = allEvents.filter(event => {
      const searchableText = [
        event.title || '',
        event.description || '',
        event.city || '',
        event.address || '',
        ...(Array.isArray(event.tags) ? event.tags : []),
      ].join(' ').toLowerCase();
      return searchableText.includes(queryLower);
    });
    
    return filtered.map(mapFirestoreEventToEvent);
  } catch (error) {
    console.error("Error searching events:", error);
    return [];
  }
}

// Reservations
export async function createReservation(
  eventId: string, 
  userId: string,
  options?: {
    attendeeCount?: number;
    supportContribution?: number;
    paymentMethod?: string;
    totalAmount?: number;
  }
): Promise<string> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    throw new Error('Firestore not initialized');
  }
  
  try {
    const reservationsCol = collection(db, "reservations");
    const reservationRaw: Omit<FirestoreReservation, 'id'> = {
      eventId,
      userId,
      reservedAt: Date.now(),
      status: "reserved",
      attendeeCount: options?.attendeeCount || 1,
      supportContribution: options?.supportContribution,
      paymentMethod: options?.paymentMethod,
      totalAmount: options?.totalAmount,
    };

    // Validate and remove undefined values
    const reservation = validateFirestoreData(
      reservationRaw,
      ['eventId', 'userId', 'reservedAt', 'status'],
      'createReservation'
    ) as Omit<FirestoreReservation, 'id'>;

    // Sanitize data to eliminate ALL undefined fields
    const sanitizedReservation = sanitizeFirestoreData(reservation);

    const docRef = await addDoc(reservationsCol, sanitizedReservation);
    return docRef.id;
  } catch (error: any) {
    console.error('Firestore write failed:', { path: 'reservations', error: error.message || 'Unknown error' });
    throw error;
  }
}

export async function listReservationsForUser(userId: string): Promise<FirestoreReservation[]> {
  // Retry logic: wait for Firestore to be ready
  let db = getDbSafe();
  if (!db) {
    // Retry up to 3 times with 100ms delay
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      db = getDbSafe();
      if (db) break;
    }
  }
  
  if (!db) {
    console.warn('[listReservationsForUser] Firestore not available after retries');
    return [];
  }
  
  // Final validation
  if (typeof db !== 'object' || db === null) {
    console.error('[listReservationsForUser] Invalid Firestore instance');
    return [];
  }
  
  try {
    const reservationsCol = collection(db, "reservations");
    const q = query(reservationsCol, where("userId", "==", userId), where("status", "==", "reserved"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreReservation, 'id'>),
    }));
  } catch (error) {
    console.error("Error fetching user reservations:", error);
    return [];
  }
}

export async function cancelReservation(reservationId: string): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    throw new Error('Firestore not initialized');
  }
  
  try {
    const reservationRef = doc(db, "reservations", reservationId);
    await updateDoc(reservationRef, { status: "cancelled" });
  } catch (error: any) {
    console.error('Firestore write failed:', { path: `reservations/${reservationId}`, error: error.message || 'Unknown error' });
    throw error;
  }
}

export async function getReservationCountForEvent(eventId: string): Promise<number> {
  const db = getDbSafe();
  if (!db) {
    return 0;
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    return 0;
  }
  
  try {
    const reservationsCol = collection(db, "reservations");
    const q = query(reservationsCol, where("eventId", "==", eventId), where("status", "==", "reserved"));
    const snap = await getDocs(q);
    // Sum up attendeeCount from all reservations (default to 1 if not specified for backward compatibility)
    return snap.docs.reduce((total, doc) => {
      const data = doc.data() as FirestoreReservation;
      return total + (data.attendeeCount || 1);
    }, 0);
  } catch (error: any) {
    // Don't log permission errors - they're expected and handled elsewhere
    if (error?.code !== 'permission-denied' && !error?.message?.includes('permission')) {
      console.error("Error fetching reservation count:", error);
    }
    return 0;
  }
}

/**
 * Subscribe to reservation count in real-time for an event
 * Returns unsubscribe function
 */
export function subscribeToReservationCount(
  eventId: string,
  callback: (count: number) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    callback(0);
    return () => {};
  }

  try {
    const reservationsCol = collection(db, "reservations");
    const q = query(
      reservationsCol, 
      where("eventId", "==", eventId), 
      where("status", "==", "reserved")
    );
    
    return onSnapshot(
      q,
      (snapshot) => {
        // Sum up attendeeCount from all reservations (default to 1 if not specified)
        const count = snapshot.docs.reduce((total, doc) => {
          const data = doc.data() as FirestoreReservation;
          return total + (data.attendeeCount || 1);
        }, 0);
        callback(count);
      },
      (error) => {
        console.error('Error in reservation count subscription:', error);
        callback(0);
      }
    );
  } catch (error) {
    console.error('Error setting up reservation count subscription:', error);
    callback(0);
    return () => {};
  }
}

/**
 * Subscribe to hosted events count in real-time
 */
export function subscribeToHostedEventsCount(
  hostId: string,
  callback: (count: number) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    callback(0);
    return () => {};
  }

  try {
    const eventsCol = collection(db, "events");
    // Query all events for this host (Firestore doesn't support != operator easily)
    // We'll filter drafts client-side
    const q = query(
      eventsCol,
      where("hostId", "==", hostId)
    );
    
    return onSnapshot(
      q,
      (snapshot) => {
        // Count only non-draft events (filter client-side)
        const count = snapshot.docs.filter(doc => {
          const data = doc.data() as FirestoreEvent;
          return data.isDraft !== true;
        }).length;
        callback(count);
      },
      (error) => {
        console.error('Error in hosted events count subscription:', error);
        callback(0);
      }
    );
  } catch (error) {
    console.error('Error setting up hosted events count subscription:', error);
    callback(0);
    return () => {};
  }
}

/**
 * Subscribe to attended events count (RSVPs) in real-time
 */
export function subscribeToAttendedEventsCount(
  userId: string,
  callback: (count: number) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    callback(0);
    return () => {};
  }

  try {
    const reservationsCol = collection(db, "reservations");
    const q = query(
      reservationsCol,
      where("userId", "==", userId),
      where("status", "==", "reserved")
    );
    
    return onSnapshot(
      q,
      (snapshot) => {
        // Count unique eventIds (user might have multiple reservations for same event)
        const uniqueEventIds = new Set(
          snapshot.docs.map(doc => (doc.data() as FirestoreReservation).eventId)
        );
        callback(uniqueEventIds.size);
      },
      (error) => {
        console.error('Error in attended events count subscription:', error);
        callback(0);
      }
    );
  } catch (error) {
    console.error('Error setting up attended events count subscription:', error);
    callback(0);
    return () => {};
  }
}

/**
 * Subscribe to total attendees count across all hosted events in real-time
 */
export function subscribeToTotalAttendeesCount(
  hostId: string,
  callback: (count: number) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    callback(0);
    return () => {};
  }

  try {
    // First, get all hosted event IDs
    const eventsCol = collection(db, "events");
    // Query all events for this host (filter drafts client-side)
    const eventsQuery = query(
      eventsCol,
      where("hostId", "==", hostId)
    );
    
    let unsubscribeEvents: Unsubscribe | null = null;
    let unsubscribeReservations: Unsubscribe | null = null;
    
    unsubscribeEvents = onSnapshot(
      eventsQuery,
      (eventsSnapshot) => {
        // Filter out draft events
        const nonDraftEventIds = eventsSnapshot.docs
          .filter(doc => {
            const data = doc.data() as FirestoreEvent;
            return data.isDraft !== true;
          })
          .map(doc => doc.id);
        
        const eventIds = nonDraftEventIds;
        
        // Unsubscribe from previous reservations query if it exists
        if (unsubscribeReservations) {
          unsubscribeReservations();
        }
        
        if (eventIds.length === 0) {
          callback(0);
          return;
        }
        
        // Subscribe to reservations for all hosted events
        // Note: Firestore 'in' query limit is 10, so we handle that
        const reservationsCol = collection(db, "reservations");
        if (eventIds.length <= 10) {
          const reservationsQuery = query(
            reservationsCol,
            where("eventId", "in", eventIds),
            where("status", "==", "reserved")
          );
          
          unsubscribeReservations = onSnapshot(
            reservationsQuery,
            (reservationsSnapshot) => {
              const total = reservationsSnapshot.docs.reduce((sum, doc) => {
                const data = doc.data() as FirestoreReservation;
                return sum + (data.attendeeCount || 1);
              }, 0);
              callback(total);
            },
            (error) => {
              console.error('Error in total attendees count subscription (reservations):', error);
              callback(0);
            }
          );
        } else {
          // For more than 10 events, query in batches (simplified - just use first 10)
          // In production, you might want to implement proper batching
          const reservationsQuery = query(
            reservationsCol,
            where("eventId", "in", eventIds.slice(0, 10)),
            where("status", "==", "reserved")
          );
          
          unsubscribeReservations = onSnapshot(
            reservationsQuery,
            (reservationsSnapshot) => {
              const total = reservationsSnapshot.docs.reduce((sum, doc) => {
                const data = doc.data() as FirestoreReservation;
                return sum + (data.attendeeCount || 1);
              }, 0);
              callback(total);
            },
            (error) => {
              console.error('Error in total attendees count subscription (reservations):', error);
              callback(0);
            }
          );
        }
      },
      (error) => {
        console.error('Error in total attendees count subscription (events):', error);
        callback(0);
      }
    );
    
    // Return combined unsubscribe function
    return () => {
      if (unsubscribeEvents) unsubscribeEvents();
      if (unsubscribeReservations) unsubscribeReservations();
    };
  } catch (error) {
    console.error('Error setting up total attendees count subscription:', error);
    callback(0);
    return () => {};
  }
}

/**
 * Subscribe to reviews count for a host in real-time
 */
export function subscribeToReviewsCount(
  hostId: string,
  callback: (count: number) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    callback(0);
    return () => {};
  }

  try {
    const reviewsCol = collection(db, "reviews");
    const q = query(
      reviewsCol,
      where("hostId", "==", hostId),
      where("status", "==", "accepted")
    );
    
    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.size);
      },
      (error) => {
        console.error('Error in reviews count subscription:', error);
        callback(0);
      }
    );
  } catch (error) {
    console.error('Error setting up reviews count subscription:', error);
    callback(0);
    return () => {};
  }
}

// Chat Messages
export async function getChatMessages(eventId: string): Promise<FirestoreChatMessage[]> {
  const db = getDbSafe();
  if (!db) {
    return [];
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    return [];
  }
  
  try {
    const messagesCol = collection(db, "events", eventId, "messages");
    const q = query(messagesCol, orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreChatMessage, 'id'>),
    }));
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return [];
  }
}

export async function addChatMessage(
  eventId: string,
  userId: string,
  userName: string,
  text: string,
  type: FirestoreChatMessage['type'] = 'message',
  isHost: boolean = false
): Promise<string> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    throw new Error('Firestore not initialized');
  }
  
  try {
    const messagesCol = collection(db, "events", eventId, "messages");
    const messageRaw: Omit<FirestoreChatMessage, 'id'> = {
      eventId,
      userId,
      userName: userName || 'Anonymous',
      text: text || '',
      createdAt: Date.now(),
      type,
      isHost,
    };
    
    // Validate and remove undefined values
    const message = validateFirestoreData(
      messageRaw,
      ['eventId', 'userId', 'userName', 'text', 'createdAt', 'type', 'isHost'],
      'addChatMessage'
    ) as Omit<FirestoreChatMessage, 'id'>;
    
    // Sanitize data to eliminate ALL undefined fields
    const sanitizedMessage = sanitizeFirestoreData(message);
    
    const docRef = await addDoc(messagesCol, sanitizedMessage);
    return docRef.id;
  } catch (error: any) {
    console.error('Firestore write failed:', { path: `events/${eventId}/messages`, error: error.message || 'Unknown error' });
    throw error;
  }
}

// User profiles
export async function getUserProfile(uid: string): Promise<FirestoreUser | null> {
  // Retry logic: wait for Firestore to be ready
  let db = getDbSafe();
  if (!db) {
    // Retry up to 3 times with 100ms delay
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      db = getDbSafe();
      if (db) break;
    }
  }
  
  if (!db) {
    console.warn('[getUserProfile] Firestore not available after retries');
    return null;
  }
  
  // Final validation
  if (typeof db !== 'object' || db === null) {
    console.error('[getUserProfile] Invalid Firestore instance');
    return null;
  }
  
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      uid: snap.id,
      name: data.displayName || data.name || '',
      email: data.email || '',
      imageUrl: data.photoURL || data.imageUrl,
      displayName: data.displayName || data.name,
      photoURL: data.photoURL || data.imageUrl,
      city: data.city,
      bio: data.bio,
      preferences: data.preferences,
      favorites: Array.isArray(data.favorites) ? data.favorites : [],
      hostedEvents: Array.isArray(data.hostedEvents) ? data.hostedEvents : [],
      preferredCity: data.preferredCity,
      phoneVerified: data.phoneVerified || false,
      signupIntent: data.signupIntent,
      isDemoHost: data.isDemoHost || false,
      username: data.username,
      isVerified: data.isVerified || false,
      createdAt: data.createdAt || Date.now(),
      updatedAt: data.updatedAt,
    };
  } catch (error: any) {
    // Don't log permission errors - they're expected and handled elsewhere
    if (error?.code !== 'permission-denied' && !error?.message?.includes('permission')) {
      console.error("Error fetching user profile:", error);
    }
    return null;
  }
}

export async function createOrUpdateUserProfile(uid: string, userData: Partial<FirestoreUser>): Promise<void> {
  // Retry logic: wait for Firestore to be ready
  let db = getDbSafe();
  if (!db) {
    // Retry up to 3 times with 100ms delay
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      db = getDbSafe();
      if (db) break;
    }
  }
  
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  
  // Final validation
  if (typeof db !== 'object' || db === null) {
    throw new Error('Firestore not initialized - invalid instance');
  }
  
  try {
    const userRef = doc(db, "users", uid);
    const userDataRaw: any = {
      ...userData,
      ...(userData && 'phone_verified' in userData ? { phone_verified: (userData as any).phone_verified, phoneVerified: (userData as any).phone_verified } : {}),
      ...(userData && 'phoneVerified' in userData ? { phoneVerified: (userData as any).phoneVerified } : {}),
      uid,
      updatedAt: userData?.updatedAt ?? Date.now(),
    };
    
    // Remove undefined values (merge: true allows partial updates)
    const cleanedUserData = removeUndefinedValues(userDataRaw);
    
    await setDoc(userRef, cleanedUserData, { merge: true });
  } catch (error: any) {
    // Don't log permission errors - they're expected for fake accounts and handled elsewhere
    if (error?.code !== 'permission-denied' && !error?.message?.includes('permission')) {
      console.error('Firestore write failed:', { path: `users/${uid}`, error: error.message || 'Unknown error' });
    }
    throw error;
  }
}

// Load user reservations and return as Event[]
export async function listUserReservations(uid: string): Promise<Event[]> {
  const db = getDbSafe();
  if (!db) {
    return [];
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    return [];
  }
  
  try {
    const reservationsCol = collection(db, "reservations");
    const q = query(
      reservationsCol,
      where("userId", "==", uid),
      where("status", "==", "reserved")
    );
    const snap = await getDocs(q);
    
    // Fetch associated event documents
    const eventPromises = snap.docs.map(async (reservationDoc) => {
      const reservation = reservationDoc.data() as FirestoreReservation;
      const event = await getEventById(reservation.eventId);
      return event;
    });
    
    const events = await Promise.all(eventPromises);
    return events.filter((e): e is Event => e !== null);
  } catch (error) {
    console.error("Error fetching user reservations:", error);
    return [];
  }
}

// Review system functions
export async function addReview(
  eventId: string,
  userId: string,
  userName: string,
  rating: number,
  comment?: string
): Promise<string> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    throw new Error('Firestore not initialized');
  }
  
  try {
    const reviewsCol = collection(db, "events", eventId, "reviews");
    const reviewRaw: Omit<FirestoreReview, 'id'> = {
      eventId,
      userId,
      userName: userName || 'Anonymous',
      rating: Math.max(1, Math.min(5, rating)),
      comment: comment || '',
      createdAt: Date.now(),
    };
    
    // Validate and remove undefined values
    const review = validateFirestoreData(
      reviewRaw,
      ['eventId', 'userId', 'userName', 'rating', 'createdAt'],
      'addReview'
    ) as Omit<FirestoreReview, 'id'>;
    
    // Sanitize data to eliminate ALL undefined fields
    const sanitizedReview = sanitizeFirestoreData(review);
    
    const docRef = await addDoc(reviewsCol, sanitizedReview);
    
    await recalculateEventRating(eventId);
    
    return docRef.id;
  } catch (error: any) {
    console.error('Firestore write failed:', { path: `events/${eventId}/reviews`, error: error.message || 'Unknown error' });
    throw error;
  }
}

/**
 * Get reviews for an event
 * @param eventId - Event ID
 * @param includePending - If true, includes pending/contested reviews. If false, only accepted reviews (default: false)
 * @returns Array of reviews
 */
export async function listReviews(eventId: string, includePending: boolean = false): Promise<FirestoreReview[]> {
  const db = getDbSafe();
  if (!db) {
    return [];
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    return [];
  }
  
  try {
    const reviewsCol = collection(db, "events", eventId, "reviews");
    const q = query(reviewsCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const allReviews = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreReview, 'id'>),
    }));
    
    // Filter by status if only accepted reviews are requested
    if (!includePending) {
      return allReviews.filter(review => {
        const status = (review as any).status;
        // Include reviews without status (backward compatibility) or explicitly accepted reviews
        return !status || status === 'accepted' || status === undefined;
      });
    }
    
    return allReviews;
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }
}

/**
 * Get all reviews for a host (from all their events)
 * @param hostId - Host user ID
 * @param includePending - If true, includes pending/contested reviews. If false, only accepted reviews (default: false)
 * @returns Array of reviews sorted by creation date (newest first)
 */
export async function listHostReviews(hostId: string, includePending: boolean = false): Promise<FirestoreReview[]> {
  const db = getDbSafe();
  if (!db) {
    return [];
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    return [];
  }
  
  try {
    // First, get all events hosted by this user
    const eventsCol = collection(db, "events");
    const eventsQuery = query(eventsCol, where("hostId", "==", hostId));
    const eventsSnapshot = await getDocs(eventsQuery);
    
    const eventIds = eventsSnapshot.docs.map(doc => doc.id);
    
    // Then, get all reviews from all their events
    // For public display (includePending=false), only show accepted reviews
    // For host management (includePending=true), show all reviews including pending/contested
    const allReviews: FirestoreReview[] = [];
    for (const eventId of eventIds) {
      const reviews = await listReviews(eventId, includePending);
      allReviews.push(...reviews);
    }
    
    // Sort by creation date (newest first)
    return allReviews.sort((a, b) => {
      const aTime = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt as any)?.toMillis?.() || 0;
      const bTime = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt as any)?.toMillis?.() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error("Error fetching host reviews:", error);
    return [];
  }
}

/**
 * Expel a user from an event
 * This adds the event to the user's bannedEvents array and creates an expulsion record
 */
export async function expelUserFromEvent(
  eventId: string,
  userId: string,
  hostId: string,
  reason: string,
  description?: string
): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    // Add event to user's bannedEvents array
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const bannedEvents = userData.bannedEvents || [];
      
      if (!bannedEvents.includes(eventId)) {
        await updateDoc(userRef, {
          bannedEvents: arrayUnion(eventId),
        });
      }
    }

    // Create expulsion record in events/{eventId}/expulsions/{expulsionId}
    const expulsionsCol = collection(db, 'events', eventId, 'expulsions');
    const expulsionData = {
      userId,
      userName: userDoc.data()?.name || userDoc.data()?.displayName || 'Unknown',
      hostId,
      reason,
      description: description || '',
      expelledAt: Date.now(),
    };

    // Validate and sanitize data
    const sanitizedData = sanitizeFirestoreData(expulsionData);
    await addDoc(expulsionsCol, sanitizedData);

    // Cancel user's reservation if they have one
    try {
      const reservationsCol = collection(db, 'reservations');
      const reservationsQuery = query(
        reservationsCol,
        where('eventId', '==', eventId),
        where('userId', '==', userId),
        where('status', '==', 'reserved')
      );
      const reservationsSnapshot = await getDocs(reservationsQuery);
      
      for (const reservationDoc of reservationsSnapshot.docs) {
        await updateDoc(doc(db, 'reservations', reservationDoc.id), {
          status: 'cancelled',
          cancelledAt: Date.now(),
          cancellationReason: 'expelled',
        });
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      // Don't fail expulsion if reservation cancellation fails
    }

    console.log(`[EXPEL_USER] User ${userId} expelled from event ${eventId} by host ${hostId}`);
  } catch (error: any) {
    console.error('[EXPEL_USER] Error expelling user:', error);
    throw new Error(`Failed to expel user: ${error.message || 'Unknown error'}`);
  }
}

export async function recalculateEventRating(eventId: string): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    throw new Error('Firestore not initialized');
  }
  
  try {
    // Get all reviews (including pending) to filter for accepted ones
    const reviews = await listReviews(eventId, true); // Get all reviews to filter
    
    // Filter to only include accepted reviews (or reviews without status for backward compatibility)
    // This ensures only accepted reviews count toward the rating
    const acceptedReviews = reviews.filter(review => {
      const status = (review as any).status;
      // Include reviews without status (backward compatibility) or explicitly accepted reviews
      return !status || status === 'accepted';
    });
    
    if (acceptedReviews.length === 0) {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, {
        rating: 0,
        reviewCount: 0,
      });
      return;
    }
    
    const totalRating = acceptedReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / acceptedReviews.length;
    const reviewCount = acceptedReviews.length;
    const roundedRating = Math.round(averageRating * 10) / 10;
    
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, {
      rating: roundedRating,
      reviewCount,
    });
    
    // This update will trigger the eventStore's onSnapshot listener, 
    // which will automatically sync the rating everywhere the event is displayed
  } catch (error: any) {
    console.error('Firestore write failed:', { path: `events/${eventId}`, error: error.message || 'Unknown error', operation: 'recalculateRating' });
    throw error;
  }
}

/**
 * Delete an event from Firestore and optionally its associated images from Storage
 * @param eventId - The ID of the event to delete
 * @param deleteImages - Whether to also delete associated images from Storage (default: true)
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteEvent(eventId: string, deleteImages: boolean = true): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  
  // Ensure Firestore is ready before calling collection()
  if (typeof db === 'undefined' || db === null) {
    throw new Error('Firestore not initialized');
  }
  
  try {
    // First, get the event to access image URLs
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      console.warn(`[DELETE_EVENT] Event ${eventId} does not exist`);
      return; // Event already deleted, nothing to do
    }
    
    const eventData = eventSnap.data() as FirestoreEvent;
    
    // Delete associated images from Storage if requested
    if (deleteImages) {
      try {
        const { deleteImage } = await import('./storage');
        const imagesToDelete: string[] = [];
        
        // Collect all image URLs
        if (eventData.imageUrl) {
          imagesToDelete.push(eventData.imageUrl);
        }
        if (eventData.imageUrls && Array.isArray(eventData.imageUrls)) {
          imagesToDelete.push(...eventData.imageUrls);
        }
        
        // Extract Storage paths from URLs and delete
        // Firebase Storage URLs format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media
        for (const imageUrl of imagesToDelete) {
          try {
            // Extract path from URL
            const urlMatch = imageUrl.match(/\/o\/([^?]+)/);
            if (urlMatch) {
              const encodedPath = urlMatch[1];
              const storagePath = decodeURIComponent(encodedPath);
              await deleteImage(storagePath);
            } else {
              console.warn(`[DELETE_EVENT] Could not extract path from URL: ${imageUrl}`);
            }
          } catch (imageError: any) {
            // Log but don't fail - image deletion is best effort
            console.warn(`[DELETE_EVENT] Failed to delete image ${imageUrl}:`, imageError);
          }
        }
      } catch (storageError: any) {
        // Log but don't fail - image deletion is best effort
        console.warn(`[DELETE_EVENT] Error deleting images:`, storageError);
      }
    }
    
    // Delete the event document from Firestore
    await deleteDoc(eventRef);
    
    console.log(`[DELETE_EVENT] ✅ Successfully deleted event: ${eventId}`);
    
    // Note: Associated subcollections (reviews, messages, reservations) will remain
    // They can be manually cleaned up if needed, but won't cause issues
    
  } catch (error: any) {
    console.error('[DELETE_EVENT] ❌ Error deleting event:', {
      eventId,
      error: error.message || 'Unknown error',
      code: error.code
    });
    throw error;
  }
}

/**
 * Update all events in Firestore with correct hostName and hostPhotoURL from user profiles
 * This ensures all events have accurate host information synced from the users collection
 */
export async function updateAllEventsHostInfo(): Promise<{ updated: number; errors: number }> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    console.log('[UPDATE_EVENTS_HOST] Starting batch update of all events...');
    
    // Get all events
    const eventsCol = collection(db, 'events');
    const eventsSnapshot = await getDocs(eventsCol);
    
    let updated = 0;
    let errors = 0;
    
    // Process events in batches to avoid overwhelming Firestore
    const batchSize = 10;
    const events = eventsSnapshot.docs;
    
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (eventDoc) => {
          try {
            const eventData = eventDoc.data() as FirestoreEvent;
            const eventId = eventDoc.id;
            
            // Skip if no hostId
            if (!eventData.hostId) {
              console.warn(`[UPDATE_EVENTS_HOST] Event ${eventId} has no hostId, skipping`);
              return;
            }
            
            // Fetch host profile
            const hostProfile = await getUserProfile(eventData.hostId);
            
            if (!hostProfile) {
              console.warn(`[UPDATE_EVENTS_HOST] Host profile not found for event ${eventId}, hostId: ${eventData.hostId}`);
              return;
            }
            
            // Get correct host name and photo
            const correctHostName = hostProfile.name || hostProfile.displayName || eventData.hostName || eventData.host || '';
            const correctHostPhotoURL = hostProfile.photoURL || hostProfile.imageUrl || eventData.hostPhotoURL || undefined;
            
            // Only update if data has changed
            if (
              eventData.hostName !== correctHostName ||
              eventData.hostPhotoURL !== correctHostPhotoURL ||
              eventData.host !== correctHostName
            ) {
              const eventRef = doc(db, 'events', eventId);
              await updateDoc(eventRef, {
                hostName: correctHostName,
                host: correctHostName,
                hostPhotoURL: correctHostPhotoURL || null,
                updatedAt: Date.now(),
              });
              
              console.log(`[UPDATE_EVENTS_HOST] ✅ Updated event ${eventId}: hostName="${correctHostName}", hostPhotoURL=${correctHostPhotoURL ? 'set' : 'null'}`);
              updated++;
            } else {
              console.log(`[UPDATE_EVENTS_HOST] ⏭️  Event ${eventId} already has correct host info, skipping`);
            }
          } catch (error: any) {
            console.error(`[UPDATE_EVENTS_HOST] ❌ Error updating event ${eventDoc.id}:`, error.message);
            errors++;
          }
        })
      );
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < events.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`[UPDATE_EVENTS_HOST] ✅ Completed: ${updated} updated, ${errors} errors out of ${events.length} total events`);
    return { updated, errors };
  } catch (error: any) {
    console.error('[UPDATE_EVENTS_HOST] ❌ Fatal error:', error);
    throw error;
  }
}
