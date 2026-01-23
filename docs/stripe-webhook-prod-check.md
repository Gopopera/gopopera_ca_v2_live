# Stripe Webhook Prod Check (Vercel)

## Resend Event (Stripe Dashboard)
- Go to Stripe Dashboard → Developers → Webhooks.
- Open the endpoint for `https://gopopera.ca/api/stripe/webhook`.
- Click "Events" (or "Recent events") for that endpoint.
- Pick a recent event and click "Resend".
- In the resend modal, choose "Send to endpoint" and confirm.

## Confirm Success in Vercel Logs
- In Vercel → Project → Deployments → (latest) → Functions/Logs.
- Look for log lines that include:
  - `status=verified` and `matchedSecretIndex=...`
  - `status=processed` with the same `requestId`
  - `rawBodyByteLength=...` (non-zero)

## Common Failure Modes
- Missing signature header:
  - Log shows `status=missing_signature` or `hasSignatureHeader=false`.
  - Indicates Stripe did not send the `stripe-signature` header or a proxy stripped it.
- Wrong secret:
  - Log shows `status=signature_failed` and no `matchedSecretIndex`.
  - Indicates the `STRIPE_WEBHOOK_SECRET` does not match the endpoint’s signing secret.
- Body parser enabled:
  - Log shows `status=signature_failed` and Stripe error about signature mismatch.
  - Indicates the raw body was altered before verification.
- Edge runtime:
  - Log may show `runtime=edge` or `require is not defined` errors.
  - Stripe verification requires Node.js and the raw request body.

## Required Vercel Env Vars
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (single secret or comma-separated list)

