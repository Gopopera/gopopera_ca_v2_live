# Webhook Secret Update

## ✅ New Webhook Secret Configured

**Date:** December 9, 2025  
**Status:** Secret rotated and updated

---

## ⚠️ ACTION REQUIRED: Update Vercel Environment Variable

The webhook secret has been rotated in Stripe. You need to update it in Vercel:

1. **Go to Vercel Dashboard:**
   - Navigate to your project
   - Go to Settings → Environment Variables

2. **Update the variable:**
   - Find `STRIPE_WEBHOOK_SECRET`
   - Update the value to the new secret from Stripe Dashboard
   - Save the changes

3. **Redeploy (if needed):**
   - Vercel should automatically redeploy with the new environment variable
   - Or manually trigger a redeploy

4. **Verify it's working:**
   - Test a payment or event
   - Check Stripe Dashboard → Webhooks → "Popera" → Event deliveries
   - Verify events are being received successfully

---

## Code Status

✅ **No code changes needed** - The webhook handler reads from environment variables:
- `process.env.STRIPE_WEBHOOK_SECRET` (production)
- `process.env.VITE_STRIPE_WEBHOOK_SECRET` (fallback)

The secret is stored securely in Vercel environment variables, not in the codebase.

---

## Security Note

✅ **Secret is NOT in git** - Only stored in Vercel environment variables  
✅ **Documentation uses placeholders** - No actual secrets in docs  
✅ **Code reads from environment** - No hardcoded secrets

---

**After updating Vercel, the webhook will work with the new secret!**

