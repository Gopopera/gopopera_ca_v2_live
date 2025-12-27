# Ticket Export Release Checklist

Quick regression checklist before deploying ticket/export changes.

## Pre-Deploy Checks

- [ ] **RSVP → Ticket page loads**
  - RSVP to a free event
  - Verify redirect to `/ticket/:reservationId`
  - Page shows event details, QR code, and action buttons

- [ ] **Download → PNG renders (non-blank)**
  - Click Download button
  - PNG file downloads
  - Image contains: logo, title, host, date/time/location, QR, footer
  - Image is 1080×1920 (or 2160×3840 at 2x scale)

- [ ] **QR scan → opens correct domain**
  - Scan the QR in the downloaded PNG
  - URL opens `https://staging.gopopera.ca/ticket/...` (not vercel.app)
  - On prod, URL opens `https://gopopera.ca/ticket/...`

- [ ] **Host check-in (manual) works**
  - Log in as the event host
  - Open Attendees section for the event
  - Click "Check in" on an attendee
  - Firestore updates with `checkedInAt` and `checkedInBy`
  - UI reflects checked-in state

- [ ] **Host check-in (QR mode) works**
  - Scan QR as host (URL includes `?mode=checkin`)
  - "Confirm Check-in" button appears
  - Click it → reservation is checked in

## Failsafe Debug Modes

If export is broken, use these query params:

- `/ticket/:id?export=debug` — Shows export layout onscreen with orange outline
- `/ticket/:id?export=plain` — Forces placeholder cover (skips image loading)

## Environment Variables

Ensure these are set in Vercel:

- **Staging:** `VITE_BASE_URL=https://staging.gopopera.ca`
- **Production:** `VITE_BASE_URL=https://gopopera.ca`

## Production Smoke Tests (Post-Deploy)

Run these on `https://gopopera.ca` after deploying:

1. **Ticket export download**
   - Open any ticket page
   - Download PNG (must NOT be blank)
   - "Hosted by" must have correct spacing
   - Date must have spaces (e.g., "Fri, January 30th 2026")

2. **QR domain check**
   - Scan QR from downloaded PNG
   - Must resolve to `https://gopopera.ca/ticket/<id>?mode=checkin`
   - Must NOT go to `vercel.com/login` or `*.vercel.app`

3. **Host attendee list**
   - Login as host
   - Open event detail page
   - Attendee list loads (or shows graceful error message)
   - Check-in button works (if list loads)

## Rollback Plan

If production breaks after deploy:

1. **Revert the merge commit on main:**
   ```bash
   git checkout main
   git revert <merge-commit-hash>
   git push origin main
   ```

2. **Trigger Vercel redeploy** (automatic on push)

3. **Verify rollback:**
   - Check production site loads
   - Ticket pages still work (may have old behavior)

4. **Investigate and fix in staging before re-merging**

## Files in This Release

- `src/components/ticket/TicketStoryExport.tsx` - Export layout (1080x1920)
- `src/pages/TicketPage.tsx` - Ticket page + download logic
- `src/utils/baseUrl.ts` - Safe base URL helper
- `src/utils/safeImage.ts` - Image to data URL conversion
- `src/utils/formatTicketText.ts` - Date/title formatting
- `firebase/db.ts` - listReservationsForEvent + updateReservationCheckIn
- `src/components/host/AttendeeList.tsx` - Host attendee list + manual check-in
- `src/pages/EventDetailPage.tsx` - AttendeeList integration
- `public/popera-logo.png` - Transparent logo for export
