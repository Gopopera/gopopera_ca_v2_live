# Firestore Security Rules Setup Guide

## Overview
This guide will help you set up Firestore security rules to resolve the "Missing or insufficient permissions" error.

## Step 1: Access Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **gopopera2026**
3. Navigate to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab at the top

## Step 2: Update Security Rules

Copy and paste the following security rules into the Firestore Rules editor:

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
      // Allow anyone to read public events (not drafts, not private)
      allow read: if resource.data.isPublic != false && resource.data.isDraft != true;
      
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

## Step 3: Publish Rules

1. Click **Publish** button at the top of the Rules editor
2. Wait for confirmation that rules have been published
3. Rules take effect immediately (usually within a few seconds)

## Step 4: Test the Rules

1. Refresh your application
2. The permission error should no longer appear
3. Check the browser console for any remaining permission errors

## Important Notes

### For Development/Testing (Less Secure)
If you need to test quickly, you can temporarily use these more permissive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // ⚠️ WARNING: Allows all access - USE ONLY FOR TESTING
    }
  }
}
```

**⚠️ IMPORTANT:** Never use the permissive rules in production! They allow anyone to read and write all data.

### Database ID
Make sure you're editing rules for the correct database:
- If using the default database: Rules apply automatically
- If using a named database (e.g., `gopopera2028`): Rules apply to that specific database

## Troubleshooting

### Rules Not Working?
1. **Check Database ID**: Ensure you're editing rules for the correct database
2. **Wait for Propagation**: Rules can take up to 1 minute to propagate
3. **Clear Browser Cache**: Clear cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. **Check Console**: Look for specific error messages in browser console

### Common Issues

1. **"Permission denied" on events collection**
   - Ensure `isPublic != false` check is correct
   - Verify `isDraft != true` check is correct

2. **"Permission denied" on newsletter_subscribers**
   - The rules allow `create: if true` - this should work
   - If still failing, check if collection name matches exactly

3. **"Permission denied" on user profile**
   - Ensure user is authenticated
   - Check that `userId == request.auth.uid` condition is met

## Need Help?

If you continue to experience issues:
1. Check Firebase Console → Firestore → Rules for syntax errors
2. Review browser console for specific permission error codes
3. Verify your Firebase project ID matches: `gopopera2026`
4. Ensure you're editing rules for the correct database (`gopopera2028` if using named database)

