/**
 * Vercel Serverless Function for Creating Stripe Connect Account
 * Creates a Stripe Connect Express account for hosts to receive payouts
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

    const { userId, email, returnUrl, existingAccountId } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing required fields: userId, email' });
    }

    let accountId: string;

    // Check if user already has a Stripe account
    if (existingAccountId) {
      // Verify the existing account exists and belongs to this user
      try {
        const existingAccount = await stripe.accounts.retrieve(existingAccountId);
        if (existingAccount.metadata?.userId === userId) {
          // Use existing account - just create a new onboarding link
          accountId = existingAccountId;
          console.log('[API] Using existing Stripe account:', { accountId, userId });
        } else {
          // Account doesn't belong to this user - create new one
          console.warn('[API] Existing account does not match userId, creating new account');
          const account = await stripe.accounts.create({
            type: 'express',
            email,
            metadata: {
              userId,
            },
          });
          accountId = account.id;
          console.log('[API] New Stripe account created:', { accountId, userId });
        }
      } catch (error: any) {
        // Account doesn't exist or error retrieving - create new one
        console.warn('[API] Could not retrieve existing account, creating new:', error.message);
        const account = await stripe.accounts.create({
          type: 'express',
          email,
          metadata: {
            userId,
          },
        });
        accountId = account.id;
        console.log('[API] New Stripe account created:', { accountId, userId });
      }
    } else {
      // No existing account - create new one
      const account = await stripe.accounts.create({
        type: 'express',
        email,
        metadata: {
          userId,
        },
      });
      accountId = account.id;
      console.log('[API] Stripe account created:', { accountId, userId });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${returnUrl}?stripe_return=true`,
      return_url: `${returnUrl}?stripe_return=true`,
      type: 'account_onboarding',
    });

    return res.status(200).json({
      accountId: accountId,
      onboardingUrl: accountLink.url,
    });
  } catch (error: any) {
    console.error('[API] Error creating Stripe account:', error);
    return res.status(500).json({ error: error.message || 'Failed to create Stripe account' });
  }
}

