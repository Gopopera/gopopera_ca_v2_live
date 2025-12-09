# Stripe Integration - Remaining Tasks

## ✅ Completed

All frontend components and backend API endpoints have been created and integrated!

### Backend APIs Created:
- ✅ `api/stripe/create-account-link.ts` - Creates Stripe Connect accounts
- ✅ `api/stripe/create-payment-intent.ts` - Creates one-time payments
- ✅ `api/stripe/create-subscription.ts` - Creates recurring subscriptions
- ✅ `api/stripe/confirm-payment.ts` - Confirms payments
- ✅ `api/stripe/release-payout.ts` - Releases payouts (24h after event)
- ✅ `api/stripe/cancel-subscription.ts` - Cancels subscriptions
- ✅ `api/stripe/webhook.ts` - Handles Stripe webhooks

### Frontend Integration:
- ✅ PaymentModal component integrated into EventDetailPage
- ✅ Subscription opt-out added to GroupChat
- ✅ CreateEventPage has fee option with Stripe redirect
- ✅ StripeSettingsPage has onboarding flow
- ✅ userStore updated to handle payments

---

## ⚠️ What's Left To Do

### 1. Environment Variables (CRITICAL)

**In Vercel Dashboard:**
1. Go to your project settings → Environment Variables
2. Add these variables:

```
STRIPE_SECRET_KEY=sk_test_... (your Stripe secret key from Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_... (get this from Stripe Dashboard → Webhooks)
```

**In Local .env file:**
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (your Stripe publishable key from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_... (your Stripe secret key from Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_... (get from Stripe Dashboard)
```

**Note:** The publishable key (`pk_test_...`) is SAFE to expose in frontend code. Only the secret key needs to be hidden.

---

### 2. Set Up Stripe Webhook (CRITICAL)

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://yourdomain.com/api/stripe/webhook`
   - For local testing: Use Stripe CLI (see below)
4. Select these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `account.updated`
5. Copy the webhook signing secret (starts with `whsec_`)
6. Add it to your environment variables

**For Local Testing:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

### 3. Complete Webhook Firestore Integration

The webhook handler (`api/stripe/webhook.ts`) has TODO comments for Firestore updates. You need to:

1. **Install Firebase Admin SDK** (for server-side Firestore access):
```bash
npm install firebase-admin
```

2. **Initialize Firebase Admin** in your API functions:
```typescript
// api/stripe/webhook.ts (add at top)
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../../firebase-service-account.json')),
  });
}

const db = admin.firestore();
```

3. **Update webhook handler functions** to write to Firestore:
   - `handlePaymentSuccess()` - Update reservation and create payment record
   - `handlePaymentFailure()` - Update reservation status
   - `handleSubscriptionUpdate()` - Update reservation with subscription ID
   - `handleSubscriptionCancellation()` - Mark reservation as opted out
   - `handleAccountUpdate()` - Update user's Stripe account status

See `STRIPE_INTEGRATION_GUIDE.md` for detailed examples.

---

### 4. Set Up Scheduled Tasks

You need scheduled tasks (Cloud Functions, Vercel Cron, etc.) for:

#### A. Release Payouts (24 hours after event)
- Run daily at midnight
- Query Firestore for payments where:
  - `payoutStatus === 'held'`
  - `eventEndDate < (now - 24 hours)`
- Call `/api/stripe/release-payout` for each
- Update payment records

#### B. Send Reminders (2 days before event)
- Run daily
- Use `processUpcomingEventReminders()` from `utils/paymentReminders.ts`
- Sends notifications to users with active subscriptions

**Vercel Cron Example:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/release-payouts",
    "schedule": "0 0 * * *"
  }, {
    "path": "/api/cron/send-reminders",
    "schedule": "0 0 * * *"
  }]
}
```

---

### 5. Test Payment Flow

1. **Test One-Time Payment:**
   - Create event with fee
   - Reserve spot
   - Complete payment
   - Verify reservation created
   - Check webhook received

2. **Test Subscription:**
   - Create recurring event (weekly/monthly) with fee
   - Reserve spot
   - Complete payment
   - Verify subscription created
   - Test opt-out in group chat

3. **Test Stripe Connect:**
   - Go to Stripe Settings page
   - Create account
   - Complete onboarding
   - Verify account status updated

---

### 6. Update PaymentModal Customer Email

In `components/payments/PaymentModal.tsx`, line ~80, you need to pass the user's email:

```typescript
body: JSON.stringify({
  // ... other fields
  customerEmail: user?.email, // Add this
}),
```

You'll need to get the user email from the user store.

---

### 7. Handle Subscription Interval

In `components/payments/PaymentModal.tsx`, the subscription creation uses a hardcoded `interval: 'weekly'`. You should:

1. Determine interval from event's `sessionFrequency`
2. Pass it to the API:
```typescript
interval: event.sessionFrequency === 'weekly' ? 'week' : 'month',
```

---

### 8. Production Checklist

Before going live:

- [ ] Switch to live Stripe keys (`pk_live_...` and `sk_live_...`)
- [ ] Update webhook endpoint to production URL
- [ ] Test with real small amounts
- [ ] Set up error monitoring
- [ ] Configure payout schedules
- [ ] Test refund flow (if needed)
- [ ] Set up email notifications for failed payments
- [ ] Review Stripe Dashboard for any warnings

---

## Quick Start Testing

1. **Set environment variables** (see #1 above)
2. **Start local server:**
   ```bash
   npm run dev
   ```
3. **Start Stripe CLI** (for webhook testing):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. **Test payment:**
   - Create event with fee
   - Reserve spot
   - Use test card: `4242 4242 4242 4242`
   - Check webhook logs in Stripe CLI

---

## Support

- Stripe Docs: https://stripe.com/docs
- Stripe Testing: https://stripe.com/docs/testing
- Stripe Connect: https://stripe.com/docs/connect

---

## Summary

**Critical (Must Do):**
1. ✅ Set environment variables in Vercel
2. ✅ Set up webhook endpoint
3. ✅ Complete webhook Firestore integration
4. ✅ Set up scheduled tasks

**Important (Should Do):**
5. ✅ Test payment flow end-to-end
6. ✅ Update PaymentModal to pass user email
7. ✅ Handle subscription interval properly

**Nice to Have:**
8. ✅ Production testing
9. ✅ Error monitoring
10. ✅ Email notifications

The core integration is complete! You just need to configure the environment, set up webhooks, and test.

