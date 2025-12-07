# Twilio SMS Setup - Complete Implementation

## ✅ Changes Applied

### 1. Created Serverless Function
- **File**: `/server/send-sms.ts`
- **Purpose**: Sends SMS via Twilio API (server-side, secure)
- **Pattern**: Follows same pattern as `/server/send-email.ts`

### 2. Updated SMS Client Code
- **File**: `utils/smsNotifications.ts`
- **Changes**: 
  - Removed mock SMS code
  - Now calls serverless function at `/server/send-sms`
  - Keeps all Twilio credentials server-side
  - Maintains Firestore logging

### 3. Routing
- **Endpoint**: `/server/send-sms`
- **Vercel**: Automatically routes `/server/*` to serverless functions
- **No config needed**: Same pattern as email function

---

## 🔑 Next Steps: Set Environment Variables

### In Vercel Dashboard

1. Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**
2. Add these **3 variables** (DO NOT use `VITE_` prefix - these are server-only):

```bash
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER=YOUR_TWILIO_PHONE_NUMBER
```

### How to Find Your Twilio Credentials

From your Twilio Dashboard (the page you showed):

1. **Account SID**: 
   - Look at the top right of your Twilio Console
   - Or go to: Dashboard → Account Info → Account SID
   - Format: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

2. **Auth Token**:
   - Same page as Account SID
   - Click "Show" or "View" to reveal
   - Keep this secret!

3. **Phone Number**:
   - From your dashboard: Go to Phone Numbers → Manage → Active Numbers
   - Format: `+1234567890` (E.164 format)

---

## 📋 Environment Variables Checklist

### Already Set (Email):
- ✅ `RESEND_API_KEY`
- ✅ `RESEND_FROM`

### Need to Add (SMS):
- ⏳ `TWILIO_ACCOUNT_SID` ← **Add this**
- ⏳ `TWILIO_AUTH_TOKEN` ← **Add this**
- ⏳ `TWILIO_PHONE_NUMBER` ← **Add this** (your Twilio phone number in E.164 format)

---

## 🧪 Testing After Deployment

### 1. Test Serverless Function Directly

After deploying, test the endpoint:

```bash
curl -X POST https://your-domain.com/server/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "Test SMS from Popera!"
  }'
```

Replace `+1234567890` with your phone number (with country code).

### 2. Test in App

1. **Enable SMS for a user**:
   - Go to user profile → Notification Settings
   - Enable "SMS Notifications"
   - Ensure user has verified phone number

2. **Trigger SMS notification**:
   - Send a message in group chat
   - Create an announcement
   - Create a poll
   - Follow a host (they create new event)

3. **Check logs**:
   - Browser console: Look for `[SMS] ✅ SMS sent successfully`
   - Firestore: Check `sms_logs` collection
   - Vercel: Check Function Logs for `/server/send-sms`

---

## 🔍 Verification Steps

### After Setting Environment Variables:

1. **Deploy to Vercel**
   ```bash
   git add server/send-sms.ts utils/smsNotifications.ts
   git commit -m "Add Twilio SMS via serverless function"
   git push
   ```

2. **Check Vercel Function Logs**:
   - Vercel Dashboard → Your Project → Functions tab
   - Look for `/server/send-sms` function
   - Check for errors or successful sends

3. **Check Firestore Logs**:
   - Firebase Console → Firestore Database
   - Navigate to `sms_logs` collection
   - Verify logs show `status: 'sent'` with real `messageId` (not `mock_`)

4. **Test with Real Phone**:
   - Use your phone number in E.164 format (e.g., `+1234567890`)
   - Send a test message
   - Check your phone for SMS

---

## 📊 SMS Notification Triggers

SMS will be sent for:

1. **New Messages** (if enabled):
   - When someone sends a message in group chat
   - Only if user has `sms_opt_in: true`
   - Only if user has verified phone number

2. **Announcements**:
   - When host creates announcement
   - Sent to all event attendees

3. **Polls**:
   - When host creates poll
   - Sent to all event attendees

4. **New Events**:
   - When followed host creates new event
   - Sent to followers

---

## 🛠️ Troubleshooting

### SMS Not Sending?

1. **Check Environment Variables**:
   - Verify all 3 Twilio vars are set in Vercel
   - Make sure NO `VITE_` prefix (server-only vars)

2. **Check Vercel Function Logs**:
   - Look for errors in `/server/send-sms` function
   - Check for "Twilio not configured" errors

3. **Check User Preferences**:
   - User must have `sms_opt_in: true`
   - User must have verified phone number
   - Phone number must be in E.164 format (`+1234567890`)

4. **Check Twilio Trial Limits**:
   - Trial accounts can only send to verified numbers
   - Upgrade Twilio account for production use

### Function Returns 500 Error?

- Check Vercel logs for specific error
- Verify Twilio credentials are correct
- Verify phone number format is E.164

### SMS Logs Show "skipped"?

- Check if Twilio env vars are set
- Check if phone number is valid
- Check user notification preferences

---

## 💰 Twilio Pricing

- **Trial Account**: Free credits for testing (limited to verified numbers)
- **Production**: ~$0.0075 per SMS in US/Canada
- **First $20 free**: New accounts get $20 credit

**Cost Estimate**:
- 1,000 SMS = ~$7.50
- 10,000 SMS = ~$75

---

## ✅ Summary

- ✅ Serverless function created: `/server/send-sms.ts`
- ✅ Client code updated: `utils/smsNotifications.ts`
- ✅ Security: All credentials server-side
- ✅ Logging: All SMS attempts logged to Firestore
- ✅ Pattern: Matches your email setup exactly

**Next**: Add environment variables in Vercel and deploy!

---

## 🚀 Quick Deploy Checklist

- [ ] Get Twilio Account SID from dashboard
- [ ] Get Twilio Auth Token from dashboard  
- [ ] Note Twilio Phone Number (from Twilio Console)
- [ ] Add 3 environment variables to Vercel
- [ ] Commit and push code changes
- [ ] Wait for Vercel deployment
- [ ] Test SMS with curl or in-app
- [ ] Verify SMS received on phone
- [ ] Check Firestore logs for confirmation

Ready to go! 🎉

