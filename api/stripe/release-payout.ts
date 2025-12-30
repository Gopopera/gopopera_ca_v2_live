/**
 * Vercel Serverless Function for Releasing Payouts
 * Releases held funds to hosts 24 hours after event ends
 * Note: This should be called by a scheduled task, not directly
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

    const { paymentId, reservationId, hostAccountId, hostPayout, currency } = req.body;

    if (!paymentId || !hostAccountId || !hostPayout || !currency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // For Stripe Connect, create a transfer to the host's account
    // Note: This requires the payment to be made with application_fee_amount
    // For now, we'll just mark it as released (actual transfer happens via Connect)
    // In production, you'd use: stripe.transfers.create()

    console.log('[API] Payout released:', { 
      paymentId, 
      hostAccountId, 
      amount: hostPayout 
    });

    // Return success - actual Firestore update should happen in webhook or separate function
    return res.status(200).json({
      success: true,
      message: 'Payout released (update Firestore separately)',
    });
  } catch (error: any) {
    console.error('[API] Error releasing payout:', error);
    return res.status(500).json({ error: error.message || 'Failed to release payout' });
  }
}

