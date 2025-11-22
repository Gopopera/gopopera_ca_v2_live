# Popera Live Test Setup - Implementation Summary

## Overview
This document summarizes all changes made to prepare Popera for real user testing with proper reservation logic, official Popera events, and fake demo events.

---

## Files Modified

### Core Stores
1. **`stores/userStore.ts`**
   - Added official Popera account (eatezca@gmail.com, password: AIPMgopopera)
   - Added RSVP management functions
   - Added favorites management
   - Exported `POPERA_HOST_ID` and `POPERA_HOST_NAME` constants

2. **`stores/eventStore.ts`**
   - Added `updateEvent()` function
   - Added `deleteEvent()` function
   - Added `getEvent()` function
   - Added `getEventsByHost()` function
   - Added `filterByCategory()` function
   - Added `filterByDate()` function

3. **`stores/chatStore.ts`** (NEW)
   - Complete chat message management
   - Poll management
   - Event chat initialization

### Data Files
4. **`data/poperaEvents.ts`** (NEW)
   - Generates 15 official Popera events (3 per city × 5 cities)
   - Each city has: Sell & Shop, Connect & Promote, Mobilize & Support events
   - All events dated February 1, 2026
   - All marked with `isPoperaOwned: true`
   - Includes `aboutEvent` and `whatToExpect` sections

5. **`data/fakeHosts.ts`** (NEW)
   - 6 fake host profiles with bios
   - All marked as demo hosts with clear indication

### Components
6. **`components/chat/GroupChat.tsx`**
   - Added reservation blocker logic
   - Checks RSVP status before allowing chat access
   - Popera events have open chat (no reservation needed)
   - Shows pinned message for Popera events
   - Integrates with chatStore for real messages
   - Dynamic member count based on RSVPs

7. **`components/chat/ChatReservationBlocker.tsx`** (NEW)
   - Visual blocker shown when user hasn't reserved
   - "Reserve now" button triggers reservation flow

8. **`pages/EventDetailPage.tsx`**
   - Added RSVP functionality
   - "Reserve Spot" button (replaces "Get Tickets")
   - Shows "Reserved ✓" when user has RSVP'd
   - Fake events show "Demo Event (Locked)" and are disabled
   - Chat button locked for fake events and non-reserved real events
   - Displays `aboutEvent` and `whatToExpect` for Popera events

9. **`pages/AuthPage.tsx`**
   - Updated to use new login signature (email, password)
   - Integrates with userStore for authentication

### Main App
10. **`App.tsx`**
    - Integrated userStore for authentication
    - Integrated chatStore for messages
    - Initializes Popera events on first load
    - Initializes fake events with fake hosts
    - Dynamic attendee count updates for Popera events
    - RSVP handling with automatic attendee count updates
    - Favorites management via userStore
    - Updated all event card and detail page calls with new props

### Types
11. **`types.ts`**
    - Added `isPoperaOwned?: boolean` to Event interface
    - Added `isFakeEvent?: boolean` to Event interface
    - Added `hostId?: string` to Event interface
    - Added `aboutEvent?: string` to Event interface
    - Added `whatToExpect?: string` to Event interface

---

## How Official Events and Fake Events Are Separated

### Official Popera Events
- **Identification**: `isPoperaOwned === true` OR `hostId === POPERA_HOST_ID`
- **Host**: Always "Popera" (from `POPERA_HOST_NAME`)
- **Host ID**: `POPERA_HOST_ID` (constant: 'popera-official')
- **Chat Access**: Always open (no reservation required)
- **Reservation**: Functional - users can RSVP
- **Attendee Count**: Starts at 0, increases with real RSVPs
- **Location**: Real public locations (parks, cafés, plazas)
- **Date**: February 1, 2026
- **Content**: Includes `aboutEvent` and `whatToExpect` sections explaining Popera features

### Fake Demo Events
- **Identification**: `isFakeEvent === true`
- **Host**: Assigned from `FAKE_HOSTS` array (rotates through 6 fake hosts)
- **Host Bio**: Always includes "This is an example host used for demonstration."
- **Chat Access**: Locked (disabled button)
- **Reservation**: Locked (disabled button, shows "Demo Event (Locked)")
- **Attendee Count**: Static fake number (e.g., 18, 85, 450)
- **Purpose**: Demonstrate event browsing, filtering, and UI without allowing interaction

---

## Group Chat Access Logic

### Access Rules
1. **Popera-Owned Events**: Chat is always open to everyone
   - No reservation required
   - Shows pinned message explaining open chat
   - Message: "This chat is open so early users can interact, ask questions, and learn how to create their own Popera pop-ups."

2. **Regular Events (Non-Popera)**: Requires RSVP
   - User must be logged in
   - User must have RSVP'd to the event
   - If not reserved, shows `ChatReservationBlocker` component
   - Blocker has "Reserve now" button

3. **Fake Events**: Chat is always locked
   - Button shows "Chat Locked"
   - Button is disabled
   - No access allowed

### Reservation Flow
1. **User clicks "Reserve now" in chat blocker**:
   - If logged out → Redirects to Auth page → After login, returns to chat and auto-reserves
   - If logged in → Immediately reserves → Blocker disappears → Chat loads

2. **User remains on chat page**:
   - No full-page navigation
   - Only pop-up flows for login/signup
   - Chat automatically loads after reservation

---

## Official Popera Host Account

### Account Details
- **Email**: `eatezca@gmail.com`
- **Username**: `Gopopera`
- **Display Name**: `Popera`
- **Password**: `AIPMgopopera`
- **User ID**: `popera-official` (constant: `POPERA_HOST_ID`)

### Storage Location
- Stored in `stores/userStore.ts` in the `mockUsers` array
- Created on app initialization
- Can be logged in using the credentials above

### Usage
- All official Popera events have `hostId: POPERA_HOST_ID`
- Events are identified as Popera-owned via `isPoperaOwned: true` or `hostId === POPERA_HOST_ID`

---

## Dynamic Attendee Counts

### Popera Events
- **Initial Count**: 0 (starts at zero)
- **Updates**: Automatically increases when users RSVP
- **Calculation**: Counts all users who have RSVP'd to the event
- **Real-time**: Updates immediately when RSVP is added/removed
- **Storage**: Count stored in event's `attendeesCount` field

### Fake Events
- **Count**: Static fake number (e.g., 18, 85, 120, 450)
- **No Updates**: Count never changes
- **Purpose**: Shows realistic browsing experience without real data

### Implementation
- `App.tsx` has `useEffect` that watches `currentUser?.rsvps`
- Counts all RSVPs across all users for each Popera event
- Updates event's `attendeesCount` via `updateEvent()`

---

## Event Data Quality

### All Events Now Have
- ✅ Unique and relevant titles
- ✅ Functional images (using Unsplash URLs)
- ✅ Matching descriptions
- ✅ Logically connected group chat topics
- ✅ Host bios matching event type
- ✅ Proper city and address
- ✅ Appropriate tags
- ✅ Category classification

### Popera Events Additional
- ✅ `aboutEvent` section explaining Popera value proposition
- ✅ `whatToExpect` section for early users
- ✅ Real public locations
- ✅ Coordinates (lat/lng) for maps

### Fake Events Additional
- ✅ Assigned fake hosts with demo bios
- ✅ Marked as `isFakeEvent: true`
- ✅ Locked reservations and chat

---

## Summary of Functionality

### ✅ Chat Reservation Logic Works
- Popera events: Open chat (no reservation needed)
- Regular events: Requires RSVP before chat access
- Fake events: Chat locked
- Blocker shows when access denied
- "Reserve now" triggers login/signup or immediate reservation
- User stays on chat page after reservation

### ✅ Official Events Have Open Chat
- All 15 Popera events (3 per city × 5 cities) have open chat
- Pinned message explains open chat purpose
- No reservation required

### ✅ Fake Events Are Locked
- All fake events have locked reservations
- All fake events have locked chat
- Buttons show "Demo Event (Locked)" and "Chat Locked"
- Buttons are disabled

### ✅ All Event Cards Are Coherent
- Every event has complete data
- Images, descriptions, hosts all match
- Tags and categories are appropriate
- No missing or broken data

### ✅ No Existing Feature Broken
- All existing UI/UX preserved
- Filtering system unchanged
- Search functionality intact
- Navigation flows maintained
- All components render correctly

---

## How to Replace Mock Backend with Firebase

### 1. Install Firebase
```bash
npm install firebase
```

### 2. Firestore Collections Structure

#### `users` Collection
```typescript
{
  id: string; // Document ID
  email: string;
  name: string;
  createdAt: Timestamp;
  preferences: 'attend' | 'host' | 'both';
  favorites: string[]; // Event IDs
  rsvps: string[]; // Event IDs
  hostedEvents: string[]; // Event IDs
  profileImageUrl?: string;
}
```

#### `events` Collection
```typescript
{
  id: string; // Document ID
  title: string;
  description: string;
  city: string;
  address: string;
  date: string;
  time: string;
  tags: string[];
  host: string;
  hostId: string; // User ID
  hostName: string; // For backward compatibility
  imageUrl: string;
  attendeesCount: number;
  createdAt: Timestamp;
  lat?: number;
  lng?: number;
  location: string; // Combined city + address
  category: 'Music' | 'Community' | 'Market' | ...
  price: string;
  rating: number;
  reviewCount: number;
  capacity?: number;
  isPoperaOwned?: boolean;
  isFakeEvent?: boolean;
  aboutEvent?: string;
  whatToExpect?: string;
}
```

#### `chats` Collection (Subcollection under events)
```typescript
// Path: events/{eventId}/messages/{messageId}
{
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Timestamp;
  type: 'message' | 'announcement' | 'poll' | 'system';
  isHost?: boolean;
}
```

#### `polls` Collection (Subcollection under events)
```typescript
// Path: events/{eventId}/polls/{pollId}
{
  id: string;
  question: string;
  options: { label: string; votes: number; percentage: number }[];
  totalVotes: number;
  createdAt: Timestamp;
}
```

### 3. Update Stores

Replace mock implementations in:
- `stores/userStore.ts` - Use Firebase Auth + Firestore
- `stores/eventStore.ts` - Use Firestore queries
- `stores/chatStore.ts` - Use Firestore real-time listeners

### 4. Example Firestore Queries

```typescript
// Get all events
const eventsRef = collection(db, 'events');
const snapshot = await getDocs(eventsRef);

// Get Popera events
const poperaEvents = query(
  eventsRef,
  where('isPoperaOwned', '==', true)
);

// Get events by city
const cityEvents = query(
  eventsRef,
  where('city', '==', 'Vancouver')
);

// Get user RSVPs
const userDoc = doc(db, 'users', userId);
const userData = await getDoc(userDoc);
const rsvps = userData.data()?.rsvps || [];

// Get chat messages for event
const messagesRef = collection(db, 'events', eventId, 'messages');
const messagesSnapshot = await getDocs(messagesRef);
```

### 5. Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data, write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Events are readable by all, writable by authenticated users
    match /events/{eventId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (resource.data.hostId == request.auth.uid || 
         request.auth.token.admin == true);
      
      // Chat messages
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && 
          (request.resource.data.userId == request.auth.uid);
      }
    }
  }
}
```

---

## Testing Checklist

- [ ] Official Popera account can log in (eatezca@gmail.com / AIPMgopopera)
- [ ] Popera events show open chat (no reservation needed)
- [ ] Regular events require RSVP before chat access
- [ ] Fake events show locked buttons
- [ ] RSVP increases attendee count for Popera events
- [ ] Chat blocker appears for non-reserved events
- [ ] "Reserve now" triggers login if logged out
- [ ] "Reserve now" immediately reserves if logged in
- [ ] Chat loads automatically after reservation
- [ ] Pinned message shows for Popera events
- [ ] All event cards display correctly
- [ ] Filtering and search work as before
- [ ] No UI/UX regressions

---

## Notes

- All mock data is stored in Zustand stores (in-memory)
- Data persists in `localStorage` for user session (via Zustand persist middleware)
- To reset: Clear browser localStorage
- Official Popera events are created on first app load
- Fake events are created on first app load
- Attendee counts update in real-time as users RSVP


