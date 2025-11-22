import { firebaseDb } from "./client";
import {
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
  Timestamp,
} from "firebase/firestore";
import { FirestoreEvent, FirestoreReservation, FirestoreChatMessage } from "./types";
import { Event } from "../types";

const eventsCol = collection(firebaseDb, "events");
const reservationsCol = collection(firebaseDb, "reservations");
const usersCol = collection(firebaseDb, "users");

// Helper to convert FirestoreEvent to Event (frontend type)
const mapFirestoreEventToEvent = (firestoreEvent: FirestoreEvent): Event => {
  return {
    id: firestoreEvent.id,
    title: firestoreEvent.title,
    description: firestoreEvent.description,
    city: firestoreEvent.city,
    address: firestoreEvent.address,
    date: firestoreEvent.date,
    time: firestoreEvent.time,
    tags: firestoreEvent.tags,
    host: firestoreEvent.host,
    hostName: firestoreEvent.hostName || firestoreEvent.host,
    hostId: firestoreEvent.hostId,
    imageUrl: firestoreEvent.imageUrl || '',
    attendeesCount: firestoreEvent.attendeesCount || 0,
    createdAt: new Date(firestoreEvent.createdAt).toISOString(),
    location: firestoreEvent.location || `${firestoreEvent.address}, ${firestoreEvent.city}`,
    category: firestoreEvent.category as Event['category'],
    price: firestoreEvent.price,
    rating: firestoreEvent.rating || 0,
    reviewCount: firestoreEvent.reviewCount || 0,
    attendees: firestoreEvent.attendeesCount,
    capacity: firestoreEvent.capacity,
    lat: firestoreEvent.lat,
    lng: firestoreEvent.lng,
    isPoperaOwned: firestoreEvent.isPoperaOwned,
    isDemo: firestoreEvent.isDemo,
    isOfficialLaunch: firestoreEvent.isOfficialLaunch,
    aboutEvent: firestoreEvent.aboutEvent,
    whatToExpect: firestoreEvent.whatToExpect,
  };
};

// Events
export async function listUpcomingEvents(): Promise<Event[]> {
  try {
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
  try {
    const ref = doc(firebaseDb, "events", id);
    const snap = await getDoc(ref);
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
    const q = query(eventsCol);
    const snap = await getDocs(q);
    const allEvents: FirestoreEvent[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreEvent, 'id'>),
    }));
    
    const queryLower = searchQuery.toLowerCase();
    const filtered = allEvents.filter(event => {
      const searchableText = [
        event.title,
        event.description,
        event.city,
        event.address,
        ...event.tags,
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
    const docRef = await addDoc(reservationsCol, reservation);
    return docRef.id;
  } catch (error) {
    console.error("Error creating reservation:", error);
    throw error;
  }
}

export async function listReservationsForUser(userId: string): Promise<FirestoreReservation[]> {
  try {
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
  try {
    const ref = doc(firebaseDb, "reservations", reservationId);
    await updateDoc(ref, { status: "cancelled" });
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    throw error;
  }
}

export async function getReservationCountForEvent(eventId: string): Promise<number> {
  try {
    const q = query(reservationsCol, where("eventId", "==", eventId), where("status", "==", "reserved"));
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
    const messagesCol = collection(firebaseDb, "events", eventId, "messages");
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
    const messagesCol = collection(firebaseDb, "events", eventId, "messages");
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
export async function getUserProfile(uid: string) {
  try {
    const ref = doc(firebaseDb, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { uid: snap.id, ...snap.data() };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function createOrUpdateUserProfile(uid: string, userData: Partial<FirestoreUser>): Promise<void> {
  try {
    const ref = doc(firebaseDb, "users", uid);
    await setDoc(ref, {
      ...userData,
      uid,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    console.error("Error creating/updating user profile:", error);
    throw error;
  }
}

