import { create } from 'zustand';
import { Event } from '../types';
import { categoryMatches } from '../utils/categoryMapper';
import { createEvent as createFirestoreEvent, mapFirestoreEventToEvent } from '../firebase/db';
import { getDbSafe } from '../src/lib/firebase';
import { collection, onSnapshot, query, orderBy, type Unsubscribe } from 'firebase/firestore';
import type { FirestoreEvent } from '../firebase/types';

interface EventStore {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  _unsubscribe: Unsubscribe | null; // Internal unsubscribe function for onSnapshot
  init: () => void; // Initialize real-time subscription
  addEvent: (event: Omit<Event, 'id' | 'createdAt' | 'location' | 'hostName' | 'attendees'>) => Promise<Event>;
  updateEvent: (eventId: string, updates: Partial<Omit<Event, 'id' | 'createdAt'>>) => void;
  deleteEvent: (eventId: string) => void;
  getEvent: (eventId: string) => Event | undefined;
  getEvents: () => Event[];
  getEventsByHost: (hostName: string) => Event[];
  searchEvents: (query: string) => Event[];
  filterByCity: (city: string) => Event[];
  filterByTags: (tags: string[]) => Event[];
  filterByCategory: (category: string) => Event[];
  filterByDate: (startDate?: string, endDate?: string) => Event[];
  getEventsByCity: () => Record<string, Event[]>;
}

// Helper function to format location
const formatLocation = (city: string, address: string): string => {
  return address ? `${address}, ${city}` : city;
};

// Helper function to create event with all required fields
const createEvent = (
  eventData: Omit<Event, 'id' | 'createdAt' | 'location' | 'hostName' | 'attendees'>
): Event => {
  const id = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = new Date().toISOString();
  const location = formatLocation(eventData.city, eventData.address);
  
  return {
    ...eventData,
    id,
    createdAt,
    location,
    hostName: eventData.host, // Set hostName for backward compatibility
    attendees: eventData.attendeesCount, // Set attendees alias
  };
};

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  isLoading: true,
  error: null,
  _unsubscribe: null,

  /**
   * Initialize real-time subscription to events collection
   * This sets up onSnapshot to automatically update events when Firestore changes
   * Should be called once when the app initializes
   */
  init: () => {
    // Don't initialize twice
    if (get()._unsubscribe) {
      return;
    }

    const db = getDbSafe();
    if (!db) {
      console.warn('[EVENT_STORE] Firestore not available, cannot initialize events subscription');
      set({ isLoading: false, error: 'Firestore not available' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      // Subscribe to events collection with ordering by date
      const eventsCol = collection(db, 'events');
      const q = query(eventsCol, orderBy('date', 'asc'));
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            const events: Event[] = snapshot.docs.map((doc) => {
              const firestoreEvent: FirestoreEvent = {
                id: doc.id,
                ...(doc.data() as Omit<FirestoreEvent, 'id'>),
              };
              return mapFirestoreEventToEvent(firestoreEvent);
            });
            
            console.log('[EVENT_STORE] Events updated from Firestore:', events.length);
            set({ events, isLoading: false, error: null });
          } catch (error) {
            console.error('[EVENT_STORE] Error processing snapshot:', error);
            set({ isLoading: false, error: 'Error processing events' });
          }
        },
        (error) => {
          console.error('[EVENT_STORE] Snapshot error:', error);
          set({ isLoading: false, error: error.message || 'Error loading events' });
        }
      );
      
      set({ _unsubscribe: unsubscribe });
    } catch (error: any) {
      console.error('[EVENT_STORE] Error initializing subscription:', error);
      set({ isLoading: false, error: error.message || 'Failed to initialize events subscription' });
    }
  },

  addEvent: async (eventData) => {
    // Write to Firestore - onSnapshot will automatically update local state
    // This ensures real-time updates across all pages (Landing, Explore, etc.)
    try {
      const firestoreEvent = await createFirestoreEvent(eventData);
      // onSnapshot will pick up the new event and update the store automatically
      // Return the created event for immediate use if needed
      return firestoreEvent;
    } catch (error) {
      console.error('[EVENT_STORE] Failed to create event in Firestore:', error);
      throw error;
    }
  },

  updateEvent: (eventId, updates) => {
    set((state) => ({
      events: state.events.map(event => {
        if (event.id === eventId) {
          const updated = { ...event, ...updates };
          // Recalculate location if city or address changed
          if (updates.city || updates.address) {
            updated.location = formatLocation(updated.city, updated.address);
          }
          // Update hostName if host changed
          if (updates.host) {
            updated.hostName = updates.host;
          }
          // Update attendees alias if attendeesCount changed
          if (updates.attendeesCount !== undefined) {
            updated.attendees = updates.attendeesCount;
          }
          return updated;
        }
        return event;
      }),
    }));
  },

  deleteEvent: (eventId) => {
    set((state) => ({
      events: state.events.filter(event => event.id !== eventId),
    }));
  },

  getEvent: (eventId) => {
    return get().events.find(event => event.id === eventId);
  },

  getEvents: () => {
    return get().events;
  },

  getEventsByHost: (hostName) => {
    return get().events.filter(event => 
      event.host === hostName || event.hostName === hostName
    );
  },

  searchEvents: (query) => {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return get().events;

    return get().events.filter((event) => {
      const searchableText = [
        event.title,
        event.description,
        event.city,
        event.address,
        ...event.tags,
      ].join(' ').toLowerCase();

      return searchableText.includes(lowerQuery);
    });
  },

  filterByCity: (city) => {
    if (!city) return get().events;
    return get().events.filter((event) => 
      event.city.toLowerCase().includes(city.toLowerCase())
    );
  },

  filterByTags: (tags) => {
    if (!tags || tags.length === 0) return get().events;
    
    return get().events.filter((event) => {
      const eventTags = Array.isArray(event.tags) ? event.tags : [];
      return tags.some((tag) =>
        eventTags.some((eventTag) =>
          eventTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
    });
  },

  filterByCategory: (category) => {
    if (!category || category === 'All') return get().events;
    return get().events.filter(event => categoryMatches(event.category, category));
  },

  filterByDate: (startDate, endDate) => {
    const events = get().events;
    if (!startDate && !endDate) return events;

    return events.filter(event => {
      // Simple date parsing - you may want to improve this
      const eventDate = new Date(event.date);
      if (startDate && eventDate < new Date(startDate)) return false;
      if (endDate && eventDate > new Date(endDate)) return false;
      return true;
    });
  },

  getEventsByCity: () => {
    const events = get().events || [];
    const grouped: Record<string, Event[]> = {};

    events.forEach((event) => {
      if (event?.city) {
        if (!grouped[event.city]) {
          grouped[event.city] = [];
        }
        grouped[event.city].push(event);
      }
    });

    return grouped;
  },
}));

