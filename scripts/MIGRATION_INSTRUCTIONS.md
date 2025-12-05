# Event Fields Migration Instructions

## 🎯 What This Does

This script adds 4 new optional fields to all existing events in Firestore:
- `vibes` (array) - Default: `[]`
- `sessionFrequency` (string) - Default: `"Flexible"`
- `sessionMode` (string) - Default: `"In-Person"`
- `country` (string) - Inferred from city or default: `"Canada"`

## 📋 Prerequisites

1. **Node.js** installed (v14+)
2. **Firebase Admin SDK** credentials

## 🔧 Setup Steps

### Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the **⚙️ Settings** icon → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the JSON file (e.g., `firebase-service-account.json`)
7. **⚠️ Keep this file secure - don't commit it to git!**

### Step 2: Install Dependencies

```bash
npm install firebase-admin
```

### Step 3: Set Up Credentials

**Option A: Environment Variable (Recommended)**

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/firebase-service-account.json"
```

**Option B: Place file in project (Less Secure)**

1. Place `firebase-service-account.json` in the project root
2. Add to `.gitignore`:
   ```
   firebase-service-account.json
   ```
3. Uncomment and update the path in `migrateEventFields.ts`:
   ```typescript
   const serviceAccount = require('../firebase-service-account.json');
   initializeApp({ credential: cert(serviceAccount) });
   ```

### Step 4: Run the Migration

```bash
# If using ts-node
npx ts-node scripts/migrateEventFields.ts

# OR if you have ts-node installed globally
ts-node scripts/migrateEventFields.ts

# OR compile and run
npx tsc scripts/migrateEventFields.ts
node scripts/migrateEventFields.js
```

## ✅ Expected Output

```
🔄 Starting event migration...
📊 Found 25 events to migrate
✅ Committed batch of 25 updates
✅ Committed final batch of 0 updates

✅ Migration complete!
   - Total events: 25
   - Events updated: 25
   - Events skipped (already had fields): 0

🎉 All done!
```

## 🚨 Alternative: Use Firebase Console (Easier for Small Datasets)

If you have fewer than 50 events, it's easier to update them manually:

1. Go to Firebase Console → Firestore Database
2. Click on `events` collection
3. For each event:
   - Click the document
   - Click "Add field"
   - Add each field:
     - `vibes` → Type: **array** → Click "Add item" to add strings
     - `sessionFrequency` → Type: **string** → Value: `"Flexible"`
     - `sessionMode` → Type: **string** → Value: `"In-Person"`
     - `country` → Type: **string** → Value: `"Canada"` (or infer from city)

## 🔍 Verify Migration

After running, check one event in Firebase Console to verify fields were added.

## ⚠️ Important Notes

- **Safe to run multiple times** - Script only adds fields if they don't exist
- **No data loss** - Only adds new fields, doesn't modify existing data
- **Backward compatible** - Events without these fields will still work in the app
- **Test first** - Consider testing on a single event first

## 🆘 Troubleshooting

**Error: "Failed to initialize Firebase Admin SDK"**
- Make sure you've set up the service account key correctly
- Check that `GOOGLE_APPLICATION_CREDENTIALS` points to the correct file

**Error: "Permission denied"**
- Make sure your service account has Firestore write permissions
- Check Firebase Console → IAM & Admin → Service Accounts

**Error: "Cannot find module 'firebase-admin'"**
- Run `npm install firebase-admin`

