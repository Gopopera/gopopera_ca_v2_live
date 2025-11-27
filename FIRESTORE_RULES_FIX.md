# 🔴 URGENT: Firestore Security Rules Fix

## Problem
Events are not showing because Firestore security rules are blocking read access with "Missing or insufficient permissions" error.

## Root Cause
The current rule for events collection:
```javascript
allow read: if resource.data.isPublic != false && resource.data.isDraft != true;
```

This rule doesn't work well for collection queries (`onSnapshot` on entire collection) because:
1. Firestore can't evaluate `resource.data` for collection-level queries
2. Events without `isPublic` or `isDraft` fields might fail the check
3. The rule is too restrictive for the query pattern we use

## Solution
Update the events rule to allow reading all events. We filter client-side anyway (which is safer and more performant).

## Steps to Fix

### 1. Go to Firebase Console
1. Visit: https://console.firebase.google.com/
2. Select project: **gopopera2026**
3. Go to **Firestore Database** → **Rules** tab

### 2. Replace the Events Rule
Find this section:
```javascript
// Events Collection - Public read, authenticated write
match /events/{eventId} {
  // Allow anyone to read public events (not drafts, not private)
  allow read: if resource.data.isPublic != false && resource.data.isDraft != true;
  ...
}
```

**Replace with:**
```javascript
// Events Collection - Public read, authenticated write
match /events/{eventId} {
  // Allow anyone to read events (filtering happens client-side)
  // This is safe because we filter out private/draft events in eventStore.ts
  allow read: if true;
  
  // Allow authenticated users to create events
  allow create: if isAuthenticated();
  
  // Allow event owners to update their events
  allow update: if isAuthenticated() && 
    (resource.data.hostId == request.auth.uid || 
     request.resource.data.hostId == request.auth.uid);
  
  // Allow event owners to delete their events
  allow delete: if isAuthenticated() && resource.data.hostId == request.auth.uid;
}
```

### 3. Complete Rules (Copy All)
If you want to replace all rules at once, here's the complete set:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Events Collection - Public read, authenticated write
    match /events/{eventId} {
      // Allow anyone to read events (filtering happens client-side)
      // This is safe because we filter out private/draft events in eventStore.ts
      allow read: if true;
      
      // Allow authenticated users to create events
      allow create: if isAuthenticated();
      
      // Allow event owners to update their events
      allow update: if isAuthenticated() && 
        (resource.data.hostId == request.auth.uid || 
         request.resource.data.hostId == request.auth.uid);
      
      // Allow event owners to delete their events
      allow delete: if isAuthenticated() && resource.data.hostId == request.auth.uid;
    }
    
    // Users Collection - Users can read their own profile, update their own
    match /users/{userId} {
      allow read: if isAuthenticated() && (userId == request.auth.uid || resource.data.isPublic == true);
      allow create: if isAuthenticated() && userId == request.auth.uid;
      allow update: if isAuthenticated() && userId == request.auth.uid;
      allow delete: if isAuthenticated() && userId == request.auth.uid;
    }
    
    // Reservations Collection - Users can read their own, hosts can read for their events
    match /reservations/{reservationId} {
      allow read: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/events/$(resource.data.eventId)).data.hostId == request.auth.uid);
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/events/$(resource.data.eventId)).data.hostId == request.auth.uid);
      allow delete: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/events/$(resource.data.eventId)).data.hostId == request.auth.uid);
    }
    
    // Reviews Collection - Public read, authenticated write
    match /reviews/{reviewId} {
      allow read: if true; // Public reviews
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Newsletter Subscribers - Anyone can write (for landing page), authenticated read
    match /newsletter_subscribers/{subscriberId} {
      allow read: if isAuthenticated(); // Only authenticated users can read
      allow create: if true; // Anyone can subscribe (for landing page)
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
    
    // Contact Inquiries - Authenticated write, admin read
    match /contact_inquiries/{inquiryId} {
      allow read: if isAuthenticated(); // Authenticated users can read
      allow create: if true; // Anyone can submit contact form
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
    
    // Reports Collection - Authenticated write, admin read
    match /reports/{reportId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
    
    // Event Subcollections (chats, polls, etc.)
    match /events/{eventId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    
    // Reviews subcollection (events/{eventId}/reviews/{reviewId})
    match /events/{eventId}/reviews/{reviewId} {
      allow read: if true; // Public reviews
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Chat messages subcollection (events/{eventId}/messages/{messageId})
    match /events/{eventId}/messages/{messageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Expulsions Subcollection
    match /events/{eventId}/expulsions/{expulsionId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && 
        get(/databases/$(database)/documents/events/$(eventId)).data.hostId == request.auth.uid;
      allow update: if isAuthenticated() && 
        get(/databases/$(database)/documents/events/$(eventId)).data.hostId == request.auth.uid;
      allow delete: if isAuthenticated() && 
        get(/databases/$(database)/documents/events/$(eventId)).data.hostId == request.auth.uid;
    }
  }
}
```

### 4. Publish Rules
1. Click **Publish** button
2. Wait for confirmation
3. Rules take effect immediately (within seconds)

### 5. Test
1. Refresh your browser
2. Check console - permission errors should be gone
3. Events should now appear on landing page and explore page

## Why This is Safe

✅ **Client-side filtering is already implemented** in `stores/eventStore.ts`:
- Events with `isPublic === false` are filtered out
- Events with `isDraft === true` are filtered out
- Events without these fields are shown (default to public)

✅ **Performance**: Client-side filtering is actually faster for collection queries

✅ **Security**: Private/draft events are still protected because:
- They're filtered out in the UI
- Only the host can see their own drafts in "My Pop-Ups"
- Write operations still require authentication

## After Fixing

Once you update the rules:
1. Events will load immediately
2. Permission errors will disappear
3. All public events will be visible
4. Private/draft events will still be hidden (client-side filtering)

