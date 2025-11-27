# Quick CORS Setup - Command Line Only

## ⚠️ CORS is NOT in Firebase Console UI

Firebase Storage CORS **cannot** be configured through the Firebase Console. You **must** use the command line.

---

## Quick Setup (5 minutes)

### 1. Install Google Cloud SDK

**macOS:**
```bash
brew install google-cloud-sdk
```

**Or download:** https://cloud.google.com/sdk/docs/install

### 2. Authenticate

```bash
gcloud auth login
gcloud config set project gopopera2026
```

### 3. Apply CORS (from your project directory)

```bash
# The cors.json file is already in your project root
gsutil cors set cors.json gs://gopopera2026.appspot.com
```

**If that bucket doesn't exist, find your bucket:**
```bash
gsutil ls
# Then use the bucket name from the list
```

### 4. Verify

```bash
gsutil cors get gs://gopopera2026.appspot.com
```

You should see your CORS configuration.

### 5. Test

1. **Clear browser cache** (important!)
2. Try uploading an image
3. Check Network tab for OPTIONS request - should be 200 OK

---

## That's It!

The `cors.json` file is already in your project. Just run the `gsutil` command above.

See `CORS_SETUP_INSTRUCTIONS.md` for detailed troubleshooting.

