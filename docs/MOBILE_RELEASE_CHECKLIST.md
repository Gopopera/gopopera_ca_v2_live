# Popera Mobile Release Checklist

## ✅ Phase A: Capacitor Setup (COMPLETE)

- [x] Install Capacitor dependencies
- [x] Create `capacitor.config.ts`
- [x] Add iOS platform (`npx cap add ios`)
- [x] Add Android platform (`npx cap add android`)
- [x] Add mobile npm scripts
- [x] Update Firebase auth for native (redirect-only)
- [x] Gate localhost debug calls for native
- [x] Add iOS permissions (camera, photos, location)
- [x] Add Android permissions (camera, storage, location)
- [x] Create iOS Privacy Manifest

---

## 🔥 Phase B: Firebase Cross-Platform Setup

### iOS Firebase Registration
- [ ] Go to [Firebase Console](https://console.firebase.google.com) → Project `gopopera2028`
- [ ] Click gear icon → Project Settings → Add app → iOS
- [ ] Bundle ID: `ca.gopopera.app`
- [ ] App nickname: `Popera iOS`
- [ ] Download `GoogleService-Info.plist`
- [ ] Open Xcode: `npm run mobile:ios`
- [ ] Drag `GoogleService-Info.plist` into `ios/App/App/` folder
- [ ] When prompted, select "Copy items if needed" and target `App`

### Android Firebase Registration
- [ ] In Firebase Console → Add app → Android
- [ ] Package name: `ca.gopopera.app`
- [ ] App nickname: `Popera Android`
- [ ] Download `google-services.json`
- [ ] Place file at: `android/app/google-services.json`

### Google Sign-In URL Scheme (iOS)
After adding `GoogleService-Info.plist`:
1. [ ] Open `GoogleService-Info.plist` and find `REVERSED_CLIENT_ID` value
2. [ ] In Xcode: select App target → Info → URL Types
3. [ ] Click `+` to add new URL Type
4. [ ] URL Schemes: paste the `REVERSED_CLIENT_ID` value
5. [ ] Identifier: `com.google.firebase.auth`

---

## 🍎 Phase C: iOS App Store Submission

### Apple Developer Portal
- [ ] Log in to [Apple Developer](https://developer.apple.com)
- [ ] Identifiers → Register new App ID
- [ ] Bundle ID: `ca.gopopera.app`
- [ ] Enable capabilities: Sign in with Apple, Push Notifications (if needed)

### App Icons (Required)
Create icons at these sizes and place in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`:

| Size | Scale | Filename | Usage |
|------|-------|----------|-------|
| 20pt | 2x | `icon-40.png` | Notification |
| 20pt | 3x | `icon-60.png` | Notification |
| 29pt | 2x | `icon-58.png` | Settings |
| 29pt | 3x | `icon-87.png` | Settings |
| 40pt | 2x | `icon-80.png` | Spotlight |
| 40pt | 3x | `icon-120.png` | Spotlight |
| 60pt | 2x | `icon-120.png` | App |
| 60pt | 3x | `icon-180.png` | App |
| 1024pt | 1x | `icon-1024.png` | App Store |

Tool recommendation: [App Icon Generator](https://appicon.co/)

### Launch Screen
- [ ] Update `ios/App/App/Base.lproj/LaunchScreen.storyboard`
- [ ] Add Popera logo image to assets
- [ ] Set background color to `#15383c`

### Sign in with Apple (REQUIRED)
Since the app offers Google Sign-In, Apple requires Sign in with Apple:
- [ ] Enable "Sign in with Apple" capability in Xcode
- [ ] Add Sign in with Apple button to auth flow
- [ ] Implement using `@capacitor-firebase/authentication` or native plugin

### App Store Connect
- [ ] Create new app in [App Store Connect](https://appstoreconnect.apple.com)
- [ ] Bundle ID: `ca.gopopera.app`
- [ ] Primary Language: English
- [ ] Add Privacy Policy URL (required)
- [ ] Add screenshots for each device size
- [ ] Complete App Information
- [ ] Set up pricing (Free)

### Xcode Archive & Upload
```bash
# Build production web assets
npm run build

# Sync to native
npx cap sync ios

# Open Xcode
npm run mobile:ios
```

In Xcode:
1. [ ] Select "Any iOS Device (arm64)" as build target
2. [ ] Product → Archive
3. [ ] Distribute App → App Store Connect
4. [ ] Upload

---

## 🤖 Phase C: Google Play Store Submission

### Adaptive Icons
Create and place in appropriate `mipmap-*` folders:

| Density | Size | Path |
|---------|------|------|
| mdpi | 48x48 | `android/app/src/main/res/mipmap-mdpi/` |
| hdpi | 72x72 | `android/app/src/main/res/mipmap-hdpi/` |
| xhdpi | 96x96 | `android/app/src/main/res/mipmap-xhdpi/` |
| xxhdpi | 144x144 | `android/app/src/main/res/mipmap-xxhdpi/` |
| xxxhdpi | 192x192 | `android/app/src/main/res/mipmap-xxxhdpi/` |

For adaptive icons, you need:
- `ic_launcher_foreground.png` (foreground layer)
- `ic_launcher_background.png` (background layer)

Tool recommendation: [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)

### Release Keystore
```bash
# Generate release keystore (keep this safe!)
keytool -genkey -v \
  -keystore popera-release.keystore \
  -alias popera \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Store the keystore password securely!
```

### Signing Configuration
Add to `android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file('popera-release.keystore')
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias 'popera'
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### Build Release APK/AAB
```bash
# Build production web assets
npm run build

# Sync to native
npx cap sync android

# Open Android Studio
npm run mobile:android
```

In Android Studio:
1. [ ] Build → Generate Signed Bundle / APK
2. [ ] Select Android App Bundle (AAB)
3. [ ] Choose keystore
4. [ ] Build release

### Google Play Console
- [ ] Create new app in [Google Play Console](https://play.google.com/console)
- [ ] Package name: `ca.gopopera.app`
- [ ] Add Privacy Policy URL (required)
- [ ] Complete Store listing
- [ ] Upload AAB to Internal testing track first
- [ ] Test on real devices
- [ ] Promote to Production

---

## 🔧 Commands Reference

```bash
# Development workflow
npm run build              # Build web assets
npm run mobile:sync        # Sync to both platforms
npm run mobile:ios         # Open Xcode
npm run mobile:android     # Open Android Studio

# Quick dev cycles
npm run mobile:dev:ios     # Build + sync + open Xcode
npm run mobile:dev:android # Build + sync + open Android Studio
```

---

## 📱 Testing Checklist

Before submitting to stores, test these features on real devices:

### Authentication
- [ ] Google Sign-In works (redirects and returns)
- [ ] Sign out works
- [ ] Auth state persists after app restart

### Core Features
- [ ] Event feed loads
- [ ] Event details page works
- [ ] Maps display correctly
- [ ] Image uploads work (profile, events)
- [ ] QR scanner opens camera and scans tickets
- [ ] Payments complete successfully (use Stripe test mode)

### Deep Links
- [ ] App opens when clicking Popera links
- [ ] Correct page loads from deep link

### Permissions
- [ ] Camera permission prompt appears
- [ ] Photo library permission prompt appears
- [ ] Location permission prompt appears (if using location)

---

## 🚨 Common Issues

### iOS: White/blank screen
- Check Safari Web Inspector for errors
- Ensure `dist/` folder exists and has content
- Verify `webDir: 'dist'` in `capacitor.config.ts`

### iOS: Google Sign-In fails
- Verify `GoogleService-Info.plist` is in Xcode project
- Verify URL Scheme is added with `REVERSED_CLIENT_ID`
- Check that redirect is being used (not popup)

### Android: Build fails
- Run `npx cap sync android` again
- Check `google-services.json` is at correct path
- Verify Gradle sync completed

### Android: Camera not working
- Check permissions in AndroidManifest.xml
- Request runtime permissions in app

