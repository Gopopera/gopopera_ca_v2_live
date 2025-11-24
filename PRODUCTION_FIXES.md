# Production Fixes - Firestore & Email System

## ✅ Changes Made

### 1. Email System - Moved to Serverless Function

**Problem:** Resend API key was exposed client-side, causing security issues and failures.

**Solution:**
- Created `/api/send-email.ts` - Vercel serverless function
- Updated `src/lib/email.ts` to call serverless function instead of Resend directly
- All email sending now happens server-side

**Files:**
- `api/send-email.ts` - Serverless function (server-side)
- `src/lib/email.ts` - Client wrapper that calls `/api/send-email`
- `vercel.json` - Vercel configuration for API routes

**Environment Variables Required in Vercel:**
- `RESEND_API_KEY` (or `VITE_RESEND_API_KEY` as fallback)
- `RESEND_FROM` (or `VITE_RESEND_FROM` as fallback)

### 2. Firestore Write Validation

**Problem:** Undefined values in Firestore writes could cause silent failures.

**Solution:**
- Created `utils/firestoreValidation.ts` with validation helpers
- Added validation to all write functions:
  - `createEvent()` - Validates required fields, removes undefined
  - `createReservation()` - Validates required fields
  - `addChatMessage()` - Validates required fields, provides defaults
  - `createOrUpdateUserProfile()` - Removes undefined values
  - `addReview()` - Validates required fields, provides defaults

**Functions:**
- `removeUndefinedValues()` - Recursively removes undefined from objects
- `assertRequiredFields()` - Throws error if required fields missing/undefined
- `validateFirestoreData()` - Combines validation and cleaning

### 3. Enhanced Logging

**Added:**
- Production mode logging in `firebase.ts` - logs `import.meta.env.MODE`
- All Firestore writes log db status before attempting write
- All errors are logged with context

## 📋 Deployment Checklist

### Vercel Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

**Firebase (Required):**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)

**Resend (Required for Email):**
- `RESEND_API_KEY` (preferred) OR `VITE_RESEND_API_KEY` (fallback)
- `RESEND_FROM` (preferred) OR `VITE_RESEND_FROM` (fallback, defaults to support@gopopera.ca)

### Verify After Deployment

1. **Firestore Initialization:**
   - Check console for `[FIREBASE] Firestore initialized successfully`
   - Check console for `[FIREBASE] import.meta.env in production: { MODE: 'production', PROD: true }`

2. **Firestore Writes:**
   - Check console for `[FIRESTORE] functionName - db: defined`
   - Check console for `Firestore write success: { path: '...', docId: '...' }`
   - Verify no `undefined` values in logs

3. **Email Sending:**
   - Check Vercel function logs for `[API] Email sent successfully`
   - Check Firestore `email_logs` collection for entries
   - Verify emails are received

4. **Collections Auto-Create:**
   - Firestore collections auto-create on first write
   - No manual collection creation needed

## 🔍 Debugging

### Check Firestore Writes

Look for these console logs:
```
[FIRESTORE] createEvent - db: defined
Firestore write success: { path: 'events', docId: 'abc123' }
```

If `db: undefined`:
- Check Firebase initialization logs
- Verify environment variables are set
- Check `getApps()` result

### Check Email Sending

1. **Client-side:**
   ```
   [EMAIL] Sending email via serverless function: { to: '...', subject: '...' }
   [EMAIL] Email sent successfully: { messageId: '...' }
   ```

2. **Server-side (Vercel logs):**
   ```
   [API] Sending email: { to: '...', subject: '...' }
   [API] Email sent successfully: { messageId: '...' }
   ```

3. **Firestore logs:**
   - Check `email_logs` collection
   - Status should be `sent`, `failed`, or `skipped`
   - Check `error` field if status is `failed`

### Common Issues

**Issue: Email API returns 500**
- Check Vercel function logs
- Verify `RESEND_API_KEY` is set in Vercel
- Check Resend API key is valid

**Issue: Firestore writes fail silently**
- Check console for `db: undefined`
- Verify Firebase env vars are set
- Check `getApps()` result

**Issue: Undefined values in Firestore**
- Check validation logs for removed undefined values
- Ensure all required fields are provided
- Check `validateFirestoreData` warnings

## 📝 Files Modified

1. `api/send-email.ts` - NEW - Serverless function
2. `src/lib/email.ts` - Updated to use serverless function
3. `firebase/db.ts` - Added validation to all write functions
4. `utils/firestoreValidation.ts` - NEW - Validation helpers
5. `src/lib/firebase.ts` - Enhanced production logging
6. `vercel.json` - NEW - Vercel configuration

## 🚀 Next Steps

1. Deploy to Vercel
2. Set environment variables in Vercel dashboard
3. Test Firestore writes (create event, RSVP, etc.)
4. Test email sending (contact form, careers, etc.)
5. Check Vercel function logs for email sends
6. Verify `email_logs` collection in Firestore

