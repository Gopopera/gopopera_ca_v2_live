# Firestore Migration Script
**Required for Schema Refactor**

## Migration Required: YES

This refactor requires manual Firestore data migration for the following:

### 1. User Documents Migration

**Action**: Migrate deprecated fields to standardized fields

**Fields to Migrate**:
- `imageUrl` → `photoURL` (if `photoURL` doesn't exist)
- `name` → `displayName` (if `displayName` doesn't exist)
- `phone_verified` → `phoneVerified` (if `phoneVerified` doesn't exist)

**Script** (run in Firebase Console or via Admin SDK):

```javascript
// Run this in Firebase Console Functions or Admin SDK
const admin = require('firebase-admin');
const db = admin.firestore();

async function migrateUserDocuments() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    const updates = {};
    
    // Migrate imageUrl to photoURL
    if (data.imageUrl && !data.photoURL) {
      updates.photoURL = data.imageUrl;
    }
    
    // Migrate name to displayName
    if (data.name && !data.displayName) {
      updates.displayName = data.name;
    }
    
    // Migrate phone_verified to phoneVerified
    if (data.phone_verified !== undefined && data.phoneVerified === undefined) {
      updates.phoneVerified = data.phone_verified;
    }
    
    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      count++;
    }
  });
  
  await batch.commit();
  console.log(`✅ Migrated ${count} user documents`);
}

migrateUserDocuments();
```

### 2. Event Documents Migration

**Action**: Remove or keep (for backward compatibility) `hostPhotoURL` and `hostName`

**Note**: These fields can be kept for backward compatibility during migration period. Components will fetch from `/users/{hostId}` in real-time.

**Optional Cleanup Script** (run after all components are updated):

```javascript
async function cleanupEventDocuments() {
  const eventsRef = db.collection('events');
  const snapshot = await eventsRef.get();
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    const updates = {};
    
    // Remove hostPhotoURL (host data fetched from /users/{hostId})
    if (data.hostPhotoURL !== undefined) {
      updates.hostPhotoURL = admin.firestore.FieldValue.delete();
    }
    
    // Remove hostName (host data fetched from /users/{hostId})
    if (data.hostName !== undefined) {
      updates.hostName = admin.firestore.FieldValue.delete();
    }
    
    // Remove attendeesCount (computed from reservations)
    if (data.attendeesCount !== undefined) {
      updates.attendeesCount = admin.firestore.FieldValue.delete();
    }
    
    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      count++;
    }
  });
  
  await batch.commit();
  console.log(`✅ Cleaned up ${count} event documents`);
}

// Only run after all components are updated
// cleanupEventDocuments();
```

### 3. Message Documents Migration

**Action**: Add `senderId` field (or keep `userId` for backward compatibility)

**Note**: `userId` can be kept for backward compatibility. Components will use `senderId` if available, fallback to `userId`.

**Optional Migration Script**:

```javascript
async function migrateMessageDocuments() {
  const eventsRef = db.collection('events');
  const eventsSnapshot = await eventsRef.get();
  
  let totalMigrated = 0;
  
  for (const eventDoc of eventsSnapshot.docs) {
    const messagesRef = eventDoc.ref.collection('messages');
    const messagesSnapshot = await messagesRef.get();
    
    const batch = db.batch();
    let count = 0;
    
    messagesSnapshot.forEach((msgDoc) => {
      const data = msgDoc.data();
      
      // Add senderId if userId exists but senderId doesn't
      if (data.userId && !data.senderId) {
        batch.update(msgDoc.ref, { senderId: data.userId });
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
      totalMigrated += count;
      console.log(`✅ Migrated ${count} messages for event ${eventDoc.id}`);
    }
  }
  
  console.log(`✅ Total messages migrated: ${totalMigrated}`);
}

// Run after component updates
// migrateMessageDocuments();
```

## Migration Timeline

1. **Phase 1** (Now): Update codebase with backward compatibility
2. **Phase 2** (After deployment): Run user documents migration
3. **Phase 3** (After all components updated): Run optional cleanup scripts

## Backward Compatibility

All changes maintain backward compatibility:
- Deprecated fields are kept in Firestore
- Components check for new fields first, fallback to deprecated fields
- No breaking changes to existing data

## Verification

After migration, verify:
- All user profiles have `displayName` and `photoURL`
- All events have `hostId` (hostName/hostPhotoURL optional)
- All messages have `senderId` (userId optional)

---

**Status**: Migration scripts ready, can be run after code deployment

