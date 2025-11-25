# Diagnostic Report: Mobile Login & Host Verification Issues

## 🔍 ROOT CAUSES IDENTIFIED

### A. MOBILE LOGIN ISSUE

**Problem:** Mobile login/sign-up fails or gets stuck loading.

**Root Causes:**

1. **CRITICAL: Viewport-based mobile detection (Line 85 in `src/lib/firebaseAuth.ts`)**
   - Uses `window.innerWidth <= 768` instead of proper user-agent detection
   - Desktop browsers in narrow windows trigger mobile redirect flow
   - Mobile browsers in landscape or with zoom may not trigger redirect
   - **File:** `src/lib/firebaseAuth.ts:85`
   - **Issue:** Unreliable viewport detection causes wrong auth flow

2. **Redirect result handling race condition**
   - `redirectChecked` flag in `firebaseAuth.ts` is module-level and never resets
   - `getRedirectResult()` called in two places:
     - `src/lib/firebase.ts:254` (module-level, async import)
     - `stores/userStore.ts:169` (in init, via `completeGoogleRedirect()`)
   - First call consumes the redirect result, second call returns null
   - **File:** `src/lib/firebaseAuth.ts:71-72` and `src/lib/firebase.ts:254`
   - **Issue:** Redirect result consumed before userStore can process it

3. **Missing mobile user-agent detection**
   - No proper `shouldUseRedirect()` function being used
   - Documentation mentions it but code doesn't use it
   - **File:** `src/lib/firebaseAuth.ts:85`
   - **Issue:** Should detect iOS/Android via user-agent, not viewport

### B. RECAPTCHA BEHAVIOR ON MOBILE

**Status:** ✅ **WORKING CORRECTLY**
- Module-level singleton prevents "already rendered" errors
- Container exists with `display: none`
- Verifier cleared only on component unmount
- **No changes needed**

### C. ONE-TIME PHONE VERIFICATION ISSUE

**Problem:** Modal shows again after successful verification.

**Root Causes:**

1. **Missing userProfile update when userProfile is null (Line 229-234 in `HostPhoneVerificationModal.tsx`)**
   - Only updates store if `current` exists
   - If `userProfile` is null, update is skipped
   - After `refreshUserProfile()`, if Firestore read is slow, gating logic still sees old state
   - **File:** `components/auth/HostPhoneVerificationModal.tsx:229-234`
   - **Issue:** Should create minimal userProfile if null

2. **Gating logic reads stale state**
   - `CreateEventPage.tsx:91` reads `userProfile` from store
   - If Firestore write succeeds but store update fails, modal shows again
   - **File:** `pages/CreateEventPage.tsx:91`
   - **Issue:** Should also check Firestore directly or ensure store is always updated

3. **Modal state not reset after success**
   - Modal closes but `showHostVerificationModal` might be set again if userProfile isn't updated
   - **File:** `pages/CreateEventPage.tsx:94`
   - **Issue:** Need to ensure modal state respects updated userProfile

---

## 🔧 EXACT FIXES REQUIRED

### FIX 1: Replace viewport-based mobile detection with user-agent detection

**File:** `src/lib/firebaseAuth.ts`

**Line 85:** Replace viewport check with proper mobile detection

**Current Code:**
```typescript
const preferRedirect = typeof window !== 'undefined' && window.innerWidth <= 768;
```

**Fixed Code:**
```typescript
// Proper mobile detection using user-agent
const isMobile = typeof window !== 'undefined' && (
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  (window.matchMedia && window.matchMedia('(max-width: 768px)').matches && /Mobile|Android/i.test(navigator.userAgent))
);
const preferRedirect = isMobile;
```

**Why:** Viewport width alone is unreliable. User-agent detection ensures mobile devices always use redirect, regardless of window size.

---

### FIX 2: Fix redirect result handling race condition

**File:** `src/lib/firebaseAuth.ts`

**Lines 69-79:** Remove module-level `redirectChecked` flag and make it per-call

**Current Code:**
```typescript
let redirectChecked = false;

export async function completeGoogleRedirect(): Promise<UserCredential | null> {
  const auth = await initFirebaseAuth();
  if (redirectChecked) return null;
  redirectChecked = true;
  try {
    return await getRedirectResult(auth);
  } catch (err) {
    console.error('[AUTH] completeGoogleRedirect error', err);
    return null;
  }
}
```

**Fixed Code:**
```typescript
// Remove module-level redirectChecked - let each call check independently
// The redirect result can only be consumed once by Firebase, so multiple calls are safe (second returns null)

export async function completeGoogleRedirect(): Promise<UserCredential | null> {
  const auth = await initFirebaseAuth();
  try {
    return await getRedirectResult(auth);
  } catch (err) {
    console.error('[AUTH] completeGoogleRedirect error', err);
    return null;
  }
}
```

**Why:** The module-level flag prevents legitimate redirect handling. Firebase's `getRedirectResult()` can be called multiple times safely (second call returns null), so we don't need the flag.

---

### FIX 3: Remove duplicate getRedirectResult call in firebase.ts

**File:** `src/lib/firebase.ts`

**Lines 250-261:** Remove the module-level async getRedirectResult call

**Current Code:**
```typescript
// Initialize Firebase and handle redirect results immediately
// This prevents iOS "missing initial state" errors
if (typeof window !== 'undefined') {
  import('firebase/auth').then(({ getRedirectResult }) => {
    const authInstance = getAuthSafe();
    if (authInstance) {
      getRedirectResult(authInstance).catch(() => {
        // Swallow missing initial state errors silently (iOS issue)
      });
    }
  }).catch(() => {
    // Ignore if auth module not available
  });
}
```

**Fixed Code:**
```typescript
// REMOVED: Let userStore.init() handle redirect results via completeGoogleRedirect()
// This prevents race condition where redirect result is consumed before userStore can process it
```

**Why:** This duplicate call consumes the redirect result before `userStore.init()` can process it, causing mobile login to fail.

---

### FIX 4: Ensure userProfile is always updated after verification

**File:** `components/auth/HostPhoneVerificationModal.tsx`

**Lines 227-237:** Always update userProfile, even if it's null

**Current Code:**
```typescript
// Immediately sync userProfile in store so gating logic sees the change on next submit
// Only update if userProfile exists (if it doesn't, refreshUserProfile will fetch it)
const current = useUserStore.getState().userProfile;
if (current) {
  useUserStore.setState({
    userProfile: { ...current, phoneVerifiedForHosting: true, hostPhoneNumber: formattedPhone },
  });
}

// Refresh user profile to get updated data from Firestore
await refreshUserProfile();
```

**Fixed Code:**
```typescript
// Immediately sync userProfile in store so gating logic sees the change on next submit
const current = useUserStore.getState().userProfile;
if (current) {
  // Update existing profile
  useUserStore.setState({
    userProfile: { ...current, phoneVerifiedForHosting: true, hostPhoneNumber: formattedPhone },
  });
} else {
  // Create minimal profile if it doesn't exist yet (refreshUserProfile will fill in details)
  useUserStore.setState({
    userProfile: {
      uid: user.uid,
      phoneVerifiedForHosting: true,
      hostPhoneNumber: formattedPhone,
    } as any, // Type assertion needed for partial profile
  });
}

// Refresh user profile to get updated data from Firestore (this will merge with our update)
await refreshUserProfile();
```

**Why:** If `userProfile` is null, the store update is skipped, causing the modal to show again. We must always update the store immediately.

---

### FIX 5: Add defensive check in CreateEventPage gating

**File:** `pages/CreateEventPage.tsx`

**Lines 86-96:** Add additional safety check and ensure userProfile is fresh

**Current Code:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Gate: Check if user has verified phone for hosting
  // Use OR logic: userProfile.phoneVerifiedForHosting OR user.phone_verified (backward compatibility)
  const isHostPhoneVerified = !!(userProfile?.phoneVerifiedForHosting || user?.phone_verified);
  
  if (!isHostPhoneVerified) {
    setShowHostVerificationModal(true);
    return;
  }
```

**Fixed Code:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Gate: Check if user has verified phone for hosting
  // Refresh profile first to ensure we have latest data
  await refreshUserProfile();
  const freshProfile = useUserStore.getState().userProfile;
  
  // Use OR logic: userProfile.phoneVerifiedForHosting OR user.phone_verified (backward compatibility)
  const isHostPhoneVerified = !!(freshProfile?.phoneVerifiedForHosting || user?.phone_verified);
  
  if (!isHostPhoneVerified) {
    setShowHostVerificationModal(true);
    return;
  }
```

**Why:** Ensures we always check the latest userProfile state before gating, preventing the modal from showing after successful verification.

---

## 📋 SUMMARY OF CHANGES

1. **`src/lib/firebaseAuth.ts`** (2 changes):
   - Line 85: Replace viewport detection with user-agent detection
   - Lines 69-79: Remove `redirectChecked` flag from `completeGoogleRedirect()`

2. **`src/lib/firebase.ts`** (1 change):
   - Lines 250-261: Remove duplicate `getRedirectResult()` call

3. **`components/auth/HostPhoneVerificationModal.tsx`** (1 change):
   - Lines 227-237: Always update userProfile, even if null

4. **`pages/CreateEventPage.tsx`** (1 change):
   - Lines 86-96: Refresh userProfile before gating check

**Total:** 5 surgical fixes across 4 files.

---

## ✅ EXPECTED RESULTS

After fixes:
- ✅ Mobile login works reliably (proper user-agent detection)
- ✅ Redirect results handled correctly (no race condition)
- ✅ Host verification modal shows only once per user
- ✅ Modal never reappears after successful verification
- ✅ Desktop login unaffected

