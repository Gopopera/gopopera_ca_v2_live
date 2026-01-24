import crypto from 'node:crypto';
import { getAdminFirestore } from '../_lib/firebaseAdmin.js';

type RateLimitEntry = { count: number; resetAt: number };
const ipRateLimit = new Map<string, RateLimitEntry>();
const reservationRateLimit = new Map<string, RateLimitEntry>();
const failureRateLimit = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000;
const IP_LIMIT = 40;
const RESERVATION_LIMIT = 20;
const FAILURE_LIMIT = 30;

function getClientIp(req: any): string {
  const forwarded = (req.headers['x-forwarded-for'] || '').toString();
  const ip = forwarded.split(',')[0]?.trim();
  return ip || req.socket?.remoteAddress || 'unknown';
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
  if (entry.count === 5 || entry.count % 10 === 0) {
    console.warn('[TICKET_GET] Repeated failures detected:', { key, count: entry.count });
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  const ipKey = `ip:${ip}`;
  const userAgent = (req.headers['user-agent'] || '').toString().slice(0, 200);

  if (!userAgent) {
    recordFailure(ipKey);
    return res.status(400).json({ error: 'Missing user agent' });
  }

  if (!checkRateLimit(ipRateLimit, ipKey, IP_LIMIT)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const reservationId = req.query?.reservationId;
  const token = req.query?.t;

  if (!reservationId || !token) {
    recordFailure(ipKey);
    return res.status(400).json({ error: 'Missing reservationId or token' });
  }

  const reservationKey = `reservation:${reservationId}`;
  if (!checkRateLimit(reservationRateLimit, reservationKey, RESERVATION_LIMIT)) {
    return res.status(429).json({ error: 'Too many requests for this ticket' });
  }

  const db = getAdminFirestore();
  if (!db) {
    return res.status(500).json({ error: 'Firebase Admin not configured' });
  }

  const reservationDoc = await db.collection('reservations').doc(reservationId).get();
  if (!reservationDoc.exists) {
    recordFailure(`${ipKey}|${reservationKey}`);
    return res.status(404).json({ error: 'Reservation not found' });
  }

  const reservation = reservationDoc.data() || {};
  const tokenHash = hashToken(String(token));
  if (reservation.publicTicketTokenHash !== tokenHash) {
    recordFailure(`${ipKey}|${reservationKey}`);
    return res.status(403).json({ error: 'Invalid token' });
  }

  const eventDoc = await db.collection('events').doc(reservation.eventId).get();
  if (!eventDoc.exists) {
    recordFailure(`${ipKey}|${reservationKey}`);
    return res.status(404).json({ error: 'Event not found' });
  }

  const event = eventDoc.data() || {};
  let host = null;
  if (event.hostId) {
    const hostDoc = await db.collection('users').doc(event.hostId).get();
    const hostData = hostDoc.data() || {};
    host = {
      id: event.hostId,
      displayName: hostData.displayName || hostData.name || 'Unknown Host',
      photoURL: hostData.photoURL || hostData.imageUrl,
    };
  }

  return res.status(200).json({
    reservation: { id: reservationDoc.id, ...reservation },
    event: { id: eventDoc.id, ...event },
    host,
  });
}

