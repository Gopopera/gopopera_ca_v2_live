# Firestore Security Rules for Popera

## Required Rules for Event Creation

Copy and paste these rules into **Firebase Console → Firestore Database → Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Events are readable by all, writable by authenticated users
    match /events/{eventId} {
      allow read: if true;  // Public read access
      allow create: if request.auth != null;  // Any authenticated user can create
      allow update, delete: if request.auth != null && 
        (resource.data.hostId == request.auth.uid);  // Only host can update/delete
      
      // Chat messages within events
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && 
          request.resource.data.userId == request.auth.uid;
        allow update, delete: if request.auth != null && 
          resource.data.userId == request.auth.uid;
      }
      
      // Reviews within events
      match /reviews/{reviewId} {
        allow read: if true;
        allow create: if request.auth != null;
        allow update, delete: if request.auth != null && 
          resource.data.userId == request.auth.uid;
      }
    }
    
    // Reservations
    match /reservations/{reservationId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid);
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Notifications
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## How to Apply These Rules

1. Go to **Firebase Console** → **Firestore Database** → **Rules** tab
2. Copy the rules above
3. Paste them into the rules editor
4. Click **"Publish"**
5. Wait a few seconds for rules to propagate

## Critical Rule for Event Creation

The most important rule for event creation is:
```javascript
match /events/{eventId} {
  allow create: if request.auth != null;  // Any authenticated user can create
}
```

This allows any logged-in user to create events. If this rule is missing or incorrect, you'll get permission errors.

## Testing

After applying the rules:
1. Try creating an event again
2. Check the console for permission errors
3. If you see `permission-denied`, the rules need to be updated

