# Firebase Storage CORS Configuration - Quick Reference

## The Problem
CORS errors when uploading images from `https://www.gopopera.ca` to Firebase Storage bucket `gopopera2026.firebasestorage.googleapis.com`.

## Most Likely Solution: Configure CORS on Firebase Storage Bucket

### Step 1: Install Google Cloud SDK (if not already installed)
```bash
# macOS
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### Step 2: Authenticate with Google Cloud
```bash
gcloud auth login
gcloud config set project gopopera2026
```

### Step 3: Create CORS Configuration File
Create a file named `cors.json` in your project root:

```json
[
  {
    "origin": [
      "https://www.gopopera.ca",
      "https://gopopera.ca",
      "http://localhost:3000",
      "http://localhost:5173"
    ],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Authorization",
      "Content-Length",
      "User-Agent",
      "X-Goog-Upload-Protocol",
      "X-Goog-Upload-Command",
      "X-Goog-Upload-Offset",
      "X-Goog-Upload-Header-Content-Length",
      "X-Goog-Upload-Header-Content-Type"
    ],
    "maxAgeSeconds": 3600
  }
]
```

### Step 4: Apply CORS Configuration
```bash
gsutil cors set cors.json gs://gopopera2026.firebasestorage.app
```

**Note:** The bucket name format might be:
- `gs://gopopera2026.firebasestorage.app` (new format)
- `gs://gopopera2026.appspot.com` (legacy format)

Check your Firebase Console → Storage → Settings to find the exact bucket name.

### Step 5: Verify CORS Configuration
```bash
gsutil cors get gs://gopopera2026.firebasestorage.app
```

## Alternative: Check Firebase Storage Security Rules

Even with CORS configured, Security Rules might block uploads. Check your rules in Firebase Console:

**Firebase Console → Storage → Rules**

Should allow authenticated uploads:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Questions to Ask ChatGPT

See `FIREBASE_STORAGE_CORS_QUESTION.md` for detailed questions to verify:
1. Exact bucket name format
2. Whether Firebase SDK handles CORS automatically
3. If Security Rules affect CORS
4. Best practices for production

## Current Code Status

✅ **Already implemented:**
- Retry logic with exponential backoff
- Better error messages for CORS issues
- Timeout handling
- Client-side image compression

⚠️ **Needs verification:**
- CORS configuration on Firebase Storage bucket (requires `gsutil` command)
- Storage Security Rules (check in Firebase Console)

## Next Steps

1. **Ask ChatGPT** using `FIREBASE_STORAGE_CORS_QUESTION.md` to verify approach
2. **Configure CORS** using `gsutil` command above
3. **Verify** with test upload
4. **Check Security Rules** in Firebase Console

