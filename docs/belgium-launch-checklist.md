# Belgium (EU) Launch Verification Checklist

## Overview
This checklist validates end-to-end functionality for Belgium/EU users. Run through both **BE (Belgium)** and **CA (Canada)** flows to ensure no regressions.

---

## Pre-Launch Requirements

### Twilio Configuration
- [ ] Enable SMS delivery to Belgium (+32) in Twilio Console → Geo Permissions
- [ ] Verify sender ID / "From" number is valid for EU (may need alphanumeric sender ID for some countries)
- [ ] Check Twilio account balance / limits for international SMS

### Stripe Configuration
- [ ] Verify Stripe account can create Express accounts in Belgium (country: BE)
- [ ] Confirm EUR is enabled as a supported currency
- [ ] Review Stripe Connect country requirements: https://stripe.com/docs/connect/required-verification-information

---

## Test Matrix

### 1. Sign Up & Phone Verification

| Test Case | Country | Steps | Expected Result | Pass? |
|-----------|---------|-------|-----------------|-------|
| BE-SIGNUP-1 | Belgium | 1. Create new account (Google/email) | Account created | ⬜ |
| BE-PHONE-1 | Belgium | 1. Go to host phone verification<br>2. Select Belgium 🇧🇪<br>3. Enter local number (e.g., 475123456) | Country selector shows BE (+32) | ⬜ |
| BE-PHONE-2 | Belgium | 4. Click "Send Verification Code" | E.164 format: +32475123456<br>SMS received (or Twilio error logged) | ⬜ |
| BE-PHONE-3 | Belgium | 5. Enter 6-digit code<br>6. Click "Verify" | Verification succeeds<br>User profile updated: countryCode=BE, currency=eur | ⬜ |
| CA-PHONE-1 | Canada | Repeat above with CA (+1) | E.164: +14165551234<br>countryCode=CA, currency=cad | ⬜ |

**Logs to check:**
- Vercel Function Logs → `/api/send-sms`
- Look for: `[SMS] requestId=xxx to=+32*** country=BE status=sent/failed`

**Common failures:**
- Twilio error 21408: Geo permission not enabled
- Twilio error 21614: Invalid mobile number
- "SMS service not configured": Missing Twilio env vars

---

### 2. Event Creation (Currency)

| Test Case | Country | Steps | Expected Result | Pass? |
|-----------|---------|-------|-----------------|-------|
| BE-EVENT-1 | Belgium | 1. Create event with fee<br>2. Select EUR (€) currency<br>3. Enter fee amount (e.g., 10) | Currency selector shows EUR option | ⬜ |
| BE-EVENT-2 | Belgium | 4. Publish event | Event saved with currency=eur, feeAmount=1000 (cents) | ⬜ |
| CA-EVENT-1 | Canada | Create paid event with CAD | currency=cad saved correctly | ⬜ |

**Firestore check:**
- `/events/{eventId}` → `currency: "eur"`, `feeAmount: 1000`

---

### 3. Paid RSVP / Payment

| Test Case | Country | Steps | Expected Result | Pass? |
|-----------|---------|-------|-----------------|-------|
| BE-PAY-1 | Belgium | 1. View EUR event<br>2. Click Reserve | Price shows: €10,00 EUR | ⬜ |
| BE-PAY-2 | Belgium | 3. Complete payment (test card 4242...) | PaymentIntent created with currency=eur | ⬜ |
| BE-PAY-3 | Belgium | 4. Check confirmation email | Shows €10,00 EUR (not $10.00 CAD) | ⬜ |
| CA-PAY-1 | Canada | RSVP to CAD event | Shows $10.00 CAD, PaymentIntent currency=cad | ⬜ |

**Logs to check:**
- Vercel Function Logs → `/api/stripe/create-payment-intent`
- Look for: `[PAYMENT] requestId=xxx eventId=xxx currency=eur amount=1000`

**Common failures:**
- "Currency not supported": Stripe account doesn't have EUR enabled
- Wrong display: Check `formatPaymentAmount()` usage

---

### 4. Stripe Connect Host Onboarding

| Test Case | Country | Steps | Expected Result | Pass? |
|-----------|---------|-------|-----------------|-------|
| BE-CONNECT-1 | Belgium | 1. Verify phone as BE user<br>2. Go to Payouts setup<br>3. Click "Set up payouts" | Stripe account created with country=BE | ⬜ |
| BE-CONNECT-2 | Belgium | 4. Complete Stripe onboarding | Account shows Belgian requirements<br>IBAN, ID verification | ⬜ |
| CA-CONNECT-1 | Canada | Same flow for CA user | Account created with country=CA<br>Shows Canadian requirements | ⬜ |
| GUARD-1 | Any | User with no countryCode tries onboarding | Error: "Please select your country first" | ⬜ |

**Logs to check:**
- Vercel Function Logs → `/api/stripe/create-account-link` or `/api/stripe/connect/onboarding-link`
- Look for: `[STRIPE_CONNECT] requestId=xxx userId=xxx country=BE type=express`

**Common failures:**
- Account created with wrong country → Stripe onboarding shows wrong documents
- "Country not supported": Check Stripe Connect supported countries

---

### 5. Reservation Confirmation Email

| Test Case | Steps | Expected Result | Pass? |
|-----------|-------|-----------------|-------|
| EMAIL-EUR | RSVP to EUR event | Email shows: €10,00 EUR | ⬜ |
| EMAIL-CAD | RSVP to CAD event | Email shows: $10.00 CAD | ⬜ |

---

## Debug Tools

### Enable Debug Panel
Add `?debug=1` to any page URL to see debug info (admin-only or debug mode):
```
https://gopopera.ca/event/xxx?debug=1
```

Shows:
- Detected timezone
- User countryCode
- Derived currency
- Event currency
- Last OTP status

### Server Logs Location
- **Vercel Dashboard** → Project → Functions tab → View logs
- Filter by function name: `send-sms`, `create-payment-intent`, `create-account-link`

### Log Format
All EU-related endpoints log with consistent format:
```
[FUNCTION_NAME] requestId=uuid action=xxx key=value ...
```

Sensitive data is masked:
- Phone: `+32***` (shows country code only)
- Email: `u***@***.com`

---

## Rollback Plan

If Belgium launch fails:

1. **Twilio failures**: Disable BE in geo permissions, users get clear error
2. **Stripe failures**: countryCode defaults to CA if missing (existing behavior)
3. **Currency display**: Falls back to CAD formatting if currency missing

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product | | | |

---

## Appendix: Test Card Numbers

| Card | Number | Use |
|------|--------|-----|
| Visa (success) | 4242 4242 4242 4242 | Normal payment |
| Visa (3DS required) | 4000 0027 6000 3184 | SCA/3DS test |
| Declined | 4000 0000 0000 0002 | Decline test |

Expiry: Any future date  
CVC: Any 3 digits  
ZIP: Any 5 digits

