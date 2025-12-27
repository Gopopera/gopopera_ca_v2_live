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
  - Image contains: logo, cover/placeholder, title, host, date/time/location, QR, footer
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

