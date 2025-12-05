# Firebase Schema Update Guide

## 📍 Where to Update in Firebase

### Option 1: Firebase Console (Manual - For Testing)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database**
4. Click on the **`events`** collection
5. For each event document, click **Edit** and add these fields:
   - `vibes` (type: **array**, add strings like "Creative", "Social", etc.)
   - `sessionFrequency` (type: **string**, values: "Weekly", "Monthly", "One-Time", or "Flexible")
   - `sessionMode` (type: **string**, values: "In-Person" or "Remote")
   - `country` (type: **string**, e.g., "Canada", "United States")

### Option 2: Migration Script (Recommended for Production)
Use a Node.js script to update all existing events automatically.

**⚠️ IMPORTANT: This is NOT a Firestore Rule!**
- Do NOT paste this into Firestore Database > Rules
- This is a Node.js script that runs on your computer or server
- See `scripts/MIGRATION_INSTRUCTIONS.md` for complete setup steps

**Quick Start:**
1. Get Firebase service account key (Firebase Console > Project Settings > Service Accounts)
2. Install: `npm install firebase-admin`
3. Set credentials: `export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"`
4. Run: `npx ts-node scripts/migrateEventFields.ts`

See `scripts/MIGRATION_INSTRUCTIONS.md` for detailed instructions.

---

## ✅ TypeScript Interfaces Updated

The following files have been updated with the new fields:

### 1. `firebase/types.ts` - FirestoreEvent Interface

**Location:** Line 49-52 in `firebase/types.ts`

**Added fields:**
```typescript
// New fields for event cards and filtering
vibes?: string[]; // Array of vibe tags (e.g., ["Creative", "Social", "Wellness"])
sessionFrequency?: string; // "Weekly" | "Monthly" | "One-Time" | "Flexible"
sessionMode?: string; // "In-Person" | "Remote"
country?: string; // Country name (e.g., "Canada", "United States")
```

### 2. `types.ts` - Event Interface

**Location:** Line 37-40 in `types.ts`

**Added fields:**
```typescript
// New fields for event cards and filtering
vibes?: string[]; // Array of vibe tags (e.g., ["Creative", "Social", "Wellness"])
sessionFrequency?: string; // "Weekly" | "Monthly" | "One-Time" | "Flexible"
sessionMode?: string; // "In-Person" | "Remote"
country?: string; // Country name (e.g., "Canada", "United States")
```

### 3. `firebase/db.ts` - Mapping Function

**Location:** Line 67-70 in `firebase/db.ts`

**Added mapping:**
```typescript
// New fields for event cards and filtering
vibes: Array.isArray(firestoreEvent.vibes) ? firestoreEvent.vibes : undefined,
sessionFrequency: firestoreEvent.sessionFrequency || undefined,
sessionMode: firestoreEvent.sessionMode || undefined,
country: firestoreEvent.country || undefined,
```

---

## 🔄 Migration Script (For Bulk Updates)

**The migration script is located at:** `scripts/migrateEventFields.ts`

**Full instructions:** See `scripts/MIGRATION_INSTRUCTIONS.md`

**Quick summary:**
- This is a **Node.js script**, NOT a Firestore Rule
- Run it from your terminal/command line
- Requires Firebase Admin SDK credentials
- Automatically updates all events in bulk

---

## 📋 Field Definitions

### `vibes` (array of strings)
**Allowed values:**
- "Creative"
- "Movement"
- "Social"
- "Wellness"
- "Spiritual"
- "Learning"
- "Resilience"
- "Cozy"
- "Outdoors"
- "Curious"
- "Purposeful"
- "Music"
- "Sports"
- "Food & Drink"
- "Markets"
- "Hands-On"
- "Performances"

**Example:** `["Creative", "Social", "Wellness"]`

### `sessionFrequency` (string)
**Allowed values:**
- "Weekly"
- "Monthly"
- "One-Time"
- "Flexible"

### `sessionMode` (string)
**Allowed values:**
- "In-Person"
- "Remote"

### `country` (string)
**Examples:**
- "Canada"
- "United States"
- "United Kingdom"
- etc.

---

## ⚠️ Important Notes

1. **All fields are optional** - Existing events will continue to work without these fields
2. **Backward compatible** - The code handles missing fields gracefully
3. **Default values** - When creating new events, you can set defaults in the creation form
4. **No breaking changes** - Old events without these fields will still display correctly

---

## ✅ Next Steps

After adding these fields to Firestore:

1. ✅ TypeScript interfaces are already updated
2. ✅ Mapping function is already updated
3. ⏳ Wait for confirmation that fields are added to Firestore
4. ⏳ Then proceed with UI implementation (event cards + filter panel)

---

## 🧪 Testing

To test if fields are working:

1. Add test data to one event in Firestore Console
2. Check that the event loads in the app
3. Verify the fields appear in the event object (check browser console)

---

**Status:** ✅ TypeScript code updated and ready. Waiting for Firestore schema update.

