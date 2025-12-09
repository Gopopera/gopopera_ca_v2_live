# Host Flow Test Guide - Stripe Payment Integration

## 🎯 Complete Host Testing Flow

This guide walks you through testing the entire host flow from Stripe setup to event creation with fees.

---

## ✅ Pre-Test Checklist

Before starting, verify:
- [ ] Webhook is configured in Stripe Dashboard (✅ You've done this!)
- [ ] Webhook secret added to Vercel: `STRIPE_WEBHOOK_SECRET=whsec_tyNojzRFmC3sRCQ70Y0LZ2gngQtq962x`
- [ ] Stripe secret key in Vercel: `STRIPE_SECRET_KEY`
- [ ] Publishable key in `.env`: `VITE_STRIPE_PUBLISHABLE_KEY`

---

## 📋 Test Flow: Host Setting Up Stripe & Creating Paid Event

### **Step 1: Set Up Stripe Account (First Time Host)**

1. **Navigate to Stripe Settings:**
   - Log in as a host user
   - Go to Profile → Stripe Settings (or Settings → Stripe Payout Settings)

2. **Expected UI:**
   - Should see "Set Up Stripe Account" screen
   - Green dollar sign icon
   - "Connect Stripe Account" button

3. **Click "Connect Stripe Account":**
   - Button should show loading state
   - API call to `/api/stripe/create-account-link`
   - Should redirect to Stripe onboarding page

4. **Complete Stripe Onboarding:**
   - Fill out Stripe's onboarding form
   - Provide business details
   - Complete verification steps
   - Click "Save" or "Complete" in Stripe

5. **Return to Popera:**
   - Should redirect back to `/profile/stripe?stripe_return=true`
   - Page should refresh and show updated status
   - Should display "Stripe Account Connected" with green checkmark
   - Account ID should be visible (truncated)

6. **Verify in Firestore:**
   - Check `users/{userId}` document
   - Should have:
     - `stripeAccountId`: `acct_...`
     - `stripeOnboardingStatus`: `'complete'`
     - `stripeAccountEnabled`: `true` (after webhook processes)

**✅ Success Criteria:**
- Redirects to Stripe successfully
- Returns to Popera after completion
- Status updates to "complete"
- Firestore updated with account ID

---

### **Step 2: Create Event with Fee (One-Time Event)**

1. **Navigate to Create Event:**
   - Click "Create Event" or "Host Event"
   - Fill in basic event details (title, description, date, time, etc.)

2. **Scroll to Fee Section:**
   - Find "Charge a fee for this event" checkbox
   - Should be below the "Price" field

3. **Enable Fee:**
   - **If Stripe NOT set up:**
     - Checkbox should be available
     - When checked, should show yellow warning box
     - Should say: "You need to set up Stripe to charge fees"
     - Should have "Set up Stripe Account →" link
     - Clicking link should navigate to Stripe Settings

   - **If Stripe IS set up (after Step 1):**
     - Checkbox should be available
     - When checked, should show:
       - Currency dropdown (CAD/USD)
       - Fee amount input (dollars, e.g., "10.00")
       - Info text: "Platform fee: 10% (includes Stripe fees). You'll receive payouts 24 hours after the event."

4. **Set Fee Amount:**
   - Select currency: "CAD" or "USD"
   - Enter fee: e.g., "10.00" (for $10.00)
   - Should accept decimal values

5. **Complete Event Creation:**
   - Fill in all required fields
   - Click "Host Event"
   - Event should be created successfully

6. **Verify Event in Firestore:**
   - Check `events/{eventId}` document
   - Should have:
     - `hasFee`: `true`
     - `feeAmount`: `1000` (in cents, so $10.00 = 1000 cents)
     - `currency`: `'cad'` or `'usd'`

**✅ Success Criteria:**
- Fee checkbox appears
- If Stripe not set up, shows warning and redirect link
- If Stripe set up, shows fee input fields
- Event saves with fee information
- Fee amount converted to cents correctly

---

### **Step 3: Create Recurring Event with Fee (Weekly/Monthly)**

1. **Create Event:**
   - Same as Step 2, but:
   - Set "Session Frequency" to "Weekly" or "Monthly"
   - Enable fee checkbox
   - Set fee amount

2. **Verify Event Type:**
   - Event should have:
     - `sessionFrequency`: `'weekly'` or `'monthly'`
     - `hasFee`: `true`
     - `feeAmount`: (in cents)

**✅ Success Criteria:**
- Recurring event created with fee
- Event type correctly identified as recurring

---

## 🧪 Testing Payment Flow (As Attendee)

### **Test 1: Reserve One-Time Paid Event**

1. **As a different user (attendee):**
   - Navigate to event detail page
   - Event should show fee information
   - Click "Reserve Spot" button

2. **PaymentModal Should Open:**
   - Should show event title
   - Should show fee breakdown:
     - Event Fee: $X.XX
     - Platform Fee (10%): $X.XX
     - Total: $X.XX
   - Should have card input field
   - Should have "Pay $X.XX" button

3. **Enter Test Card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

4. **Complete Payment:**
   - Click "Pay $X.XX"
   - Should show "Processing..." state
   - Should show success checkmark
   - Modal should close
   - Reservation should be confirmed

5. **Verify:**
   - **Firestore `reservations` collection:**
     - New reservation document
     - `paymentIntentId`: `pi_...`
     - `paymentStatus`: `'succeeded'`
     - `payoutStatus`: `'held'`
     - `totalAmount`: (fee amount in cents)
     - `paymentMethod`: `'stripe'`

   - **Firestore `payments` collection:**
     - New payment document
     - `paymentIntentId`: `pi_...`
     - `status`: `'succeeded'`
     - `payoutStatus`: `'held'`
     - `amount`: (total in cents)
     - `platformFee`: (10% in cents)
     - `hostPayout`: (90% in cents)

   - **Stripe Dashboard:**
     - Payment should appear in Payments
     - Status: "Succeeded"
     - Amount should match

   - **Webhook:**
     - Check Stripe Dashboard → Webhooks → "Popera" → Event deliveries
     - Should show `payment_intent.succeeded` event
     - Status: "Succeeded" (green)

**✅ Success Criteria:**
- PaymentModal opens correctly
- Payment processes successfully
- Reservation created with payment info
- Payment record created
- Webhook received and processed
- Firestore updated correctly

---

### **Test 2: Reserve Recurring Paid Event**

1. **Navigate to recurring event:**
   - Event with `sessionFrequency: 'weekly'` or `'monthly'`
   - Event with `hasFee: true`

2. **Reserve Spot:**
   - PaymentModal should open
   - Should show blue info box: "Recurring Subscription - You'll be automatically charged for future sessions..."

3. **Complete Payment:**
   - Enter test card
   - Complete payment

4. **Verify:**
   - **Firestore `reservations`:**
     - `subscriptionId`: `sub_...`
     - `paymentIntentId`: `pi_...`
     - `paymentStatus`: `'succeeded'`
     - `nextChargeDate`: (timestamp for next charge)

   - **Stripe Dashboard:**
     - Subscription created in Subscriptions
     - Status: "Active"
     - Next payment date shown

   - **Webhook:**
     - `customer.subscription.created` event received
     - `payment_intent.succeeded` event received

**✅ Success Criteria:**
- Subscription created
- First payment processed
- Reservation has subscription ID
- Next charge date set

---

### **Test 3: Opt Out of Subscription**

1. **As attendee with active subscription:**
   - Navigate to event detail page
   - Open group conversation
   - Click "More" button (three dots)

2. **MoreToolsModal Should Show:**
   - Should have "Manage Subscription" option
   - Only visible if user has active subscription

3. **Click "Manage Subscription":**
   - SubscriptionOptOutModal should open
   - Should show:
     - Event title
     - Next charge date (if available)
     - Warning about cancellation
     - "Cancel Subscription" button

4. **Confirm Cancellation:**
   - Click "Cancel Subscription"
   - Should show "Cancelling..." state
   - Should show success message
   - Modal should close

5. **Verify:**
   - **Firestore `reservations`:**
     - `optOutRequested`: `true`
     - `optOutProcessed`: `true`

   - **Stripe Dashboard:**
     - Subscription status: "Canceled"
     - No future charges scheduled

   - **Webhook:**
     - `customer.subscription.deleted` event received

**✅ Success Criteria:**
- Opt-out option appears in group chat
- Cancellation succeeds
- Subscription cancelled in Stripe
- Reservation marked as opted out
- Webhook received

---

## 🔍 Verification Checklist

After each test, verify:

### Stripe Dashboard:
- [ ] Payment/Subscription appears
- [ ] Status is correct
- [ ] Amount matches
- [ ] Webhook events received

### Firestore:
- [ ] `reservations` collection updated
- [ ] `payments` collection has record (for one-time)
- [ ] `users` collection has Stripe account info (for hosts)

### Frontend:
- [ ] UI shows correct status
- [ ] No console errors
- [ ] User feedback is clear

---

## 🐛 Common Issues & Solutions

### Issue: "Stripe service not configured"
**Solution:** Check Vercel environment variables:
- `STRIPE_SECRET_KEY` is set
- Value is correct (starts with `sk_test_...`)

### Issue: PaymentModal doesn't open
**Solution:** 
- Check browser console for errors
- Verify `VITE_STRIPE_PUBLISHABLE_KEY` in `.env`
- Check event has `hasFee: true` and `feeAmount > 0`

### Issue: Webhook not received
**Solution:**
- Verify webhook URL in Stripe: `https://gopopera.ca/api/stripe/webhook`
- Check webhook secret matches: `whsec_tyNojzRFmC3sRCQ70Y0LZ2gngQtq962x`
- Check Vercel function logs for errors
- Verify webhook is "Active" in Stripe Dashboard

### Issue: Firestore not updating
**Solution:**
- Check Vercel function logs
- Verify Firebase Admin initialized
- Check service account file exists
- Verify webhook handler is being called

### Issue: "You need to set up Stripe" when Stripe is set up
**Solution:**
- Refresh user profile: `refreshUserProfile()`
- Check Firestore `users/{userId}` has:
  - `stripeAccountId` set
  - `stripeOnboardingStatus: 'complete'`

---

## 📊 Expected Webhook Events

When testing, you should see these webhook events in Stripe Dashboard:

1. **Account Setup:**
   - `account.updated` - When onboarding completes

2. **One-Time Payment:**
   - `payment_intent.succeeded` - When payment completes

3. **Subscription:**
   - `customer.subscription.created` - When subscription created
   - `payment_intent.succeeded` - When first payment completes
   - `customer.subscription.updated` - When subscription changes

4. **Opt-Out:**
   - `customer.subscription.deleted` - When subscription cancelled

---

## ✅ Test Summary

**Host Flow:**
1. ✅ Set up Stripe account → Onboarding works
2. ✅ Create event with fee → Fee option works
3. ✅ Event saves with fee → Firestore updated

**Attendee Flow:**
1. ✅ Reserve paid event → PaymentModal opens
2. ✅ Complete payment → Reservation created
3. ✅ Webhook processes → Firestore updated

**Recurring Events:**
1. ✅ Create recurring event with fee → Works
2. ✅ Reserve → Subscription created
3. ✅ Opt-out → Subscription cancelled

---

## 🚀 Ready to Test!

Follow this guide step-by-step. If you encounter any issues, check the "Common Issues" section above or review the Vercel function logs.

**All code is complete and ready!** 🎉

