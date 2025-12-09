/**
 * Vercel Serverless Function for Creating Payment Intent
 * Creates a Stripe PaymentIntent for one-time event payments
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
}) : null;

export default async function handler(req: any, res: any) {
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
      console.error('[API] Stripe not configured - missing STRIPE_SECRET_KEY');
      return res.status(500).json({ error: 'Stripe service not configured' });
    }

    const { amount, currency, isRecurring, eventId, hostId, userId } = req.body;

    if (!amount || !currency || !eventId || !hostId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate platform fee (10%)
    const platformFee = Math.round(amount * 0.10);
    const hostPayout = amount - platformFee;

    // For now, create a one-time payment intent
    // Subscriptions will be handled separately
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
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

    console.log('[API] Payment intent created:', { 
      paymentIntentId: paymentIntent.id, 
      amount, 
      eventId 
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('[API] Error creating payment intent:', error);
    return res.status(500).json({ error: error.message || 'Failed to create payment intent' });
  }
}

