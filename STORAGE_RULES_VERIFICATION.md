# Firebase Storage Rules Verification

## ✅ Your Current Rules Look Correct!

Based on the screenshot, your Storage Rules match what we need:

### Rules Structure
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Events folder - ✅ CORRECT
    match /events/{userId}/{imageId} {
      allow write: if request.auth != null && 
                      request.auth.uid == userId &&
                      request.resource.size < 5 * 1024 * 1024 &&
                      request.resource.contentType.matches('image/.*');
      allow read: if true; // Public read
    }
    
    // Users folder - ✅ CORRECT
    match /users/{userId}/{imageId} {
      allow write: if request.auth != null && 
                      request.auth.uid == userId &&
                      request.resource.size < 5 * 1024 * 1024 &&
                      request.resource.contentType.matches('image/.*');
      allow read: if true; // Public read
    }
  }
}
```

### What These Rules Cover
- ✅ **Event Images**: `events/{userId}/{imageId}` matches our path: `events/${user.uid}/${timestamp}_${filename}`
- ✅ **User Avatars**: `users/{userId}/{imageId}` matches our path: `users/${user.uid}/avatar.jpg`
- ✅ **Authentication**: Only authenticated users can upload
- ✅ **User Matching**: Users can only upload to their own folders
- ✅ **File Size**: Max 5MB (matches our validation)
- ✅ **File Type**: Only images allowed
- ✅ **Public Read**: Anyone can view images (needed for event cards)

## ⚠️ IMPORTANT: Two Separate Configurations

### 1. Storage Rules (✅ You're showing this - looks good!)
**Location:** Storage → Rules tab (what you're showing)
**Status:** ✅ Rules look correct
**Action:** Click "Publish" to save the rules

### 2. CORS Configuration (❌ This is SEPARATE and still needed!)
**Location:** Storage → Settings → CORS (NOT the Rules tab)
**Status:** ⚠️ Still needs to be configured
**Action:** This is the CRITICAL blocker preventing uploads

## Next Steps

### Step 1: Publish Your Rules (if not already published)
1. In the Rules tab (where you are now)
2. Click the blue "Publish" button
3. Confirm the publish

### Step 2: Configure CORS (CRITICAL - This is what's blocking uploads!)
1. Go to **Storage → Settings** (NOT Rules)
2. Look for **"CORS configuration"** section
3. Add this JSON configuration:

```json
[
  {
    "origin": ["https://www.gopopera.ca", "https://gopopera.ca"],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

4. Save the CORS configuration

### Step 3: Verify Both Are Active
- Rules: Should show "Published" (not "unpublished changes")
- CORS: Should show your domain in the CORS list

## Why Both Are Needed

- **Rules**: Control WHO can upload (authentication, permissions)
- **CORS**: Controls WHERE uploads can come from (your domain)

**Without CORS:** Browser blocks all requests (CORS policy error)
**Without Rules:** Anyone could upload (security risk)

Both must be configured correctly for uploads to work!

