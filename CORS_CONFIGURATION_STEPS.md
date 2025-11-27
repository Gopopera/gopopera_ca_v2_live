# CORS Configuration Steps - Interactive Guide

## Current Status
- ✅ `cors.json` file is ready in your project
- ⚠️ Google Cloud SDK needs to be installed
- ⚠️ Authentication required (interactive)

## Step-by-Step Instructions

### Step 1: Install Google Cloud SDK

**Option A: Using Homebrew (Recommended for macOS)**
```bash
brew install google-cloud-sdk
```

**Option B: Manual Installation**
1. Visit: https://cloud.google.com/sdk/docs/install
2. Download the macOS installer
3. Run the installer
4. Follow the installation wizard

**After installation, restart your terminal or run:**
```bash
source ~/.zshrc  # or ~/.bash_profile depending on your shell
```

### Step 2: Authenticate with Google

```bash
gcloud auth login
```

This will:
- Open your browser
- Ask you to sign in with your Google account
- Grant permissions to Google Cloud SDK
- **Use the account that has access to the gopopera2026 Firebase project**

### Step 3: Set Your Project

```bash
gcloud config set project gopopera2026
```

Verify it's set:
```bash
gcloud config get-value project
# Should output: gopopera2026
```

### Step 4: Find Your Storage Bucket

```bash
gsutil ls
```

This will list all your buckets. Look for one of these:
- `gs://gopopera2026.appspot.com` (most likely - default bucket)
- `gs://gopopera2026.firebasestorage.app` (newer format)

**Note the exact bucket name** - you'll need it in the next step.

### Step 5: Apply CORS Configuration

From your project directory (where `cors.json` is located):

```bash
# If your bucket is gopopera2026.appspot.com
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
gsutil cors get gs://gopopera2026.appspot.com
```

You should see your CORS configuration printed, showing:
- Your origins: `https://www.gopopera.ca` and `https://gopopera.ca`
- Allowed methods
- Response headers

### Step 7: Test in Browser

1. **Clear browser cache completely** (CORS responses are cached!)
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Or use Incognito/Private mode

2. Open your app: https://www.gopopera.ca

3. Open Developer Tools (F12) → Network tab

4. Try uploading an image when creating an event

5. Look for an **OPTIONS** request to `firebasestorage.googleapis.com`

6. Check the response:
   - Status should be **200 OK** (not blocked)
   - Response headers should include: `Access-Control-Allow-Origin: https://www.gopopera.ca`

---

## Troubleshooting

### "Command not found: gsutil"
- Make sure Google Cloud SDK is installed
- Restart your terminal
- Try: `gcloud components install gsutil`

### "Access Denied" or "Permission Denied"
- Make sure you're authenticated: `gcloud auth login`
- Make sure you're using the account that owns/has access to the Firebase project
- Check your IAM permissions in Firebase Console

### "Bucket not found"
- Run `gsutil ls` to see all available buckets
- Use the exact bucket name from the list
- Make sure you're in the correct Google Cloud project

### CORS Still Not Working After Configuration
1. **Clear browser cache** (very important - CORS is cached!)
2. Try in **incognito/private mode**
3. Wait 1-2 minutes for changes to propagate
4. Check Network tab - OPTIONS request should be 200 OK
5. Verify the origin in CORS exactly matches your domain (including `https://`)

---

## Quick Command Reference

```bash
# Install (if needed)
brew install google-cloud-sdk

# Authenticate
gcloud auth login

# Set project
gcloud config set project gopopera2026

# List buckets
gsutil ls

# Set CORS
gsutil cors set cors.json gs://gopopera2026.appspot.com

# Verify CORS
gsutil cors get gs://gopopera2026.appspot.com
```

---

## Need Help?

If you encounter any issues, check:
1. Are you authenticated? (`gcloud auth list`)
2. Is the project set correctly? (`gcloud config get-value project`)
3. Do you have the right bucket name? (`gsutil ls`)
4. Is the `cors.json` file in the current directory? (`ls cors.json`)

