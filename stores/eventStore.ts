import { create } from 'zustand';
import { Event } from '../types';
import { categoryMatches } from '../utils/categoryMapper';
import { createEvent as createFirestoreEvent, mapFirestoreEventToEvent } from '../firebase/db';
import { getDbSafe } from '../src/lib/firebase';
import { collection, onSnapshot, query, type Unsubscribe } from 'firebase/firestore';
import type { FirestoreEvent } from '../firebase/types';

interface EventStore {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  _unsubscribe: Unsubscribe | null; // Internal unsubscribe function for onSnapshot
  init: () => void; // Initialize real-time subscription
  addEvent: (event: Omit<Event, 'id' | 'createdAt' | 'location' | 'hostName' | 'attendees'>) => Promise<Event>;
  updateEvent: (eventId: string, updates: Partial<Omit<Event, 'id' | 'createdAt'>>) => Promise<void>;
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
      
      // Subscribe to events collection
      // IMPORTANT: Query without orderBy first to avoid index requirements
      // We'll sort client-side to ensure all events are loaded
      const eventsCol = collection(db, 'events');
      
      // Use a simple query without orderBy to avoid index issues
      // Filter for public events only (isPublic !== false, defaulting to true)
      // Note: Firestore doesn't support != null, so we query all and filter client-side
      const q = query(eventsCol);
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            // Map and filter events
            const events: Event[] = snapshot.docs
              .map((doc) => {
                const data = doc.data();
                // CRITICAL: Only filter out events that are EXPLICITLY marked as private or draft
                // Events without isPublic field are PUBLIC by default - always show them
                // Events without isDraft field are NOT drafts - always show them
                // This ensures backward compatibility and never hides user events
                const isExplicitlyPrivate = data.isPublic === false; // Must be explicitly false
                const isExplicitlyDraft = data.isDraft === true; // Must be explicitly true
                
                if (isExplicitlyPrivate || isExplicitlyDraft) {
                  return null; // Skip only explicitly private events and drafts
                }
                
                const firestoreEvent: FirestoreEvent = {
                  id: doc.id,
                  ...(data as Omit<FirestoreEvent, 'id'>),
                };
                return mapFirestoreEventToEvent(firestoreEvent);
              })
              .filter((event): event is Event => event !== null) // Remove nulls
              // Sort by date client-side (handle missing dates)
              .sort((a, b) => {
                const dateA = a.date || '';
                const dateB = b.date || '';
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1; // Events without dates go to end
                if (!dateB) return -1;
                return dateA.localeCompare(dateB);
              });
            
            console.log('[EVENT_STORE] ✅ Events updated from Firestore:', {
              totalEvents: events.length,
              totalDocsInFirestore: snapshot.docs.length,
              filteredOut: snapshot.docs.length - events.length,
              eventIds: events.map(e => e.id),
              eventTitles: events.map(e => e.title),
              eventCities: events.map(e => e.city),
              note: 'All events without explicit isPublic=false or isDraft=true are shown'
            });
            set({ events, isLoading: false, error: null });
          } catch (error) {
            console.error('[EVENT_STORE] Error processing snapshot:', error);
            set({ isLoading: false, error: 'Error processing events' });
          }
        },
        (error: any) => {
          console.error('[EVENT_STORE] Snapshot error:', error);
          // Handle permission errors gracefully
          if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
            console.warn('[EVENT_STORE] Permission denied - user may not have access to events collection');
            set({ isLoading: false, error: 'Permission denied. Please check your Firestore security rules.' });
          } else {
            set({ isLoading: false, error: error.message || 'Error loading events' });
          }
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

  updateEvent: async (eventId, updates) => {
    // Update in Firestore first
    try {
      const { updateEvent: updateEventInFirestore } = await import('../firebase/db');
      const updatedEvent = await updateEventInFirestore(eventId, updates);
      
      // Then update local store
      set((state) => ({
        events: state.events.map(event => {
          if (event.id === eventId) {
            const updated = { ...event, ...updatedEvent };
            // Recalculate location if city or address changed
            if (updates.city || updates.address) {
              updated.location = formatLocation(updated.city || event.city, updated.address || event.address);
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
        })
      }));
    } catch (error: any) {
      // Don't log permission errors - they're expected and handled elsewhere
      if (error?.code !== 'permission-denied' && !error?.message?.includes('permission')) {
        console.error('[EVENT_STORE] Error updating event in Firestore:', error);
      }
      
      // Only update local store optimistically if it's not a permission error
      // Permission errors mean we shouldn't update at all
      if (error?.code !== 'permission-denied' && !error?.message?.includes('permission')) {
        set((state) => ({
          events: state.events.map(event => {
            if (event.id === eventId) {
              const updated = { ...event, ...updates };
              // Recalculate location if city or address changed
              if (updates.city || updates.address) {
                updated.location = formatLocation(updated.city || event.city, updated.address || event.address);
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
          })
        }));
      }
      
      // Re-throw to let callers handle it
      throw error;
    }
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
        event.hostName,
        event.aboutEvent || '',
        event.whatToExpect || '',
        ...(event.tags || []),
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

    // Helper to normalize city name to "City, CA" format
    const normalizeCityName = (city: string): string => {
      if (!city) return '';
      // Remove any existing country code and whitespace
      const cleaned = city.trim().replace(/,\s*CA$/, '').replace(/,\s*Canada$/, '').trim();
      // Add ", CA" if not already present
      return cleaned ? `${cleaned}, CA` : '';
    };

    events.forEach((event) => {
      if (event?.city) {
        // Normalize city name to ensure consistent format
        const normalizedCity = normalizeCityName(event.city);
        if (normalizedCity) {
          if (!grouped[normalizedCity]) {
            grouped[normalizedCity] = [];
          }
          grouped[normalizedCity].push(event);
        }
      }
    });

    return grouped;
  },
}));

