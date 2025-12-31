# Marketing Hub Setup Guide

The Marketing Hub is an admin-only dashboard for sending mass emails to Popera users via Resend.

## Access

- **URL**: `/marketinghub`
- **Admin Only**: Restricted to `eatezca@gmail.com`

## Features

1. **Campaign Composer**: Create marketing emails with live mobile preview
2. **Theme Options**: Popera Dark, Popera Light, or Minimal themes
3. **Markdown Support**: Write content in markdown with auto-conversion to HTML
4. **Hero Images**: Optional hero image with alt text
5. **CTA Buttons**: Add call-to-action buttons
6. **Audience Segmentation**: Target all users, hosts only, or attendees only
7. **Test Emails**: Send test email to admin before bulk send
8. **Campaign History**: View and edit past campaigns
9. **Unsubscribe Links**: Auto-generated personalized unsubscribe links

## Environment Variables Required

Add these to your Vercel environment variables:

```bash
# Resend API Key (required)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Sender address (optional, defaults to support@gopopera.ca)
RESEND_FROM=support@gopopera.ca

# Firebase Admin SDK (choose one method)
# Method 1: Full JSON (recommended)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"gopopera2026",...}'

# Method 2: Individual values
FIREBASE_PROJECT_ID=gopopera2026
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@gopopera2026.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxxxxxx\n-----END PRIVATE KEY-----\n"

# Unsubscribe token secret (optional, adds extra security)
UNSUBSCRIBE_SECRET=your-random-secret-string

# App URL for unsubscribe links
VITE_APP_URL=https://gopopera.ca
```

## API Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/marketing/recipients-count` | POST | Get recipient count for audience | Admin token |
| `/api/marketing/test-send` | POST | Send test email to admin | Admin token |
| `/api/marketing/send-bulk` | POST | Send campaign to all recipients | Admin token |
| `/api/marketing/unsubscribe` | POST | Process unsubscribe request | Token verified |

## Firestore Collections

The Marketing Hub uses these Firestore collections:

### `marketing_campaigns`
Stores saved campaign drafts and history.
```typescript
{
  campaignName: string;
  subject: string;
  preheader?: string;
  theme: 'dark' | 'light' | 'minimal';
  density: 'compact' | 'normal';
  heroImageUrl?: string;
  heroAlt?: string;
  markdownBody: string;
  ctaText?: string;
  ctaUrl?: string;
  audience: 'all' | 'hosts' | 'attendees';
  status: 'draft' | 'sending' | 'sent' | 'failed';
  recipientCount?: number;
  sentCount?: number;
  failedCount?: number;
  createdByEmail: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sentAt?: number;
}
```

### `marketing_campaigns_log`
Detailed logs of each campaign send.
```typescript
{
  campaignId?: string;
  subject: string;
  audience: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  status: 'sending' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  adminEmail: string;
}
```

### `email_unsubscribes`
Records of users who unsubscribed.
```typescript
{
  userId: string;
  email: string;
  timestamp: number;
  source: 'marketing_email';
}
```

## User Consent

The Marketing Hub respects user email preferences:

- Only sends to users where `notification_settings.email_opt_in !== false`
- When users unsubscribe, their profile is updated:
  - `notification_settings.email_opt_in = false`
  - `unsubscribedAt = timestamp`

## Rate Limiting

- **Bulk sends**: 50 emails per batch with 1 second delay between batches
- **Transactional API**: 10 emails per IP per minute

## CASL Compliance Notes

1. ✅ **Consent tracking**: Respects `email_opt_in` preference
2. ✅ **Unsubscribe mechanism**: One-click unsubscribe in every email
3. ✅ **Sender identification**: Clear "Popera" branding in emails
4. ⚠️ **Consider adding**: Explicit marketing consent checkbox at signup

## Security

- Admin access verified via Firebase Auth ID token
- Unsubscribe tokens are cryptographically generated
- API keys are server-side only (not exposed to client)
- Rate limiting prevents abuse

## Testing Checklist

- [ ] Navigate to `/marketinghub` as admin
- [ ] Compose a test campaign
- [ ] Verify mobile preview renders correctly
- [ ] Send test email to admin
- [ ] Check test email arrives in inbox
- [ ] Verify unsubscribe link works
- [ ] Send small campaign (limit audience first)
- [ ] Check `email_logs` collection for send records

---

## Validation Checklist (Admin Auth Flow)

Use this checklist to diagnose "403 Access denied" errors:

### 1. Verify Admin Token is Being Sent

**Browser Console**:
```
[MarketingHub] Getting token for: eatezca@gmail.com
[MarketingHub] Token obtained, length: 1234
[MarketingHub] Sending test email, auth token obtained
```

**DevTools → Network → test-send request → Headers**:
- Request Headers should include: `Authorization: Bearer eyJhbGci...` (long JWT)

### 2. Expected Responses

**Success (admin):**
```json
{ "success": true, "messageId": "xxxxx-yyyy-zzzz" }
```

**403 (non-admin or token issues):**
```json
{ "success": false, "error": "Access denied - admin auth required" }
```

### 3. Vercel Logs Debug Lines

Go to **Vercel Dashboard → Project → Logs** and search for `[Test Send]`:

```
[Test Send] === REQUEST START ===
[Test Send] Headers received: { hasAuth: true, authPrefix: "Bearer eyJhbGc..." }
[Test Send] verifyAdminToken called, hasHeader: true
[Test Send] Env check: { hasProjectId: true, hasClientEmail: true, hasPrivateKey: true, privateKeyLength: 1704 }
[Test Send] Firebase Admin initialized successfully
[Test Send] Token extracted, length: 1234
[Test Send] Token verified successfully: { uid: "xxx", email: "eatezca@gmail.com", aud: "gopopera2026", iss: "..." }
[Test Send] Email check: { tokenEmail: "eatezca@gmail.com", adminEmail: "eatezca@gmail.com", matches: true }
[Test Send] Admin verified: eatezca@gmail.com
[Test Send] Sending email to: eatezca@gmail.com
[Test Send] === SUCCESS === messageId: ...
```

### 4. Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `hasClientEmail: false` | Missing `FIREBASE_CLIENT_EMAIL` in Vercel | Add env var |
| `hasPrivateKey: false` | Missing `FIREBASE_PRIVATE_KEY` in Vercel | Add env var |
| `privateKeyLength: 0` | Private key not properly formatted | Use full JSON or escape newlines |
| `verifyIdToken FAILED: code=auth/argument-error` | Malformed private key | Re-download service account JSON |
| `verifyIdToken FAILED: code=auth/invalid-credential` | Wrong project or expired key | Regenerate service account key |
| `ACCESS DENIED - email mismatch` | Logged in with wrong account | Sign out and sign in as admin |

