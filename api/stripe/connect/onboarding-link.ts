/**
 * Vercel Serverless Function for Creating Stripe Connect Onboarding Link
 * 
 * POST /api/stripe/connect/onboarding-link
 * 
 * Creates or retrieves a Stripe Connect Express account for the host
 * and generates an onboarding link.
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;
const APP_URL = process.env.APP_URL || process.env.VITE_APP_URL || 'https://gopopera.ca';

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

    const { 
      userId, 
      email, 
      existingAccountId,
      returnUrl,
      refreshUrl,
    } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing required fields: userId, email' });
    }

    let accountId: string;

    // Check if user already has a Stripe account
    if (existingAccountId) {
      try {
        const existingAccount = await stripe.accounts.retrieve(existingAccountId);
        if (existingAccount.metadata?.userId === userId) {
          // Use existing account
          accountId = existingAccountId;
          console.log('[API] Using existing Stripe account:', { accountId, userId });
        } else {
          // Account doesn't belong to this user - create new one
          console.warn('[API] Existing account does not match userId, creating new account');
          const account = await stripe.accounts.create({
            type: 'express',
            email,
            metadata: { userId },
            capabilities: {
              transfers: { requested: true },
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
          metadata: { userId },
          capabilities: {
            transfers: { requested: true },
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
        metadata: { userId },
        capabilities: {
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      console.log('[API] Stripe account created:', { accountId, userId });
    }

    // Build URLs - use provided URLs or defaults
    const finalReturnUrl = returnUrl || `${APP_URL}/host/payouts?stripe=return`;
    const finalRefreshUrl = refreshUrl || `${APP_URL}/host/payouts?stripe=refresh`;

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url: finalReturnUrl,
      refresh_url: finalRefreshUrl,
      type: 'account_onboarding',
    });

    console.log('[API] Onboarding link created:', { accountId, url: accountLink.url?.slice(0, 50) + '...' });

    return res.status(200).json({
      accountId,
      url: accountLink.url,
    });

  } catch (error: any) {
    console.error('[API] Error creating onboarding link:', error);
    return res.status(500).json({ error: error.message || 'Failed to create onboarding link' });
  }
}

