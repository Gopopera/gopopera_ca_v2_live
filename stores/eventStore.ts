import { create } from 'zustand';
import { Event } from '../types';
import { categoryMatches } from '../utils/categoryMapper';

interface EventStore {
  events: Event[];
  addEvent: (event: Omit<Event, 'id' | 'createdAt' | 'location' | 'hostName' | 'attendees'>) => Event;
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

  addEvent: (eventData) => {
    const newEvent = createEvent(eventData);
    set((state) => ({
      events: [...state.events, newEvent],
    }));
    return newEvent;
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
      return tags.some((tag) =>
        event.tags.some((eventTag) =>
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
    const events = get().events;
    const grouped: Record<string, Event[]> = {};

    events.forEach((event) => {
      if (!grouped[event.city]) {
        grouped[event.city] = [];
      }
      grouped[event.city].push(event);
    });

    return grouped;
  },
}));

