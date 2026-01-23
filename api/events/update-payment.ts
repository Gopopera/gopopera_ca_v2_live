import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminAuth, getAdminFirestore } from '../_lib/firebaseAdmin';

const ACTIVE_RESERVATION_STATUSES = ['reserved', 'checked_in'] as const;
const ALLOWED_CURRENCIES = new Set(['cad', 'usd', 'eur']);
const MAX_FEE_AMOUNT_CENTS = 1_000_000;

function normalizeCurrency(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length ? normalized : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { eventId, pricingType, feeAmountCents, currency } = req.body || {};

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ error: 'Missing eventId' });
    }

    if (!['free', 'online', 'door'].includes(pricingType)) {
      return res.status(400).json({ error: 'Invalid pricingType' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization token' });
    }

    const auth = getAdminAuth();
    const db = getAdminFirestore();
    if (!auth || !db) {
      return res.status(500).json({ error: 'Firebase Admin not configured' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);

    const eventRef = db.collection('events').doc(eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventData = eventSnap.data() || {};
    if (eventData.hostId && eventData.hostId !== decoded.uid) {
      return res.status(403).json({ error: 'Not authorized to update this event' });
    }

    const activeReservationSnap = await db
      .collection('reservations')
      .where('eventId', '==', eventId)
      .where('status', 'in', ACTIVE_RESERVATION_STATUSES)
      .limit(1)
      .get();

    if (!activeReservationSnap.empty) {
      return res.status(409).json({
        error: 'Payments are locked because you already have attendees. To change pricing, create a new event.',
      });
    }

    const normalizedCurrency = normalizeCurrency(currency);
    if (normalizedCurrency && !ALLOWED_CURRENCIES.has(normalizedCurrency)) {
      return res.status(400).json({ error: 'Unsupported currency' });
    }

    const feeAmountNumber = typeof feeAmountCents === 'number' ? feeAmountCents : Number(feeAmountCents);
    if (!Number.isFinite(feeAmountNumber)) {
      return res.status(400).json({ error: 'Invalid feeAmountCents' });
    }

    let finalFeeAmountCents = Math.round(feeAmountNumber);
    if (pricingType === 'free') {
      finalFeeAmountCents = 0;
    }

    if (finalFeeAmountCents < 0 || finalFeeAmountCents > MAX_FEE_AMOUNT_CENTS) {
      return res.status(400).json({ error: 'Fee amount out of range' });
    }

    if (pricingType === 'online' && finalFeeAmountCents <= 0) {
      return res.status(400).json({ error: 'Online pricing requires a fee amount greater than 0' });
    }

    const finalCurrency = (normalizedCurrency || eventData.currency || 'cad').toString().toLowerCase();
    if (!ALLOWED_CURRENCIES.has(finalCurrency)) {
      return res.status(400).json({ error: 'Unsupported currency' });
    }

    const hasFee = pricingType !== 'free' && finalFeeAmountCents > 0;

    await eventRef.update({
      pricingType,
      hasFee,
      feeAmount: finalFeeAmountCents,
      currency: finalCurrency,
      updatedAt: Date.now(),
    });

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('[UPDATE_PAYMENT] Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to update payment settings' });
  }
}

