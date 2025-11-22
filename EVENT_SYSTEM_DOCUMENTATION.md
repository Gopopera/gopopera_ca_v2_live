# Event System Documentation

## Overview
A complete event creation and event feed system has been implemented using Zustand for state management and mock data storage. The system is ready for Firebase integration.

## Files Created

### 1. `stores/eventStore.ts`
**Location:** `/stores/eventStore.ts`

**Purpose:** Zustand store for event management

**Key Functions:**
- `addEvent()` - Add a new event to the store
- `getEvents()` - Get all events
- `searchEvents(query)` - Search events by title, description, city, address, and tags
- `filterByCity(city)` - Filter events by city
- `filterByTags(tags)` - Filter events by tags
- `getEventsByCity()` - Group events by city

**Store Structure:**
```typescript
interface EventStore {
  events: Event[];
  addEvent: (event: Omit<Event, 'id' | 'createdAt' | 'location' | 'hostName' | 'attendees'>) => void;
  getEvents: () => Event[];
  searchEvents: (query: string) => Event[];
  filterByCity: (city: string) => Event[];
  filterByTags: (tags: string[]) => Event[];
  getEventsByCity: () => Record<string, Event[]>;
}
```

## Files Modified

### 1. `types.ts`
**Changes:**
- Extended Event interface with new required fields:
  - `city: string`
  - `address: string`
  - `tags: string[]`
  - `host: string`
  - `attendeesCount: number`
  - `createdAt: string`
- Maintained backward compatibility with legacy fields (`location`, `hostName`, `attendees`)

### 2. `pages/CreateEventPage.tsx`
**Changes:**
- Complete rewrite with full form functionality
- Added all required fields:
  - Event Title (required)
  - Pop-Up Type/Category (required)
  - Description (required)
  - City with autocomplete (required)
  - Address (optional)
  - Date & Time (required)
  - Image Upload (mock - creates data URL)
  - Tags (add/remove functionality)
  - Attendees Limit (optional)
  - Price
- Form validation
- Saves events to Zustand store on submit
- Redirects to event feed after creation

### 3. `App.tsx`
**Changes:**
- Integrated Zustand store for event management
- Replaced `generateMockEvents()` usage with store
- Added search functionality using `searchEvents()`
- Added city filtering using `filterByCity()`
- Added tag filtering using `filterByTags()`
- Added city categorization using `getEventsByCity()`
- Updated all event references to use `allEvents` from store
- Added tag filter UI in feed
- Events are automatically grouped by city when no filters are active

## Features Implemented

### ✅ Event Creation
- Full form with all required fields
- Image upload (mock - creates data URL)
- Tag management (add/remove)
- City autocomplete with suggestions
- Form validation
- Automatic redirect to feed after creation

### ✅ Event Feed
- Displays all events from store
- Responsive grid layout (mobile/desktop)
- Clickable event cards
- Proper image sizing (no stretching)

### ✅ Search & Filtering
- **Real-time search:** Searches title, description, tags, city, and address
- **City filter:** Filter by city with autocomplete dropdown
- **Tag filter:** Filter by one or multiple tags
- **Category filter:** Filter by event category
- All filters work simultaneously

### ✅ City Categorization
- Events automatically grouped by city
- City browsing through:
  - Search bar
  - City dropdown selector
  - Automatic grouping in feed

### ✅ Mobile & Desktop Compatibility
- Fully responsive layouts
- Touch-optimized interactions
- Proper image scaling
- Horizontal scroll on mobile where appropriate

## Mock Store Location

**File:** `stores/eventStore.ts`

The store uses in-memory storage (Zustand state). Events persist during the session but are lost on page refresh.

## How to Replace Mock Store with Firebase

### Step 1: Install Firebase
```bash
npm install firebase
```

### Step 2: Create Firebase Config
Create `config/firebase.ts`:
```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### Step 3: Update `stores/eventStore.ts`

Replace the Zustand store implementation:

```typescript
import { create } from 'zustand';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Event } from '../types';

interface EventStore {
  events: Event[];
  loading: boolean;
  addEvent: (event: Omit<Event, 'id' | 'createdAt' | 'location' | 'hostName' | 'attendees'>) => Promise<void>;
  getEvents: () => Promise<Event[]>;
  searchEvents: (query: string) => Promise<Event[]>;
  filterByCity: (city: string) => Promise<Event[]>;
  filterByTags: (tags: string[]) => Promise<Event[]>;
  getEventsByCity: () => Promise<Record<string, Event[]>>;
  fetchEvents: () => Promise<void>;
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  loading: false,

  fetchEvents: async () => {
    set({ loading: true });
    try {
      const eventsRef = collection(db, 'events');
      const snapshot = await getDocs(eventsRef);
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      set({ events, loading: false });
    } catch (error) {
      console.error('Error fetching events:', error);
      set({ loading: false });
    }
  },

  addEvent: async (eventData) => {
    try {
      const eventsRef = collection(db, 'events');
      const docRef = await addDoc(eventsRef, {
        ...eventData,
        createdAt: new Date().toISOString(),
        location: formatLocation(eventData.city, eventData.address),
        hostName: eventData.host,
        attendees: eventData.attendeesCount,
      });
      
      // Add to local state
      const newEvent = {
        ...eventData,
        id: docRef.id,
        createdAt: new Date().toISOString(),
        location: formatLocation(eventData.city, eventData.address),
        hostName: eventData.host,
        attendees: eventData.attendeesCount,
      } as Event;
      
      set((state) => ({
        events: [...state.events, newEvent],
      }));
    } catch (error) {
      console.error('Error adding event:', error);
    }
  },

  getEvents: async () => {
    if (get().events.length === 0) {
      await get().fetchEvents();
    }
    return get().events;
  },

  searchEvents: async (query) => {
    const events = await get().getEvents();
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return events;

    return events.filter((event) => {
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

  filterByCity: async (city) => {
    const events = await get().getEvents();
    if (!city) return events;
    
    // Or use Firestore query:
    // const q = query(collection(db, 'events'), where('city', '==', city));
    // const snapshot = await getDocs(q);
    
    return events.filter((event) => 
      event.city.toLowerCase().includes(city.toLowerCase())
    );
  },

  filterByTags: async (tags) => {
    const events = await get().getEvents();
    if (!tags || tags.length === 0) return events;
    
    return events.filter((event) => {
      return tags.some((tag) =>
        event.tags.some((eventTag) =>
          eventTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
    });
  },

  getEventsByCity: async () => {
    const events = await get().getEvents();
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
```

### Step 4: Update `App.tsx`

Add `fetchEvents()` call on mount:

```typescript
useEffect(() => {
  useEventStore.getState().fetchEvents();
}, []);
```

### Step 5: Update `CreateEventPage.tsx`

No changes needed - it already uses `addEvent()` from the store.

### Step 6: Firestore Collection Structure

Create a collection named `events` with documents structured as:

```typescript
{
  title: string;
  description: string;
  city: string;
  address: string;
  date: string;
  time: string;
  tags: string[];
  host: string;
  imageUrl: string;
  attendeesCount: number;
  createdAt: string;
  category: string;
  price: string;
  rating: number;
  reviewCount: number;
  capacity?: number;
}
```

### Step 7: Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      allow read: if true; // Public read
      allow create: if request.auth != null; // Authenticated users only
      allow update, delete: if request.auth != null && 
        resource.data.host == request.auth.uid; // Only event host
    }
  }
}
```

## Testing

1. **Create Event:**
   - Log in
   - Navigate to Create Event
   - Fill all required fields
   - Add tags
   - Upload image
   - Submit
   - Should redirect to feed and show new event

2. **Search:**
   - Type in search bar
   - Should filter events in real-time

3. **Filter by City:**
   - Select city from dropdown
   - Should show only events in that city

4. **Filter by Tags:**
   - Click tag buttons
   - Should filter events by selected tags

5. **City Grouping:**
   - Clear all filters
   - Should see events grouped by city

## Notes

- The mock store is session-only (data lost on refresh)
- Firebase integration will provide persistence
- All event operations are synchronous in mock store
- Firebase operations will be asynchronous (use async/await)
- Image upload is currently mock (data URL) - Firebase Storage needed for production


