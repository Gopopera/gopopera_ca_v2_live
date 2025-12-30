/**
 * Vercel Serverless Function for Cancelling Subscriptions
 * Cancels a Stripe subscription when user opts out
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

    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Missing subscriptionId' });
    }

    // Cancel subscription immediately
    const subscription = await stripe.subscriptions.cancel(subscriptionId);

    console.log('[API] Subscription cancelled:', { subscriptionId: subscription.id });

    return res.status(200).json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (error: any) {
    console.error('[API] Error cancelling subscription:', error);
    return res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
}

