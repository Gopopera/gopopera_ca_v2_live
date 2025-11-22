# Popera Group Chat & Event Behavior Update - Implementation Summary

## Overview
This document summarizes all changes made to implement fake hosts/events per city, reservation blocking, and enhanced group conversation logic with host/participant/demo views.

---

## Files Created

### Data Files
1. **`data/fakeHosts.ts`** (UPDATED)
   - Now contains 2 fake hosts per city (10 total hosts across 5 cities)
   - Each host has: id, name, username, email, bio, profileImageUrl, city, useCase
   - All bios include: "This is a sample host used to demonstrate what's possible on Popera."
   - Use cases: musician, fitness-coach, art-workshop, small-business, community-organizer

2. **`data/fakeEvents.ts`** (NEW)
   - Generates 1 fake event per fake host (10 total events)
   - Each event matches host's use case
   - Events have coherent titles, descriptions, images, categories, tags
   - Mix of free and paid events
   - All marked with `isFakeEvent: true`
   - Empty conversations (no messages initialized)

### Components
3. **`components/events/FakeEventReservationModal.tsx`** (NEW)
   - Modal shown when user tries to reserve fake event
   - Message: "This is an example Popera event and cannot be reserved..."
   - "Browse other events" CTA button

4. **`components/chat/DemoEventBlocker.tsx`** (NEW)
   - Blocker shown in chat for fake events
   - Message: "This is a demo event. Group chat is only available for real, upcoming events."

5. **`components/chat/GroupChatHeader.tsx`** (NEW)
   - New header design replacing Popera logo
   - Shows "Group conversation" title
   - Displays host profile photo (larger, more visible)
   - Shows host name and "Host" badge
   - Responsive for mobile and desktop

---

## Files Modified

### Main App
6. **`App.tsx`**
   - Updated to use `generateFakeEvents()` instead of old mock events
   - Fake events initialized after Popera events
   - All fake events properly marked with `isFakeEvent: true`

### Pages
7. **`pages/EventDetailPage.tsx`**
   - Added `FakeEventReservationModal` integration
   - `handleRSVP()` now checks `isFakeEvent` and shows modal instead of reserving
   - "Reserve Spot" button shows "Demo Event (Locked)" for fake events
   - Chat button locked for fake events
   - Displays `aboutEvent` and `whatToExpect` for Popera events

### Components
8. **`components/chat/GroupChat.tsx`** (MAJOR UPDATE)
   - **View Type Detection**: Determines host/participant/demo/blocked views
   - **Host View**: Shows host tools bar (polls, announcements, surveys)
   - **Participant View**: Simplified view without host tools
   - **Demo View**: Always blocked with `DemoEventBlocker`
   - **New Header**: Uses `GroupChatHeader` component
   - **Image Upload**: Added image upload support for hosts and participants
   - **Message Styling**: Host messages styled differently (right-aligned, orange accent)
   - **Reservation Blocker**: Updated text to "Group conversation available only after reservation"
   - **Host Tools**: Only visible to hosts, includes Create Poll, Announcement, Survey buttons

9. **`components/chat/ChatReservationBlocker.tsx`**
   - Updated title: "Group conversation available only after reservation"
   - Updated CTA: "Reserve to access this conversation"

---

## How Fake Hosts and Fake Events Are Represented

### Fake Hosts
- **Location**: `data/fakeHosts.ts`
- **Structure**: 2 hosts per city × 5 cities = 10 total hosts
- **Fields**:
  - `id`: Unique ID (e.g., 'fake-host-vancouver-1')
  - `name`: Realistic name
  - `username`: Username
  - `email`: Email address
  - `bio`: Always includes "This is a sample host used to demonstrate what's possible on Popera."
  - `profileImageUrl`: Avatar image URL
  - `city`: City name
  - `useCase`: Type (musician, fitness-coach, art-workshop, small-business, community-organizer)

### Fake Events
- **Location**: `data/fakeEvents.ts`
- **Structure**: 1 event per fake host = 10 total events
- **Fields**:
  - All standard Event fields
  - `isFakeEvent: true` (key identifier)
  - `hostId`: Links to fake host ID
  - Coherent title, description, image matching use case
  - Mix of free and paid events
  - Empty chat (no messages initialized)

---

## How App Determines View Type

### View Type Logic (in `GroupChat.tsx`)

```typescript
const isFakeEvent = event.isFakeEvent === true;
const isHost = currentUser && currentUser.id === event.hostId;
const hasReserved = currentUser ? currentUser.rsvps.includes(event.id) : false;
const isPoperaOwned = event.isPoperaOwned === true || event.hostId === POPERA_HOST_ID;

const viewType = isFakeEvent 
  ? 'demo' 
  : isHost 
  ? 'host' 
  : (isPoperaOwned || hasReserved) 
  ? 'participant' 
  : 'blocked';
```

### View Types

1. **Demo View** (`isFakeEvent === true`)
   - Always blocked
   - Shows `DemoEventBlocker`
   - No messages, no input
   - Applies to all users (including fake host)

2. **Host View** (`currentUser.id === event.hostId` AND not fake)
   - Always has access (no reservation needed)
   - Shows host tools bar
   - Can create polls, announcements, surveys
   - Messages styled with orange accent, right-aligned
   - Can send text and images

3. **Participant View** (`hasReserved === true` OR `isPoperaOwned === true`)
   - No host tools
   - Can read messages
   - Can send text and images
   - Simplified community conversation view

4. **Blocked View** (not reserved, not Popera-owned, not fake)
   - Shows `ChatReservationBlocker`
   - "Reserve to access this conversation" CTA
   - No messages visible
   - No input field

---

## Reservation Blocking Logic

### Fake Events
- **Location**: `pages/EventDetailPage.tsx` → `handleRSVP()`
- **Behavior**:
  1. User clicks "Reserve Spot" button
  2. `isFakeEvent` check triggers
  3. Shows `FakeEventReservationModal` instead of reserving
  4. Modal message: "This is an example Popera event and cannot be reserved..."
  5. "Browse other events" button routes to feed
  6. Reservation state unchanged
  7. Attendee count unchanged

### Real Events
- **Behavior**: Unchanged
- User can reserve normally
- RSVP updates user's `rsvps` array
- Attendee count increases for Popera events

---

## Group Conversation Blocking Logic

### Fake Events (Demo View)
- **Location**: `components/chat/GroupChat.tsx`
- **Condition**: `isFakeEvent === true`
- **Behavior**:
  - Always shows `DemoEventBlocker` overlay
  - Message: "This is a demo event. Group chat is only available for real, upcoming events."
  - No messages displayed
  - No input field
  - Applies to all users (including fake host)

### Non-Reserved Users (Real Events)
- **Condition**: `!isFakeEvent && !canAccessChat` (not reserved, not Popera-owned)
- **Behavior**:
  - Shows `ChatReservationBlocker` overlay
  - Message: "Group conversation available only after reservation"
  - CTA: "Reserve to access this conversation"
  - Clicking CTA triggers reservation flow:
    - If logged out → Auth pop-up → then reservation
    - If logged in → Immediate reservation
  - After reservation: Blocker removed, chat loads, user stays on same page

### Popera Events
- **Condition**: `isPoperaOwned === true`
- **Behavior**: Chat always open (no reservation needed)
- Shows pinned message explaining open chat

---

## Host Tools

### Visibility
- **Only visible to**: Users where `currentUser.id === event.hostId`
- **Location**: Top of chat area (above messages)
- **Not visible to**: Participants, blocked users, demo events

### Tools Available
1. **Create Poll**
   - Prompts for question and 2 options
   - Creates poll via `addPoll()`
   - Poll displayed in chat

2. **Announcement**
   - Prompts for announcement text
   - Creates announcement message (special styling)
   - Shows with megaphone icon

3. **Survey**
   - Placeholder (shows "coming soon" alert)

4. **More**
   - Placeholder for future host tools

---

## Message Types and Layout

### Text Messages
- **Host messages**: Right-aligned, orange accent background (`bg-[#e35e25]/10`)
- **Participant messages**: Left-aligned, white background
- **Styling**: Clear distinction with border colors and alignment

### Image Messages
- **Format**: `[Image:dataUrl:filename]`
- **Rendering**: Displays image with filename caption
- **Support**: Both hosts and participants can send images
- **Upload**: Image icon button in input area

### Announcements
- **Type**: Special message type
- **Styling**: Dark background (`bg-[#15383c]`), white text
- **Icon**: Megaphone icon
- **Label**: "Host Announcement"

### Polls
- **Styling**: Dark background, white text
- **Display**: Shows question, options with percentages, vote count
- **Creation**: Host-only via host tools

---

## Conversation Header

### Design
- **Title**: "Group conversation" (replaces Popera logo)
- **Host Photo**: Large, visible profile image (14-16px on desktop, 12px on mobile)
- **Host Name**: Displayed prominently
- **Host Badge**: "Host" badge with orange accent
- **Close Button**: X button in top-right

### Implementation
- **Component**: `GroupChatHeader.tsx`
- **Responsive**: Different layouts for mobile/desktop
- **Host Image Source**:
  - Fake hosts: From `FAKE_HOSTS` array
  - Popera: Generic avatar
  - Others: Generated from host name

---

## Confirmation Checklist

### ✅ Real Events' Reservation and Chat Flows Still Work
- Real events can be reserved normally
- Reservation increases attendee count for Popera events
- Chat access granted after reservation
- Popera events have open chat

### ✅ Fake Events Behave as Demo-Only
- Reservation blocked with modal
- Chat always blocked with demo message
- No messages, no input
- Attendee count static

### ✅ Host Tools Only Visible to Hosts
- Host tools bar only shown when `isHost === true`
- Participants don't see host tools
- Blocked users don't see host tools
- Demo events don't show host tools

### ✅ Participants Can Send Text and Photos
- Participants can send text messages
- Participants can upload and send images
- Image upload button visible in input area
- Messages display correctly

### ✅ New Conversation Header Visible and Consistent
- Header shows on all views (host/participant/demo)
- "Group conversation" title visible
- Host photo, name, and badge displayed
- Consistent across mobile and desktop

---

## Summary

### Fake Hosts & Events
- ✅ 2 fake hosts per city (10 total)
- ✅ 1 fake event per host (10 total)
- ✅ All events coherent with matching images/descriptions
- ✅ Mix of free and paid events

### Reservation Blocking
- ✅ Fake events show modal instead of reserving
- ✅ Real events work normally
- ✅ Modal includes "Browse other events" CTA

### Group Chat Logic
- ✅ Host view: Tools visible, can send messages/images
- ✅ Participant view: No tools, can send messages/images
- ✅ Demo view: Always blocked
- ✅ Blocked view: Reservation blocker shown

### Header & Messages
- ✅ New header with host info
- ✅ Text and image message support
- ✅ Host messages styled differently
- ✅ Consistent across all views

---

## Technical Notes

- All fake events have empty conversations (no initial messages)
- Image upload uses data URLs (in production, upload to storage first)
- Host tools use simple prompts (can be enhanced with proper modals)
- View type determination is centralized in GroupChat component
- No changes to existing search, filter, or navigation logic


