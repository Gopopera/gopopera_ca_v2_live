/**
 * Vercel Serverless Function for Stripe Webhooks
 * Handles Stripe webhook events (payment succeeded, subscription updates, etc.)
 */

import Stripe from 'stripe';
import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../../firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('[WEBHOOK] Failed to initialize Firebase Admin:', error);
  }
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || process.env.VITE_STRIPE_WEBHOOK_SECRET;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
}) : null;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate Stripe is configured
    if (!stripe || !STRIPE_SECRET_KEY) {
      console.error('[WEBHOOK] Stripe not configured');
      return res.status(500).json({ error: 'Stripe service not configured' });
    }

    const sig = req.headers['stripe-signature'] as string;
    
    // For Vercel serverless functions, Stripe webhooks need raw body for signature verification
    // Vercel automatically provides req.body as a string for webhook endpoints
    // If it's already a string, use it; otherwise try to get raw body
    let body: string | Buffer;
    
    // Check if we have rawBody (Vercel sometimes provides this)
    if ((req as any).rawBody) {
      body = (req as any).rawBody;
    } else if (typeof req.body === 'string') {
      // If body is already a string, use it directly
      body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      body = req.body;
    } else {
      // Last resort: stringify (may fail signature verification)
      // This should rarely happen with Vercel
      console.warn('[WEBHOOK] Body is not string or buffer, stringifying (may fail verification)');
      body = JSON.stringify(req.body);
    }

    let event: Stripe.Event;

    // Verify webhook signature
    if (WEBHOOK_SECRET) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
      } catch (err: any) {
        console.error('[WEBHOOK] Signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      // In development, you might skip signature verification
      // WARNING: Never do this in production!
      console.warn('[WEBHOOK] No webhook secret - skipping signature verification');
      // Parse body if it's a string
      event = typeof body === 'string' ? JSON.parse(body) : body as any;
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object as Stripe.Subscription);
        break;

      case 'account.updated':
        await handleAccountUpdate(event.data.object as Stripe.Account);
        break;

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { eventId, hostId, userId, platformFee, hostPayout } = paymentIntent.metadata;

  console.log('[WEBHOOK] Payment succeeded:', {
    paymentIntentId: paymentIntent.id,
    eventId,
    hostId,
    userId,
  });

  if (!db || !eventId || !userId) {
    console.error('[WEBHOOK] Missing required data for payment success');
    return;
  }

  try {
    // Find reservation by eventId and userId
    const reservationsRef = db.collection('reservations');
    const snapshot = await reservationsRef
      .where('eventId', '==', eventId)
      .where('userId', '==', userId)
      .where('status', '==', 'reserved')
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const reservationDoc = snapshot.docs[0];
      await reservationDoc.ref.update({
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'succeeded',
        payoutStatus: 'held', // Will be released 24h after event
      });
      console.log('[WEBHOOK] Updated reservation:', reservationDoc.id);
    }

    // Create payment record
    const paymentsRef = db.collection('payments');
    await paymentsRef.add({
      reservationId: snapshot.empty ? null : snapshot.docs[0].id,
      eventId,
      userId,
      hostId,
      amount: paymentIntent.amount,
      platformFee: platformFee ? parseInt(platformFee) : Math.round(paymentIntent.amount * 0.10),
      hostPayout: hostPayout ? parseInt(hostPayout) : Math.round(paymentIntent.amount * 0.90),
      currency: paymentIntent.currency,
      paymentIntentId: paymentIntent.id,
      status: 'succeeded',
      payoutStatus: 'held',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('[WEBHOOK] Created payment record');
  } catch (error: any) {
    console.error('[WEBHOOK] Error handling payment success:', error);
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const { eventId, userId } = paymentIntent.metadata;

  console.log('[WEBHOOK] Payment failed:', {
    paymentIntentId: paymentIntent.id,
    eventId,
    userId,
  });

  if (!db || !eventId || !userId) {
    console.error('[WEBHOOK] Missing required data for payment failure');
    return;
  }

  try {
    // Find and update reservation
    const reservationsRef = db.collection('reservations');
    const snapshot = await reservationsRef
      .where('eventId', '==', eventId)
      .where('userId', '==', userId)
      .where('status', '==', 'reserved')
      .limit(1)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        paymentStatus: 'failed',
      });
      console.log('[WEBHOOK] Updated reservation status to failed');
    }
  } catch (error: any) {
    console.error('[WEBHOOK] Error handling payment failure:', error);
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { eventId, userId } = subscription.metadata;

  console.log('[WEBHOOK] Subscription updated:', {
    subscriptionId: subscription.id,
    eventId,
    userId,
    status: subscription.status,
  });

  if (!db || !eventId || !userId) {
    console.error('[WEBHOOK] Missing required data for subscription update');
    return;
  }

  try {
    // Find and update reservation with subscription ID
    const reservationsRef = db.collection('reservations');
    const snapshot = await reservationsRef
      .where('eventId', '==', eventId)
      .where('userId', '==', userId)
      .where('status', '==', 'reserved')
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const updates: any = {
        subscriptionId: subscription.id,
        paymentStatus: 'succeeded',
      };

      // Calculate next charge date
      // Use type assertion for API compatibility
      const periodEnd = (subscription as any).current_period_end;
      if (periodEnd) {
        updates.nextChargeDate = periodEnd * 1000; // Convert to milliseconds
      }

      await snapshot.docs[0].ref.update(updates);
      console.log('[WEBHOOK] Updated reservation with subscription ID');
    }
  } catch (error: any) {
    console.error('[WEBHOOK] Error handling subscription update:', error);
  }
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  const { eventId, userId } = subscription.metadata;

  console.log('[WEBHOOK] Subscription cancelled:', {
    subscriptionId: subscription.id,
    eventId,
    userId,
  });

  if (!db || !eventId || !userId) {
    console.error('[WEBHOOK] Missing required data for subscription cancellation');
    return;
  }

  try {
    // Find and update reservation
    const reservationsRef = db.collection('reservations');
    const snapshot = await reservationsRef
      .where('eventId', '==', eventId)
      .where('userId', '==', userId)
      .where('status', '==', 'reserved')
      .limit(1)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        optOutRequested: true,
        optOutProcessed: true,
      });
      console.log('[WEBHOOK] Marked reservation as opted out');
    }
  } catch (error: any) {
    console.error('[WEBHOOK] Error handling subscription cancellation:', error);
  }
}

async function handleAccountUpdate(account: Stripe.Account) {
  const userId = account.metadata?.userId;

  console.log('[WEBHOOK] Account updated:', {
    accountId: account.id,
    userId,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  });

  if (!db || !userId) {
    console.error('[WEBHOOK] Missing userId for account update');
    return;
  }

  try {
    // Update user's Stripe account status
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      stripeAccountId: account.id,
      stripeOnboardingStatus: account.details_submitted ? 'complete' : 'incomplete',
      stripeAccountEnabled: account.charges_enabled && account.payouts_enabled,
    });
    console.log('[WEBHOOK] Updated user Stripe account status');
  } catch (error: any) {
    console.error('[WEBHOOK] Error handling account update:', error);
  }
}

