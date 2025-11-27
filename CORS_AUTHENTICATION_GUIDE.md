# CORS Authentication - Quick Guide

## ⚠️ Authentication Required

The CORS configuration requires you to authenticate with Google Cloud. This is a **one-time setup**.

## Step 1: Authenticate

Run this command in your terminal (it will open your browser):

```bash
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"
gcloud auth login
```

**What happens:**
1. Your browser will open
2. Sign in with your Google account (use the account that has access to `gopopera2026` Firebase project)
3. Grant permissions to Google Cloud SDK
4. You'll see "You are now authenticated" message

## Step 2: Run CORS Configuration

After authentication, run:

```bash
./configure_cors.sh
```

The script will automatically:
- Set your project to `gopopera2026`
- Find your storage bucket
- Apply CORS configuration
- Verify it worked

## Alternative: Manual CORS Setup

If you prefer to do it manually after authenticating:

```bash
# 1. Set project
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"
gcloud config set project gopopera2026

# 2. Find your bucket
gsutil ls

# 3. Apply CORS (use the bucket name from step 2)
gsutil cors set cors.json gs://gopopera2026.appspot.com

# 4. Verify
gsutil cors get gs://gopopera2026.appspot.com
```

## Troubleshooting

### "Command not found: gcloud"
Make sure PATH is set:
```bash
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"
```

### "Access Denied"
- Make sure you're using the correct Google account
- The account must have Owner or Storage Admin role on the Firebase project
- Check Firebase Console → Project Settings → Users and permissions

### Browser Doesn't Open
If `gcloud auth login` doesn't open your browser, it will show a URL. Copy and paste it into your browser manually.

---

## After CORS is Configured

1. **Clear browser cache** (very important!)
2. Test image upload in your app
3. Check Network tab - OPTIONS request should be 200 OK

---

**The `cors.json` file is ready in your project root. Once you authenticate, the script will apply it automatically.**

