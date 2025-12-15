/**
 * Vercel Serverless Function for Verifying Stripe Connect Account Status
 * Called when user returns from Stripe onboarding to verify their account is properly set up
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

    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'Missing required field: accountId' });
    }

    // Retrieve account status from Stripe
    const account = await stripe.accounts.retrieve(accountId);

    console.log('[API] Stripe account verified:', {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });

    return res.status(200).json({
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      // Additional useful fields
      email: account.email,
      country: account.country,
      defaultCurrency: account.default_currency,
    });
  } catch (error: any) {
    console.error('[API] Error verifying Stripe account:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(404).json({ error: 'Stripe account not found' });
    }
    
    return res.status(500).json({ error: error.message || 'Failed to verify Stripe account' });
  }
}

