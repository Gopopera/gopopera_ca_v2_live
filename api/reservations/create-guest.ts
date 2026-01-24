import crypto from 'node:crypto';
import { Resend } from 'resend';
import { getAdminAuth, getAdminFirestore } from '../_lib/firebaseAdmin.js';
import { RESEND_FROM, RESEND_REPLY_TO, RESEND_API_KEY } from '../_lib/emailConfig.js';
import { ReservationConfirmationEmailTemplate } from '../../src/emails/templates/ReservationConfirmationEmail';
import { formatDate } from '../../utils/dateFormatter';

type RateLimitEntry = { count: number; resetAt: number };
const ipRateLimit = new Map<string, RateLimitEntry>();
const emailRateLimit = new Map<string, RateLimitEntry>();
const failureRateLimit = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000;
const IP_LIMIT = 6;
const EMAIL_LIMIT = 3;
const FAILURE_LIMIT = 8;

function getClientIp(req: any): string {
  const forwarded = (req.headers['x-forwarded-for'] || '').toString();
  const ip = forwarded.split(',')[0]?.trim();
  return ip || req.socket?.remoteAddress || 'unknown';
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

function checkRateLimit(map: Map<string, RateLimitEntry>, key: string, limit: number): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

function recordFailure(key: string): void {
  const now = Date.now();
  const entry = failureRateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    failureRateLimit.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count === 3 || entry.count % 5 === 0) {
    console.warn('[CREATE_GUEST_RESERVATION] Repeated failures detected:', { key, count: entry.count });
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(input: string): string {
  const stripped = input.trim().replace(/[\s\-().]/g, '');
  if (stripped.startsWith('00')) return `+${stripped.slice(2)}`;
  return stripped;
}

function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

function getEventPricingType(event: Record<string, any>): 'free' | 'online' | 'door' {
  if (event.pricingType && ['free', 'online', 'door'].includes(event.pricingType)) {
    return event.pricingType;
  }
  if (event.hasFee === true && (event.feeAmount ?? 0) > 0) return 'online';
  if (event.price && event.price !== 'Free' && event.price !== '' && event.price !== '$0' && event.price !== '0') {
    return 'online';
  }
  return 'free';
}

function getBaseUrlServer(): string {
  const fallback = 'https://gopopera.ca';
  const envBase = process.env.VITE_BASE_URL || process.env.BASE_URL;
  if (envBase && /^https:\/\//i.test(envBase)) {
    return envBase.replace(/\/$/, '');
  }
  return fallback;
}

function generateToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const ip = getClientIp(req);
    const ipKey = `ip:${ip}`;
    const userAgent = (req.headers['user-agent'] || '').toString().slice(0, 200);
    const rawBodySize = JSON.stringify(req.body || {}).length;

    if (!userAgent) {
      recordFailure(ipKey);
      return res.status(400).json({ error: 'Missing user agent' });
    }

    if (rawBodySize > 12_000) {
      recordFailure(ipKey);
      return res.status(413).json({ error: 'Request too large' });
    }

    if (!checkRateLimit(ipRateLimit, ipKey, IP_LIMIT)) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    const {
      eventId,
      attendeeName,
      attendeeEmail,
      attendeePhoneE164,
      smsOptIn,
      paymentIntentId,
      paymentStatus,
      totalAmount,
    } = req.body || {};

    // Phone is now optional - only name, email, and eventId are required
    if (!eventId || !attendeeName || !attendeeEmail) {
      recordFailure(ipKey);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const email = normalizeEmail(attendeeEmail);
    const emailKey = `email:${email}`;

    if (!checkRateLimit(emailRateLimit, emailKey, EMAIL_LIMIT)) {
      return res.status(429).json({ error: 'Too many requests for this email' });
    }

    const failureKey = `${ipKey}|${emailKey}`;
    if (!checkRateLimit(failureRateLimit, failureKey, FAILURE_LIMIT)) {
      return res.status(429).json({ error: 'Too many failed attempts' });
    }

    // Phone is optional - normalize and validate only if provided
    const phone = attendeePhoneE164 ? normalizePhone(attendeePhoneE164) : '';
    if (phone && !isValidE164(phone)) {
      recordFailure(failureKey);
      return res.status(400).json({ error: 'Invalid phone number format (E.164 required)' });
    }

    const db = getAdminFirestore();
    const auth = getAdminAuth();
    if (!db || !auth) {
      return res.status(500).json({ error: 'Firebase Admin not configured' });
    }

    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      recordFailure(failureKey);
      return res.status(404).json({ error: 'Event not found' });
    }
    const eventData = eventDoc.data() || {};
    const pricingType = getEventPricingType(eventData);

    if (eventData.capacity) {
      const activeSnapshot = await db
        .collection('reservations')
        .where('eventId', '==', eventId)
        .where('status', 'in', ['reserved', 'checked_in'])
        .get();

      const currentCount = activeSnapshot.docs.reduce((sum, d) => {
        const data = d.data() || {};
        return sum + (data.attendeeCount || 1);
      }, 0);

      if (currentCount + 1 > eventData.capacity) {
        recordFailure(failureKey);
        return res.status(409).json({ error: 'Event is at capacity' });
      }
    }

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('[CREATE_GUEST_RESERVATION] Existing user found:', { uid: userRecord.uid, email });
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        console.log('[CREATE_GUEST_RESERVATION] Creating new user for:', email);
        try {
          const randomPassword = crypto.randomBytes(32).toString('base64url');
          userRecord = await auth.createUser({
            email,
            displayName: attendeeName,
            password: randomPassword,
          });
          console.log('[CREATE_GUEST_RESERVATION] New user created:', { uid: userRecord.uid, email });
        } catch (createError: any) {
          console.error('[CREATE_GUEST_RESERVATION] Failed to create user:', createError?.message, createError?.code);
          throw new Error(`Failed to create user: ${createError?.message || 'Unknown error'}`);
        }
      } else {
        console.error('[CREATE_GUEST_RESERVATION] Auth error:', error?.message, error?.code);
        throw error;
      }
    }

    const uid = userRecord.uid;
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    // Track if this is a newly created guest user
    const isNewGuestUser = !userSnap.exists;

    if (isNewGuestUser) {
      // Create guest user profile with isGuestAccount marker
      // This user cannot sign in normally until they complete the claim flow
      // (password reset link converts them to a full account)
      try {
        await userRef.set(
          {
            uid,
            email,
            displayName: attendeeName,
            createdAt: Date.now(),
            isGuestAccount: true, // Safety marker: not a full account yet
            guestCreatedAt: Date.now(),
          },
          { merge: true }
        );
        console.log('[CREATE_GUEST_RESERVATION] Guest user profile created:', { uid, email });
      } catch (profileError: any) {
        console.error('[CREATE_GUEST_RESERVATION] Failed to create user profile:', profileError?.message);
        throw new Error(`Failed to create user profile: ${profileError?.message || 'Unknown error'}`);
      }
    }

    const { raw: publicToken, hash: publicTicketTokenHash } = generateToken();
    const reservationsRef = db.collection('reservations');
    const existingSnapshot = await reservationsRef
      .where('eventId', '==', eventId)
      .where('userId', '==', uid)
      .get();

    const reservationPayload: Record<string, any> = {
      eventId,
      userId: uid,
      status: 'reserved',
      reservedAt: Date.now(),
      attendeeCount: 1,
      attendeeName,
      attendeeEmail: email,
      publicTicketTokenHash,
      isGuestCreated: true,
      pricingMode: pricingType,
      createdVia: 'guest',
      createdIpHash: hashIp(ip),
      createdUserAgent: userAgent,
    };

    // Only set phone fields if phone was provided
    if (phone) {
      reservationPayload.attendeePhoneE164 = phone;
      reservationPayload.smsOptIn = Boolean(smsOptIn);
    } else {
      reservationPayload.smsOptIn = false; // Explicit: no SMS without phone
    }

    if (pricingType === 'door') {
      reservationPayload.doorPaymentStatus = 'unpaid';
      reservationPayload.paymentStatus = 'not_required';
      if (typeof totalAmount === 'number') {
        reservationPayload.totalAmount = totalAmount;
      }
    } else if (pricingType === 'free') {
      reservationPayload.paymentStatus = 'not_required';
    } else if (pricingType === 'online') {
      if (!paymentIntentId || paymentStatus !== 'succeeded') {
        recordFailure(failureKey);
        return res.status(400).json({ error: 'Payment required for this event' });
      }
      reservationPayload.paymentIntentId = paymentIntentId;
      reservationPayload.paymentStatus = 'succeeded';
      reservationPayload.paymentMethod = 'stripe';
      if (typeof totalAmount === 'number') {
        reservationPayload.totalAmount = totalAmount;
      }
    }

    let reservationId: string;
    try {
      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        await existingDoc.ref.set(reservationPayload, { merge: true });
        reservationId = existingDoc.id;
        console.log('[CREATE_GUEST_RESERVATION] Updated existing reservation:', reservationId);
      } else {
        const docRef = await reservationsRef.add(reservationPayload);
        reservationId = docRef.id;
        console.log('[CREATE_GUEST_RESERVATION] Created new reservation:', reservationId);
      }
    } catch (reservationError: any) {
      console.error('[CREATE_GUEST_RESERVATION] Failed to save reservation:', reservationError?.message);
      throw new Error(`Failed to save reservation: ${reservationError?.message || 'Unknown error'}`);
    }

    const baseUrl = getBaseUrlServer();
    const ticketUrl = `${baseUrl}/ticket/${reservationId}?t=${publicToken}`;

    // Only generate claim link for NEW guest users
    // Returning users (existing accounts) don't need it, and OAuth users can't use password reset
    let claimLink: string | null = null;
    if (isNewGuestUser) {
      try {
        claimLink = await auth.generatePasswordResetLink(email, {
          url: `${baseUrl}/auth?mode=signin`,
          handleCodeInApp: false,
        });
      } catch (claimError) {
        // Non-fatal: user can still access their ticket via ticketUrl
        console.warn('[CREATE_GUEST_RESERVATION] Could not generate claim link:', claimError);
      }
    }

    if (RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        const eventLocation =
          eventData.location ||
          `${eventData.address || ''}${eventData.city ? `, ${eventData.city}` : ''}`.trim();

        const emailHtml = ReservationConfirmationEmailTemplate({
          userName: attendeeName,
          eventTitle: eventData.title || 'Event',
          eventDate: formatDate(eventData.date || ''),
          eventTime: eventData.time || '',
          eventLocation: eventLocation || 'TBD',
          reservationId,
          orderId: reservationId.substring(0, 10).toUpperCase(),
          eventUrl: `${baseUrl}/event/${eventId}`,
          ticketUrl,
          eventImageUrl: eventData.coverImageUrl || eventData.imageUrls?.[0] || eventData.imageUrl,
          attendeeCount: 1,
          totalAmount: reservationPayload.totalAmount,
          currency: eventData.currency || 'cad',
          pricingType,
          claimUrl: claimLink,
        });

        await resend.emails.send({
          from: RESEND_FROM,
          replyTo: RESEND_REPLY_TO,
          to: email,
          subject: `Reservation Confirmed: ${eventData.title || 'Event'}`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error('[CREATE_GUEST_RESERVATION] Email send failed:', emailError);
      }
    }

    return res.status(200).json({
      reservationId,
      ticketUrl,
      claimLink,
    });
  } catch (error: any) {
    console.error('[CREATE_GUEST_RESERVATION] Error:', error);
    return res.status(500).json({ error: error.message || 'Guest reservation failed' });
  }
}

