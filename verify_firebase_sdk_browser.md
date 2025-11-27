# How to Verify Firebase SDK is Well Configured

## Quick Browser Console Check

### Step 1: Open Browser Console
1. Open your app in the browser
2. Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
3. Go to the **Console** tab

### Step 2: Run Verification Commands

Copy and paste these commands one by one into the console:

#### 1. Check Environment Variables
```javascript
// Check if Firebase env vars are accessible
console.log('Firebase Config Check:');
console.log('API Key:', import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing');
console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing');
console.log('Storage Bucket:', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Missing');
console.log('Storage Bucket Value:', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);
```

#### 2. Check for Newlines in Storage Bucket
```javascript
const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
if (bucket) {
  const hasNewline = bucket.includes('\n') || bucket.includes('\r');
  console.log('Bucket has newline:', hasNewline ? '❌ YES (BAD!)' : '✅ NO (GOOD)');
  console.log('Bucket length:', bucket.length);
  console.log('Bucket trimmed:', bucket.trim().length);
  if (hasNewline) {
    console.log('⚠️ WARNING: Bucket contains newline! This will cause %0A in URLs.');
  }
}
```

#### 3. Check Firebase App Initialization
```javascript
// This requires accessing your Firebase module
// Try to access it through the app's global state or import
// For React apps, you might need to check the store
console.log('Check Firebase initialization in your app code');
```

#### 4. Check Storage Instance
```javascript
// In your app, add this temporarily to a component or run in console:
// (This assumes you can access your Firebase module)
import { getStorageSafe } from './src/lib/firebase';
const storage = getStorageSafe();
if (storage) {
  console.log('✅ Storage initialized');
  console.log('Storage app:', storage.app.name);
} else {
  console.log('❌ Storage not initialized');
}
```

## Automated Verification Script

### Option 1: Add to Your App (Recommended)

Add this component/page to your app temporarily:

```typescript
// pages/VerifyFirebasePage.tsx (temporary)
import { useEffect } from 'react';
import { getAppSafe, getStorageSafe, getAuthSafe, getDbSafe } from '../src/lib/firebase';
import { ref } from 'firebase/storage';

export const VerifyFirebasePage = () => {
  useEffect(() => {
    const verify = async () => {
      console.log('🔍 Firebase SDK Verification');
      console.log('============================\n');

      // 1. Check Environment Variables
      console.log('1️⃣ Environment Variables:');
      const env = import.meta.env;
      const bucket = env.VITE_FIREBASE_STORAGE_BUCKET;
      console.log('  Storage Bucket:', bucket ? `✅ "${bucket}"` : '❌ Missing');
      if (bucket) {
        const hasNewline = bucket.includes('\n') || bucket.includes('\r');
        console.log('  Has newline:', hasNewline ? '❌ YES' : '✅ NO');
        console.log('  Length:', bucket.length, 'Trimmed:', bucket.trim().length);
      }

      // 2. Check Firebase App
      console.log('\n2️⃣ Firebase App:');
      const app = getAppSafe();
      if (app) {
        console.log('  ✅ App initialized');
        console.log('  Project ID:', app.options.projectId);
        console.log('  Storage Bucket:', app.options.storageBucket);
        const bucketHasNewline = app.options.storageBucket?.includes('\n') || app.options.storageBucket?.includes('\r');
        console.log('  Bucket has newline:', bucketHasNewline ? '❌ YES' : '✅ NO');
      } else {
        console.log('  ❌ App not initialized');
      }

      // 3. Check Storage
      console.log('\n3️⃣ Firebase Storage:');
      const storage = getStorageSafe();
      if (storage) {
        console.log('  ✅ Storage initialized');
        const testRef = ref(storage, 'test/verification.txt');
        console.log('  Bucket:', testRef.bucket);
        const urlHasNewline = testRef.bucket.includes('\n') || testRef.bucket.includes('\r');
        console.log('  URL has newline:', urlHasNewline ? '❌ YES' : '✅ NO');
        
        // Check the full URL that would be generated
        const fullPath = testRef.fullPath;
        const expectedUrl = `https://firebasestorage.googleapis.com/v0/b/${testRef.bucket}/o/${encodeURIComponent(fullPath)}`;
        console.log('  Expected URL:', expectedUrl);
        console.log('  URL contains %0A:', expectedUrl.includes('%0A') ? '❌ YES' : '✅ NO');
      } else {
        console.log('  ❌ Storage not initialized');
      }

      // 4. Check Auth
      console.log('\n4️⃣ Firebase Auth:');
      const auth = getAuthSafe();
      if (auth) {
        console.log('  ✅ Auth initialized');
        console.log('  Current user:', auth.currentUser ? auth.currentUser.email || auth.currentUser.uid : 'Not logged in');
      } else {
        console.log('  ❌ Auth not initialized');
      }

      // 5. Check Firestore
      console.log('\n5️⃣ Firestore:');
      const db = getDbSafe();
      if (db) {
        console.log('  ✅ Firestore initialized');
      } else {
        console.log('  ❌ Firestore not initialized');
      }

      console.log('\n✅ Verification complete! Check console for details.');
    };

    verify();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Firebase SDK Verification</h1>
      <p>Check the browser console for verification results.</p>
    </div>
  );
};
```

### Option 2: Network Tab Check

1. Open DevTools → **Network** tab
2. Try to upload an image
3. Look for requests to `firebasestorage.googleapis.com`
4. Check the URL:
   - ✅ Good: `https://firebasestorage.googleapis.com/v0/b/gopopera2026.firebasestorage.app/o/...`
   - ❌ Bad: `https://firebasestorage.googleapis.com/v0/b/gopopera2026.firebasestorage.app%0A/o/...` (has %0A)

## What to Look For

### ✅ Good Signs:
- All environment variables are set
- No newlines in storage bucket value
- Firebase app initializes without errors
- Storage instance is created
- URLs don't contain `%0A`
- No CORS errors in console

### ❌ Bad Signs:
- Missing environment variables
- Newlines in storage bucket (`\n` or `\r`)
- `%0A` in Firebase Storage URLs
- "Storage not initialized" errors
- CORS errors mentioning `%0A` in URL

## Quick Fix Checklist

If verification fails:

1. ✅ **Check `.env` file** - Ensure `VITE_FIREBASE_STORAGE_BUCKET` has no trailing newlines
2. ✅ **Verify `.trim()` is applied** - Check `src/lib/firebase.ts` lines 37-44
3. ✅ **Clear browser cache** - Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
4. ✅ **Check Network tab** - Look for `%0A` in URLs
5. ✅ **Restart dev server** - Environment variables load on startup

## Expected Results

After fixes, you should see:
- ✅ Storage bucket value is clean (no newlines)
- ✅ Firebase app initializes with clean bucket name
- ✅ Storage URLs don't contain `%0A`
- ✅ CORS preflight requests succeed (or at least don't fail due to invalid URL)

