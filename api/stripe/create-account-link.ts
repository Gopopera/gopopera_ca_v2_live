/**
 * Vercel Serverless Function for Creating Stripe Connect Account
 * Creates a Stripe Connect Express account for hosts to receive payouts
 * Includes debug instrumentation for Belgium launch verification
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
}) : null;

/**
 * Generate a short request ID for log correlation
 */
function generateRequestId(): string {
  return `stripe_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Mask user ID for logging (first 8 chars only)
 */
function maskUserId(userId: string): string {
  if (!userId || userId.length < 8) return '***';
  return `${userId.substring(0, 8)}***`;
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
      console.error(`[STRIPE_CONNECT] requestId=${requestId} status=config_error reason=missing_secret_key`);
      return res.status(500).json({ error: 'Stripe service not configured' });
    }

    const { userId, email, returnUrl, existingAccountId, countryCode } = req.body;

    if (!userId || !email) {
      console.warn(`[STRIPE_CONNECT] requestId=${requestId} status=validation_error reason=missing_fields`);
      return res.status(400).json({ error: 'Missing required fields: userId, email' });
    }

    const maskedUser = maskUserId(userId);

    // GUARDRAIL: Require country selection for new accounts (prevent wrong country assignment)
    // For existing accounts, we don't need country (account already has it)
    if (!existingAccountId && (!countryCode || countryCode.length !== 2)) {
      console.warn(`[STRIPE_CONNECT] requestId=${requestId} userId=${maskedUser} status=guardrail_block reason=missing_country`);
      return res.status(400).json({ 
        error: 'Please select your country before setting up payouts.',
        code: 'COUNTRY_REQUIRED'
      });
    }

    // Validate country code for Stripe Connect (ISO2)
    // For existing accounts without countryCode, we'll use the account's existing country
    const stripeCountry = (countryCode && countryCode.length === 2) ? countryCode.toUpperCase() : null;

    const capabilitiesPayload = {
      card_payments: { requested: true },
      transfers: { requested: true },
    };

    let accountId: string;
    let usedExistingAccount = false;
    let logCountry: string | null = stripeCountry;

    // Check if user already has a Stripe account
    if (existingAccountId) {
      // Verify the existing account exists and belongs to this user
      try {
        const existingAccount = await stripe.accounts.retrieve(existingAccountId);
        if (existingAccount.metadata?.userId === userId) {
          // Use existing account - just create a new onboarding link
          accountId = existingAccountId;
          usedExistingAccount = true;
          logCountry = existingAccount.country || stripeCountry || countryCode || null;
          console.log(`[STRIPE_CONNECT] requestId=${requestId} userId=${maskedUser} action=use_existing accountId=${accountId} existingCountry=${existingAccount.country}`);
        } else {
          // Account doesn't belong to this user - create new one
          if (!stripeCountry) {
            console.warn(`[STRIPE_CONNECT] requestId=${requestId} userId=${maskedUser} status=guardrail_block reason=country_required_for_new`);
            return res.status(400).json({ 
              error: 'Please select your country before setting up payouts.',
              code: 'COUNTRY_REQUIRED'
            });
          }
          
          console.warn(`[STRIPE_CONNECT] requestId=${requestId} userId=${maskedUser} action=create_new reason=account_mismatch`);
          const account = await stripe.accounts.create({
            type: 'express',
            country: stripeCountry,
            email,
            metadata: {
              userId,
            },
            capabilities: capabilitiesPayload,
          });
          accountId = account.id;
          console.log(`[STRIPE_CONNECT] requestId=${requestId} userId=${maskedUser} action=created accountId=${accountId} country=${stripeCountry} type=express capabilities=transfers,card_payments`);
        }
      } catch (error: any) {
        // Account doesn't exist or error retrieving - create new one
        if (!stripeCountry) {
          console.warn(`[STRIPE_CONNECT] requestId=${requestId} userId=${maskedUser} status=guardrail_block reason=country_required_after_error`);
          return res.status(400).json({ 
            error: 'Please select your country before setting up payouts.',
            code: 'COUNTRY_REQUIRED'
          });
        }
        
        console.warn(`[STRIPE_CONNECT] requestId=${requestId} userId=${maskedUser} action=create_new reason=retrieve_failed error="${error.message?.substring(0, 50)}"`);
        const account = await stripe.accounts.create({
          type: 'express',
          country: stripeCountry,
          email,
          metadata: {
            userId,
          },
          capabilities: capabilitiesPayload,
        });
        accountId = account.id;
        console.log(`[STRIPE_CONNECT] requestId=${requestId} userId=${maskedUser} action=created accountId=${accountId} country=${stripeCountry} type=express capabilities=transfers,card_payments`);
      }
    } else {
      // No existing account - create new one (stripeCountry is guaranteed by guardrail above)
      const account = await stripe.accounts.create({
        type: 'express',
        country: stripeCountry!,
        email,
        metadata: {
          userId,
        },
        capabilities: capabilitiesPayload,
      });
      accountId = account.id;
      console.log(`[STRIPE_CONNECT] requestId=${requestId} userId=${maskedUser} action=created accountId=${accountId} country=${stripeCountry} type=express capabilities=transfers,card_payments`);
    }

    if (usedExistingAccount) {
      await stripe.accounts.update(accountId, {
        capabilities: capabilitiesPayload,
      });
    }

    const requestedCountry = (logCountry || countryCode || stripeCountry || 'unknown').toString().toUpperCase();
    console.log(`[STRIPE_CONNECT] status=capabilities_requested country=${requestedCountry} existingAccount=${usedExistingAccount ? 'true' : 'false'}`);

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${returnUrl}?stripe_return=true`,
      return_url: `${returnUrl}?stripe_return=true`,
      type: 'account_onboarding',
    });

    console.log(`[STRIPE_CONNECT] requestId=${requestId} userId=${maskedUser} action=link_created accountId=${accountId}`);

    return res.status(200).json({
      accountId: accountId,
      onboardingUrl: accountLink.url,
    });
  } catch (error: any) {
    console.error(`[STRIPE_CONNECT] requestId=${requestId} status=exception error="${error.message?.substring(0, 100)}"`);
    return res.status(500).json({ error: error.message || 'Failed to create Stripe account' });
  }
}
