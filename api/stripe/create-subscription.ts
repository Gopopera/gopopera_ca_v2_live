/**
 * Vercel Serverless Function for Creating Subscription
 * Creates a Stripe Subscription for recurring event payments
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
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

    const { amount, currency, eventId, hostId, userId, interval, customerEmail } = req.body;

    if (!amount || !currency || !eventId || !hostId || !userId || !interval || !customerEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
      console.error('[API] Error creating/retrieving customer:', error);
      return res.status(500).json({ error: 'Failed to create customer' });
    }

    // Create price
    const price = await stripe.prices.create({
      unit_amount: amount,
      currency: currency.toLowerCase(),
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
      },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    // Use type assertion for API compatibility
    const paymentIntent = (invoice as any)?.payment_intent as Stripe.PaymentIntent;

    console.log('[API] Subscription created:', { 
      subscriptionId: subscription.id, 
      eventId 
    });

    return res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret,
      customerId: customer.id,
    });
  } catch (error: any) {
    console.error('[API] Error creating subscription:', error);
    return res.status(500).json({ error: error.message || 'Failed to create subscription' });
  }
}

