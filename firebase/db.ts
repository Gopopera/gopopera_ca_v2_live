/**
 * CYCLES DETECTED BY MADGE: None
 * 
 * Static imports only from src/lib/firebase.ts
 * No imports from stores or App
 * Pure helper functions only
 */

import { getDbSafe } from "../src/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, orderBy, addDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { FirestoreEvent, FirestoreReservation, FirestoreChatMessage, FirestoreReview, FirestoreUser } from "./types";
import { Event } from "../types";
import { validateFirestoreData, removeUndefinedValues, sanitizeFirestoreData } from "../utils/firestoreValidation";
import { POPERA_EMAIL } from "../stores/userStore";

// Helper to convert FirestoreEvent to Event (frontend type)
const mapFirestoreEventToEvent = (firestoreEvent: FirestoreEvent): Event => {
  return {
    id: firestoreEvent.id,
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
    imageUrl: firestoreEvent.imageUrl || '',
    attendeesCount: firestoreEvent.attendeesCount || 0,
    createdAt: firestoreEvent.createdAt ? new Date(firestoreEvent.createdAt).toISOString() : new Date().toISOString(),
    location: firestoreEvent.location || `${firestoreEvent.address || ''}, ${firestoreEvent.city || ''}`,
    category: firestoreEvent.category as Event['category'] || 'Community',
    price: firestoreEvent.price || 'Free',
    rating: firestoreEvent.rating || 0,
    reviewCount: firestoreEvent.reviewCount || 0,
    attendees: firestoreEvent.attendeesCount || 0,
    capacity: firestoreEvent.capacity,
    lat: firestoreEvent.lat,
    lng: firestoreEvent.lng,
      isPoperaOwned: firestoreEvent.isPoperaOwned || false,
      isDemo: firestoreEvent.isDemo || false,
      demoPurpose: firestoreEvent.demoPurpose,
      demoType: firestoreEvent.demoType, // Map demoType for filtering (e.g., "city-launch")
      isOfficialLaunch: firestoreEvent.isOfficialLaunch || false,
      aboutEvent: firestoreEvent.aboutEvent,
      whatToExpect: firestoreEvent.whatToExpect,
      // Note: managedBy, subtitle, startDate, endDate, isPublic, allowChat, allowRsvp
      // are stored in Firestore but not mapped to Event type (not needed in UI)
  };
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
  
  try {
    const eventsCol = collection(db, "events");
    const now = Date.now();
    
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
      imageUrl: eventData.imageUrl || '',
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
      isPublic: (eventData as any).isPublic,
      allowChat: (eventData as any).allowChat,
      allowRsvp: (eventData as any).allowRsvp,
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

    const docRef = await addDoc(eventsCol, sanitizedEvent);
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
    console.error('Firestore write failed:', { path: 'events', error: error.message || 'Unknown error' });
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
export async function createReservation(eventId: string, userId: string): Promise<string> {
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
    return snap.size;
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
