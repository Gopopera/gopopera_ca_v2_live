/**
 * Vercel Serverless Function for Creating Subscription
 * Creates a Stripe Subscription for recurring event payments
 * 
 * SERVER-SIDE STRIPE GATING:
 * - Validates event exists in Firestore
 * - Only allows Subscription creation for pricingType === 'online'
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
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
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
 */
function getEventPricingType(event: Record<string, any>): 'free' | 'online' | 'door' {
  if (event.pricingType && ['free', 'online', 'door'].includes(event.pricingType)) {
    return event.pricingType;
  }
  if (event.hasFee === true && (event.feeAmount ?? 0) > 0) {
    return 'online';
  }
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
      console.error(`[SUBSCRIPTION] requestId=${requestId} status=config_error reason=missing_secret_key`);
      return res.status(500).json({ error: 'Stripe service not configured' });
    }

    const { amount, currency: clientCurrency, eventId, hostId, userId, interval, customerEmail } = req.body;

    if (!amount || !eventId || !hostId || !userId || !interval || !customerEmail) {
      console.warn(`[SUBSCRIPTION] requestId=${requestId} status=validation_error reason=missing_fields`);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const maskedEvent = maskId(eventId);
    const maskedUser = maskId(userId);

    // =========================================================================
    // SERVER-SIDE STRIPE GATING: Fetch event and validate pricingType
    // =========================================================================
    const db = getAdminFirestore();
    if (!db) {
      console.error(`[SUBSCRIPTION] requestId=${requestId} status=config_error reason=firestore_not_initialized`);
      return res.status(500).json({ error: 'Database service not configured' });
    }

    const eventDoc = await db.collection('events').doc(eventId).get();
    
    if (!eventDoc.exists) {
      console.warn(`[SUBSCRIPTION] requestId=${requestId} eventId=${maskedEvent} status=blocked reason=event_not_found`);
      return res.status(404).json({ error: 'Event not found', code: 'EVENT_NOT_FOUND' });
    }

    const eventData = eventDoc.data() as Record<string, any>;
    const pricingType = getEventPricingType(eventData);
    const eventCurrency = getEventCurrency(eventData);

    // HARD BLOCK: Only allow Stripe for pricingType === 'online'
    if (pricingType !== 'online') {
      console.error(`[SUBSCRIPTION] requestId=${requestId} eventId=${maskedEvent} userId=${maskedUser} status=blocked reason=pricingType_not_online pricingType=${pricingType}`);
      return res.status(400).json({ 
        error: 'This event does not support online payment.', 
        code: 'STRIPE_NOT_ALLOWED' 
      });
    }

    // Warn and override if client sent different currency
    let finalCurrency = eventCurrency;
    if (clientCurrency && clientCurrency.toLowerCase() !== eventCurrency) {
      console.warn(`[SUBSCRIPTION] requestId=${requestId} eventId=${maskedEvent} status=currency_mismatch clientCurrency=${clientCurrency} eventCurrency=${eventCurrency} action=using_event_currency`);
      finalCurrency = eventCurrency;
    }

    console.log(`[SUBSCRIPTION] requestId=${requestId} eventId=${maskedEvent} userId=${maskedUser} currency=${finalCurrency} amount=${amount} interval=${interval} pricingType=${pricingType} status=creating`);

    // Create or retrieve customer
    // In a real implementation, you'd store customer IDs in Firestore
    // For now, we'll create a new customer each time (Stripe will handle duplicates by email)
    let customer;
    try {
      const customers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });
      
      if (customers.data.length > 0) {
        customer = customers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: customerEmail,
          metadata: {
            userId,
          },
        });
      }
    } catch (error: any) {
      console.error(`[SUBSCRIPTION] requestId=${requestId} status=customer_error error="${error.message?.substring(0, 100)}"`);
      return res.status(500).json({ error: 'Failed to create customer' });
    }

    // Create price (using event currency, not client-supplied)
    const price = await stripe.prices.create({
      unit_amount: amount,
      currency: finalCurrency,
      recurring: {
        interval: interval === 'weekly' ? 'week' : 'month',
      },
      product_data: {
        name: `Event Subscription - ${eventId}`,
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      metadata: {
        eventId,
        hostId,
        userId,
        pricingType, // Track in metadata for audit
      },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    // Use type assertion for API compatibility
    const paymentIntent = (invoice as any)?.payment_intent as Stripe.PaymentIntent;

    console.log(`[SUBSCRIPTION] requestId=${requestId} eventId=${maskedEvent} userId=${maskedUser} currency=${finalCurrency} status=created subscriptionId=${subscription.id}`);

    return res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret,
      customerId: customer.id,
    });
  } catch (error: any) {
    console.error(`[SUBSCRIPTION] requestId=${requestId} status=exception error="${error.message?.substring(0, 100)}"`);
    return res.status(500).json({ error: error.message || 'Failed to create subscription' });
  }
}

