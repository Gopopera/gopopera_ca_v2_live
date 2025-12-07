# SMS Setup - Final Steps & Testing Guide

## ✅ Code Changes Complete

All code changes have been applied:
- ✅ `/server/send-sms.ts` - Serverless function created
- ✅ `utils/smsNotifications.ts` - Updated to call serverless function
- ✅ All Twilio credentials stay server-side (secure)

---

## 🔑 CRITICAL: Add Environment Variables to Vercel

**Important**: The credentials in the markdown file are just for reference. You MUST add them to Vercel's environment variables for them to work.

### Steps:

1. **Go to Vercel Dashboard**:
   - https://vercel.com/dashboard
   - Select your project
   - Go to **Settings** → **Environment Variables**

2. **Add these 3 variables** (one at a time):

   ```
   Name: TWILIO_ACCOUNT_SID
   Value: YOUR_TWILIO_ACCOUNT_SID
   Environment: Production, Preview, Development (select all)
   ```

   ```
   Name: TWILIO_AUTH_TOKEN
   Value: YOUR_TWILIO_AUTH_TOKEN
   Environment: Production, Preview, Development (select all)
   ```

   ```
   Name: TWILIO_PHONE_NUMBER
   Value: YOUR_TWILIO_PHONE_NUMBER
   Environment: Production, Preview, Development (select all)
   ```

3. **Click "Save"** for each variable

4. **Redeploy** your application (Vercel will auto-deploy, or trigger a new deployment)

---

## 🧪 Testing Guide

### Step 1: Verify Environment Variables

After deployment, check Vercel logs:

1. Go to Vercel Dashboard → Your Project → **Functions** tab
2. Look for `/server/send-sms` function
3. If you see "Twilio not configured" errors, the env vars aren't set correctly

### Step 2: Test with Twilio Trial Account

**Important**: Twilio trial accounts can only send SMS to **verified phone numbers**.

#### Verify Your Phone Number in Twilio:

1. Go to Twilio Console → **Phone Numbers** → **Manage** → **Verified Caller IDs**
2. Click **Add a new Caller ID**
3. Enter your phone number (e.g., `+1234567890`)
4. Twilio will send a verification code via SMS/voice
5. Enter the code to verify

Once verified, you can send SMS to that number!

### Step 3: Test SMS Function

#### Option A: Test via Browser Console

1. Open your app in browser
2. Open Developer Console (F12)
3. Run this command:

```javascript
fetch('/server/send-sms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+YOUR_PHONE_NUMBER', // Replace with your verified number
    message: 'Test SMS from Popera! 🎉'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

Replace `+YOUR_PHONE_NUMBER` with your verified phone number (E.164 format: `+1234567890`).

#### Option B: Test via Terminal (after deployment)

```bash
curl -X POST https://your-domain.com/server/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+YOUR_PHONE_NUMBER",
    "message": "Test SMS from Popera!"
  }'
```

### Step 4: Test In-App SMS Notifications

1. **Enable SMS for a test user**:
   - User must have a verified phone number in their profile
   - User must have `sms_opt_in: true` in notification settings
   - Phone number must be in E.164 format (`+1234567890`)

2. **Trigger a notification**:
   - Send a message in group chat
   - Create an announcement (as host)
   - Create a poll (as host)

3. **Check for SMS**:
   - Check your phone for the SMS
   - Check browser console for `[SMS] ✅ SMS sent successfully`
   - Check Firestore `sms_logs` collection

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Environment variables added to Vercel (all 3)
- [ ] Vercel deployment completed successfully
- [ ] Phone number verified in Twilio Console
- [ ] Test SMS sent successfully
- [ ] SMS received on phone
- [ ] Firestore `sms_logs` collection shows `status: 'sent'`
- [ ] Vercel Function Logs show successful sends

---

## 🚨 Common Issues & Solutions

### Issue: "Twilio not configured" error

**Solution**: 
- Verify all 3 environment variables are set in Vercel
- Make sure NO `VITE_` prefix (server-only variables)
- Redeploy after adding variables

### Issue: "Trial accounts can only send SMS to verified numbers"

**Solution**: 
- Verify your phone number in Twilio Console
- Go to: Phone Numbers → Manage → Verified Caller IDs
- Add and verify your phone number

### Issue: SMS not received

**Check**:
1. Phone number format (must be E.164: `+1234567890`)
2. Phone number is verified in Twilio
3. User has `sms_opt_in: true`
4. Check Vercel Function Logs for errors
5. Check Firestore `sms_logs` for status

### Issue: Function returns 500 error

**Check**:
- Vercel Function Logs for specific error
- Verify Twilio credentials are correct
- Verify phone number format
- Check Twilio account status (not suspended)

---

## 📊 Monitoring SMS Usage

### Check Vercel Function Logs:
- Vercel Dashboard → Your Project → Functions → `/server/send-sms`
- See all SMS send attempts
- Check for errors

### Check Firestore Logs:
- Firebase Console → Firestore Database → `sms_logs` collection
- See all SMS attempts with status
- Filter by `status: 'sent'` or `status: 'failed'`

### Check Twilio Usage:
- Twilio Console → Monitor → Logs → Messaging
- See all SMS sent via Twilio
- Check delivery status

---

## 🎯 What Happens When SMS is Sent

1. **User triggers notification** (e.g., sends message in chat)
2. **App checks user preferences** (`sms_opt_in: true`, verified phone)
3. **App calls** `sendSMSNotification()` from `utils/smsNotifications.ts`
4. **Client code calls** `/server/send-sms` serverless function
5. **Serverless function** sends SMS via Twilio API
6. **Twilio sends** SMS to user's phone
7. **Logs created** in Firestore `sms_logs` collection
8. **User receives** SMS on their phone

---

## ✅ Final Verification

Run through this checklist:

1. ✅ Code deployed to Vercel
2. ✅ Environment variables set in Vercel (all 3)
3. ✅ Phone number verified in Twilio
4. ✅ Test SMS sent successfully
5. ✅ SMS received on phone
6. ✅ In-app notifications working (send message in chat)

---

## 🚀 You're All Set!

SMS notifications are now fully configured and ready to use. After you:
1. Add environment variables to Vercel
2. Verify your phone number in Twilio
3. Deploy (or redeploy)

Your SMS notifications will work automatically for:
- ✅ New messages in group chat
- ✅ Announcements from hosts
- ✅ Polls from hosts  
- ✅ New events from followed hosts

Happy testing! 🎉

