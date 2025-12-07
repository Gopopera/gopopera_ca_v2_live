# ✅ Twilio SMS Setup - COMPLETE

## 🎉 Setup Status

All code changes have been applied and are ready for deployment!

### ✅ What's Done

1. **Serverless Function Created** (`/server/send-sms.ts`)
   - Secure server-side SMS sending via Twilio
   - Follows same pattern as email function
   - All API keys stay server-side

2. **Client Code Updated** (`utils/smsNotifications.ts`)
   - Removed mock SMS code
   - Now calls `/server/send-sms` serverless function
   - Maintains Firestore logging

3. **Integration Points**
   - ✅ New messages in group chat
   - ✅ Announcements from hosts
   - ✅ Polls from hosts
   - ✅ New events from followed hosts

---

## 🔑 REQUIRED: Add Environment Variables to Vercel

**You've added the credentials to the markdown file, but they MUST be added to Vercel's environment variables to work!**

### Step-by-Step:

1. **Go to Vercel Dashboard**:
   - Visit: https://vercel.com/dashboard
   - Click on your **Popera project**
   - Navigate to: **Settings** → **Environment Variables**

2. **Add These 3 Variables** (one at a time):

   **Variable 1:**
   - **Name**: `TWILIO_ACCOUNT_SID`
   - **Value**: `YOUR_TWILIO_ACCOUNT_SID` (from Twilio Console)
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
   - Click **Save**

   **Variable 2:**
   - **Name**: `TWILIO_AUTH_TOKEN`
   - **Value**: `YOUR_TWILIO_AUTH_TOKEN` (from Twilio Console)
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
   - Click **Save**

   **Variable 3:**
   - **Name**: `TWILIO_PHONE_NUMBER`
   - **Value**: `YOUR_TWILIO_PHONE_NUMBER` (e.g., +1234567890)
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
   - Click **Save**

3. **Redeploy**:
   - After adding all 3 variables, Vercel will prompt you to redeploy
   - Or manually trigger a new deployment from the Deployments tab
   - **Important**: Environment variables only take effect after redeployment

---

## 📱 Verify Phone Number in Twilio (CRITICAL)

**Twilio trial accounts can only send SMS to verified phone numbers!**

### Steps:

1. **Go to Twilio Console**:
   - Visit: https://console.twilio.com
   - Navigate to: **Phone Numbers** → **Manage** → **Verified Caller IDs**

2. **Add Your Phone Number**:
   - Click **Add a new Caller ID**
   - Enter your phone number in E.164 format (e.g., `+1234567890`)
   - Select verification method (SMS or Voice call)
   - Enter the verification code when received
   - Click **Verify**

3. **Repeat for Test Numbers**:
   - Add any phone numbers you want to test with
   - Only verified numbers will receive SMS on trial accounts

---

## 🧪 Testing Checklist

### After Deployment:

- [ ] Environment variables added to Vercel (all 3)
- [ ] Vercel deployment completed successfully
- [ ] Phone number verified in Twilio Console
- [ ] Test SMS sent successfully
- [ ] SMS received on phone
- [ ] Firestore `sms_logs` shows `status: 'sent'`
- [ ] Vercel Function Logs show successful sends

### Quick Test (Browser Console):

After deployment, open your app and run in browser console:

```javascript
fetch('/server/send-sms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+YOUR_VERIFIED_PHONE', // Replace with your verified number
    message: 'Test SMS from Popera! 🎉'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Expected Response:**
```json
{
  "success": true,
  "messageId": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

---

## 📊 Where SMS is Triggered

SMS notifications will automatically be sent when:

1. **New Message in Group Chat**
   - User sends a message in event group chat
   - Recipients with SMS enabled receive notification
   - Only if `sms_opt_in: true` and phone verified

2. **Host Creates Announcement**
   - Host creates announcement in group chat
   - All attendees with SMS enabled receive notification

3. **Host Creates Poll**
   - Host creates poll in group chat
   - All attendees with SMS enabled receive notification

4. **New Event from Followed Host**
   - Host that user follows creates new event
   - Follower receives SMS notification

**Note**: SMS is only sent if:
- User has `sms_opt_in: true` in their notification preferences
- User has a verified phone number in their profile
- Phone number is in E.164 format (`+1234567890`)

---

## 🔍 Monitoring & Debugging

### Check Vercel Function Logs:
1. Vercel Dashboard → Your Project → **Functions** tab
2. Click on `/server/send-sms`
3. View all SMS send attempts and errors

### Check Firestore Logs:
1. Firebase Console → Firestore Database
2. Navigate to `sms_logs` collection
3. See all SMS attempts with status, errors, and message IDs

### Check Twilio Logs:
1. Twilio Console → **Monitor** → **Logs** → **Messaging**
2. See all SMS sent via Twilio API
3. Check delivery status and errors

---

## 🚨 Troubleshooting

### "Twilio not configured" error:
- ✅ Verify all 3 environment variables are set in Vercel
- ✅ Make sure NO `VITE_` prefix (server-only variables)
- ✅ Redeploy after adding variables

### "Trial accounts can only send SMS to verified numbers":
- ✅ Verify phone number in Twilio Console
- ✅ Go to: Phone Numbers → Manage → Verified Caller IDs
- ✅ Add and verify your phone number

### SMS not received:
- ✅ Check phone number format (must be E.164: `+1234567890`)
- ✅ Verify phone number in Twilio Console
- ✅ Check user has `sms_opt_in: true`
- ✅ Check Vercel Function Logs for errors
- ✅ Check Firestore `sms_logs` for status

### Function returns 500 error:
- ✅ Check Vercel Function Logs for specific error
- ✅ Verify Twilio credentials are correct
- ✅ Verify phone number format is E.164
- ✅ Check Twilio account status (not suspended)

---

## 💰 Twilio Pricing

- **Trial Account**: Free credits for testing (limited to verified numbers)
- **Production**: ~$0.0075 per SMS in US/Canada
- **First $20 free**: New accounts get $20 credit

**Cost Estimate**:
- 1,000 SMS = ~$7.50
- 10,000 SMS = ~$75

---

## ✅ Final Checklist

Before considering setup complete:

- [ ] Code committed to git
- [ ] Code pushed to repository
- [ ] Environment variables added to Vercel (all 3)
- [ ] Vercel deployment completed
- [ ] Phone number verified in Twilio
- [ ] Test SMS sent successfully
- [ ] SMS received on phone
- [ ] Firestore logs showing successful sends
- [ ] Vercel Function Logs showing no errors

---

## 🚀 Next Steps

1. **Add environment variables to Vercel** (see above)
2. **Verify phone number in Twilio** (see above)
3. **Deploy/Redeploy** your application
4. **Test SMS** using browser console or in-app
5. **Monitor** Firestore and Vercel logs

Once these steps are complete, SMS notifications will work automatically! 🎉

---

## 📝 Summary

- ✅ All code changes complete
- ✅ Serverless function ready
- ✅ Client integration ready
- ⏳ **Next**: Add environment variables to Vercel
- ⏳ **Next**: Verify phone number in Twilio
- ⏳ **Next**: Deploy and test

You're almost there! Just need to add the environment variables and verify your phone number. 🚀

