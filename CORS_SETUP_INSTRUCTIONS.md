# CORS Configuration for Firebase Storage - Step-by-Step Guide

## ⚠️ Important: CORS is NOT in Firebase Console UI

**Firebase Storage CORS must be configured using the command line (`gsutil`), not through the Firebase Console.**

The Firebase Console UI does NOT have a CORS configuration section for Storage. You need to use Google Cloud's `gsutil` tool.

---

## Step-by-Step Instructions

### Step 1: Install Google Cloud SDK (if not already installed)

**For macOS:**
```bash
# Using Homebrew (recommended)
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

**For Windows:**
- Download from: https://cloud.google.com/sdk/docs/install
- Run the installer

**For Linux:**
```bash
# Using apt (Debian/Ubuntu)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Step 2: Authenticate and Set Project

```bash
# Authenticate with your Google account
gcloud auth login

# Set your Firebase project
gcloud config set project gopopera2026

# Verify it's set correctly
gcloud config get-value project
# Should output: gopopera2026
```

### Step 3: Create CORS Configuration File

Create a file named `cors.json` in your project root directory:

```json
[
  {
    "origin": ["https://www.gopopera.ca", "https://gopopera.ca"],
    "method": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Firebase-Storage-Resumable-Upload-Protocol",
      "X-Firebase-Appcheck",
      "x-goog-resumable",
      "x-goog-requested-by",
      "Authorization"
    ],
    "maxAgeSeconds": 3600
  }
]
```

**Save this as:** `cors.json` in your project root (same directory as `package.json`)

### Step 4: Find Your Storage Bucket Name

Your bucket name is likely one of these:
- `gopopera2026.appspot.com` (default bucket)
- `gopopera2026.firebasestorage.app` (newer format)

**To verify, run:**
```bash
gsutil ls
```

This will list all your buckets. Look for one that matches your project ID.

### Step 5: Apply CORS Configuration

```bash
# If your bucket is gopopera2026.appspot.com (most likely)
gsutil cors set cors.json gs://gopopera2026.appspot.com

# OR if it's the newer format
gsutil cors set cors.json gs://gopopera2026.firebasestorage.app
```

**Expected output:**
```
Setting CORS on gs://gopopera2026.appspot.com/...
```

### Step 6: Verify CORS Configuration

```bash
# Check current CORS settings
gsutil cors get gs://gopopera2026.appspot.com
```

You should see your CORS configuration printed.

### Step 7: Test in Browser

1. **Clear browser cache** (important for CORS!)
2. Open your app: https://www.gopopera.ca
3. Open Developer Tools (F12) → Network tab
4. Try uploading an image
5. Look for an **OPTIONS** request to `firebasestorage.googleapis.com`
6. Check the response headers - you should see:
   - `Access-Control-Allow-Origin: https://www.gopopera.ca`
   - Status: `200 OK`

---

## Troubleshooting

### "Command not found: gsutil"
- Make sure Google Cloud SDK is installed
- Try: `gcloud components install gsutil`

### "Access Denied" or "Permission Denied"
- Make sure you're authenticated: `gcloud auth login`
- Make sure you have Owner or Storage Admin role on the project
- Check: `gcloud projects get-iam-policy gopopera2026`

### "Bucket not found"
- Verify bucket name with: `gsutil ls`
- Use the exact bucket name from the list

### CORS Still Not Working After Configuration
1. **Clear browser cache completely** (CORS responses are cached)
2. Try in **incognito/private mode**
3. Check Network tab for OPTIONS request status
4. Verify the origin in CORS config matches exactly (including https://)
5. Wait a few minutes - CORS changes can take time to propagate

---

## Quick Reference Commands

```bash
# Authenticate
gcloud auth login

# Set project
gcloud config set project gopopera2026

# List buckets
gsutil ls

# Set CORS
gsutil cors set cors.json gs://gopopera2026.appspot.com

# Get CORS (verify)
gsutil cors get gs://gopopera2026.appspot.com

# Remove CORS (if needed)
gsutil cors set [] gs://gopopera2026.appspot.com
```

---

## Why Command Line?

Firebase Storage is built on Google Cloud Storage. While Firebase provides a console UI for many things, CORS configuration for Storage buckets is managed at the Google Cloud Storage level, which requires the `gsutil` command-line tool.

This is a Google Cloud limitation, not a Firebase limitation.

