/**
 * Vercel Serverless Function for Creating Payment Intent
 * Creates a Stripe PaymentIntent for one-time event payments
 * Includes debug instrumentation for Belgium launch verification
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
}) : null;

/**
 * Generate a short request ID for log correlation
 */
function generateRequestId(): string {
  return `pay_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Mask ID for logging (first 8 chars only)
 */
function maskId(id: string): string {
  if (!id || id.length < 8) return '***';
  return `${id.substring(0, 8)}***`;
}

export default async function handler(req: any, res: any) {
  const requestId = generateRequestId();
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate Stripe is configured
    if (!stripe || !STRIPE_SECRET_KEY) {
      console.error(`[PAYMENT] requestId=${requestId} status=config_error reason=missing_secret_key`);
      return res.status(500).json({ error: 'Stripe service not configured' });
    }

    const { amount, currency, isRecurring, eventId, hostId, userId } = req.body;

    if (!amount || !currency || !eventId || !hostId || !userId) {
      console.warn(`[PAYMENT] requestId=${requestId} status=validation_error reason=missing_fields`);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const maskedEvent = maskId(eventId);
    const maskedUser = maskId(userId);
    const normalizedCurrency = currency.toLowerCase();

    // Calculate platform fee (10%)
    const platformFee = Math.round(amount * 0.10);
    const hostPayout = amount - platformFee;

    // Debug log: Payment intent creation attempt
    console.log(`[PAYMENT] requestId=${requestId} eventId=${maskedEvent} userId=${maskedUser} currency=${normalizedCurrency} amount=${amount} platformFee=${platformFee} isRecurring=${isRecurring || false} status=creating`);

    // For now, create a one-time payment intent
    // Subscriptions will be handled separately
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: normalizedCurrency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        eventId,
        hostId,
        userId,
        platformFee: platformFee.toString(),
        hostPayout: hostPayout.toString(),
        isRecurring: isRecurring ? 'true' : 'false',
      },
    });

    // Debug log: Success
    console.log(`[PAYMENT] requestId=${requestId} eventId=${maskedEvent} userId=${maskedUser} currency=${normalizedCurrency} amount=${amount} status=created paymentIntentId=${paymentIntent.id}`);

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error(`[PAYMENT] requestId=${requestId} status=exception error="${error.message?.substring(0, 100)}"`);
    return res.status(500).json({ error: error.message || 'Failed to create payment intent' });
  }
}
