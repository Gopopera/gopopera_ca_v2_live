# Firebase Storage Rules Deployment Guide

## Problem
Users were getting "Permission denied" errors when trying to upload images while editing events. This was because Firebase Storage security rules were not configured.

## Solution
Created `storage.rules` file with proper security rules that allow:
- Authenticated users to upload images to their own event folders (`events/{userId}/**`)
- Users to delete their own images
- Public read access to event images
- Users to upload/delete their own profile pictures (`users/{userId}/**`)
- Authenticated users to upload chat images

## Deployment Steps

### Option 1: Deploy via Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project** (if not already done):
   ```bash
   firebase init storage
   ```
   - Select your Firebase project
   - Choose "Use an existing rules file"
   - Select `storage.rules`

4. **Deploy the rules**:
   ```bash
   firebase deploy --only storage
   ```

### Option 2: Deploy via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`gopopera2026`)
3. Navigate to **Storage** → **Rules** tab
4. Copy the contents of `storage.rules`
5. Paste into the rules editor
6. Click **Publish**

## Rules Overview

The rules allow:
- ✅ **Event Images**: `events/{userId}/{imageName}` - Users can upload/delete their own images
- ✅ **Profile Pictures**: `users/{userId}/{imageName}` - Users can upload/delete their own profile pictures
- ✅ **Chat Images**: `chat/{eventId}/{userId}/{imageName}` - Authenticated users can upload chat images
- ✅ **Public Read**: All images are publicly readable
- ❌ **Default**: All other paths are denied

## Verification

After deploying, test by:
1. Logging in as a user
2. Creating or editing an event
3. Uploading an image
4. Verifying the upload succeeds without permission errors

## Security Notes

- Rules verify that `request.auth.uid == userId` before allowing writes
- Only authenticated users can upload images
- Users can only modify images in their own folders
- Firestore rules (in `firestore.rules`) also protect event data from unauthorized edits

