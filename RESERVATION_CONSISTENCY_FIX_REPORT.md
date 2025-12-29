# Reservation State Consistency Fix Report

## Problem Summary

A user could see "Reserved ✓" on EventDetailPage but:
- Event did not appear in My Circles → Attending
- Occupancy label didn't reflect the user
- Clicking "Reserved" button attempted to reserve again and showed "Failed to reserve spot"

**Root Causes Identified:**
1. **Non-idempotent reservation creation**: `createReservation` always created a new doc, even if one already existed (cancelled or reserved)
2. **Stale state**: UI showed "Reserved" based on cached `user.rsvps` even when Firestore had no active reservation
3. **Button behavior**: Button attempted to reserve when `hasRSVPed` was true but reservation didn't exist in Firestore

---

## Files Changed

### 1. `firebase/db.ts` (lines 552-750)
**Changes:**
- Made `createReservation` idempotent:
  - Queries for existing reservations (userId, eventId) regardless of status
  - If status='reserved' exists, returns existing ID (no duplicate)
  - If status='cancelled' exists, updates it back to 'reserved' (reactivates)
  - Handles multiple docs by picking most recent
  - Added DEV-only debug logging
  - Enhanced error propagation with error codes

**Key Logic:**
```typescript
// Query existing reservations
const existingQuery = query(reservationsCol, where("userId", "==", userId), where("eventId", "==", eventId));
const existingSnapshot = await getDocs(existingQuery);

// If reserved exists, return it
if (reservedDoc) return reservedDoc.id;

// If cancelled exists, reactivate it
if (cancelledDoc) {
  await updateDoc(reservationRef, { status: "reserved", reservedAt: Date.now(), ... });
  return cancelledDoc.id;
}
```

### 2. `stores/userStore.ts` (lines 767-850, 993-1013)
**Changes:**
- Updated `addRSVP` to use new idempotent `createReservation`
- Added DEV-only debug logging for reservation state
- Updated `removeRSVP` to be idempotent (no error if reservation already cancelled)
- Added logging for all reservations for (userId, eventId)

**Key Logic:**
```typescript
// Check if reservation already exists before creating
const existingResult = await listReservationsForUser(userId);
const activeReservation = existingResult.reservations.find(r => r.eventId === eventId && r.status === 'reserved');
if (activeReservation) return activeReservation.id; // Idempotent
```

### 3. `src/pages/EventDetailPage.tsx` (lines 386-431, 620-640, 1451-1480)
**Changes:**
- Added DEV-only debug logging for reservation state checks
- Fixed button behavior: only cancel if `hasActiveReservation === true` (confirmed from Firestore)
- Added state refresh when stale state detected
- Enhanced error handling for cancellation

**Key Logic:**
```typescript
// Only cancel if confirmed from Firestore
if (hasRSVPed && hasActiveReservation === true) {
  await removeRSVP(user.uid, event.id);
} else if (hasRSVPed && hasActiveReservation !== true) {
  // Stale state - refresh
  const result = await listReservationsForUser(user.uid);
  setHasActiveReservation(!!result.reservations.find(r => r.eventId === event.id && r.status === 'reserved'));
}
```

### 4. `src/pages/MyPopsPage.tsx` (lines 182-199)
**Changes:**
- Added DEV-only logging when event doc fetch fails
- Already correctly uses `/reservations` query (no changes needed)

### 5. `scripts/debugReservationState.ts` (new file)
**Purpose:** One-off debug script to inspect reservation state
**Usage:** `npx tsx scripts/debugReservationState.ts <userId> <eventId>`
**Output:** Shows all reservations for (userId, eventId), user.rsvps state, MyPops query results, event attendeeCount

---

## Verification

### Build Status
✅ **PASS** - `npm run build` completed successfully (3.04s)

### Circular Dependencies
✅ **PASS** - No new circular dependencies introduced
- Existing cycle: `utils/notificationHelpers.ts > firebase/follow.ts` (unrelated)

### Manual Testing Checklist

**Test 1: Reserve Event**
- [ ] Click "Reserve Spot" on free event
- [ ] Button shows "Confirming..." → "Reserved ✓"
- [ ] Occupancy count increments
- [ ] My Circles → Attending shows event

**Test 2: Cancel Reservation**
- [ ] Click "Reserved ✓" button
- [ ] Reservation is cancelled
- [ ] Event removed from My Circles → Attending
- [ ] Occupancy count decrements

**Test 3: Re-reserve Same Event**
- [ ] After cancelling, click "Reserve Spot" again
- [ ] Should work (no "Failed to reserve spot" error)
- [ ] Event appears in My Circles → Attending
- [ ] Occupancy count increments

**Test 4: Occupancy Updates**
- [ ] Reserve event
- [ ] Check occupancy count matches `/reservations` count
- [ ] Have another user reserve
- [ ] Occupancy count updates in real-time

---

## Debug Logging

All debug logs are **DEV-only** (guarded by `import.meta.env.DEV`):

1. **EventDetailPage**: Logs reservation state checks, all reservations for (userId, eventId), user.rsvps state
2. **userStore.addRSVP**: Logs reservation creation, existing reservations check
3. **firebase/db.createReservation**: Logs existing reservations query, idempotent decisions
4. **MyPopsPage**: Logs when event doc fetch fails

**To view logs:**
- Open browser console in dev mode
- Look for `[EVENT_DETAIL]`, `[USER_STORE]`, `[CREATE_RESERVATION]`, `[MY_POPS]` prefixes

---

## Expected Behavior After Fix

1. **Reserve Flow:**
   - Click "Reserve Spot" → Button shows "Confirming..."
   - `createReservation` checks for existing reservations
   - If cancelled exists, reactivates it (no duplicate)
   - If reserved exists, returns existing ID (idempotent)
   - Button shows "Reserved ✓" only after Firestore confirms
   - Occupancy count increments
   - Event appears in My Circles → Attending

2. **Cancel Flow:**
   - Click "Reserved ✓" → Only if `hasActiveReservation === true`
   - `removeRSVP` finds reservation and cancels it
   - If no reservation found, logs warning but doesn't error (idempotent)
   - Event removed from My Circles → Attending
   - Occupancy count decrements

3. **Re-reserve Flow:**
   - After cancelling, click "Reserve Spot"
   - `createReservation` finds cancelled reservation
   - Reactivates it (updates status to 'reserved')
   - No duplicate reservation created
   - Event appears in My Circles → Attending

4. **Stale State Handling:**
   - If UI shows "Reserved" but Firestore has no active reservation
   - Button click refreshes state instead of attempting cancel
   - State corrects itself automatically

---

## Summary

**Fixed Issues:**
- ✅ Reservation creation is now idempotent (no duplicates)
- ✅ Cancelled reservations can be reactivated (no duplicates)
- ✅ Button only cancels when reservation confirmed from Firestore
- ✅ Stale state is detected and refreshed automatically
- ✅ DEV-only debug logging added for troubleshooting

**No Breaking Changes:**
- All changes are backward compatible
- Existing reservations continue to work
- No schema changes required

**Next Steps:**
1. Run manual tests (see checklist above)
2. Use `scripts/debugReservationState.ts` to inspect any problematic reservations
3. Monitor DEV console logs for any edge cases

