# Mobile Debugging Guide

## Viewing Console Logs on Your Phone

### iOS Safari (iPhone/iPad)

**Requirements:**
- Mac computer
- iPhone/iPad connected via USB
- Safari browser on Mac

**Steps:**
1. On your iPhone/iPad:
   - Go to Settings → Safari → Advanced
   - Enable "Web Inspector"

2. On your Mac:
   - Open Safari
   - Go to Safari → Settings → Advanced
   - Enable "Show Develop menu in menu bar"

3. Connect your iPhone to Mac via USB

4. On your iPhone:
   - Open Safari and navigate to your app
   - Start the login flow

5. On your Mac:
   - In Safari, go to Develop menu
   - Select your iPhone name → Your app URL
   - Safari DevTools will open showing console logs

**Alternative (Wireless):**
- Connect iPhone and Mac to same WiFi
- On iPhone: Settings → Safari → Advanced → Web Inspector
- On Mac Safari: Develop menu → [Your iPhone] → [Your app]

---

### Android Chrome

**Requirements:**
- Computer with Chrome browser
- Android phone connected via USB
- USB debugging enabled on phone

**Steps:**
1. On your Android phone:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times to enable Developer Options
   - Go to Settings → Developer Options
   - Enable "USB Debugging"

2. Connect phone to computer via USB

3. On your computer:
   - Open Chrome
   - Navigate to `chrome://inspect`
   - Check "Discover USB devices"
   - Your phone should appear in the list

4. On your phone:
   - Open Chrome and navigate to your app
   - Start the login flow

5. On your computer:
   - Click "Inspect" next to your phone in chrome://inspect
   - Chrome DevTools will open showing console logs

**Alternative (Wireless):**
- Connect phone and computer to same WiFi
- On phone: Chrome → Settings → Developer Tools → Remote Debugging
- On computer: chrome://inspect → "Port forwarding" → Add port

---

## Option 2: Visual Debug Panel (Easier for Quick Testing)

I can add a visual debug panel that shows logs directly on your phone screen. This is easier than remote debugging but less detailed.

Would you like me to add this?

---

## Option 3: Send Logs to Firestore

I can modify the monitoring script to send all console logs to Firestore so you can view them in the Firebase Console.

Would you like me to add this?

---

## Quick Test: Alert-Based Debugging

For immediate testing, I can add temporary `alert()` calls at key points in the login flow so you can see what's happening without any setup.

Would you like me to add this temporarily?

