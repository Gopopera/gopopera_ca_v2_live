/**
 * Vercel Serverless Function for Checking Stripe Connect Account Status
 * 
 * GET /api/stripe/connect/account-status?accountId=acct_xxx
 * 
 * Returns the status of a Stripe Connect account (charges_enabled, payouts_enabled, etc.)
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
}) : null;

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate Stripe is configured
    if (!stripe || !STRIPE_SECRET_KEY) {
      console.error('[API] Stripe not configured - missing STRIPE_SECRET_KEY');
      return res.status(500).json({ error: 'Stripe service not configured' });
    }

    const { accountId } = req.query;

    if (!accountId) {
      return res.status(400).json({ error: 'Missing required parameter: accountId' });
    }

    // Retrieve the account from Stripe
    const account = await stripe.accounts.retrieve(accountId as string);

    console.log('[API] Account status retrieved:', {
      accountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });

    return res.status(200).json({
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      email: account.email,
      country: account.country,
      defaultCurrency: account.default_currency,
      // Include requirements if there are any pending
      requirements: account.requirements ? {
        currentlyDue: account.requirements.currently_due || [],
        eventuallyDue: account.requirements.eventually_due || [],
        pastDue: account.requirements.past_due || [],
        pendingVerification: account.requirements.pending_verification || [],
      } : null,
    });

  } catch (error: any) {
    console.error('[API] Error retrieving account status:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    return res.status(500).json({ error: error.message || 'Failed to retrieve account status' });
  }
}

