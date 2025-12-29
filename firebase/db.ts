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

// Helper to convert FirestoreEvent to Event (frontend type)
// Exported for use in eventStore
// REFACTORED: Map Firestore event to frontend Event type
// Host data (hostName, hostPhotoURL) is fetched in real-time from /users/{hostId}
// attendeesCount is computed in real-time from reservations
export const mapFirestoreEventToEvent = (firestoreEvent: FirestoreEvent): Event => {
  const standardizedEvent: Event = {
    id: firestoreEvent.id || '',
    title: firestoreEvent.title || '',
    description: firestoreEvent.description || '',
    city: firestoreEvent.city || '',
    address: firestoreEvent.address || '',
    date: firestoreEvent.date || '',
    time: firestoreEvent.time || '',
    tags: Array.isArray(firestoreEvent.tags) ? firestoreEvent.tags : [],
    hostId: firestoreEvent.hostId || '', // Primary field - fetch host data from /users/{hostId}
    imageUrls: firestoreEvent.imageUrls || (firestoreEvent.imageUrl ? [firestoreEvent.imageUrl] : undefined),
    // REMOVED: attendeesCount - computed in real-time from reservations
    // Backward compatibility (will be removed after migration)
    host: firestoreEvent.host || firestoreEvent.hostName || '',
    hostName: firestoreEvent.hostName || firestoreEvent.host || '',
    hostPhotoURL: firestoreEvent.hostPhotoURL || undefined,
    imageUrl: firestoreEvent.imageUrl || (firestoreEvent.imageUrls && firestoreEvent.imageUrls.length > 0 ? firestoreEvent.imageUrls[0] : ''),
    attendeesCount: undefined, // Computed in real-time
    createdAt: firestoreEvent.createdAt ? (typeof firestoreEvent.createdAt === 'number' ? new Date(firestoreEvent.createdAt).toISOString() : new Date(firestoreEvent.createdAt).toISOString()) : new Date().toISOString(),
    location: firestoreEvent.location || `${firestoreEvent.address || ''}, ${firestoreEvent.city || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '') || firestoreEvent.city || '',
    category: (firestoreEvent.category as Event['category']) || 'Community',
    price: firestoreEvent.price || 'Free',
    rating: typeof firestoreEvent.rating === 'number' ? firestoreEvent.rating : 0,
    reviewCount: typeof firestoreEvent.reviewCount === 'number' ? firestoreEvent.reviewCount : 0,
    attendees: undefined, // Computed in real-time from reservations
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
    // Payment fields
    hasFee: firestoreEvent.hasFee === true,
    feeAmount: typeof firestoreEvent.feeAmount === 'number' ? firestoreEvent.feeAmount : undefined,
    currency: firestoreEvent.currency || undefined,
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
    
    // REFACTORED: Do not store hostName or hostPhotoURL in event
    // Host data is fetched in real-time from /users/{hostId}
    // Only store hostId - UI components fetch host info via real-time listener
    
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
      // REFACTORED: Only store hostId - host data fetched in real-time from /users/{hostId}
      hostId: eventData.hostId || '',
      // Backward compatibility (will be removed after migration)
      host: hostProfileData?.displayName || hostProfileData?.name || (eventData as any).host || 'Unknown Host',
      hostName: hostProfileData?.displayName || hostProfileData?.name || (eventData as any).hostName || 'Unknown Host',
      imageUrl: eventData.imageUrl || (eventData.imageUrls && eventData.imageUrls.length > 0 ? eventData.imageUrls[0] : ''),
      imageUrls: eventData.imageUrls || (eventData.imageUrl ? [eventData.imageUrl] : undefined),
      rating: eventData.rating || 0,
      reviewCount: eventData.reviewCount || 0,
      // REMOVED: attendeesCount - computed in real-time from reservations
      // Use subscribeToReservationCount(eventId) for real-time updates
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
      // Payment fields
      hasFee: (eventData as any).hasFee === true,
      feeAmount: typeof (eventData as any).feeAmount === 'number' ? (eventData as any).feeAmount : undefined,
      currency: (eventData as any).currency || undefined,
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
    // REMOVED: attendeesCount - computed in real-time from reservations
    // if (eventData.attendeesCount !== undefined) updateData.attendeesCount = eventData.attendeesCount;
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
    paymentIntentId?: string;
    subscriptionId?: string;
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
    
    // TASK B: Make reservation creation idempotent
    // Query for existing reservations for this (userId, eventId) regardless of status
    const existingQuery = query(
      reservationsCol,
      where("userId", "==", userId),
      where("eventId", "==", eventId)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    // DEV-only debug logging
    if (import.meta.env.DEV) {
      console.log('[CREATE_RESERVATION] 🔍 Checking existing reservations:', {
        eventId,
        userId,
        existingCount: existingSnapshot.size
      });
      existingSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   [${index + 1}] Doc ID: ${doc.id}, Status: ${data.status}, ReservedAt: ${data.reservedAt}`);
      });
    }
    
    // If a doc exists with status: 'reserved', return existing ID (idempotent)
    const reservedDoc = existingSnapshot.docs.find(doc => doc.data().status === 'reserved');
    if (reservedDoc) {
      if (import.meta.env.DEV) {
        console.log('[CREATE_RESERVATION] ✅ Reservation already exists with status="reserved", returning existing ID:', reservedDoc.id);
      }
      return reservedDoc.id;
    }
    
    // If a doc exists with status: 'cancelled', update it back to 'reserved'
    const cancelledDoc = existingSnapshot.docs.find(doc => doc.data().status === 'cancelled');
    if (cancelledDoc) {
      if (import.meta.env.DEV) {
        console.log('[CREATE_RESERVATION] ♻️  Found cancelled reservation, reactivating:', cancelledDoc.id);
      }
      
      const updateData: Record<string, any> = {
        status: "reserved",
        reservedAt: Date.now(),
        attendeeCount: options?.attendeeCount || 1,
      };
      
      // Update optional fields if provided
      if (options?.supportContribution !== undefined) {
        updateData.supportContribution = options.supportContribution;
      }
      if (options?.paymentMethod) {
        updateData.paymentMethod = options.paymentMethod;
      }
      if (options?.totalAmount !== undefined) {
        updateData.totalAmount = options.totalAmount;
      }
      if (options?.paymentIntentId) {
        updateData.paymentIntentId = options.paymentIntentId;
        updateData.paymentStatus = 'succeeded';
      }
      if (options?.subscriptionId) {
        updateData.subscriptionId = options.subscriptionId;
        updateData.paymentStatus = 'succeeded';
      }
      if (options?.paymentIntentId) {
        updateData.payoutStatus = 'held';
      }
      
      // Remove cancelledAt and cancelledByUid if they exist
      updateData.cancelledAt = null;
      updateData.cancelledByUid = null;
      
      const reservationRef = doc(db, "reservations", cancelledDoc.id);
      await updateDoc(reservationRef, sanitizeFirestoreData(updateData));
      
      // Sync attendeeCount on event document
      syncEventAttendeeCount(eventId).catch(err => {
        console.warn('[CREATE_RESERVATION] ⚠️ Failed to sync attendeeCount:', err);
      });
      
      return cancelledDoc.id;
    }
    
    // If multiple docs exist (edge case), pick the most recent and log warning
    if (existingSnapshot.docs.length > 1) {
      if (import.meta.env.DEV) {
        console.warn('[CREATE_RESERVATION] ⚠️ Multiple reservations found for (userId, eventId):', {
          count: existingSnapshot.docs.length,
          docIds: existingSnapshot.docs.map(d => d.id)
        });
      }
      
      // Sort by reservedAt (or createdAt) descending, pick most recent
      const sortedDocs = existingSnapshot.docs.sort((a, b) => {
        const aTime = a.data().reservedAt || a.data().createdAt || 0;
        const bTime = b.data().reservedAt || b.data().createdAt || 0;
        return bTime - aTime;
      });
      
      const mostRecent = sortedDocs[0];
      const mostRecentData = mostRecent.data();
      
      // If most recent is reserved, return it
      if (mostRecentData.status === 'reserved') {
        if (import.meta.env.DEV) {
          console.log('[CREATE_RESERVATION] ✅ Using most recent reserved reservation:', mostRecent.id);
        }
        return mostRecent.id;
      }
      
      // If most recent is cancelled, reactivate it
      if (mostRecentData.status === 'cancelled') {
        if (import.meta.env.DEV) {
          console.log('[CREATE_RESERVATION] ♻️  Reactivating most recent cancelled reservation:', mostRecent.id);
        }
        
        const updateData: Record<string, any> = {
          status: "reserved",
          reservedAt: Date.now(),
          attendeeCount: options?.attendeeCount || 1,
          cancelledAt: null,
          cancelledByUid: null,
        };
        
        if (options?.supportContribution !== undefined) updateData.supportContribution = options.supportContribution;
        if (options?.paymentMethod) updateData.paymentMethod = options.paymentMethod;
        if (options?.totalAmount !== undefined) updateData.totalAmount = options.totalAmount;
        if (options?.paymentIntentId) {
          updateData.paymentIntentId = options.paymentIntentId;
          updateData.paymentStatus = 'succeeded';
        }
        if (options?.subscriptionId) {
          updateData.subscriptionId = options.subscriptionId;
          updateData.paymentStatus = 'succeeded';
        }
        if (options?.paymentIntentId) {
          updateData.payoutStatus = 'held';
        }
        
        const reservationRef = doc(db, "reservations", mostRecent.id);
        await updateDoc(reservationRef, sanitizeFirestoreData(updateData));
        
        syncEventAttendeeCount(eventId).catch(err => {
          console.warn('[CREATE_RESERVATION] ⚠️ Failed to sync attendeeCount:', err);
        });
        
        return mostRecent.id;
      }
    }
    
    // No existing reservation found - create new one
    const reservationRaw: Omit<FirestoreReservation, 'id'> = {
      eventId,
      userId,
      reservedAt: Date.now(),
      status: "reserved",
      attendeeCount: options?.attendeeCount || 1,
      supportContribution: options?.supportContribution,
      paymentMethod: options?.paymentMethod,
      totalAmount: options?.totalAmount,
      paymentIntentId: options?.paymentIntentId,
      subscriptionId: options?.subscriptionId,
      paymentStatus: options?.paymentIntentId || options?.subscriptionId ? 'succeeded' : undefined,
      payoutStatus: options?.paymentIntentId ? 'held' : undefined, // One-time events: hold until 24h after
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
    
    if (import.meta.env.DEV) {
      console.log('[CREATE_RESERVATION] ✅ Created new reservation:', docRef.id);
    }
    
    // Sync attendeeCount on event document for unauthenticated users
    // This is done in background - don't block reservation creation
    syncEventAttendeeCount(eventId).catch(err => {
      console.warn('[CREATE_RESERVATION] ⚠️ Failed to sync attendeeCount:', err);
    });
    
    return docRef.id;
  } catch (error: any) {
    // TASK B: Ensure error messages are not swallowed
    const errorMessage = error.message || 'Unknown error';
    const errorCode = error.code || 'unknown';
    console.error('[CREATE_RESERVATION] ❌ Firestore write failed:', { 
      path: 'reservations', 
      eventId,
      userId,
      error: errorMessage,
      code: errorCode
    });
    
    // Propagate clear error with code
    const enhancedError = new Error(`Failed to create reservation: ${errorMessage}`);
    (enhancedError as any).code = errorCode;
    throw enhancedError;
  }
}

/**
 * Sync the attendeeCount field on an event document
 * Counts all reservations with status "reserved" for the event
 * This denormalized field is used by unauthenticated users
 */
async function syncEventAttendeeCount(eventId: string): Promise<void> {
  const db = getDbSafe();
  if (!db) return;
  
  try {
    // Count all reserved reservations for this event
    const reservationsCol = collection(db, "reservations");
    const q = query(
      reservationsCol,
      where("eventId", "==", eventId),
      where("status", "==", "reserved")
    );
    const snapshot = await getDocs(q);
    
    // Sum up attendeeCount from all reservations
    const totalCount = snapshot.docs.reduce((total, docSnap) => {
      const data = docSnap.data() as FirestoreReservation;
      return total + (data.attendeeCount || 1);
    }, 0);
    
    // Update the event document
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, { attendeeCount: totalCount });
    
    console.log('[SYNC_ATTENDEE_COUNT] ✅ Event attendeeCount synced:', { eventId, count: totalCount });
  } catch (error: any) {
    // Only log non-permission errors
    if (error?.code !== 'permission-denied') {
      console.warn('[SYNC_ATTENDEE_COUNT] ⚠️ Failed to sync:', error);
    }
  }
}

/**
 * Result type for listReservationsForUser with error handling
 */
export interface ListReservationsForUserResult {
  reservations: FirestoreReservation[];
  errorCode?: string;
  errorMessage?: string;
}

export async function listReservationsForUser(userId: string): Promise<ListReservationsForUserResult> {
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
    const errorMsg = 'Firestore not available after retries';
    if (import.meta.env.DEV) {
      console.error('[listReservationsForUser]', errorMsg);
    }
    return { reservations: [], errorCode: 'firestore-unavailable', errorMessage: errorMsg };
  }
  
  // Final validation
  if (typeof db !== 'object' || db === null) {
    const errorMsg = 'Invalid Firestore instance';
    if (import.meta.env.DEV) {
      console.error('[listReservationsForUser]', errorMsg);
    }
    return { reservations: [], errorCode: 'invalid-db', errorMessage: errorMsg };
  }
  
  try {
    const reservationsCol = collection(db, "reservations");
    const q = query(reservationsCol, where("userId", "==", userId), where("status", "==", "reserved"));
    const snap = await getDocs(q);
    return {
      reservations: snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<FirestoreReservation, 'id'>),
      }))
    };
  } catch (error: any) {
    const errorCode = error?.code || 'unknown';
    const errorMessage = error?.message || 'Unknown error';
    if (import.meta.env.DEV) {
      console.error('[listReservationsForUser] Error fetching user reservations:', {
        code: errorCode,
        message: errorMessage,
        userId,
        error
      });
    }
    return { reservations: [], errorCode, errorMessage };
  }
}

export async function cancelReservation(reservationId: string, cancelledByUid?: string): Promise<void> {
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
    
    // Get the reservation to find eventId before cancelling
    const reservationDoc = await getDoc(reservationRef);
    const eventId = reservationDoc.data()?.eventId;
    
    // Update with status, cancelledAt timestamp, and cancelledByUid
    const updateData: Record<string, any> = { 
      status: "cancelled",
      cancelledAt: serverTimestamp(),
    };
    if (cancelledByUid) {
      updateData.cancelledByUid = cancelledByUid;
    }
    
    await updateDoc(reservationRef, updateData);
    
    // Sync attendeeCount on event document for unauthenticated users
    if (eventId) {
      syncEventAttendeeCount(eventId).catch(err => {
        console.warn('[CANCEL_RESERVATION] ⚠️ Failed to sync attendeeCount:', err);
      });
    }
  } catch (error: any) {
    console.error('Firestore write failed:', { path: `reservations/${reservationId}`, error: error.message || 'Unknown error' });
    throw error;
  }
}

/**
 * Get a single reservation by ID
 */
export async function getReservationById(reservationId: string): Promise<FirestoreReservation | null> {
  const db = getDbSafe();
  if (!db) {
    return null;
  }
  
  try {
    const reservationRef = doc(db, "reservations", reservationId);
    const reservationDoc = await getDoc(reservationRef);
    
    if (!reservationDoc.exists()) {
      return null;
    }
    
    const data = reservationDoc.data();
    return {
      id: reservationDoc.id,
      ...data,
    } as FirestoreReservation;
  } catch (error: any) {
    console.error('Error fetching reservation:', error);
    return null;
  }
}

/**
 * Update reservation with check-in info (host only)
 */
export async function updateReservationCheckIn(reservationId: string, checkedInByUid: string): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  
  try {
    const reservationRef = doc(db, "reservations", reservationId);
    
    await updateDoc(reservationRef, {
      checkedInAt: serverTimestamp(),
      checkedInBy: checkedInByUid,
    });
    
    console.log('[CHECK_IN] ✅ Reservation checked in:', { reservationId, checkedInBy: checkedInByUid });
  } catch (error: any) {
    console.error('Error checking in reservation:', error);
    throw error;
  }
}

/**
 * Get count of checked-in reservations for an event
 */
export async function getCheckedInCountForEvent(eventId: string): Promise<number> {
  const db = getDbSafe();
  if (!db) {
    return 0;
  }
  
  try {
    const reservationsCol = collection(db, "reservations");
    const q = query(
      reservationsCol, 
      where("eventId", "==", eventId), 
      where("status", "==", "reserved")
    );
    const snap = await getDocs(q);
    
    // Count reservations that have checkedInAt set
    return snap.docs.filter(doc => {
      const data = doc.data();
      return !!data.checkedInAt;
    }).length;
  } catch (error: any) {
    console.error("Error fetching checked-in count:", error);
    return 0;
  }
}

/**
 * Result type for listReservationsForEvent with error handling
 */
export interface ListReservationsResult {
  reservations: (FirestoreReservation & { id: string })[];
  error?: 'permission-denied' | 'index-required' | 'unknown';
  errorMessage?: string;
}

/**
 * List all reservations for an event (for hosts to see attendee list)
 * Uses single where() filter only - no orderBy() to avoid composite index requirements.
 * Sorting is done client-side in AttendeeList component.
 */
export async function listReservationsForEvent(eventId: string): Promise<ListReservationsResult> {
  const db = getDbSafe();
  if (!db) {
    return { reservations: [], error: 'unknown', errorMessage: 'Database not available' };
  }
  
  if (!eventId) {
    return { reservations: [], error: 'unknown', errorMessage: 'Event ID is required' };
  }
  
  try {
    const reservationsCol = collection(db, "reservations");
    // Single where() filter only - index-safe, no composite index needed
    const q = query(reservationsCol, where("eventId", "==", eventId));
    const snap = await getDocs(q);
    const reservations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as FirestoreReservation }));
    return { reservations };
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMsg = error?.message || 'Unknown error';
    
    // Log full error for debugging
    console.error('[listReservationsForEvent] Error:', { code: errorCode, message: errorMsg, eventId });
    
    if (errorCode === 'permission-denied') {
      return { 
        reservations: [], 
        error: 'permission-denied', 
        errorMessage: "You don't have permission to view attendees for this event." 
      };
    }
    
    if (errorCode === 'failed-precondition' || errorMsg.includes('index')) {
      return { 
        reservations: [], 
        error: 'index-required', 
        errorMessage: 'Attendee list requires a Firestore index. Contact support.' 
      };
    }
    
    return { 
      reservations: [], 
      error: 'unknown', 
      errorMessage: 'Failed to load attendees. Please try again.' 
    };
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
 * Subscribe to user RSVPs in real-time
 * Returns unsubscribe function
 */
export function subscribeToUserRSVPs(
  userId: string,
  callback: (rsvpEventIds: string[]) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback([]));
    return () => {};
  }

  try {
    const reservationsCol = collection(db, "reservations");
    const q = query(
      reservationsCol,
      where("userId", "==", userId),
      where("status", "==", "reserved")
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rsvpEventIds = snapshot.docs
          .map(doc => doc.data().eventId)
          .filter(Boolean) as string[];
        callback(rsvpEventIds);
      },
      (error) => {
        console.error('[subscribeToUserRSVPs] Error:', error);
        // On error, return empty array
        callback([]);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('[subscribeToUserRSVPs] Error setting up subscription:', error);
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback([]));
    return () => {};
  }
}

/**
 * Subscribe to reservation count in real-time for an event
 * Returns unsubscribe function
 * 
 * IMPORTANT: This function handles both authenticated and unauthenticated users:
 * - Authenticated users: Can query reservations collection directly (more accurate)
 * - Unauthenticated users: Falls back to attendeeCount field on event document
 */
export function subscribeToReservationCount(
  eventId: string,
  callback: (count: number) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    // CRITICAL: Defer callback to prevent React Error #310
    // (Cannot update a component while rendering a different component)
    queueMicrotask(() => callback(0));
    return () => {};
  }

  // Track if we've received valid data from reservations query
  let reservationsQueryActive = false;
  let eventUnsubscribe: Unsubscribe | null = null;

  // Always subscribe to event document for attendeeCount (works for unauthenticated users)
  // This is the fallback and also ensures data consistency
  const setupEventSubscription = () => {
    try {
      const eventRef = doc(db, "events", eventId);
      eventUnsubscribe = onSnapshot(
        eventRef,
        (docSnapshot) => {
          // Only use event attendeeCount if reservations query failed/not active
          if (!reservationsQueryActive) {
            const data = docSnapshot.data();
            const count = data?.attendeeCount || 0;
            console.log('[RESERVATION_COUNT] 📊 Using event.attendeeCount (fallback):', { eventId, count });
            callback(count);
          }
        },
        (error) => {
          console.warn('[RESERVATION_COUNT] ⚠️ Event subscription error:', error);
          // Don't call callback with 0 here - let reservations query handle it
        }
      );
    } catch (error) {
      console.warn('[RESERVATION_COUNT] ⚠️ Error setting up event subscription:', error);
    }
  };

  // Set up event subscription first as fallback
  setupEventSubscription();

  // Try to subscribe to reservations (only works for authenticated users)
  let reservationsUnsubscribe: Unsubscribe | null = null;
  try {
    const reservationsCol = collection(db, "reservations");
    const q = query(
      reservationsCol, 
      where("eventId", "==", eventId), 
      where("status", "==", "reserved")
    );
    
    reservationsUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Sum up attendeeCount from all reservations (default to 1 if not specified)
        const count = snapshot.docs.reduce((total, docSnap) => {
          const data = docSnap.data() as FirestoreReservation;
          return total + (data.attendeeCount || 1);
        }, 0);
        reservationsQueryActive = true;
        console.log('[RESERVATION_COUNT] ✅ Using reservations query:', { eventId, count, docs: snapshot.docs.length });
        callback(count);
        
        // Also update the event document's attendeeCount for sync
        // This ensures unauthenticated users see up-to-date counts
        updateEventAttendeeCount(eventId, count).catch(err => {
          // Silent fail - this is a sync operation, not critical
          console.warn('[RESERVATION_COUNT] ⚠️ Failed to sync attendeeCount to event:', err);
        });
      },
      (error: any) => {
        // Permission denied is expected for unauthenticated users
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          console.log('[RESERVATION_COUNT] 📖 Falling back to event.attendeeCount (not authenticated):', { eventId });
          // Event subscription will provide the count
        } else {
          console.error('[RESERVATION_COUNT] ❌ Error in reservation subscription:', error);
        }
        reservationsQueryActive = false;
      }
    );
  } catch (error) {
    console.warn('[RESERVATION_COUNT] ⚠️ Error setting up reservations subscription:', error);
    reservationsQueryActive = false;
  }

  // Return combined unsubscribe function
  return () => {
    if (eventUnsubscribe) eventUnsubscribe();
    if (reservationsUnsubscribe) reservationsUnsubscribe();
  };
}

/**
 * Update the attendeeCount field on an event document
 * This is a denormalized field for public display (unauthenticated users)
 */
async function updateEventAttendeeCount(eventId: string, count: number): Promise<void> {
  const db = getDbSafe();
  if (!db) return;
  
  try {
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, { attendeeCount: count });
  } catch (error: any) {
    // Only log non-permission errors
    if (error?.code !== 'permission-denied') {
      console.warn('[RESERVATION_COUNT] ⚠️ Failed to update attendeeCount:', error);
    }
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
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
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
        // Count only valid events:
        // - hostId matches exactly (defense against data corruption)
        // - Not a draft
        // - Not a demo event
        // - Not a Popera-owned event (unless user is the Popera account)
        const count = snapshot.docs.filter(doc => {
          const data = doc.data() as FirestoreEvent;
          // Ensure hostId matches exactly (defense against data corruption)
          const isValidHost = data.hostId === hostId;
          const isNotDraft = data.isDraft !== true;
          const isNotDemo = data.isDemo !== true;
          const isNotPoperaOwned = data.isPoperaOwned !== true;
          
          if (!isValidHost) {
            console.warn('[HOSTED_EVENTS_COUNT] Event has mismatched hostId:', {
              eventId: doc.id,
              eventHostId: data.hostId,
              expectedHostId: hostId,
              eventTitle: data.title
            });
          }
          
          return isValidHost && isNotDraft && isNotDemo && isNotPoperaOwned;
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
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
    return () => {};
  }
}

/**
 * Subscribe to host revenue in real-time
 * Calculates total revenue from reservations for events hosted by this user
 */
export function subscribeToHostRevenue(
  hostId: string,
  callback: (revenue: number) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
    return () => {};
  }

  try {
    // First, get all events for this host
    const eventsCol = collection(db, "events");
    const eventsQuery = query(
      eventsCol,
      where("hostId", "==", hostId)
    );

    return onSnapshot(
      eventsQuery,
      async (eventsSnapshot) => {
        // Get all event IDs for this host (excluding drafts and demo events)
        const eventIds = eventsSnapshot.docs
          .filter(doc => {
            const data = doc.data() as FirestoreEvent;
            return data.hostId === hostId && 
                   data.isDraft !== true && 
                   data.isDemo !== true && 
                   data.isPoperaOwned !== true;
          })
          .map(doc => doc.id);

        if (eventIds.length === 0) {
          callback(0);
          return;
        }

        // Query reservations for these events with successful payments
        // Note: Firestore doesn't support 'in' queries with more than 10 items
        // So we need to batch if there are many events
        let totalRevenue = 0;
        const batchSize = 10;
        
        for (let i = 0; i < eventIds.length; i += batchSize) {
          const batchEventIds = eventIds.slice(i, i + batchSize);
          const reservationsCol = collection(db, "reservations");
          const reservationsQuery = query(
            reservationsCol,
            where("eventId", "in", batchEventIds),
            where("status", "==", "reserved")
          );
          
          const reservationsSnapshot = await getDocs(reservationsQuery);
          
          reservationsSnapshot.docs.forEach(doc => {
            const data = doc.data() as FirestoreReservation;
            // Only count reservations with successful payments
            if (data.totalAmount && data.totalAmount > 0) {
              // Check if payment was successful (has paymentIntentId or paymentStatus is succeeded)
              if (data.paymentIntentId || data.paymentStatus === 'succeeded') {
                totalRevenue += data.totalAmount;
              }
            }
          });
        }

        callback(totalRevenue);
      },
      (error) => {
        console.error('Error in host revenue subscription:', error);
        callback(0);
      }
    );
  } catch (error) {
    console.error('Error setting up host revenue subscription:', error);
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
    return () => {};
  }
}

/**
 * Event revenue breakdown item
 */
export interface EventRevenueBreakdown {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  currentCapacity: number;
  maxCapacity: number | null;
  revenue: number;
  currency: string;
}

/**
 * Get host revenue breakdown by event
 * Returns a list of events with their individual revenue, sorted by most recent first
 */
export async function getHostRevenueBreakdown(
  hostId: string
): Promise<EventRevenueBreakdown[]> {
  const db = getDbSafe();
  if (!db) {
    return [];
  }

  try {
    // Get all events for this host (excluding drafts and demo events)
    const eventsCol = collection(db, "events");
    const eventsQuery = query(
      eventsCol,
      where("hostId", "==", hostId)
    );

    const eventsSnapshot = await getDocs(eventsQuery);
    
    // Filter and map events
    const hostEvents = eventsSnapshot.docs
      .filter(doc => {
        const data = doc.data() as FirestoreEvent;
        return data.hostId === hostId && 
               data.isDraft !== true && 
               data.isDemo !== true && 
               data.isPoperaOwned !== true;
      })
      .map(doc => ({
        id: doc.id,
        ...(doc.data() as FirestoreEvent)
      }));

    if (hostEvents.length === 0) {
      return [];
    }

    // Get revenue for each event
    const breakdown: EventRevenueBreakdown[] = [];
    const batchSize = 10;

    for (let i = 0; i < hostEvents.length; i += batchSize) {
      const batchEvents = hostEvents.slice(i, i + batchSize);
      const batchEventIds = batchEvents.map(e => e.id);
      
      // Query reservations for this batch
      const reservationsCol = collection(db, "reservations");
      const reservationsQuery = query(
        reservationsCol,
        where("eventId", "in", batchEventIds),
        where("status", "==", "reserved")
      );
      
      const reservationsSnapshot = await getDocs(reservationsQuery);
      
      // Calculate revenue and capacity per event in this batch
      const eventRevenue: Record<string, number> = {};
      const eventCapacity: Record<string, number> = {};
      const eventCurrency: Record<string, string> = {};
      
      reservationsSnapshot.docs.forEach(doc => {
        const data = doc.data() as FirestoreReservation;
        const eventId = data.eventId;
        
        // Count capacity (attendees)
        eventCapacity[eventId] = (eventCapacity[eventId] || 0) + (data.attendeeCount || 1);
        
        // Sum revenue only for successful payments
        if (data.totalAmount && data.totalAmount > 0) {
          if (data.paymentIntentId || data.paymentStatus === 'succeeded') {
            eventRevenue[eventId] = (eventRevenue[eventId] || 0) + data.totalAmount;
          }
        }
      });
      
      // Add each event in the batch to the breakdown
      for (const event of batchEvents) {
        breakdown.push({
          eventId: event.id,
          eventTitle: event.title || 'Untitled Event',
          eventDate: event.date || '',
          currentCapacity: eventCapacity[event.id] || 0,
          maxCapacity: typeof event.capacity === 'number' ? event.capacity : null,
          revenue: eventRevenue[event.id] || 0,
          currency: event.currency || 'cad',
        });
      }
    }

    // Sort by date (most recent first)
    breakdown.sort((a, b) => {
      const dateA = new Date(a.eventDate).getTime() || 0;
      const dateB = new Date(b.eventDate).getTime() || 0;
      return dateB - dateA;
    });

    return breakdown;
  } catch (error) {
    console.error('Error fetching host revenue breakdown:', error);
    return [];
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
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
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
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
    return () => {};
  }
}

/**
 * Subscribe to all user events categorized by type in real-time
 * Returns counts for: hosting (upcoming), past, drafts
 */
export interface UserEventCounts {
  hosting: number;    // Upcoming events user is hosting (non-draft)
  past: number;       // Past events user has hosted
  drafts: number;     // Draft events
  total: number;      // Total (hosting + past + drafts)
}

export function subscribeToUserEventCounts(
  userId: string,
  callback: (counts: UserEventCounts) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback({ hosting: 0, past: 0, drafts: 0, total: 0 }));
    return () => {};
  }

  try {
    const eventsCol = collection(db, "events");
    const q = query(
      eventsCol,
      where("hostId", "==", userId)
    );
    
    return onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();
        let hosting = 0;
        let past = 0;
        let drafts = 0;
        
        snapshot.docs.forEach(doc => {
          const data = doc.data() as FirestoreEvent;
          
          // Skip demo and Popera-owned events
          if (data.isDemo === true || data.isPoperaOwned === true) {
            return;
          }
          
          // Ensure hostId matches exactly
          if (data.hostId !== userId) {
            return;
          }
          
          // Categorize the event
          if (data.isDraft === true) {
            drafts++;
          } else {
            // Check if event is in the past
            const eventDate = data.startDateTime || parseEventDateToTimestamp(data.date, data.time);
            if (eventDate && eventDate < now) {
              past++;
            } else {
              hosting++;
            }
          }
        });
        
        callback({ hosting, past, drafts, total: hosting + past + drafts });
      },
      (error) => {
        console.error('Error in user event counts subscription:', error);
        callback({ hosting: 0, past: 0, drafts: 0, total: 0 });
      }
    );
  } catch (error) {
    console.error('Error setting up user event counts subscription:', error);
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback({ hosting: 0, past: 0, drafts: 0, total: 0 }));
    return () => {};
  }
}

/**
 * Helper to parse event date string to timestamp
 */
function parseEventDateToTimestamp(dateStr: string | undefined, timeStr: string | undefined): number | null {
  if (!dateStr) return null;
  
  try {
    // Try parsing common date formats
    // Format: "Dec 15, 2025" or "December 15, 2025" or "2025-12-15"
    let date = new Date(dateStr);
    
    // If time is provided, try to add it
    if (timeStr) {
      const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const ampm = timeMatch[3]?.toUpperCase();
        
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        date.setHours(hours, minutes, 0, 0);
      }
    }
    
    return date.getTime();
  } catch {
    return null;
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
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
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
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
    return () => {};
  }
}

/**
 * Subscribe to reviews count for a host in real-time
 * Reviews are stored per event, so we need to:
 * 1. Subscribe to all events for this host
 * 2. Periodically recalculate total accepted reviews count
 * This uses polling approach for simplicity (reviews don't have hostId field)
 */
export function subscribeToReviewsCount(
  hostId: string,
  callback: (count: number) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
    return () => {};
  }

  let isActive = true;
  let intervalId: NodeJS.Timeout | null = null;
  let eventsUnsubscribe: (() => void) | null = null;

  const recalculateCount = async () => {
    if (!isActive || !db) return;

    try {
      // Get all events for this host
      const eventsCol = collection(db, "events");
      const eventsQuery = query(eventsCol, where("hostId", "==", hostId));
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventIds = eventsSnapshot.docs.map(doc => doc.id);

      if (eventIds.length === 0) {
        callback(0);
        return;
      }

      // FIXED: Get reviews from subcollection under each event (events/{eventId}/reviews)
      // NOT from top-level reviews collection
      const allReviewQueries = eventIds.map(eventId => {
        const reviewsSubCol = collection(db, "events", eventId, "reviews");
        return getDocs(reviewsSubCol);
      });

      const reviewSnapshots = await Promise.all(allReviewQueries);
      
      // Count only accepted reviews (or reviews without status for backward compatibility)
      // FIXED: Use same falsy check as listReviews - !status covers undefined, null, empty strings, etc.
      const totalCount = reviewSnapshots.reduce((sum, snapshot) => {
        return sum + snapshot.docs.filter(doc => {
          const data = doc.data();
          const status = data.status;
          // Include accepted reviews or reviews without status (backward compatibility)
          // Match listReviews logic: !status || status === 'accepted'
          return !status || status === 'accepted';
        }).length;
      }, 0);

      if (isActive) {
        console.log('[REVIEWS_COUNT] ✅ Calculated review count:', { hostId, eventCount: eventIds.length, totalCount });
        callback(totalCount);
      }
    } catch (error) {
      console.error('[REVIEWS_COUNT] Error recalculating count:', error);
      if (isActive) {
        callback(0);
      }
    }
  };

  // Subscribe to events to detect when new events are added
  try {
    const eventsCol = collection(db, "events");
    const eventsQuery = query(eventsCol, where("hostId", "==", hostId));
    
    eventsUnsubscribe = onSnapshot(
      eventsQuery,
      () => {
        // When events change, recalculate count
        recalculateCount();
      },
      (error) => {
        console.error('[REVIEWS_COUNT] Error in events subscription:', error);
        callback(0);
      }
    );

    // Initial calculation
    recalculateCount();

    // Poll every 10 seconds to catch review changes (since we can't easily subscribe to all reviews)
    intervalId = setInterval(() => {
      if (isActive) {
        recalculateCount();
      }
    }, 10000);
  } catch (error) {
    console.error('Error setting up reviews count subscription:', error);
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
  }

  // Return unsubscribe function
  return () => {
    isActive = false;
    if (eventsUnsubscribe) {
      eventsUnsubscribe();
    }
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
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

// REFACTORED: Messages only store senderId - sender info fetched from /users/{senderId}
export async function addChatMessage(
  eventId: string,
  senderId: string, // Renamed from userId for clarity
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
  
  // CRITICAL: Validate senderId is provided and not empty
  if (!senderId || typeof senderId !== 'string' || senderId.trim() === '') {
    const error = new Error('senderId is required and must be a non-empty string');
    console.error('[CHAT WRITE] ❌ Validation failed:', { eventId, senderId, text: text?.substring(0, 50) });
    throw error;
  }
  
  // CRITICAL: Ensure both senderId and userId are set (userId for Firestore rules backward compatibility)
  // Both fields MUST be present for Firestore security rules to work
  const userId = senderId; // Always set userId = senderId for backward compatibility
  
  // Log BEFORE write
  console.log('[CHAT WRITE] 📤 Preparing to write message:', {
    eventId,
    senderId,
    userId, // Explicitly log both
    text: text?.substring(0, 100),
    type,
    isHost,
    timestamp: new Date().toISOString(),
  });
  
  try {
    const messagesCol = collection(db, "events", eventId, "messages");
    const messageRaw: Omit<FirestoreChatMessage, 'id'> = {
      eventId,
      senderId, // Standardized field (primary)
      userId,   // CRITICAL: Required for Firestore rules backward compatibility
      text: text || '',
      createdAt: Date.now(),
      type,
      isHost,
      // userName is intentionally omitted - fetched from /users/{senderId} in real-time
    };
    
    // CRITICAL: Include userId in required fields to ensure it's never removed
    // Validate and remove undefined values
    const message = validateFirestoreData(
      messageRaw,
      ['eventId', 'senderId', 'userId', 'text', 'createdAt', 'type', 'isHost'], // ✅ Added userId to required fields
      'addChatMessage'
    ) as Omit<FirestoreChatMessage, 'id'>;
    
    // Sanitize data to eliminate ALL undefined fields
    const sanitizedMessage = sanitizeFirestoreData(message);
    
    // CRITICAL: Verify both senderId and userId are present after sanitization
    if (!sanitizedMessage.senderId || !sanitizedMessage.userId) {
      const error = new Error('Message missing required senderId or userId after sanitization');
      console.error('[CHAT WRITE] ❌ Sanitization failed:', {
        eventId,
        senderId: sanitizedMessage.senderId,
        userId: sanitizedMessage.userId,
        sanitizedMessage,
      });
      throw error;
    }
    
    // Log message data being written
    console.log('[CHAT WRITE] 📝 Writing to Firestore:', {
      eventId,
      senderId: sanitizedMessage.senderId,
      userId: sanitizedMessage.userId,
      hasText: !!sanitizedMessage.text,
      textLength: sanitizedMessage.text?.length || 0,
      type: sanitizedMessage.type,
      isHost: sanitizedMessage.isHost,
    });
    
    const docRef = await addDoc(messagesCol, sanitizedMessage);
    
    // Log AFTER successful write
    console.log('[CHAT WRITE SUCCESS] ✅ Message written successfully:', {
      messageId: docRef.id,
      eventId,
      senderId: sanitizedMessage.senderId,
      userId: sanitizedMessage.userId,
      path: `events/${eventId}/messages/${docRef.id}`,
    });
    
    return docRef.id;
  } catch (error: any) {
    // Log full error details
    console.error('[CHAT WRITE] ❌ Firestore write failed:', {
      path: `events/${eventId}/messages`,
      eventId,
      senderId,
      userId,
      error: error.message || 'Unknown error',
      code: error.code,
      stack: error.stack,
      fullError: error,
    });
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
    // REFACTORED: Single source of truth - use displayName and photoURL only
    // Backward compatibility: fallback to deprecated fields during migration
    return {
      id: snap.id,
      uid: snap.id,
      email: data.email || '',
      displayName: data.displayName || data.name || '', // Standardized field
      photoURL: data.photoURL || data.imageUrl || undefined, // Standardized field
      bio: data.bio || null,
      phoneVerified: data.phoneVerified || data.phone_verified || false,
      username: data.username || null,
      createdAt: data.createdAt || Date.now(),
      updatedAt: data.updatedAt || undefined,
      
      // Extended fields
      city: data.city,
      preferences: data.preferences,
      favorites: Array.isArray(data.favorites) ? data.favorites : [],
      hostedEvents: Array.isArray(data.hostedEvents) ? data.hostedEvents : [],
      preferredCity: data.preferredCity,
      phone_number: data.phone_number,
      phoneVerifiedForHosting: data.phoneVerifiedForHosting,
      hostPhoneNumber: data.hostPhoneNumber,
      signupIntent: data.signupIntent,
      following: Array.isArray(data.following) ? data.following : [],
      followers: Array.isArray(data.followers) ? data.followers : [],
      notification_settings: data.notification_settings,
      bannedEvents: Array.isArray(data.bannedEvents) ? data.bannedEvents : [],
      isDemoHost: data.isDemoHost || false,
      isOfficialHost: data.isOfficialHost || false,
      isVerified: data.isVerified || false,
      isPoperaDemoHost: data.isPoperaDemoHost || false,
      
      // Stripe Connect fields for host payouts
      stripeAccountId: data.stripeAccountId || undefined,
      stripeOnboardingStatus: data.stripeOnboardingStatus || undefined,
      stripeOnboardingUrl: data.stripeOnboardingUrl || undefined,
      stripeAccountEnabled: data.stripeAccountEnabled || false,
      
      // Cover photo
      coverPhotoURL: data.coverPhotoURL || undefined,
      
      // Backward compatibility (will be removed after migration)
      name: data.displayName || data.name || '',
      imageUrl: data.photoURL || data.imageUrl || undefined,
      phone_verified: data.phoneVerified || data.phone_verified || false,
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
    
    // REFACTORED: Standardize to displayName and photoURL only
    // Map deprecated fields to standardized fields
    const standardizedData: any = {
      ...userData,
      uid,
      updatedAt: userData?.updatedAt ?? Date.now(),
    };
    
    // Standardize name fields: use displayName, fallback to name
    if (userData?.displayName || userData?.name) {
      standardizedData.displayName = userData.displayName || userData.name;
    }
    
    // Standardize photo fields: use photoURL, fallback to imageUrl
    if (userData?.photoURL || (userData as any)?.imageUrl) {
      standardizedData.photoURL = userData.photoURL || (userData as any).imageUrl;
    }
    
    // Standardize phone verification: use phoneVerified, fallback to phone_verified
    if (userData?.phoneVerified !== undefined || (userData as any)?.phone_verified !== undefined) {
      standardizedData.phoneVerified = userData.phoneVerified ?? (userData as any).phone_verified ?? false;
    }
    
    // Remove undefined values (merge: true allows partial updates)
    const cleanedUserData = removeUndefinedValues(standardizedData);
    
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
        // !status covers undefined, null, empty strings, etc.
        return !status || status === 'accepted';
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
