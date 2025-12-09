# Stripe Payment Integration - Complete Implementation Guide

## Overview

This guide provides step-by-step instructions to complete the Stripe payment integration for Popera. The frontend components and utilities are already implemented. You need to set up the backend API endpoints and configure Stripe.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Stripe Account Setup](#stripe-account-setup)
3. [Backend API Endpoints](#backend-api-endpoints)
4. [Environment Variables](#environment-variables)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### 1. Stripe Account
- Sign up for a Stripe account at https://stripe.com
- Complete business verification
- Enable Stripe Connect (for host payouts)

### 2. Dependencies Installed
The following packages are already installed:
- `@stripe/stripe-js` - Stripe client-side SDK
- `@stripe/react-stripe-js` - React components for Stripe
- `stripe` - Stripe server-side SDK (needs to be installed on backend)

### 3. Backend Setup
You need a backend server (Node.js/Express, Vercel Serverless Functions, or similar) to handle:
- Stripe API calls (server-side only)
- Webhook handling
- Payment processing

---

## Stripe Account Setup

### 1. Get API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_live_...` or `pk_test_...`)
3. Copy your **Secret key** (starts with `sk_live_...` or `sk_test_...`)
4. Save these for environment variables

### 2. Enable Stripe Connect

1. Go to https://dashboard.stripe.com/settings/connect
2. Enable **Express accounts** (recommended for hosts)
3. Configure your Connect settings:
   - Business type
   - Support email
   - Branding

### 3. Set Up Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `charge.failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `account.updated` (for Connect accounts)
5. Copy the webhook signing secret (starts with `whsec_tyNojzRFmC3sRCQ7OY0LZ2gngQtq962x`)

---

## Environment Variables

Add these to your `.env` file (and production environment):

```env
# Stripe Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
STRIPE_SECRET_KEY=sk_test_... (your Stripe secret key from Stripe Dashboard) (or sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...

# Platform Configuration
PLATFORM_FEE_PERCENTAGE=0.10  # 10%
PLATFORM_CURRENCY=cad  # or usd

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000  # or your production URL
```

**Important:** Never commit `.env` files to git. Use your hosting platform's environment variable settings.

---

## Backend API Endpoints

You need to create these API endpoints. Examples are provided for Vercel Serverless Functions, but you can adapt them to your backend.

### 1. Create Stripe Connect Account Link

**File:** `api/stripe/create-account-link.ts` (or your backend route)

```typescript
import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email, returnUrl } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if account already exists (you might want to store this in Firestore)
    // For now, create a new account each time
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      metadata: {
        userId,
      },
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${returnUrl}?stripe_return=true`,
      return_url: `${returnUrl}?stripe_return=true`,
      type: 'account_onboarding',
    });

    return res.status(200).json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
    });
  } catch (error: any) {
    console.error('Error creating Stripe account:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### 2. Create Payment Intent

**File:** `api/stripe/create-payment-intent.ts`

```typescript
import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, currency, isRecurring, eventId, hostId, userId } = req.body;

    if (!amount || !currency || !eventId || !hostId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate platform fee (10%)
    const platformFee = Math.round(amount * 0.10);
    const hostPayout = amount - platformFee;

    // Get host's Stripe account ID from Firestore
    // You'll need to fetch this from your database
    // const hostAccountId = await getHostStripeAccountId(hostId);

    if (isRecurring) {
      // Create subscription for recurring events
      // This is more complex - see Stripe Subscriptions docs
      // For now, we'll create a one-time payment
      // TODO: Implement subscription creation
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        eventId,
        hostId,
        userId,
        platformFee: platformFee.toString(),
        hostPayout: hostPayout.toString(),
      },
      // For Connect accounts, use application_fee_amount
      // application_fee_amount: platformFee,
      // transfer_data: {
      //   destination: hostAccountId,
      // },
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### 3. Create Subscription (for recurring events)

**File:** `api/stripe/create-subscription.ts`

```typescript
import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, currency, eventId, hostId, userId, interval } = req.body;

    if (!amount || !currency || !eventId || !hostId || !userId || !interval) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create or retrieve customer
    let customerId: string;
    // Check if user already has a Stripe customer ID in Firestore
    // If not, create one
    // customerId = await getOrCreateStripeCustomer(userId, email);

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
      customer: customerId,
      items: [{ price: price.id }],
      metadata: {
        eventId,
        hostId,
        userId,
      },
    });

    return res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### 4. Confirm Payment

**File:** `api/stripe/confirm-payment.ts`

```typescript
import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Missing paymentIntentId' });
    }

    // Retrieve payment intent to verify status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: 'Payment not succeeded',
        status: paymentIntent.status,
      });
    }

    // Payment is confirmed - the webhook will handle the rest
    // But you can return success here
    return res.status(200).json({
      success: true,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### 5. Release Payout (for one-time events)

**File:** `api/stripe/release-payout.ts`

```typescript
import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentId, reservationId } = req.body;

    if (!paymentId || !reservationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get payment record from Firestore
    // const payment = await getPaymentFromFirestore(paymentId);
    // const hostAccountId = await getHostStripeAccountId(payment.hostId);

    // Create transfer to host (if using Connect)
    // const transfer = await stripe.transfers.create({
    //   amount: payment.hostPayout,
    //   currency: payment.currency,
    //   destination: hostAccountId,
    //   metadata: {
    //     paymentId,
    //     reservationId,
    //   },
    // });

    // Update payment record in Firestore
    // await updatePaymentInFirestore(paymentId, {
    //   payoutStatus: 'released',
    //   payoutReleasedAt: Date.now(),
    // });

    return res.status(200).json({
      success: true,
      // transferId: transfer.id,
    });
  } catch (error: any) {
    console.error('Error releasing payout:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### 6. Cancel Subscription

**File:** `api/stripe/cancel-subscription.ts`

```typescript
import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Missing subscriptionId' });
    }

    // Cancel subscription immediately (or at period end)
    const subscription = await stripe.subscriptions.cancel(subscriptionId);

    return res.status(200).json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### 7. Webhook Handler

**File:** `api/stripe/webhook.ts`

```typescript
import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      // Update reservation and create payment record in Firestore
      await handlePaymentSuccess(paymentIntent);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      // Update reservation status to failed
      await handlePaymentFailure(failedPayment);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      // Update reservation with subscription ID
      await handleSubscriptionUpdate(subscription);
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      // Mark reservation as opted out
      await handleSubscriptionCancellation(deletedSubscription);
      break;

    case 'account.updated':
      const account = event.data.object as Stripe.Account;
      // Update user's Stripe account status in Firestore
      await handleAccountUpdate(account);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return res.status(200).json({ received: true });
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  // Get metadata
  const { eventId, hostId, userId, platformFee, hostPayout } = paymentIntent.metadata;

  // Update reservation in Firestore
  // await updateReservation(userId, eventId, {
  //   paymentIntentId: paymentIntent.id,
  //   paymentStatus: 'succeeded',
  //   payoutStatus: 'held', // For one-time events
  // });

  // Create payment record in Firestore
  // await createPaymentRecord({
  //   paymentIntentId: paymentIntent.id,
  //   eventId,
  //   hostId,
  //   userId,
  //   amount: paymentIntent.amount,
  //   platformFee: parseInt(platformFee),
  //   hostPayout: parseInt(hostPayout),
  //   status: 'succeeded',
  //   payoutStatus: 'held', // Will be released 24h after event
  // });
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  // Update reservation status
  // await updateReservation(userId, eventId, {
  //   paymentStatus: 'failed',
  // });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  // Update reservation with subscription ID
  // await updateReservation(userId, eventId, {
  //   subscriptionId: subscription.id,
  // });
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  // Mark reservation as opted out
  // await updateReservation(userId, eventId, {
  //   optOutProcessed: true,
  // });
}

async function handleAccountUpdate(account: Stripe.Account) {
  // Update user's Stripe account status
  // await updateUserStripeStatus(account.id, {
  //   stripeOnboardingStatus: account.details_submitted ? 'complete' : 'incomplete',
  //   stripeAccountEnabled: account.charges_enabled && account.payouts_enabled,
  // });
}
```

---

## Frontend Integration

The frontend components are already created. You just need to:

1. **Set environment variable** `VITE_STRIPE_PUBLISHABLE_KEY` in your `.env` file
2. **Update API endpoints** in `PaymentModal.tsx` to point to your backend URLs
3. **Test the flow** end-to-end

### Payment Flow

1. User clicks "Reserve" on paid event
2. `PaymentModal` opens
3. User enters card details
4. Frontend calls `/api/stripe/create-payment-intent`
5. Stripe Elements confirms payment
6. Frontend calls `/api/stripe/confirm-payment`
7. Webhook updates Firestore records
8. Reservation is confirmed

---

## Scheduled Tasks

### 1. Release Payouts (24 hours after event)

Create a scheduled function (Cloud Functions, Vercel Cron, etc.) that runs daily:

```typescript
// This should run daily at midnight
export async function releaseHeldPayouts() {
  // Query Firestore for payments where:
  // - payoutStatus === 'held'
  // - eventEndDate < (now - 24 hours)
  
  // For each payment:
  // 1. Call /api/stripe/release-payout
  // 2. Update payment record
}
```

### 2. Send Reminders (2 days before event)

Use the `processUpcomingEventReminders()` function from `utils/paymentReminders.ts`:

```typescript
// Run daily
import { processUpcomingEventReminders } from './utils/paymentReminders';

export async function sendSubscriptionReminders() {
  await processUpcomingEventReminders();
}
```

---

## Testing

### 1. Test Mode

Use Stripe test mode:
- Test cards: https://stripe.com/docs/testing
- Use `pk_test_...` and `sk_test_...` keys
- Test webhook events using Stripe CLI

### 2. Stripe CLI

Install Stripe CLI for local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 3. Test Cards

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

---

## Deployment Checklist

- [ ] Set environment variables in production
- [ ] Configure webhook endpoint in Stripe Dashboard
- [ ] Test payment flow end-to-end
- [ ] Set up scheduled tasks for payouts and reminders
- [ ] Monitor webhook logs
- [ ] Set up error alerting
- [ ] Test with real Stripe account (small amount)

---

## Troubleshooting

### Payment Intent Creation Fails
- Check Stripe API key is correct
- Verify amount is in cents (not dollars)
- Check currency is valid

### Webhook Not Receiving Events
- Verify webhook secret is correct
- Check endpoint URL is accessible
- Use Stripe CLI to test locally

### Payouts Not Releasing
- Check scheduled task is running
- Verify event end dates are correct
- Check Firestore queries

### Subscriptions Not Working
- Verify customer creation
- Check price creation
- Review subscription metadata

---

## Next Steps

1. Implement the backend API endpoints
2. Set up webhook endpoint
3. Configure scheduled tasks
4. Test thoroughly in test mode
5. Deploy to production
6. Monitor and iterate

---

## Support

- Stripe Docs: https://stripe.com/docs
- Stripe Connect: https://stripe.com/docs/connect
- Stripe Subscriptions: https://stripe.com/docs/billing/subscriptions/overview

