# Firestore Diagnostics - Summary

## ✅ What Was Added

### 1. Firebase Initialization Logging (`src/lib/firebase.ts`)

**Before `initializeApp()`:**
- ✅ Logs `import.meta.env` check (shows which vars are present)
- ✅ Logs full config object (with redacted API key) BEFORE initialization
- ✅ Logs `getApps()` result to show existing apps
- ✅ Logs when new app is initialized vs using existing app

**After `getFirestore()`:**
- ✅ Logs "Firestore initialized successfully" when `getFirestore()` completes
- ✅ Logs warning if app not available before Firestore init

### 2. Firestore Write Function Logging (`firebase/db.ts`)

**Every write function now logs:**
- ✅ `console.log('[FIRESTORE] functionName - db:', db ? 'defined' : 'undefined')` BEFORE any write attempt
- ✅ `console.error('[FIRESTORE] functionName failed: Firestore not available')` if db is undefined
- ✅ All existing success/failure logs remain

**Functions with logging:**
- ✅ `createEvent()` - logs db status before write
- ✅ `createReservation()` - logs db status before write
- ✅ `cancelReservation()` - logs db status before write
- ✅ `addChatMessage()` - logs db status before write
- ✅ `createOrUpdateUserProfile()` - logs db status before write
- ✅ `addReview()` - logs db status before write
- ✅ `recalculateEventRating()` - logs db status before write

### 3. Debug Route Enhanced (`pages/DebugEnvPage.tsx`)

**Added:**
- ✅ Logs full `import.meta.env` object (not just filtered keys)
- ✅ Dynamically imports `getApps()` and logs all initialized Firebase apps
- ✅ Shows app names and project IDs

## 🔍 What to Check in Production

### Step 1: Check Console on Page Load

Look for these logs in order:

```
[FIREBASE] import.meta.env check: { hasVITE_FIREBASE_API_KEY: true/false, ... }
[FIREBASE] Config BEFORE initializeApp: { apiKey: "...", authDomain: "...", ... }
[FIREBASE] getApps() result: 0 existing app(s)  OR  1 existing app(s)
[FIREBASE] Initializing new app...  OR  Using existing app: [DEFAULT]
[FIREBASE] App initialized successfully: [DEFAULT]
[FIREBASE] Initializing Firestore...
[FIREBASE] Firestore initialized successfully
```

**If you see:**
- ❌ `getApps() result: 0` → Firebase never initialized (check config)
- ❌ `Firestore not available` → `getDbSafe()` returned null
- ❌ Missing env vars → Config incomplete

### Step 2: Check on Firestore Write

When a write is attempted (e.g., createEvent, createReservation):

```
[FIRESTORE] createEvent - db: defined  OR  undefined
```

**If `db: undefined`:**
- ❌ `getDbSafe()` returned null
- ❌ Check if Firebase app initialized (Step 1)
- ❌ Check if `isDisabled` flag is true

**If `db: defined`:**
- ✅ Write should proceed
- ✅ Check for success/failure logs after

### Step 3: Use Debug Route

Navigate to `ViewState.DEBUG_ENV` and check console for:
- Full `import.meta.env` object
- Firebase Apps list (should show 1 app with projectId)

## 🐛 Common Issues & Solutions

### Issue: `db: undefined` on all writes

**Possible causes:**
1. Firebase config missing → Check `import.meta.env` logs
2. `isDisabled` flag is true → Check if any required vars are missing
3. `getAppSafe()` returns null → Check app initialization logs

**Solution:**
- Verify all `VITE_FIREBASE_*` vars are set in Vercel
- Check console for missing variable warnings
- Ensure `VITE_DISABLE_FIREBASE` is not set to '1'

### Issue: Firebase never initializes

**Check:**
- `getApps() result: 0` → No apps found
- Config logs show missing values
- `initializeApp()` throws error (logged)

**Solution:**
- Verify environment variables in deployment platform
- Check `vite.config.ts` defines all env vars
- Ensure build process injects env vars

### Issue: Writes succeed locally but fail in production

**Check:**
- Compare `import.meta.env` between local and production
- Verify Vercel environment variables are set
- Check if production build includes env vars in bundle

## 📊 Expected Log Flow

**Successful initialization:**
```
[FIREBASE] import.meta.env check: { hasVITE_FIREBASE_API_KEY: true, ... }
[FIREBASE] Config BEFORE initializeApp: { apiKey: "AIza...", ... }
[FIREBASE] getApps() result: 0 existing app(s)
[FIREBASE] Initializing new app...
[FIREBASE] App initialized successfully: [DEFAULT]
[FIREBASE] Initializing Firestore...
[FIREBASE] Firestore initialized successfully
```

**Successful write:**
```
[FIRESTORE] createEvent - db: defined
Firestore write success: { path: 'events', docId: 'abc123' }
```

**Failed write (db undefined):**
```
[FIRESTORE] createEvent - db: undefined
[FIRESTORE] createEvent failed: Firestore not available
```

## ✅ Verification Checklist

- [ ] Console shows Firebase config before initialization
- [ ] Console shows `getApps()` result
- [ ] Console shows "Firestore initialized successfully"
- [ ] All write functions log `db: defined` or `db: undefined`
- [ ] Debug route shows full `import.meta.env`
- [ ] Debug route shows Firebase apps list
- [ ] No silent failures (all errors logged)

