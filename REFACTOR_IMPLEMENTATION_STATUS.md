# Refactor Implementation Status
**Date**: Generated automatically  
**Status**: In Progress

## ✅ COMPLETED

### A. User Schema Unification
- ✅ Updated `FirestoreUser` type to standardized schema (displayName, photoURL only)
- ✅ Updated `getUserProfile()` to use standardized fields with backward compatibility
- ✅ Updated `createOrUpdateUserProfile()` to standardize fields

### B. Remove Duplicated Snapshot Fields
- ✅ Updated `FirestoreEvent` type to remove hostPhotoURL, hostName (kept for backward compatibility)
- ✅ Updated `Event` interface to remove hostPhotoURL, hostName (kept for backward compatibility)
- ✅ Updated `createEvent()` to not store hostPhotoURL/hostName
- ✅ Updated `mapFirestoreEventToEvent()` to handle new schema

### C. Chat + Group-Conversation Sync
- ✅ Updated `FirestoreChatMessage` type to use `senderId` instead of `userId`
- ✅ Updated `addChatMessage()` to use `senderId` parameter

### D. Real-time Metrics Fix
- ✅ Removed `attendeesCount` from `FirestoreEvent` type
- ✅ Updated `mapFirestoreEventToEvent()` to not include attendeesCount

## 🔄 IN PROGRESS

### A. User Schema Unification (Components)
- ⏳ Update all components to use `displayName` and `photoURL` only
- ⏳ Remove all `imageUrl`, `profileImage`, `hostPhotoURL` references

### B. Remove Duplicated Snapshot Fields (Components)
- ⏳ Update all components to fetch host data via real-time listener
- ⏳ Remove all `hostPhotoURL` and `hostName` usage

### C. Chat + Group-Conversation Sync (Components)
- ⏳ Update message UI to fetch sender info from `/users/{senderId}`
- ⏳ Update GroupChatHeader to subscribe to `/users/{hostId}`
- ⏳ Update chatStore to handle `senderId` instead of `userId`

### D. Real-time Metrics Fix (Components)
- ⏳ Update all UI components to compute `spotsAvailable` and `membersJoined` from reservations
- ⏳ Remove all `attendeesCount` field references

### E. Notification System Fix
- ⏳ Standardize all notification field names
- ⏳ Add console logging to all notification triggers

### F. Clean Up Listeners
- ⏳ Remove duplicated/stacked listeners
- ⏳ Ensure proper cleanup on unmount

## 📋 FILES TO UPDATE

### Core Files (✅ Done)
- ✅ `firebase/types.ts`
- ✅ `types.ts`
- ✅ `firebase/db.ts` (partial)

### Components (⏳ Pending)
- ⏳ `components/events/EventCard.tsx`
- ⏳ `components/chat/GroupChatHeader.tsx`
- ⏳ `components/chat/GroupChat.tsx`
- ⏳ `components/profile/HostProfile.tsx`
- ⏳ `pages/EventDetailPage.tsx`
- ⏳ `pages/ProfilePage.tsx`
- ⏳ `components/layout/Header.tsx`
- ⏳ `components/chat/AttendeeList.tsx`
- ⏳ `stores/chatStore.ts`
- ⏳ `stores/userStore.ts`
- ⏳ `utils/notificationHelpers.ts`

## ⚠️ MIGRATION REQUIRED

**YES** - Manual Firestore migration required:

1. **User Documents**: Migrate `imageUrl` → `photoURL`, `name` → `displayName`
2. **Event Documents**: Remove `hostPhotoURL` and `hostName` fields (or keep for backward compatibility)
3. **Message Documents**: Add `senderId` field (or keep `userId` for backward compatibility)

**Migration Script**: Will be generated after component updates are complete.

## 🔍 BREAKING CHANGES

**None** - All changes maintain backward compatibility with deprecated fields.

---

**Next Steps**: Continue updating components systematically.

