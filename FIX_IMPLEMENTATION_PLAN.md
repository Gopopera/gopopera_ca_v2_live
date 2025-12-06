# Fix Implementation Plan
**Based on Comprehensive Audit Report**

## Summary of Issues & Fixes

### Issue 1: Group Conversation Messages Not Showing
**Root Cause**: Multiple useEffects managing subscription, potential conflicts
**Fix**: Consolidate subscription logic, ensure proper cleanup

### Issue 2: Profile Picture Inconsistencies  
**Root Cause**: Multiple source fields, no single source of truth
**Fix**: Standardize on `photoURL` as primary, add consistent fallbacks

### Issue 3: Host Profile Picture in Group Conversation
**Root Cause**: Missing `event.hostPhotoURL` fallback in GroupChatHeader
**Fix**: Add fallback to match EventCard pattern

### Issue 4: Conversation Icon on Host Profile
**Root Cause**: Icon button with no functionality
**Fix**: Remove the icon button

### Issue 5: Notification System
**Root Cause**: May be failing silently, need better error logging
**Fix**: Add comprehensive error logging, verify triggers

---

## Implementation Order

1. Fix Group Conversation Messages (Critical)
2. Fix Profile Picture Standardization (Critical)
3. Fix GroupChatHeader Profile Picture (Quick Fix)
4. Remove Conversation Icon (Quick Fix)
5. Enhance Notification Logging (Important)

---

## Files to Modify

1. `components/chat/GroupChat.tsx` - Consolidate subscription logic
2. `components/chat/GroupChatHeader.tsx` - Add hostPhotoURL fallback
3. `components/profile/HostProfile.tsx` - Remove conversation icon
4. `firebase/db.ts` - Standardize getUserProfile photoURL priority
5. `utils/notificationHelpers.ts` - Add error logging
6. All profile picture components - Standardize fallback logic

---

**Ready to implement fixes**

