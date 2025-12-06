# Comprehensive Diagnostic Audit Report
**Popera Codebase - Structural & Architectural Analysis**  
**Date**: Generated automatically  
**Scope**: Full codebase audit for synchronization issues

---

## EXECUTIVE SUMMARY

This audit identifies **critical structural inconsistencies** and **architectural flaws** causing:
1. Group conversation messages not appearing
2. Profile picture inconsistencies
3. Notification system failures
4. Metrics not auto-updating

**Key Finding**: Multiple sources of truth, inconsistent field naming, and subscription management issues are causing desynchronization across the application.

---

## PART A: FIRESTORE STRUCTURE DETECTION

### A.1 Collections Identified

#### ✅ **Primary Collections**

1. **`events/{eventId}`**
   - **Path**: `collection(db, "events")`
   - **Subcollections**:
     - `events/{eventId}/messages/{messageId}` - Chat messages
     - `events/{eventId}/reviews/{reviewId}` - Event reviews
     - `events/{eventId}/expulsions/{expulsionId}` - User expulsions
     - `events/{eventId}/surveys/{surveyId}` - Host surveys

2. **`users/{userId}`**
   - **Path**: `collection(db, "users")`
   - **Subcollections**:
     - `users/{userId}/notifications/{notificationId}` - User notifications

3. **`reservations/{reservationId}`**
   - **Path**: `collection(db, "reservations")`
   - **No subcollections**

4. **`reviews/{reviewId}`**
   - **Path**: `collection(db, "reviews")` (legacy, also exists as subcollection)

5. **`announcements/{eventId}/items/{announcementId}`**
   - **Path**: `collection(db, "announcements", eventId, "items")`
   - **Subcollections**:
     - `announcements/{eventId}/items/{announcementId}/votes/{userId}` - Poll votes

---

### A.2 Document Schemas

#### **`events/{eventId}` Document**

```typescript
{
  // Core fields
  id: string;                    // Document ID
  title: string;
  description: string;
  date: string;                  // String format
  time: string;
  city: string;
  address: string;
  location: string;              // Combined city + address
  tags: string[];
  
  // Host fields
  host: string;                  // Display name (legacy)
  hostName: string;              // Display name (preferred)
  hostId: string;                // User ID
  hostPhotoURL?: string;         // ⚠️ SNAPSHOT - may be stale
  
  // Images
  imageUrl?: string;              // Main image (legacy)
  imageUrls?: string[];           // Array of images (preferred)
  
  // Metrics
  attendeesCount: number;        // ⚠️ May not auto-update
  rating?: number;
  reviewCount?: number;
  capacity?: number;
  
  // Timestamps
  createdAt: number;             // Timestamp
  updatedAt?: number;             // Timestamp
  
  // Flags
  isPoperaOwned?: boolean;
  isDemo?: boolean;
  isDraft?: boolean;
  isPublic?: boolean;
  isOfficialLaunch?: boolean;
  allowChat?: boolean;
  allowRsvp?: boolean;
  
  // Additional
  category: string;
  price: string;
  lat?: number;
  lng?: number;
  aboutEvent?: string;
  whatToExpect?: string;
  hostPhoneNumber?: string;
  vibes?: string[];
  sessionFrequency?: string;
  sessionMode?: string;
  country?: string;
  mainCategory?: string;
  durationWeeks?: number;
  weeklyDayOfWeek?: number;
  monthlyDayOfMonth?: number;
  startDateTime?: number;
  startDate?: number;
  endDate?: number;
  subtitle?: string;
  demoPurpose?: string;
  demoType?: string;
  managedBy?: string;
  status?: string;
  public?: boolean;               // ⚠️ DUPLICATE of isPublic
}
```

**⚠️ ISSUES IDENTIFIED**:
- `hostPhotoURL` is a snapshot at event creation - **may be stale**
- `attendeesCount` may not auto-update (depends on listeners)
- `public` and `isPublic` both exist (duplicate)
- `startDate` and `startDateTime` both exist (redundant)

---

#### **`users/{userId}` Document**

```typescript
{
  // Core fields
  id: string;                    // Document ID
  uid: string;                   // Same as id
  name: string;
  displayName?: string;          // ⚠️ DUPLICATE of name
  email: string;
  
  // Profile pictures - ⚠️ CRITICAL INCONSISTENCY
  photoURL?: string;             // Primary field (standardized)
  imageUrl?: string;             // Fallback field (legacy)
  // ⚠️ BOTH EXIST - causing desync
  
  // Location
  city?: string;
  preferredCity?: string;
  
  // Bio
  bio?: string;
  fullName?: string;
  
  // Preferences
  preferences?: 'attend' | 'host' | 'both';
  signupIntent?: 'attend' | 'host' | 'both';
  
  // Arrays
  favorites?: string[];          // Event IDs
  hostedEvents?: string[];        // Event IDs
  following?: string[];          // Host IDs
  followers?: string[];          // User IDs
  bannedEvents?: string[];        // Event IDs
  
  // Phone
  phone_number?: string;
  phoneVerified?: boolean;
  phone_verified?: boolean;      // ⚠️ DUPLICATE of phoneVerified
  phoneVerifiedForHosting?: boolean;
  hostPhoneNumber?: string | null;
  
  // Notification settings
  notification_settings?: {
    email_opt_in?: boolean;
    sms_opt_in?: boolean;
    notification_opt_in?: boolean;
  };
  
  // Flags
  isDemoHost?: boolean;
  isOfficialHost?: boolean;
  isPoperaDemoHost?: boolean;
  isVerified?: boolean;
  username?: string;
  
  // Timestamps
  createdAt: number;
  updatedAt?: number | unknown;  // ⚠️ Type inconsistency
}
```

**⚠️ CRITICAL ISSUES IDENTIFIED**:
1. **Profile Picture Fields**: Both `photoURL` and `imageUrl` exist - **no single source of truth**
2. **Name Fields**: Both `name` and `displayName` exist - **inconsistent usage**
3. **Phone Verification**: Both `phoneVerified` and `phone_verified` exist - **duplicate**
4. **UpdatedAt Type**: `number | unknown` - **type inconsistency**

---

#### **`events/{eventId}/messages/{messageId}` Document**

```typescript
{
  id: string;                    // Document ID
  eventId: string;
  userId: string;
  userName: string;
  text: string;                   // Message content
  createdAt: number;             // Timestamp
  type?: 'message' | 'announcement' | 'poll' | 'system';
  isHost?: boolean;               // ⚠️ May not be set correctly
}
```

**⚠️ ISSUES IDENTIFIED**:
- `isHost` flag may not be set correctly when host sends messages
- No `conversationId` field (messages directly linked to eventId)

---

#### **`users/{userId}/notifications/{notificationId}` Document**

```typescript
{
  id: string;                    // Document ID
  userId: string;                // ⚠️ Redundant (already in path)
  type: 'new-event' | 'new-rsvp' | 'announcement' | 'poll' | 'new-message' | 'followed-host-event' | 'new-follower' | 'new-favorite' | 'event-getting-full' | 'event-trending' | 'follow-host-suggestion';
  title: string;
  body: string;
  timestamp: number;             // serverTimestamp
  read: boolean;
  eventId?: string;
  hostId?: string;
  createdAt?: number;
}
```

**✅ SCHEMA CORRECT** - No issues identified

---

#### **`reservations/{reservationId}` Document**

```typescript
{
  id: string;                    // Document ID
  eventId: string;
  userId: string;
  reservedAt: number;            // Timestamp
  status: "reserved" | "checked_in" | "cancelled";
  attendeeCount?: number;        // Number of attendees
  supportContribution?: number;
  paymentMethod?: string;
  totalAmount?: number;
}
```

**✅ SCHEMA CORRECT** - No issues identified

---

### A.3 Field Naming Inconsistencies

#### **Profile Picture Fields** (CRITICAL)

| Field Name | Location | Usage | Status |
|------------|----------|-------|--------|
| `photoURL` | `users/{userId}` | Primary (standardized) | ✅ Correct |
| `imageUrl` | `users/{userId}` | Fallback (legacy) | ⚠️ Duplicate |
| `hostPhotoURL` | `events/{eventId}` | Snapshot at creation | ⚠️ May be stale |
| `profileImageUrl` | `User` interface (stores) | Alias for photoURL | ⚠️ Inconsistent |

**Components Using Profile Pictures**:
- `EventCard.tsx`: Uses `photoURL || imageUrl || event.hostPhotoURL`
- `EventDetailPage.tsx`: Uses `photoURL || imageUrl || event.hostPhotoURL`
- `GroupChatHeader.tsx`: Uses `photoURL || imageUrl || event.hostPhotoURL`
- `HostProfile.tsx`: Uses `photoURL || imageUrl`
- `ProfilePage.tsx`: Uses `photoURL || imageUrl`
- `AttendeeList.tsx`: Uses `photoURL || imageUrl`
- `Header.tsx`: Uses `photoURL || imageUrl`

**⚠️ ISSUE**: No single source of truth - components fetch independently

---

#### **Name Fields** (MODERATE)

| Field Name | Location | Usage | Status |
|------------|----------|-------|--------|
| `name` | `users/{userId}` | Primary | ✅ Correct |
| `displayName` | `users/{userId}` | Alias | ⚠️ Duplicate |
| `hostName` | `events/{eventId}` | Snapshot | ⚠️ May be stale |
| `host` | `events/{eventId}` | Legacy | ⚠️ Deprecated |

**⚠️ ISSUE**: Both `name` and `displayName` exist, causing confusion

---

### A.4 Fields Referenced in UI But NOT in Firestore

**NONE IDENTIFIED** - All UI fields have corresponding Firestore fields

---

### A.5 Fields in Firestore But NOT Referenced in Code

1. **`events/{eventId}.public`** - Exists but `isPublic` is preferred
2. **`events/{eventId}.status`** - Defined but rarely used
3. **`users/{userId}.phone_verified`** - Duplicate of `phoneVerified`

---

## PART B: LISTENER + SUBSCRIPTION AUDIT

### B.1 Real-time Listeners Identified

#### **1. Chat Messages Listener**

**Location**: `firebase/listeners.ts:subscribeToChat()`

**Path**: `events/{eventId}/messages`

**Query**:
```typescript
const messagesCol = collection(db, "events", eventId, "messages");
const q = query(messagesCol, orderBy("createdAt", "asc"));
return onSnapshot(q, callback);
```

**✅ CORRECT** - Path is correct, uses `eventId` from parameter

**⚠️ POTENTIAL ISSUES**:
- Fallback query without `orderBy` if index missing (handled)
- Client-side sorting as backup (correct)

---

#### **2. Chat Store Subscription**

**Location**: `stores/chatStore.ts:subscribeToEventChat()`

**Flow**:
```
subscribeToEventChat(eventId)
  → subscribeToChat(eventId, callback)
    → onSnapshot(events/{eventId}/messages)
      → Updates firestoreMessages[eventId]
        → getMessagesForEvent(eventId) reads from store
```

**✅ CORRECT** - Subscription path is correct

**⚠️ POTENTIAL ISSUES**:
- Multiple subscriptions may be created if `subscribeToEventChat` called multiple times
- Unsubscribe cleanup may not be called properly

---

#### **3. Group Chat Component Subscription**

**Location**: `components/chat/GroupChat.tsx` (lines 151-246)

**Flow**:
```
useEffect(() => {
  if (shouldSubscribe) {
    subscribeToEventChat(event.id);
    // Cleanup
    return () => unsubscribeFromEventChat(event.id);
  }
}, [dependencies]);
```

**⚠️ ISSUES IDENTIFIED**:
1. **Multiple useEffects**: Previously had multiple useEffects managing subscription (now consolidated)
2. **Dependency Array**: Large dependency array may cause unnecessary re-subscriptions
3. **Host Verification**: Periodic verification interval (every 3 seconds) may cause performance issues

**✅ FIXED**: Subscription logic now consolidated into single useEffect

---

#### **4. Reservation Count Listener**

**Location**: `firebase/db.ts:subscribeToReservationCount()`

**Path**: `reservations`

**Query**:
```typescript
const reservationsCol = collection(db, "reservations");
const q = query(
  reservationsCol,
  where("eventId", "==", eventId),
  where("status", "==", "reserved")
);
return onSnapshot(q, callback);
```

**✅ CORRECT** - Path and query are correct

---

#### **5. User RSVPs Listener**

**Location**: `firebase/db.ts:subscribeToUserRSVPs()`

**Path**: `reservations`

**Query**:
```typescript
const reservationsCol = collection(db, "reservations");
const q = query(
  reservationsCol,
  where("userId", "==", userId),
  where("status", "==", "reserved")
);
return onSnapshot(q, callback);
```

**✅ CORRECT** - Path and query are correct

---

#### **6. Followers Count Listener**

**Location**: `firebase/follow.ts:subscribeToFollowersCount()`

**Path**: `users/{hostId}`

**Query**:
```typescript
const hostRef = doc(db, 'users', hostId);
return onSnapshot(hostRef, (snap) => {
  const followers = snap.data()?.followers || [];
  callback(followers.length);
});
```

**✅ CORRECT** - Path is correct

---

#### **7. Unread Notifications Listener**

**Location**: `firebase/notifications.ts:subscribeToUnreadNotificationCount()`

**Path**: `users/{userId}/notifications`

**Query**:
```typescript
const notificationsRef = collection(db, 'users', userId, 'notifications');
const q = query(
  notificationsRef,
  where('read', '==', false),
  limit(100)
);
return onSnapshot(q, callback);
```

**✅ CORRECT** - Path and query are correct

---

#### **8. Events Listener**

**Location**: `stores/eventStore.ts:initialize()`

**Path**: `events`

**Query**:
```typescript
const eventsCol = collection(db, 'events');
const q = query(eventsCol);
return onSnapshot(q, callback);
```

**✅ CORRECT** - Path is correct

---

### B.2 Listener Issues Summary

**✅ ALL LISTENERS POINT TO CORRECT PATHS**

**⚠️ POTENTIAL ISSUES**:
1. **Multiple Subscriptions**: `subscribeToEventChat` may be called multiple times without cleanup
2. **Dependency Arrays**: Large dependency arrays may cause unnecessary re-subscriptions
3. **Cleanup**: Some listeners may not be properly unsubscribed on component unmount

---

## PART C: PROFILE SYNCHRONIZATION AUDIT

### C.1 Profile Picture Sources

#### **Source 1: Firestore User Document**
- **Path**: `users/{userId}`
- **Fields**: `photoURL` (primary), `imageUrl` (fallback)
- **Function**: `getUserProfile(userId)`
- **Location**: `firebase/db.ts:getUserProfile()`

#### **Source 2: Event Document Snapshot**
- **Path**: `events/{eventId}`
- **Field**: `hostPhotoURL`
- **When Set**: At event creation (snapshot)
- **⚠️ ISSUE**: May be stale if host updates profile

#### **Source 3: Firebase Auth**
- **Path**: `user.photoURL` (from Firebase Auth)
- **⚠️ ISSUE**: May differ from Firestore

#### **Source 4: User Store**
- **Path**: `userStore.user.photoURL` or `userStore.user.profileImageUrl`
- **⚠️ ISSUE**: May be stale if not refreshed

---

### C.2 Components Fetching Profile Pictures

| Component | Source | Refresh Interval | Fallback |
|-----------|--------|------------------|----------|
| `EventCard.tsx` | `getUserProfile()` | 3 seconds | `event.hostPhotoURL` |
| `EventDetailPage.tsx` | `getUserProfile()` | 3 seconds | `event.hostPhotoURL` |
| `GroupChatHeader.tsx` | `getUserProfile()` | 2 seconds | `event.hostPhotoURL` |
| `HostProfile.tsx` | `getUserProfile()` | 3 seconds | None |
| `ProfilePage.tsx` | `getUserProfile()` | 3 seconds | `userProfile` or `user` |
| `AttendeeList.tsx` | Direct Firestore query | On mount | None |
| `Header.tsx` | `getUserProfile()` | 3 seconds | `userProfile` or `user` |

**⚠️ ISSUES IDENTIFIED**:
1. **No Single Source of Truth**: Each component fetches independently
2. **Inconsistent Refresh Intervals**: 2-3 seconds (not synchronized)
3. **Different Fallback Logic**: Some use `event.hostPhotoURL`, others don't
4. **No Real-time Subscription**: Using polling instead of `onSnapshot`

---

### C.3 Profile Picture Field Priority

**Current Priority** (inconsistent):
- `EventCard`: `photoURL || imageUrl || event.hostPhotoURL`
- `EventDetailPage`: `photoURL || imageUrl || event.hostPhotoURL`
- `GroupChatHeader`: `photoURL || imageUrl || event.hostPhotoURL`
- `HostProfile`: `photoURL || imageUrl`
- `ProfilePage`: `photoURL || imageUrl || user.photoURL || user.profileImageUrl`

**⚠️ ISSUE**: Priority order is inconsistent across components

---

### C.4 Caching and Derived State

**No Caching Identified** - Components fetch directly from Firestore

**⚠️ ISSUE**: No caching means:
- Multiple fetches for same user
- No shared state between components
- Potential race conditions

---

## PART D: CONVERSATION + EVENT LINKING AUDIT

### D.1 Conversation ID Generation

**⚠️ CRITICAL FINDING**: **NO `conversationId` FIELD EXISTS**

Messages are directly linked to `eventId`:
- **Path**: `events/{eventId}/messages/{messageId}`
- **No separate conversation collection**
- **No `conversationId` field in events or messages**

**✅ CORRECT**: This is the intended architecture - messages are subcollection of events

---

### D.2 Event Creation and Conversation Linking

**Location**: `firebase/db.ts:createEvent()`

**Process**:
1. Event created in `events/{eventId}`
2. Messages subcollection created automatically when first message is sent
3. No explicit conversation creation

**✅ CORRECT** - No issues identified

---

### D.3 Message References

**Location**: `firebase/db.ts:addChatMessage()`

**Message Structure**:
```typescript
{
  eventId: string,        // ✅ Correct - references event
  userId: string,         // ✅ Correct - sender ID
  userName: string,       // ✅ Correct - sender name
  text: string,          // ✅ Correct - message content
  createdAt: number,      // ✅ Correct - timestamp
  type: string,          // ✅ Correct - message type
  isHost: boolean        // ✅ Correct - host flag
}
```

**✅ CORRECT** - All fields properly set

---

### D.4 Host Inclusion in Participants

**Location**: `components/chat/GroupChat.tsx:handleSendMessage()`

**Process**:
```typescript
// Get all RSVPs
const attendeeIds = rsvpsSnapshot.docs.map(doc => doc.data().userId);

// CRITICAL: ALWAYS include host in notification recipients
const allRecipients = [...new Set([...attendeeIds, event.hostId].filter(Boolean))];
```

**✅ CORRECT** - Host is always included in notification recipients

**⚠️ POTENTIAL ISSUE**: Host may not be in RSVPs array, but is included in notifications (correct behavior)

---

## PART E: NOTIFICATION SYSTEM AUDIT

### E.1 Notification Triggers

#### **1. New Follower Notification**

**Trigger**: `firebase/follow.ts:followHost()`
**Function**: `notifyHostOfNewFollower(hostId, followerId)`
**Location**: `utils/notificationHelpers.ts:notifyHostOfNewFollower()`

**Flow**:
```
followHost(followerId, hostId)
  → notifyHostOfNewFollower(hostId, followerId)
    → createNotification(hostId, {...})
      → Firestore: users/{hostId}/notifications/{notificationId}
```

**✅ CORRECT** - Trigger exists and path is correct

---

#### **2. New RSVP Notification**

**Trigger**: `stores/userStore.ts:addRSVP()`
**Function**: `notifyHostOfRSVP(hostId, userId, eventId, eventTitle)`
**Location**: `utils/notificationHelpers.ts:notifyHostOfRSVP()`

**Flow**:
```
addRSVP(userId, eventId)
  → createReservation(eventId, userId)
  → notifyHostOfRSVP(hostId, userId, eventId, eventTitle)
    → createNotification(hostId, {...})
      → Firestore: users/{hostId}/notifications/{notificationId}
```

**✅ CORRECT** - Trigger exists and path is correct

---

#### **3. New Message Notification**

**Trigger**: `components/chat/GroupChat.tsx:handleSendMessage()`
**Function**: `notifyAttendeesOfNewMessage(eventId, eventTitle, senderId, senderName, messageSnippet, attendeeIds)`
**Location**: `utils/notificationHelpers.ts:notifyAttendeesOfNewMessage()`

**Flow**:
```
handleSendMessage()
  → addMessage(eventId, userId, userName, messageText)
  → notifyAttendeesOfNewMessage(eventId, eventTitle, senderId, senderName, messageSnippet, allRecipients)
    → For each recipient:
      → createNotification(userId, {...})
        → Firestore: users/{userId}/notifications/{notificationId}
```

**✅ CORRECT** - Trigger exists and path is correct

---

### E.2 Notification Creation

**Location**: `firebase/notifications.ts:createNotification()`

**Path**: `users/{userId}/notifications/{notificationId}`

**✅ CORRECT** - Path is correct

---

### E.3 Notification Preferences

**Location**: `utils/notificationHelpers.ts:getUserNotificationPreferences()`

**Default Values**:
```typescript
{
  email_opt_in: true,      // ✅ Default enabled
  sms_opt_in: true,        // ✅ Default enabled
  notification_opt_in: true // ✅ Default enabled (in-app always on)
}
```

**✅ CORRECT** - Defaults are correct

---

### E.4 Notification System Issues

**⚠️ POTENTIAL ISSUES**:
1. **Silent Failures**: Error handling may swallow errors
2. **No Retry Logic**: Failed notifications are not retried
3. **No Batch Operations**: Each notification is created individually

**✅ TRIGGERS EXIST** - All notification triggers are properly implemented

---

## PART F: METRICS AUTO-UPDATE AUDIT

### F.1 Real-time Metric Subscriptions

#### **1. Followers Count**
- **Location**: `firebase/follow.ts:subscribeToFollowersCount()`
- **Path**: `users/{hostId}`
- **Field**: `followers.length`
- **✅ CORRECT** - Updates in real-time

#### **2. Following Count**
- **Location**: `firebase/follow.ts:subscribeToFollowingCount()`
- **Path**: `users/{userId}`
- **Field**: `following.length`
- **✅ CORRECT** - Updates in real-time

#### **3. Reservation Count**
- **Location**: `firebase/db.ts:subscribeToReservationCount()`
- **Path**: `reservations` (query by eventId)
- **Field**: Query result count
- **✅ CORRECT** - Updates in real-time

#### **4. User RSVPs**
- **Location**: `firebase/db.ts:subscribeToUserRSVPs()`
- **Path**: `reservations` (query by userId)
- **Field**: Array of eventIds
- **✅ CORRECT** - Updates in real-time

#### **5. Unread Notification Count**
- **Location**: `firebase/notifications.ts:subscribeToUnreadNotificationCount()`
- **Path**: `users/{userId}/notifications` (query by read: false)
- **Field**: Query result count
- **✅ CORRECT** - Updates in real-time

#### **6. Hosted Events Count**
- **Location**: `firebase/db.ts:subscribeToHostedEventsCount()`
- **Path**: `events` (query by hostId)
- **Field**: Query result count
- **✅ CORRECT** - Updates in real-time

#### **7. Attended Events Count**
- **Location**: `firebase/db.ts:subscribeToAttendedEventsCount()`
- **Path**: `reservations` (query by userId, status: reserved)
- **Field**: Query result count
- **✅ CORRECT** - Updates in real-time

#### **8. Total Attendees Count**
- **Location**: `firebase/db.ts:subscribeToTotalAttendeesCount()`
- **Path**: `reservations` (query by eventIds, status: reserved)
- **Field**: Sum of attendeeCount
- **✅ CORRECT** - Updates in real-time

#### **9. Reviews Count**
- **Location**: `firebase/db.ts:subscribeToReviewsCount()`
- **Path**: `reviews` (query by hostId)
- **Field**: Query result count
- **✅ CORRECT** - Updates in real-time

---

### F.2 Metrics Update Issues

**⚠️ POTENTIAL ISSUES**:
1. **`attendeesCount` Field**: Stored in event document but may not be updated in real-time
   - **Location**: `events/{eventId}.attendeesCount`
   - **Update**: Manual update via `updateEvent()` or listener
   - **⚠️ ISSUE**: May be stale if not updated by listener

2. **No Direct Field Update**: `attendeesCount` is calculated from reservations, not stored directly
   - **Solution**: Use `subscribeToReservationCount()` instead of reading `attendeesCount` field

---

## PART G: ARCHITECTURAL FLAWS IDENTIFIED

### G.1 Multiple Sources of Truth

**Issue**: Profile pictures have multiple sources:
1. Firestore `users/{userId}.photoURL`
2. Firestore `users/{userId}.imageUrl`
3. Event snapshot `events/{eventId}.hostPhotoURL`
4. Firebase Auth `user.photoURL`
5. User Store `user.photoURL`

**Impact**: Desynchronization across components

**Solution**: Single source of truth (Firestore `users/{userId}.photoURL`)

---

### G.2 Inconsistent Field Naming

**Issue**: Duplicate fields with different names:
- `photoURL` vs `imageUrl`
- `name` vs `displayName`
- `phoneVerified` vs `phone_verified`
- `public` vs `isPublic`

**Impact**: Confusion, potential bugs

**Solution**: Standardize on one field name per concept

---

### G.3 Polling Instead of Real-time

**Issue**: Profile pictures use polling (2-3 second intervals) instead of `onSnapshot`

**Impact**: Delayed updates, unnecessary Firestore reads

**Solution**: Use `onSnapshot` for real-time updates

---

### G.4 No Shared State

**Issue**: Each component fetches profile data independently

**Impact**: Multiple Firestore reads, no shared cache

**Solution**: Centralized profile store with real-time subscriptions

---

### G.5 Stale Snapshot Data

**Issue**: `events/{eventId}.hostPhotoURL` is snapshot at event creation

**Impact**: Profile pictures may be stale on event cards

**Solution**: Always fetch from `users/{userId}.photoURL` or use real-time subscription

---

## PART H: SUMMARY OF ISSUES

### H.1 Critical Issues

1. **Profile Picture Desynchronization**
   - Multiple sources of truth
   - Inconsistent field naming
   - Polling instead of real-time

2. **Stale Event Data**
   - `hostPhotoURL` snapshot may be stale
   - `attendeesCount` may not auto-update

3. **Inconsistent Field Naming**
   - `photoURL` vs `imageUrl`
   - `name` vs `displayName`
   - `phoneVerified` vs `phone_verified`

---

### H.2 Moderate Issues

1. **Subscription Management**
   - Multiple subscriptions may be created
   - Cleanup may not be called properly

2. **No Shared State**
   - Components fetch independently
   - No centralized cache

---

### H.3 Minor Issues

1. **Type Inconsistencies**
   - `updatedAt?: number | unknown`

2. **Duplicate Fields**
   - `public` vs `isPublic`
   - `startDate` vs `startDateTime`

---

## PART I: RECOMMENDATIONS

### I.1 Immediate Fixes

1. **Standardize Profile Picture Fields**
   - Use `photoURL` as primary
   - Remove `imageUrl` (or keep as fallback only)
   - Always fetch from Firestore, not snapshot

2. **Implement Real-time Profile Subscriptions**
   - Replace polling with `onSnapshot`
   - Centralize in user store

3. **Fix Stale Event Data**
   - Remove `hostPhotoURL` from events (or always fetch from user)
   - Use real-time subscription for `attendeesCount`

---

### I.2 Architectural Improvements

1. **Centralized Profile Store**
   - Single source of truth
   - Real-time subscriptions
   - Shared cache

2. **Standardize Field Names**
   - One field name per concept
   - Remove duplicates

3. **Improve Subscription Management**
   - Proper cleanup
   - Prevent duplicate subscriptions

---

## END OF DIAGNOSTIC REPORT

**Next Steps**: Review findings and implement fixes based on recommendations.

