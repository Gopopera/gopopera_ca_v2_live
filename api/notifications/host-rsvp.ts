/**
 * Host RSVP Notification API Endpoint
 * 
 * Called by client after successful reservation creation to notify host.
 * This provides a reliable server-side notification path for logged-in RSVPs.
 * 
 * POST /api/notifications/host-rsvp
 * Headers: Authorization: Bearer <firebase-id-token>
 * Body: { reservationId: string }
 * 
 * Security:
 * - Requires valid Firebase ID token
 * - Caller must be reservation owner, event host, or admin
 * - Only processes active reservations (reserved, checked_in)
 * - Rate limited per-IP and per-reservation
 * - Smart cooldown: only applies if all channels already sent
 */

import { getAdminFirestore, getAdminAuth } from '../_lib/firebaseAdmin.js';
import { notifyHostOnReservation, generateRequestId, type HostNotifyState } from '../_lib/notifyHostOnReservation.js';

// --- CORS Allowlist ---
const ALLOWED_ORIGINS = [
    'https://gopopera.ca',
    'https://www.gopopera.ca',
];

/**
 * Check if origin is allowed (includes Vercel preview domains)
 */
function isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) return false;

    // Exact match for production
    if (ALLOWED_ORIGINS.includes(origin)) return true;

    // Allow Vercel preview deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) return true;

    // Allow localhost for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;

    return false;
}

// --- Admin Check Helper ---
let adminWarningLogged = false;

/**
 * Check if user is admin.
 * Priority: 1) Firebase custom claim 2) ADMIN_EMAIL_ALLOWLIST env 3) Hardcoded fallback
 * TODO: Migrate to Firebase custom claims for production
 */
function isUserAdmin(decoded: { admin?: boolean; email?: string }): boolean {
    // 1. Firebase custom claim (preferred)
    if (decoded.admin === true) return true;

    // 2. Environment variable allowlist
    const envAllowlist = process.env.ADMIN_EMAIL_ALLOWLIST;
    if (envAllowlist) {
        const emails = envAllowlist.split(',').map(e => e.trim().toLowerCase());
        if (decoded.email && emails.includes(decoded.email.toLowerCase())) return true;
        return false;
    }

    // 3. Hardcoded fallback (legacy) - log warning once
    if (!adminWarningLogged) {
        console.warn('[HOST_RSVP_API] Using hardcoded admin email - set ADMIN_EMAIL_ALLOWLIST or use Firebase custom claims');
        adminWarningLogged = true;
    }
    const FALLBACK_ADMIN_EMAIL = 'eatezca@gmail.com';
    return decoded.email?.toLowerCase() === FALLBACK_ADMIN_EMAIL.toLowerCase();
}

// Active reservation statuses that can trigger host notifications
const ACTIVE_STATUSES = ['reserved', 'checked_in'];

// Smart cooldown: 15s, but only if all channels are already sent/skipped
const NOTIFICATION_COOLDOWN_MS = 15_000;

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const IP_RATE_LIMIT = 30; // max requests per IP per minute
const RESERVATION_RATE_LIMIT = 5; // max requests per reservation per minute

// In-memory rate limit maps (reset on cold start)
const ipRateLimit = new Map<string, { count: number; resetAt: number }>();
const reservationRateLimit = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit and increment counter
 */
function checkRateLimit(
    map: Map<string, { count: number; resetAt: number }>,
    key: string,
    limit: number
): boolean {
    const now = Date.now();
    const entry = map.get(key);

    if (!entry || now > entry.resetAt) {
        map.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (entry.count >= limit) {
        return false;
    }

    entry.count += 1;
    return true;
}

/**
 * Get client IP from request
 */
function getClientIp(req: any): string {
    const forwarded = (req.headers['x-forwarded-for'] || '').toString();
    const ip = forwarded.split(',')[0]?.trim();
    return ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Check if all notification channels are complete (sent or skipped)
 */
function allChannelsComplete(hostNotify: Partial<HostNotifyState>): boolean {
    // If any channel timestamp exists, that channel is complete
    // If inAppAt is set, in-app is done; emailAt set means email is done; smsAt set means SMS is done
    // This is a simplified check - returns true if lastAttemptAt exists and no errors
    // A more precise check would require knowing which channels are applicable
    const hasAttempts = !!hostNotify.lastAttemptAt;
    const hasNoErrors = !hostNotify.lastError;
    return hasAttempts && hasNoErrors && (!!hostNotify.inAppAt || !!hostNotify.emailAt);
}

export default async function handler(req: any, res: any) {
    const origin = req.headers.origin;

    // --- CORS with Allowlist ---
    if (isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (origin) {
        // Origin header present but not allowed - for non-browser requests (no Origin), we still proceed
        // This is safe because auth token is required anyway
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const requestId = generateRequestId();
    const clientIp = getClientIp(req);

    // --- Rate Limit: Per-IP ---
    if (!checkRateLimit(ipRateLimit, clientIp, IP_RATE_LIMIT)) {
        console.warn(`[HOST_RSVP_API] requestId=${requestId} status=rate_limited reason=ip_limit ip=${clientIp}`);
        return res.status(429).json({ error: 'Too many requests' });
    }

    try {
        const { reservationId } = req.body || {};

        // --- Input Validation ---
        if (!reservationId || typeof reservationId !== 'string') {
            console.warn(`[HOST_RSVP_API] requestId=${requestId} status=bad_request reason=missing_reservationId`);
            return res.status(400).json({ error: 'Missing reservationId' });
        }

        // Basic format validation: Firestore doc IDs are typically 20 alphanumeric chars
        const reservationIdTrimmed = reservationId.trim();
        if (reservationIdTrimmed.length < 10 || reservationIdTrimmed.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(reservationIdTrimmed)) {
            console.warn(`[HOST_RSVP_API] requestId=${requestId} status=bad_request reason=invalid_reservationId_format`);
            return res.status(400).json({ error: 'Invalid reservationId format' });
        }

        // --- Rate Limit: Per-Reservation ---
        if (!checkRateLimit(reservationRateLimit, reservationIdTrimmed, RESERVATION_RATE_LIMIT)) {
            console.warn(`[HOST_RSVP_API] requestId=${requestId} status=rate_limited reason=reservation_limit reservationId=${reservationIdTrimmed}`);
            return res.status(429).json({ error: 'Too many requests for this reservation' });
        }

        // --- Firebase Admin Setup ---
        const db = getAdminFirestore();
        const auth = getAdminAuth();

        if (!db || !auth) {
            console.error(`[HOST_RSVP_API] requestId=${requestId} status=error reason=firebase_not_configured`);
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // --- Auth Verification ---
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn(`[HOST_RSVP_API] requestId=${requestId} status=unauthorized reason=missing_auth_header`);
            return res.status(401).json({ error: 'Authorization required' });
        }

        const idToken = authHeader.split('Bearer ')[1];
        let callerUid: string;
        let callerEmail: string | undefined;
        let isAdmin = false;

        try {
            const decoded = await auth.verifyIdToken(idToken);
            callerUid = decoded.uid;
            callerEmail = decoded.email;
            isAdmin = isUserAdmin(decoded);
        } catch (authError: any) {
            console.warn(`[HOST_RSVP_API] requestId=${requestId} status=unauthorized reason=invalid_token error="${authError.message?.substring(0, 50)}"`);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // --- Fetch Reservation ---
        const reservationDoc = await db.collection('reservations').doc(reservationIdTrimmed).get();
        if (!reservationDoc.exists) {
            console.warn(`[HOST_RSVP_API] requestId=${requestId} callerUid=${callerUid} status=not_found reservationId=${reservationIdTrimmed}`);
            return res.status(404).json({ error: 'Reservation not found' });
        }

        const reservation = reservationDoc.data() || {};
        const { eventId, attendeeName, attendeeEmail, userId, status } = reservation;
        const hostNotify = (reservation.hostNotify || {}) as Partial<HostNotifyState>;

        // --- Status Check ---
        if (!ACTIVE_STATUSES.includes(status)) {
            console.warn(`[HOST_RSVP_API] requestId=${requestId} callerUid=${callerUid} status=rejected reason=inactive_reservation reservationId=${reservationIdTrimmed} reservationStatus=${status}`);
            return res.status(409).json({ error: 'Reservation is not active', reservationStatus: status });
        }

        if (!eventId) {
            console.warn(`[HOST_RSVP_API] requestId=${requestId} callerUid=${callerUid} status=bad_data reason=missing_eventId reservationId=${reservationIdTrimmed}`);
            return res.status(400).json({ error: 'Invalid reservation data' });
        }

        // --- Fetch Event ---
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            console.warn(`[HOST_RSVP_API] requestId=${requestId} callerUid=${callerUid} status=not_found eventId=${eventId}`);
            return res.status(404).json({ error: 'Event not found' });
        }

        const eventData = eventDoc.data() || {};
        const { hostId, title: eventTitle, pricingType } = eventData;

        if (!hostId) {
            console.warn(`[HOST_RSVP_API] requestId=${requestId} callerUid=${callerUid} status=bad_data reason=missing_hostId eventId=${eventId}`);
            return res.status(400).json({ error: 'Event has no host' });
        }

        // --- Access Control ---
        const isReservationOwner = callerUid === userId;
        const isEventHost = callerUid === hostId;
        const hasAccess = isReservationOwner || isEventHost || isAdmin;

        if (!hasAccess) {
            console.warn(`[HOST_RSVP_API] requestId=${requestId} callerUid=${callerUid} status=forbidden reason=access_denied reservationId=${reservationIdTrimmed} userId=${userId} hostId=${hostId}`);
            return res.status(403).json({ error: 'Access denied' });
        }

        // --- Self-RSVP Check ---
        if (userId === hostId) {
            console.log(`[HOST_RSVP_API] requestId=${requestId} callerUid=${callerUid} status=skipped reason=self_rsvp userId=${userId} hostId=${hostId} reservationId=${reservationIdTrimmed}`);
            return res.status(200).json({
                success: true,
                skipped: true,
                reason: 'self_rsvp',
            });
        }

        // --- Smart Cooldown Check ---
        // Only apply cooldown if all channels are already complete and recent attempt
        const lastAttemptAt = hostNotify.lastAttemptAt || 0;
        const timeSinceLastAttempt = Date.now() - lastAttemptAt;
        const channelsComplete = allChannelsComplete(hostNotify);

        if (timeSinceLastAttempt < NOTIFICATION_COOLDOWN_MS && channelsComplete) {
            const remainingCooldown = Math.ceil((NOTIFICATION_COOLDOWN_MS - timeSinceLastAttempt) / 1000);
            console.log(`[HOST_RSVP_API] requestId=${requestId} callerUid=${callerUid} status=skipped reason=cooldown_all_complete reservationId=${reservationIdTrimmed} remainingSeconds=${remainingCooldown}`);
            return res.status(200).json({
                success: true,
                skipped: true,
                reason: 'cooldown',
                remainingSeconds: remainingCooldown,
            });
        }

        // --- Determine Pricing Type ---
        let pricing: 'free' | 'online' | 'door' = 'free';
        if (pricingType && ['free', 'online', 'door'].includes(pricingType)) {
            pricing = pricingType;
        } else if (eventData.hasFee && (eventData.feeAmount || 0) > 0) {
            pricing = 'online';
        }

        // --- Call Notification Helper ---
        console.log(`[HOST_RSVP_API] requestId=${requestId} callerUid=${callerUid} reservationId=${reservationIdTrimmed} eventId=${eventId} hostId=${hostId} status=invoking_notify`);

        const result = await notifyHostOnReservation({
            db,
            reservationId: reservationIdTrimmed,
            eventId,
            hostId,
            attendeeName: attendeeName || 'Someone',
            attendeeEmail: attendeeEmail || '',
            eventTitle: eventTitle || 'Event',
            pricingType: pricing,
            isGuest: !!reservation.isGuestCreated,
            requestId,
        });

        console.log(`[HOST_RSVP_API] requestId=${requestId} callerUid=${callerUid} reservationId=${reservationIdTrimmed} eventId=${eventId} hostId=${hostId} status=complete inApp=${result.inApp.success ? 'sent' : (result.inApp.skipped ? 'skipped' : 'failed')} email=${result.email.success ? 'sent' : (result.email.skipped ? 'skipped' : 'failed')} sms=${result.sms.success ? 'sent' : (result.sms.skipped ? 'skipped' : 'failed')}`);

        return res.status(200).json({
            success: true,
            inApp: result.inApp,
            email: result.email,
            sms: result.sms,
        });

    } catch (error: any) {
        console.error(`[HOST_RSVP_API] requestId=${requestId} status=exception error="${error.message?.substring(0, 100)}"`);
        // Return 200 to not break client - reservation is already created
        return res.status(200).json({
            success: false,
            error: error.message?.substring(0, 100) || 'Unknown error',
        });
    }
}
