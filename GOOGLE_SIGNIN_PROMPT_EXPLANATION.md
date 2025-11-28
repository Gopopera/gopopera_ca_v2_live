# Changing Google Sign-In Prompt Text

## Current Behavior
When users sign in with Google, they see:
**"Choose an account to continue to gopopera2026.firebaseapp.com"**

## What You Want
Change it to show:
**"Choose an account to continue to Popera"**

## Where to Change This

### Option 1: OAuth Consent Screen (Recommended)
This is the **primary** place to control what users see during Google sign-in.

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project: **gopopera2026**
3. Navigate to: **APIs & Services** → **OAuth consent screen**
4. Under **App name**, change it to: **Popera**
5. Under **App domain**, you can also customize:
   - **Application home page**: Your website URL (e.g., `https://www.gopopera.ca`)
   - **Application privacy policy link**: Your privacy policy URL
   - **Application terms of service link**: Your terms of service URL
6. Click **Save**

**Note:** The domain shown (`gopopera2026.firebaseapp.com`) is your Firebase Auth domain and cannot be changed. However, the app name ("Popera") will appear more prominently.

### Option 2: Firebase Project Display Name
This affects how your project appears in Firebase Console, but may also influence the sign-in prompt.

**Steps:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **gopopera2026**
3. Click the **gear icon** (⚙️) next to "Project Overview"
4. Select **Project settings**
5. Under **General** tab, find **Project name**
6. Change it to: **Popera**
7. Click **Save**

## Important Notes

### What Changes in Code?
**NO CODE CHANGES NEEDED** - This is purely a Firebase/Google Cloud Console configuration change.

The `authDomain` in your Firebase config (`gopopera2026.firebaseapp.com`) is the Firebase Auth domain and **cannot be changed**. This is a Firebase-managed domain.

However, the **app name** shown in the OAuth consent screen can be changed to "Popera", which will make it more prominent in the sign-in flow.

### What Users Will See
After making these changes:
- The OAuth consent screen will show **"Popera"** as the app name
- The domain (`gopopera2026.firebaseapp.com`) will still appear but less prominently
- The overall experience will be more branded to "Popera"

### Verification
After making changes:
1. Wait a few minutes for changes to propagate
2. Clear your browser cache
3. Try signing in with Google again
4. You should see "Popera" more prominently displayed

## Can You Hide the Domain?

### Short Answer
**You cannot completely hide the domain**, but you can **replace it with your own custom domain** (e.g., `auth.gopopera.ca` instead of `gopopera2026.firebaseapp.com`).

### Option: Use a Custom Domain for Firebase Auth

Firebase supports custom domains for Authentication, which will replace the `firebaseapp.com` domain in the OAuth consent screen.

**Steps to Set Up Custom Domain:**

1. **In Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: **gopopera2026**
   - Navigate to: **Authentication** → **Settings** → **Authorized domains**
   - Click **Add domain**
   - Enter your custom domain (e.g., `auth.gopopera.ca` or `auth.gopopera.com`)

2. **Domain Verification:**
   - Firebase will provide DNS records you need to add to your domain
   - Add the TXT record to your domain's DNS settings
   - Wait for verification (can take a few minutes to 24 hours)

3. **Update Your Code:**
   - Once verified, update your `.env` file:
     ```
     VITE_FIREBASE_AUTH_DOMAIN=auth.gopopera.ca
     ```
   - Or keep using `gopopera2026.firebaseapp.com` - Firebase will automatically use the custom domain if configured

4. **OAuth Consent Screen:**
   - The custom domain will now appear instead of `gopopera2026.firebaseapp.com`
   - Users will see: "Choose an account to continue to **auth.gopopera.ca**" (or your custom domain)

### Important Notes

- **Domain Requirements:**
  - You must own the domain
  - You need access to DNS settings
  - The domain must be verified with Firebase

- **What You'll See:**
  - Instead of: `gopopera2026.firebaseapp.com`
  - You'll see: Your custom domain (e.g., `auth.gopopera.ca`)

- **Limitations:**
  - You cannot completely remove the domain from the prompt
  - Google requires showing a domain for security/verification purposes
  - The app name ("Popera") will be more prominent, but the domain will still appear

### Alternative: Use Your Main Domain

If you want to use your main website domain:
- You can use `auth.gopopera.ca` or `auth.gopopera.com`
- This makes it look more professional and branded
- Users will see your branded domain instead of the Firebase domain

## Summary
- **Where**: Google Cloud Console → OAuth consent screen
- **What to change**: App name to "Popera" ✅ (You've done this)
- **Domain**: Can be customized with Firebase custom domain feature
- **Code changes**: Update `VITE_FIREBASE_AUTH_DOMAIN` in `.env` after setting up custom domain
- **Cannot completely hide**: Google requires showing a domain for security

