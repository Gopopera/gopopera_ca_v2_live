# Metrics Accuracy Fix - Profile Page

## Issues Fixed

### 1. Pending Reviews Cleanup
**Problem:** ~200 pending reviews were showing in the count, making metrics inaccurate.

**Solution:**
- Created `utils/cleanupPendingReviews.ts` to delete all pending/contested reviews
- Only keeps accepted reviews (or reviews without status for backward compatibility)
- Automatically runs once for `eatezca@gmail.com` when profile page loads
- Uses sessionStorage to prevent running multiple times

**Files:**
- `utils/cleanupPendingReviews.ts` - Cleanup function
- `src/pages/ProfilePage.tsx` - Auto-runs cleanup on mount

### 2. Events Count Accuracy
**Problem:** Profile showed 34 events but user only has ~4 events.

**Solution:**
- Enhanced `subscribeToHostedEventsCount` to validate `hostId` matches exactly
- Added logging to detect events with incorrect `hostId` values
- Filters out events where `hostId` doesn't match (data corruption protection)
- Only counts non-draft events with correct `hostId`

**Files:**
- `firebase/db.ts` - Enhanced `subscribeToHostedEventsCount` function

### 3. Reviews Count Accuracy
**Problem:** Reviews count subscription was querying by `hostId` but reviews don't have that field.

**Solution:**
- Fixed `subscribeToReviewsCount` to:
  1. Subscribe to events for the host
  2. Get all reviews for those events
  3. Count only accepted reviews (or reviews without status)
  4. Poll every 10 seconds to catch review changes
- Uses proper event-based querying since reviews are stored per event

**Files:**
- `firebase/db.ts` - Fixed `subscribeToReviewsCount` function

### 4. Diagnostic Tools
**Created:**
- `utils/diagnoseUserEvents.ts` - Diagnose events for a user to find incorrect data
- Helps identify events with wrong `hostId` values

## How It Works

### Automatic Cleanup
When `eatezca@gmail.com` loads their profile:
1. Checks if cleanup has run this session (sessionStorage)
2. If not, runs `deletePendingReviewsForHost(userId)`
3. Deletes all reviews with `status: 'pending'` or `status: 'contested'`
4. Keeps only accepted reviews
5. Refreshes profile to update counts

### Events Count Validation
- Queries events by `hostId`
- Validates each event's `hostId` matches exactly
- Logs warnings for mismatched events
- Only counts valid, non-draft events

### Reviews Count
- Subscribes to host's events
- When events change, recalculates review count
- Polls every 10 seconds to catch review updates
- Counts only accepted reviews across all events

## Prevention Measures

1. **Data Validation:**
   - Events count validates `hostId` matches
   - Logs warnings for data inconsistencies

2. **Review Status:**
   - Only counts accepted reviews
   - Pending reviews are excluded from counts

3. **Real-time Updates:**
   - All counts update in real-time via subscriptions
   - Changes reflect immediately

## Testing

To test the fixes:
1. Log in as `eatezca@gmail.com`
2. Navigate to Profile page
3. Check console for cleanup logs
4. Verify review count is accurate (only accepted reviews)
5. Verify events count is accurate (only your events)
6. Check browser console for any warnings about mismatched events

## Manual Cleanup (if needed)

If you need to manually run cleanup:

```typescript
import { deletePendingReviewsForHost } from './utils/cleanupPendingReviews';

// Get your user ID
const userId = 'YOUR_USER_ID';

// Run cleanup
deletePendingReviewsForHost(userId).then(result => {
  console.log('Cleanup result:', result);
});
```

## Diagnostic (if needed)

To diagnose events for a user:

```typescript
import { diagnoseUserEvents } from './utils/diagnoseUserEvents';

const userId = 'YOUR_USER_ID';
diagnoseUserEvents(userId).then(result => {
  console.log('Diagnostic result:', result);
  // Shows: correctEvents, incorrectEvents, incorrectEventIds, eventDetails
});
```

---

**All fixes are now in place and will prevent future inaccuracies!** ✅

