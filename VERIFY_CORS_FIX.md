# CORS Verification and Fix Guide

## Current Problem
Console shows CORS errors blocking Firebase Storage uploads:
- Preflight OPTIONS requests failing
- POST requests blocked with `net::ERR_FAILED`
- Images not uploading, placeholder images used instead

## Bucket Name
From `.env.local`:
- Storage Bucket: `gopopera2026.firebasestorage.app`

## Verify CORS Configuration

### Step 1: Check Current CORS Settings

Run this command to see what CORS is currently configured:

```bash
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"
gcloud config set project gopopera2026
gsutil cors get gs://gopopera2026.firebasestorage.app
```

**Expected Output:**
If CORS is configured, you should see JSON with your origins. If it's empty or shows an error, CORS is not configured.

### Step 2: Apply CORS Configuration

If CORS is not configured or incorrect, run:

```bash
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"
gcloud config set project gopopera2026
gsutil cors set cors.json gs://gopopera2026.firebasestorage.app
```

### Step 3: Verify It Worked

```bash
gsutil cors get gs://gopopera2026.firebasestorage.app
```

You should see:
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

### Step 4: Clear Browser Cache

**CRITICAL:** After configuring CORS, you MUST:
1. Clear browser cache completely
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Or use incognito/private mode

CORS settings are cached by the browser, so old settings might persist even after fixing.

## Alternative: Use the Script

You can also use the automated script:

```bash
./configure_cors.sh
```

This will:
- Check authentication
- Set project to gopopera2026
- Find the correct bucket
- Apply CORS configuration
- Verify it worked

## Troubleshooting

### If CORS still doesn't work:

1. **Check bucket name is correct:**
   ```bash
   gsutil ls
   ```
   Look for `gs://gopopera2026.firebasestorage.app` or `gs://gopopera2026.appspot.com`

2. **Try both bucket formats:**
   - `gs://gopopera2026.firebasestorage.app` (newer format)
   - `gs://gopopera2026.appspot.com` (legacy format)

3. **Check authentication:**
   ```bash
   gcloud auth list
   ```
   Should show an ACTIVE account

4. **Check project:**
   ```bash
   gcloud config get-value project
   ```
   Should output: `gopopera2026`

## After Fixing

1. Clear browser cache
2. Test image upload
3. Check Network tab - OPTIONS request should be 200 OK
4. POST requests should succeed

