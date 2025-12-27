# Ticket Export Release Checklist

Quick regression checklist before deploying ticket/export changes.

## Environment Variables (CRITICAL)

**Verify in Vercel Dashboard before deploying:**

| Environment | Variable | Expected Value |
|-------------|----------|----------------|
| **Production** | `VITE_BASE_URL` | `https://gopopera.ca` |
| **Staging** | `VITE_BASE_URL` | `https://staging.gopopera.ca` |

If `VITE_BASE_URL` is missing or set incorrectly, QR codes may resolve to wrong domain.

## Pre-Deploy Checks

### 1. Ticket Page Load
- [ ] RSVP to a free event
- [ ] Verify redirect to `/ticket/:reservationId`
- [ ] Page shows: event title, host name, date/time, location, QR code, action buttons

### 2. Download PNG Works
- [ ] Click **Download** button
- [ ] PNG file downloads (not blank)
- [ ] Image contains: logo (no box), title, "Hosted by [name]", date/time/location, QR, footer
- [ ] Image is 1080×1920 (or 2160×3840 at 2x scale)
- [ ] "Hosted by" has correct spacing (not "Hostedby")
- [ ] Date has correct spacing (e.g., "Fri, January 30th 2026", not "Fri,January30th2026")

### 3. QR Domain Verification (CRITICAL)
- [ ] Scan QR code from downloaded PNG
- [ ] **MUST open**: `https://gopopera.ca/ticket/...` (prod) or `https://staging.gopopera.ca/ticket/...` (staging)
- [ ] **MUST NOT open**: `*.vercel.app`, `vercel.com/login`, or any Vercel URL
- [ ] Test from a device NOT logged into Vercel (prevents false positive)

### 4. Host Check-in (Manual)
- [ ] Log in as event host
- [ ] Open Attendees section for the event
- [ ] If list loads: click "Check in" on an attendee
- [ ] If list fails: verify graceful error message (not crash)
- [ ] After check-in: Firestore updates with `checkedInAt` and `checkedInBy`

### 5. Host Check-in (QR Mode)
- [ ] Scan QR as host (URL includes `?mode=checkin`)
- [ ] "Confirm Check-in" button appears
- [ ] Click it → reservation is checked in

## Failsafe Debug Modes

If export is broken, use these query params for debugging:

- `/ticket/:id?export=debug` — Shows export layout onscreen with orange outline
- `/ticket/:id?export=plain` — Forces placeholder (skips any asset loading)

## Attendee List Error Handling

The attendee list may fail if:
1. **Firestore index missing**: Error message will say "index required"
2. **Permission denied**: Error message will say "permissions"

In both cases:
- [ ] UI shows graceful error message (not crash)
- [ ] Rest of EventDetailPage still loads
- [ ] Console shows error details for debugging

## Production Smoke Tests (Post-Deploy)

Run these on `https://gopopera.ca` immediately after deploying:

1. **Ticket page loads**
   - Open any existing ticket URL
   - Page renders without crash

2. **Download works**
   - Click Download button
   - PNG is not blank
   - Contains: logo, title, host, date, location, QR

3. **QR domain is correct**
   - Scan QR from downloaded PNG on a phone NOT logged into Vercel
   - URL resolves to `https://gopopera.ca/ticket/...`
   - Does NOT redirect to Vercel login

4. **Host attendee list**
   - Login as host
   - Open event detail page
   - List loads OR shows graceful error
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

| File | Purpose |
|------|---------|
| `src/components/ticket/TicketStoryExport.tsx` | Export layout (1080x1920) |
| `src/pages/TicketPage.tsx` | Ticket page + download logic |
| `src/utils/baseUrl.ts` | Safe base URL helper (rejects Vercel URLs) |
| `src/utils/safeImage.ts` | Image to data URL conversion |
| `src/utils/formatTicketText.ts` | Date/title formatting |
| `firebase/db.ts` | listReservationsForEvent + updateReservationCheckIn |
| `src/components/host/AttendeeList.tsx` | Host attendee list + manual check-in |
| `src/pages/EventDetailPage.tsx` | AttendeeList integration |
| `public/popera-logo.png` | Transparent logo for export |

## QR URL Safety

The `getBaseUrl()` function in `src/utils/baseUrl.ts` ensures:

1. **Priority 1**: Use `VITE_BASE_URL` if set and valid HTTPS and NOT Vercel
2. **Priority 2**: Use `window.location.origin` if valid HTTPS and NOT Vercel
3. **Priority 3**: Fallback to `https://gopopera.ca` (always safe)

Vercel URLs are explicitly rejected:
- `*.vercel.app`
- `*.vercel.com`
- `*.vercel.*`
