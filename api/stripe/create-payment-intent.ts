/**
 * Vercel Serverless Function for Creating Payment Intent
 * Creates a Stripe PaymentIntent for one-time event payments
 * Includes debug instrumentation for Belgium launch verification
 * 
 * SERVER-SIDE STRIPE GATING:
 * - Validates event exists in Firestore
 * - Only allows PaymentIntent creation for pricingType === 'online'
 * - Blocks door/free events even if client sends malicious request
 * - Forces currency to event.currency (ignores client-supplied currency)
 */

import Stripe from 'stripe';
import { getAdminFirestore } from '../_lib/firebaseAdmin';

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

/**
 * SERVER-SIDE: Determine pricing type from event data
 * Mirrors getEventPricingType from utils/stripeHelpers.ts
 */
function getEventPricingType(event: Record<string, any>): 'free' | 'online' | 'door' {
  // Use explicit pricingType if set
  if (event.pricingType && ['free', 'online', 'door'].includes(event.pricingType)) {
    return event.pricingType;
  }
  
  // Backward compatibility: derive from legacy fields
  // Check hasFee + feeAmount
  if (event.hasFee === true && (event.feeAmount ?? 0) > 0) {
    return 'online'; // Legacy paid events default to online
  }
  
  // Check legacy price field
  if (event.price && event.price !== 'Free' && event.price !== '' && event.price !== '$0' && event.price !== '0') {
    return 'online';
  }
  
  return 'free';
}

/**
 * SERVER-SIDE: Get event currency (default: 'cad')
 */
function getEventCurrency(event: Record<string, any>): string {
  return (event.currency || 'cad').toLowerCase();
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

    const { amount, currency: clientCurrency, isRecurring, eventId, hostId, userId } = req.body;

    if (!amount || !eventId || !hostId || !userId) {
      console.warn(`[PAYMENT] requestId=${requestId} status=validation_error reason=missing_fields`);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const maskedEvent = maskId(eventId);
    const maskedUser = maskId(userId);

    // =========================================================================
    // SERVER-SIDE STRIPE GATING: Fetch event and validate pricingType
    // =========================================================================
    const db = getAdminFirestore();
    if (!db) {
      console.error(`[PAYMENT] requestId=${requestId} status=config_error reason=firestore_not_initialized`);
      return res.status(500).json({ error: 'Database service not configured' });
    }

    // Fetch event from Firestore
    const eventDoc = await db.collection('events').doc(eventId).get();
    
    if (!eventDoc.exists) {
      console.warn(`[PAYMENT] requestId=${requestId} eventId=${maskedEvent} status=blocked reason=event_not_found`);
      return res.status(404).json({ error: 'Event not found', code: 'EVENT_NOT_FOUND' });
    }

    const eventData = eventDoc.data() as Record<string, any>;
    const pricingType = getEventPricingType(eventData);
    const eventCurrency = getEventCurrency(eventData);

    // HARD BLOCK: Only allow Stripe for pricingType === 'online'
    if (pricingType !== 'online') {
      console.error(`[PAYMENT] requestId=${requestId} eventId=${maskedEvent} userId=${maskedUser} status=blocked reason=pricingType_not_online pricingType=${pricingType}`);
      return res.status(400).json({ 
        error: 'This event does not support online payment.', 
        code: 'STRIPE_NOT_ALLOWED' 
      });
    }

    // Warn and override if client sent different currency
    let finalCurrency = eventCurrency;
    if (clientCurrency && clientCurrency.toLowerCase() !== eventCurrency) {
      console.warn(`[PAYMENT] requestId=${requestId} eventId=${maskedEvent} status=currency_mismatch clientCurrency=${clientCurrency} eventCurrency=${eventCurrency} action=using_event_currency`);
      finalCurrency = eventCurrency;
    }

    // Calculate platform fee (10%)
    const platformFee = Math.round(amount * 0.10);
    const hostPayout = amount - platformFee;

    // Debug log: Payment intent creation attempt (now includes pricingType validation)
    console.log(`[PAYMENT] requestId=${requestId} eventId=${maskedEvent} userId=${maskedUser} currency=${finalCurrency} amount=${amount} platformFee=${platformFee} isRecurring=${isRecurring || false} pricingType=${pricingType} status=creating`);

    // Create payment intent (only reached if pricingType === 'online')
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: finalCurrency,
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
        pricingType, // Track in metadata for audit
      },
    });

    // Debug log: Success
    console.log(`[PAYMENT] requestId=${requestId} eventId=${maskedEvent} userId=${maskedUser} currency=${finalCurrency} amount=${amount} status=created paymentIntentId=${paymentIntent.id}`);

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error(`[PAYMENT] requestId=${requestId} status=exception error="${error.message?.substring(0, 100)}"`);
    return res.status(500).json({ error: error.message || 'Failed to create payment intent' });
  }
}
