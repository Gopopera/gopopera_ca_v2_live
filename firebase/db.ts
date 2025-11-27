/**
 * CYCLES DETECTED BY MADGE: None
 * 
 * Static imports only from src/lib/firebase.ts
 * No imports from stores or App
 * Pure helper functions only
 */

import { getDbSafe } from "../src/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, orderBy, addDoc, updateDoc, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { FirestoreEvent, FirestoreReservation, FirestoreChatMessage, FirestoreReview, FirestoreUser } from "./types";
import { Event } from "../types";
import { validateFirestoreData, removeUndefinedValues, sanitizeFirestoreData } from "../utils/firestoreValidation";
import { POPERA_EMAIL } from "../stores/userStore";

// Helper to convert FirestoreEvent to Event (frontend type)
// Exported for use in eventStore
export const mapFirestoreEventToEvent = (firestoreEvent: FirestoreEvent): Event => {
  // Standardize all fields to ensure consistent format
  const standardizedEvent: Event = {
    id: firestoreEvent.id || '',
    title: firestoreEvent.title || '',
    description: firestoreEvent.description || '',
    city: firestoreEvent.city || '',
    address: firestoreEvent.address || '',
    date: firestoreEvent.date || '',
    time: firestoreEvent.time || '',
    tags: Array.isArray(firestoreEvent.tags) ? firestoreEvent.tags : [],
    host: firestoreEvent.host || '',
    hostName: firestoreEvent.hostName || firestoreEvent.host || '',
    hostId: firestoreEvent.hostId || '',
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
      host: eventData.host || 'Unknown',
      hostName: eventData.host || 'Unknown',
      hostId: eventData.hostId || '',
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
      startDate: (eventData as any).startDate,
      endDate: (eventData as any).endDate,
      // Default to public and joinable if not specified
      isPublic: (eventData as any).isPublic !== undefined ? (eventData as any).isPublic : true,
      allowChat: (eventData as any).allowChat !== undefined ? (eventData as any).allowChat : true,
      allowRsvp: (eventData as any).allowRsvp !== undefined ? (eventData as any).allowRsvp : true,
      isOfficialLaunch: eventData.isOfficialLaunch || false,
      aboutEvent: eventData.aboutEvent,
      whatToExpect: eventData.whatToExpect,
      capacity: eventData.capacity,
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
  } catch (error) {
    console.error("Error fetching reservation count:", error);
    return 0;
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
  } catch (error) {
    console.error("Error fetching user profile:", error);
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
    console.error('Firestore write failed:', { path: `users/${uid}`, error: error.message || 'Unknown error' });
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

export async function listReviews(eventId: string): Promise<FirestoreReview[]> {
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
    return snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreReview, 'id'>),
    }));
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }
}

/**
 * Get all reviews for a host (from all their events)
 */
export async function listHostReviews(hostId: string): Promise<FirestoreReview[]> {
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
    const allReviews: FirestoreReview[] = [];
    for (const eventId of eventIds) {
      const reviews = await listReviews(eventId);
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
    const reviews = await listReviews(eventId);
    if (reviews.length === 0) {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, {
        rating: 0,
        reviewCount: 0,
      });
      return;
    }
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    const reviewCount = reviews.length;
    const roundedRating = Math.round(averageRating * 10) / 10;
    
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, {
      rating: roundedRating,
      reviewCount,
    });
  } catch (error: any) {
    console.error('Firestore write failed:', { path: `events/${eventId}`, error: error.message || 'Unknown error', operation: 'recalculateRating' });
    throw error;
  }
}
