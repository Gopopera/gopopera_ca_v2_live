import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  setDoc,
} from "../src/lib/firebase";
import { FirestoreEvent, FirestoreReservation, FirestoreChatMessage, FirestoreReview, FirestoreUser } from "./types";
import { Event } from "../types";

// Lazy collection references - created when functions are called, not at module load
// These are function definitions, so they don't execute until called
// This prevents "Cannot access before initialization" errors
const getEventsCol = () => collection(db, "events");
const getReservationsCol = () => collection(db, "reservations");
const getUsersCol = () => collection(db, "users");

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
    isOfficialLaunch: firestoreEvent.isOfficialLaunch || false,
    aboutEvent: firestoreEvent.aboutEvent,
    whatToExpect: firestoreEvent.whatToExpect,
  };
};

// Events
export async function listUpcomingEvents(): Promise<Event[]> {
  try {
    const q = query(getEventsCol(), orderBy("date", "asc"));
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
  try {
    const eventsCol = getEventsCol();
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
  try {
    // Firestore doesn't support full-text search, so we fetch all and filter client-side
    // For production, consider using Algolia or similar
    const q = query(getEventsCol());
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
  try {
    const reservation: Omit<FirestoreReservation, 'id'> = {
      eventId,
      userId,
      reservedAt: Date.now(),
      status: "reserved",
    };
    const docRef = await addDoc(getReservationsCol(), reservation);
    return docRef.id;
  } catch (error) {
    console.error("Error creating reservation:", error);
    throw error;
  }
}

export async function listReservationsForUser(userId: string): Promise<FirestoreReservation[]> {
  try {
    const q = query(getReservationsCol(), where("userId", "==", userId), where("status", "==", "reserved"));
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
  try {
    const reservationRef = doc(db, "reservations", reservationId);
    await updateDoc(reservationRef, { status: "cancelled" });
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    throw error;
  }
}

export async function getReservationCountForEvent(eventId: string): Promise<number> {
  try {
    const q = query(getReservationsCol(), where("eventId", "==", eventId), where("status", "==", "reserved"));
    const snap = await getDocs(q);
    return snap.size;
  } catch (error) {
    console.error("Error fetching reservation count:", error);
    return 0;
  }
}

// Chat Messages (non-realtime version - use listeners.ts for realtime)
export async function getChatMessages(eventId: string): Promise<FirestoreChatMessage[]> {
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
  try {
    const messagesCol = collection(db, "events", eventId, "messages");
    const message: Omit<FirestoreChatMessage, 'id'> = {
      eventId,
      userId,
      userName,
      text,
      createdAt: Date.now(),
      type,
      isHost,
    };
    const docRef = await addDoc(messagesCol, message);
    return docRef.id;
  } catch (error) {
    console.error("Error adding chat message:", error);
    throw error;
  }
}

// User profiles
export async function getUserProfile(uid: string): Promise<FirestoreUser | null> {
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
      favorites: data.favorites || [],
      createdAt: data.createdAt || Date.now(),
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function createOrUpdateUserProfile(uid: string, userData: Partial<FirestoreUser>): Promise<void> {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, {
      ...userData,
      uid,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    console.error("Error creating/updating user profile:", error);
    throw error;
  }
}

// Load user reservations and return as Event[]
export async function listUserReservations(uid: string): Promise<Event[]> {
  try {
    const q = query(
      getReservationsCol(),
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
  try {
    const reviewsCol = collection(db, "events", eventId, "reviews");
    const review: Omit<FirestoreReview, 'id'> = {
      eventId,
      userId,
      userName,
      rating: Math.max(1, Math.min(5, rating)), // Clamp between 1-5
      comment,
      createdAt: Date.now(),
    };
    const docRef = await addDoc(reviewsCol, review);
    
    // Recalculate event rating (optional, can be done separately)
    await recalculateEventRating(eventId);
    
    return docRef.id;
  } catch (error) {
    console.error("Error adding review:", error);
    throw error;
  }
}

export async function listReviews(eventId: string): Promise<FirestoreReview[]> {
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
  try {
    const reviews = await listReviews(eventId);
    if (reviews.length === 0) {
      // Set rating to 0 if no reviews
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
    
    // Round to 1 decimal place
    const roundedRating = Math.round(averageRating * 10) / 10;
    
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, {
      rating: roundedRating,
      reviewCount,
    });
  } catch (error) {
    console.error("Error recalculating event rating:", error);
    throw error;
  }
}
