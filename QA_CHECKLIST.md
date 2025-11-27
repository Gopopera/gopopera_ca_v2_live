# QA Checklist — One-Time Phone Verification & Event Publishing

## Pre-Conditions ✅

- [ ] User is logged in with Google
- [ ] User has no `phoneVerifiedForHosting` in Firestore
- [ ] `CreateEventPage` refreshes user profile before gating
- [ ] reCAPTCHA container is present in DOM (`host-phone-recaptcha-container`)
- [ ] No existing phone provider linked to Firebase user

---

## 1. Phone Verification Flow (First Time)

| Test Case | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| User clicks "Submit event" | Modal opens | ⬜ | |
| User enters valid phone (e.g., +1234567890) | Code is sent | ⬜ | Check console for `[HOST_VERIFY] Code sent` |
| User enters correct code | Modal closes | ⬜ | |
| Firestore user doc updated | `{ phoneVerifiedForHosting: true, hostPhoneNumber: "+1..." }` | ⬜ | Verify in Firestore console |
| UserStore updated | `userProfile.phoneVerifiedForHosting = true` | ⬜ | Check Zustand store |
| Event creation continues | Works without interruption | ⬜ | Event should be created |
| reCAPTCHA behavior | Invisible, no UI flicker | ⬜ | Should not see reCAPTCHA widget |

**Test on:**
- [ ] Desktop Chrome
- [ ] Desktop Safari
- [ ] iPhone Safari
- [ ] Android Chrome

---

## 2. Phone Verification Flow (Second Time)

| Test Case | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| User clicks "Submit event" | Modal does NOT open | ⬜ | Should bypass directly to event creation |
| User already verified | Gating bypasses modal | ⬜ | Check `isHostPhoneVerified` logic |
| Event creation | Proceeds directly | ⬜ | No SMS modal should appear |

**Test on:**
- [ ] Desktop Chrome
- [ ] Desktop Safari
- [ ] iPhone Safari
- [ ] Android Chrome

---

## 3. Fail/Edge Cases

| Case | Expected Behavior | Status | Notes |
|------|-------------------|--------|-------|
| Invalid phone number | Correct error displayed | ⬜ | Should show validation error |
| Wrong verification code | "Invalid code" error | ⬜ | Check error message |
| Expired code | "Code expired" or generic error | ⬜ | May show generic error (known issue) |
| Too many attempts | Fail-open: access granted | ⬜ | Should grant access even if SMS fails |
| Network drop | Modal remains in code step with retry | ⬜ | User can retry sending code |
| User closes modal | `required=true` → modal reopens | ⬜ | Should reopen on next submit attempt |
| User refreshes mid-process | Flow restarts cleanly | ⬜ | Should not get stuck |

**Test on:**
- [ ] Desktop Chrome
- [ ] Desktop Safari
- [ ] iPhone Safari
- [ ] Android Chrome

---

## 4. Event Publishing QA

When a verified user publishes an event:

| Check Area | What Must Happen | Status | Notes |
|------------|------------------|--------|-------|
| Firestore `events` collection | New event created | ⬜ | Verify in Firestore console |
| Landing page | Event appears | ⬜ | Should appear immediately |
| Explore page | Event appears | ⬜ | Should appear immediately |
| Signed-in personalized feed | Event appears | ⬜ | Should appear immediately |
| Search | Event found by title, tags, host name | ⬜ | Test search functionality |
| Categories | Event filtered correctly | ⬜ | Test category filters |
| City filter | Event appears only in correct city | ⬜ | Test city filtering |
| Realtime updates | UI refreshes without page reload | ⬜ | Should update via `onSnapshot` |

**Test on:**
- [ ] Desktop Chrome
- [ ] Desktop Safari
- [ ] iPhone Safari
- [ ] Android Chrome

---

## 5. Regression Checks

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Posting a second event skips SMS | ✅ | ⬜ | Should not ask for phone again |
| Editing an event doesn't require SMS | ✅ | ⬜ | Edit flow should not trigger verification |
| Duplicated verifier not created | ✅ | ⬜ | Check console for "already rendered" errors |
| No modal flashes | ✅ | ⬜ | Modal should not flash open/close |
| No stale profile | ✅ | ⬜ | `refreshUserProfile()` should be called |

**Test on:**
- [ ] Desktop Chrome
- [ ] Desktop Safari
- [ ] iPhone Safari
- [ ] Android Chrome

---

## 6. Authentication Flow QA

### Google Login

| Device | Test Case | Expected | Status | Notes |
|--------|-----------|----------|--------|-------|
| Desktop Chrome | Click "Sign in with Google" | Popup opens, login succeeds | ⬜ | |
| Desktop Safari | Click "Sign in with Google" | Popup opens, login succeeds | ⬜ | |
| iPhone Safari | Click "Sign in with Google" | Redirects to Google, returns logged in | ⬜ | Check for redirect loop |
| Android Chrome | Click "Sign in with Google" | Redirects to Google, returns logged in | ⬜ | Check for redirect loop |
| Private Mode | Login attempt | Works or shows warning | ⬜ | May fail in private mode |

### Email/Password Login (if enabled)

| Test Case | Expected | Status | Notes |
|-----------|----------|--------|-------|
| Valid credentials | Login succeeds | ⬜ | |
| Invalid credentials | Error message shown | ⬜ | |
| Password reset | Reset email sent | ⬜ | If implemented |

---

## 7. Mobile-Specific Checks

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| User-agent detection | Mobile devices use redirect | ⬜ | Check `signInWithRedirect` is called |
| Redirect flow in Safari iOS | Works without loop | ⬜ | Should redirect once and return |
| LocalStorage/state persists | User stays logged in | ⬜ | Check after page refresh |
| No reCAPTCHA rendering errors | No "already rendered" errors | ⬜ | Check console |
| No passive event blocking | Buttons work on touch | ⬜ | Test all interactive elements |

---

## 8. Monitoring & Debugging

| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Auth monitoring initialized | Console shows `[AUTH_MONITOR] Initializing` | ⬜ | Check browser console |
| Failures logged to Firestore | Check `auth_failures` collection | ⬜ | Verify logs are created |
| No infinite loading | Page loads within 3 seconds | ⬜ | Check loading states |
| No stuck redirect loops | Redirect happens once | ⬜ | Should not redirect multiple times |
| No "popup blocked" errors | Popup works or falls back to redirect | ⬜ | Check error messages |
| No blank white screen | Page renders after login return | ⬜ | Should see content immediately |

---

## Test Execution Notes

1. **Clear browser cache and localStorage** before each test session
2. **Use incognito/private mode** for clean testing
3. **Check browser console** for errors and warnings
4. **Check Firestore console** for data updates
5. **Test on real devices** when possible (not just browser dev tools)

---

## Known Issues

1. ⚠️ **Expired code error**: May show generic error instead of "Code expired"
2. ⚠️ **Safari ITP**: May block Firebase cookies in private mode
3. ⚠️ **Mobile redirect timing**: May have race condition (mitigated but not fully resolved)

---

## Sign-Off

- [ ] All critical tests passed
- [ ] No blocking issues found
- [ ] Monitoring is active
- [ ] Ready for production

**Tester:** _________________  
**Date:** _________________  
**Notes:** _________________

