# Pre-Push Checklist

## Commands to Run

### 1. Build Check
```bash
npm run build
```
**Expected:** Build succeeds with no errors

### 2. Circular Dependency Check
```bash
npx madge --circular --extensions ts,tsx src firebase stores components
```
**Expected:** No new circular dependencies (existing cycle in `utils/notificationHelpers.ts > firebase/follow.ts` is acceptable)

### 3. Pre-Push Sanity Check (READ-ONLY)
```bash
npx tsx scripts/prePushSanity.ts --userId <USER_ID> --eventId <EVENT_ID>
```

**Example:**
```bash
npx tsx scripts/prePushSanity.ts --userId yDt2rFMadrWvN0IEgE1C8WPRFeK2 --eventId YWNZUGSf0VCczFVGs1lR
```

**Expected Output Format:**
```
✅ Connected to Firestore

🔍 Pre-Push Sanity Check
   Mode: READ-ONLY
   userId: <USER_ID>
   eventId: <EVENT_ID>

📋 Query 1: All reservations for (userId, eventId)
   Found 1 reservation(s):

   [1] Doc ID: <DOC_ID>
       Status: reserved
       Reserved At: 2024-01-15T10:30:00.000Z
       Created At: 2024-01-15T10:30:00.000Z
       Updated At: 2024-01-15T10:30:00.000Z

📊 Query 2: Active reservations for event
   Active reservation count: 5
   Unique active attendees: 5

📱 Query 3: My Circles → Attending (simulated)
   Total reserved events for user: 3
   This event appears: ✅ YES

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ GO: All checks passed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4. Pre-Push Sanity Check (FIX MODE - if duplicates found)
```bash
npx tsx scripts/prePushSanity.ts --userId <USER_ID> --eventId <EVENT_ID> --fix
```

**Use FIX MODE only if:**
- READ-ONLY mode shows duplicate active reservations (2+ reserved docs for same userId+eventId)
- You want to automatically cancel duplicates (keeps newest, cancels others)

---

## What "GO" Looks Like

✅ **GO** means:
- Build succeeds
- No new circular dependencies
- Pre-push sanity check shows:
  - ✅ All checks passed
  - No duplicate active reservations (0 or 1 reserved doc per userId+eventId)
  - MyPops query returns the event if user has active reservation
  - No permission-denied errors
  - Event has reserved docs and MyPops query matches

**Example GO output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ GO: All checks passed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## What "NO-GO" Looks Like

❌ **NO-GO** means one or more of:
- Build fails
- New circular dependencies introduced
- Pre-push sanity check shows:
  - ❌ NO-GO: Issues found
  - 2+ reserved docs for same (userId, eventId) → **Duplicate active reservations**
  - Event has reserved docs but MyPops query would return none → **Query mismatch**
  - Permission-denied errors → **Firestore rules issue**

**Example NO-GO output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ NO-GO: Issues found
   1. 2 active reservations found for (userId, eventId)
   2. Event has reserved docs but MyPops query would return none for user
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**If NO-GO:**
1. **Duplicate reservations:** Run with `--fix` flag to cancel duplicates (keeps newest)
2. **Query mismatch:** Check Firestore security rules and reservation status values
3. **Permission-denied:** Verify Firebase Admin SDK credentials and Firestore rules

---

## FIX MODE Details

When `--fix` flag is used and duplicates are found:

1. **Keeps newest reservation** (sorted by: updatedAt > reservedAt > createdAt > doc.id)
2. **Cancels all duplicates** (sets status='cancelled', cancelledAt=serverTimestamp())
3. **Re-runs report** to show before/after counts

**Example FIX MODE output:**
```
🔧 FIX MODE: Cancelling duplicate active reservations...

   Keeping newest: <NEWEST_DOC_ID> (reservedAt: 2024-01-15T10:30:00.000Z)
   Cancelling 1 duplicate(s):

   ✅ Cancelled: <DUPLICATE_DOC_ID>

   🔄 Re-running report after fix...

   Before: 2 active reservation(s)
   After: 1 active reservation(s)
   ✅ FIX APPLIED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ GO: All checks passed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## DEV-Only Diagnostic Logs

When running in dev mode (`npm run dev`), additional diagnostic logs will appear in browser console:

**When reserve is clicked:**
```
[EVENT_DETAIL] 🔍 RSVP FLOW START: { userId: "...", eventId: "..." }
```

**When createReservation returns:**
```
[EVENT_DETAIL] ✅ createReservation returned: { reservationId: "...", userId: "...", eventId: "..." }
```

**When confirmation polling succeeds:**
```
[EVENT_DETAIL] ✅ Confirmation polling SUCCESS: { attempt: 2, reservationId: "...", userId: "...", eventId: "..." }
```

**When confirmation polling fails:**
```
[EVENT_DETAIL] ❌ Confirmation polling FAILED: { reservationId: "...", userId: "...", eventId: "...", attempts: 5 }
```

These logs are **DEV-only** and do not appear in production builds.

---

## Quick Reference

| Check | Command | Expected Result |
|-------|---------|----------------|
| Build | `npm run build` | ✓ built successfully |
| Circular Deps | `npx madge --circular --extensions ts,tsx src firebase stores components` | No new cycles |
| Sanity (Read) | `npx tsx scripts/prePushSanity.ts --userId <UID> --eventId <ID>` | ✅ GO: All checks passed |
| Sanity (Fix) | `npx tsx scripts/prePushSanity.ts --userId <UID> --eventId <ID> --fix` | ✅ FIX APPLIED → GO |

---

## Notes

- Pre-push sanity script requires `firebase-service-account.json` in project root
- Script uses Firebase Admin SDK (read-only by default, writes only in FIX MODE)
- FIX MODE only cancels duplicate active reservations (no other writes)
- All diagnostic logs are DEV-only and guarded by `import.meta.env.DEV`

