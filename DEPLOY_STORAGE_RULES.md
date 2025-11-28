# Deploy Firebase Storage Rules - URGENT

## Problem
You're getting "Permission denied" errors when uploading images to events. This is because the Firebase Storage security rules haven't been deployed yet.

## Quick Fix (Choose One Method)

### Method 1: Firebase Console (Easiest - No CLI needed)

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com/
   - Select your project: `gopopera2026`

2. **Navigate to Storage:**
   - Click **Storage** in the left sidebar
   - Click the **Rules** tab

3. **Copy and Paste Rules:**
   - Open the file `storage.rules` in this project
   - Copy ALL the contents
   - Paste into the Firebase Console rules editor

4. **Publish:**
   - Click **Publish** button
   - Wait for confirmation

5. **Test:**
   - Try uploading an image to an event
   - Should work immediately!

### Method 2: Firebase CLI (If you have it installed)

```bash
# Make sure you're in the project directory
cd "/Users/kevin-koudbilapierre/Desktop/Cursor files/popera"

# Deploy storage rules
firebase deploy --only storage
```

## What These Rules Do

✅ **Allow authenticated users to upload images to their own event folders**
- Path: `events/{userId}/{imageName}`
- Users can only upload to their own folder (`events/their-user-id/...`)

✅ **Allow users to upload/delete their own profile pictures**
- Path: `users/{userId}/{imageName}`

✅ **Allow authenticated users to upload chat images**
- Path: `chat/{eventId}/{userId}/{imageName}`

✅ **Public read access** - Anyone can view images

❌ **Deny all other paths** - Security by default

## Verification

After deploying, the rules should look like this in Firebase Console:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // ... (your rules here)
  }
}
```

## Important Notes

- **Rules take effect immediately** after publishing
- **No database changes needed** - this is only about Storage permissions
- **All existing images remain accessible** - rules don't affect existing files
- **Users can only upload to their own folders** - this is by design for security

## Still Having Issues?

If you still get permission errors after deploying:

1. **Check you're logged in** - Rules require authentication
2. **Check the user ID matches** - Path must be `events/YOUR-USER-ID/...`
3. **Check Firebase project** - Make sure you're using the correct project
4. **Clear browser cache** - Sometimes helps with auth issues

## Support

If problems persist, check:
- Firebase Console → Storage → Rules tab (should show your deployed rules)
- Browser console for detailed error messages
- Network tab to see the exact Firebase request

