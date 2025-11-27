# Quick CORS Setup - Run This Now!

## ✅ Google Cloud SDK is Installed!

I've installed Google Cloud SDK for you. Now you need to:

### Option 1: Run the Automated Script (Easiest)

```bash
./configure_cors.sh
```

This script will:
1. Check if you're authenticated
2. Set your project to `gopopera2026`
3. Find your storage bucket
4. Apply the CORS configuration
5. Verify it worked

**If you're not authenticated, it will prompt you to run:**
```bash
gcloud auth login
```

---

### Option 2: Manual Steps

If you prefer to do it manually:

#### 1. Authenticate (opens browser)
```bash
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"
gcloud auth login
```

#### 2. Set Project
```bash
gcloud config set project gopopera2026
```

#### 3. Find Your Bucket
```bash
gsutil ls
```

Look for: `gs://gopopera2026.appspot.com` or `gs://gopopera2026.firebasestorage.app`

#### 4. Apply CORS
```bash
gsutil cors set cors.json gs://gopopera2026.appspot.com
```

(Replace with your actual bucket name if different)

#### 5. Verify
```bash
gsutil cors get gs://gopopera2026.appspot.com
```

---

## After CORS is Configured

1. **Clear browser cache** (very important!)
2. Try creating an event with an image
3. Check Network tab - OPTIONS request should be 200 OK
4. Uploads should now work! 🎉

---

## Need Help?

The script will guide you through any issues. Just run:
```bash
./configure_cors.sh
```

