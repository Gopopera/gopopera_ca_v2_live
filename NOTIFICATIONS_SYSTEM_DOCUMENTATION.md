# Popera Notifications & Communication System

## Overview

This document describes the complete notifications and communication system implemented for Popera, including in-app notifications, email notifications, SMS notifications, host announcements, polls, follow system, and phone verification.

## System Architecture

### Firestore Collections

#### New Collections Added

1. **`notifications/{userId}/items/{notificationId}`**
   - User-specific notification feed
   - Structure:
     ```typescript
     {
       type: 'new-event' | 'new-rsvp' | 'announcement' | 'poll' | 'new-message' | 'followed-host-event',
       title: string,
       body: string,
       timestamp: serverTimestamp(),
       eventId?: string,
       hostId?: string,
       read: boolean,
       createdAt: number
     }
     ```

2. **`announcements/{eventId}/items/{announcementId}`**
   - Host announcements and polls for events
   - Structure:
     ```typescript
     {
       type: 'announcement' | 'poll',
       title: string,
       message: string,
       options?: string[], // For polls
       timestamp: serverTimestamp(),
       createdBy: string, // hostId
       createdAt: number
     }
     ```

3. **`announcements/{eventId}/items/{announcementId}/votes/{userId}`**
   - Poll votes
   - Structure:
     ```typescript
     {
       userId: string,
       option: string,
       timestamp: serverTimestamp()
     }
     ```

#### Extended Collections

1. **`users/{uid}`** - Added fields:
   - `phone_verified: boolean`
   - `phone_number: string`
   - `following: string[]` // Host IDs user is following
   - `followers: string[]` // User IDs following this host
   - `notification_settings: {
       email_opt_in?: boolean,
       sms_opt_in?: boolean,
       notification_opt_in?: boolean
     }`

2. **`career_inquiries`** - Already exists, used for Careers page form submissions

3. **`contact_inquiries`** - Already exists, used for Contact page form submissions

## Files Created

### Components

1. **`components/auth/PhoneVerificationModal.tsx`**
   - Reusable phone verification modal
   - Uses Firebase Phone Auth with invisible reCAPTCHA
   - Two-step flow: phone number → verification code
   - Updates `users/{uid}.phone_verified` and `phone_number` on success

2. **`components/notifications/NotificationsModal.tsx`**
   - In-app notifications modal
   - Shows unread count badge
   - Mark as read functionality
   - Navigate to event detail on click

### Firebase Operations

3. **`firebase/notifications.ts`**
   - `createNotification()` - Create in-app notification
   - `getUserNotifications()` - Fetch user notifications
   - `markNotificationAsRead()` - Mark single notification as read
   - `markAllNotificationsAsRead()` - Mark all as read
   - `getUnreadNotificationCount()` - Get unread count
   - `createAnnouncement()` - Create announcement/poll
   - `getEventAnnouncements()` - Fetch event announcements
   - `voteOnPoll()` - Vote on poll
   - `getPollResults()` - Get poll results
   - `hasUserVoted()` - Check if user voted

4. **`firebase/follow.ts`**
   - `followHost()` - Follow a host
   - `unfollowHost()` - Unfollow a host
   - `isFollowing()` - Check follow status
   - `getFollowingHosts()` - Get user's following list
   - `getHostFollowers()` - Get host's followers
   - `notifyFollowersOfNewEvent()` - Notify followers when host creates event

### Utilities

5. **`utils/emailNotifications.ts`**
   - `sendEmailNotification()` - Send email via Resend API or mailto fallback
   - `notifyNewEventFromHost()` - Email for new event from followed host
   - `notifyAnnouncement()` - Email for announcement
   - `notifyPoll()` - Email for poll
   - `notifyNewMessage()` - Email for new message

6. **`utils/smsNotifications.ts`**
   - `sendSMSNotification()` - Send SMS via Twilio API
   - `notifyNewEventSMS()` - SMS for new event
   - `notifyAnnouncementSMS()` - SMS for announcement
   - `notifyPollSMS()` - SMS for poll
   - `notifyNewMessageSMS()` - SMS for new message

7. **`utils/notificationHelpers.ts`**
   - `sendComprehensiveNotification()` - Orchestrates in-app + email + SMS
   - `notifyFollowersOfNewEvent()` - Notify all followers
   - `notifyAttendeesOfAnnouncement()` - Notify event attendees
   - `notifyAttendeesOfPoll()` - Notify event attendees
   - `notifyAttendeesOfNewMessage()` - Notify chat attendees

## Files Modified

1. **`firebase/types.ts`**
   - Extended `FirestoreUser` with `phone_number`, `following`, `followers`, `notification_settings`
   - Added `FirestoreNotification`, `FirestoreAnnouncement`, `FirestorePollVote` types

2. **`pages/CreateEventPage.tsx`**
   - Replaced inline phone verification with `PhoneVerificationModal`
   - Phone verification required before creating event
   - Integrated follower notifications on event creation

3. **`pages/EventDetailPage.tsx`**
   - Added "Follow Host" button
   - Follow/unfollow functionality
   - Auth modal for logged-out users

4. **`components/layout/Header.tsx`**
   - Added unread notification count badge
   - Real-time count updates every 30 seconds
   - Opens `NotificationsModal` on click

5. **`App.tsx`**
   - Integrated `NotificationsModal`
   - Navigation handler for notifications
   - Notification click navigates to event detail

6. **`components/chat/GroupChat.tsx`**
   - Integrated announcement creation with notifications
   - Integrated poll creation with notifications
   - Message notifications for chat attendees
   - Uses Firestore announcements collection

7. **`firebase/db.ts`**
   - Event creation now notifies followers
   - Integrated with follow system

8. **`pages/ProfileSubPages.tsx`**
   - Updated `NotificationSettingsPage` to save to Firestore
   - Real-time toggle updates
   - Settings persisted in `users/{uid}.notification_settings`

## Environment Variables Required

### Email (Resend API - Optional)
```env
VITE_RESEND_API_KEY=your_resend_api_key
```

### SMS (Twilio - Optional)
```env
VITE_TWILIO_ACCOUNT_SID=your_twilio_account_sid
VITE_TWILIO_AUTH_TOKEN=your_twilio_auth_token
VITE_TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

**Note:** If email/SMS APIs are not configured, the system falls back to `mailto:` links for email.

## Features Implemented

### 1. Phone Verification ✅
- Reusable `PhoneVerificationModal` component
- Required before hosting events
- Optional during onboarding
- Updates `phone_verified` and `phone_number` in user profile
- Uses Firebase Phone Auth with invisible reCAPTCHA

### 2. In-App Notifications ✅
- Collection: `notifications/{userId}/items/{notificationId}}`
- Real-time unread count in header
- Notifications modal with mark as read
- Navigate to event detail on click
- Types: new-event, new-rsvp, announcement, poll, new-message, followed-host-event

### 3. Follow System ✅
- Follow/unfollow hosts from event detail page
- Updates `users/{uid}.following` and `users/{uid}.followers`
- Notifies followers when host creates new event
- Follow button with visual feedback

### 4. Email Notifications ✅
- Uses Resend API (if configured) or mailto fallback
- Respects `email_opt_in` preference
- Templates for: new events, announcements, polls, messages
- Sends to `users/{uid}.email`

### 5. SMS Notifications ✅
- Uses Twilio API (if configured)
- Respects `sms_opt_in` and `phone_verified` preferences
- Sends for: new events, announcements, polls
- Sends to `users/{uid}.phone_number`

### 6. Host Announcements & Polls ✅
- Collection: `announcements/{eventId}/items/{announcementId}`
- Host can create announcements and polls from chat
- Notifies all event attendees (in-app + email + SMS)
- Poll voting with one vote per user
- Results stored in `announcements/{eventId}/items/{announcementId}/votes/{userId}`

### 7. Conversation Notifications ✅
- Notifies all attendees when new message sent (except sender)
- Respects notification preferences
- In-app notifications always enabled for messages
- Email/SMS optional (can be disabled for high-volume chats)

### 8. Notification Settings ✅
- Settings page with toggles:
  - In-App Notifications
  - Email Notifications
  - SMS Notifications
- Saved to `users/{uid}.notification_settings`
- Real-time updates

## Testing Instructions

### Phone Verification
1. Navigate to Create Event page
2. If phone not verified, modal should appear
3. Enter phone number, receive code
4. Verify code
5. Check `users/{uid}.phone_verified` and `phone_number` in Firestore

### Follow System
1. Go to any event detail page
2. Click "Follow Host" button
3. Check `users/{uid}.following` in Firestore
4. Create new event as that host
5. Check notifications for followers

### In-App Notifications
1. Click bell icon in header
2. Should show unread count badge
3. Click notification to mark as read
4. Click notification to navigate to event

### Announcements
1. Join event chat as host
2. Click "Announcement" in Host Tools
3. Enter title and message
4. Check notifications for all attendees
5. Check `announcements/{eventId}/items/` in Firestore

### Polls
1. Join event chat as host
2. Click "Create Poll" in Host Tools
3. Enter question and options
4. Vote as attendee
5. Check poll results
6. Verify one vote per user

### Email/SMS
1. Configure environment variables (optional)
2. Enable email/SMS in notification settings
3. Trigger notification (follow event, announcement, etc.)
4. Check email/SMS delivery

## Build Status

✅ `npm run build` - PASSED
✅ No TypeScript errors
✅ No linter errors

## Branch & Commit

- **Branch:** `feature/notifications-system`
- **Commit:** (will be shown after commit)
- **Status:** Ready for review

## Known Limitations

1. **SMS/Email APIs**: Require external service configuration (Resend/Twilio). Falls back to mailto if not configured.
2. **Poll Results**: Currently calculated on-demand. For high-volume polls, consider caching.
3. **Notification Batching**: Notifications are sent individually. For large follower lists, consider batching.
4. **Message Notifications**: SMS notifications for messages are disabled by default to avoid spam.

## Next Steps

1. Configure Resend API for email (optional)
2. Configure Twilio for SMS (optional)
3. Test all notification flows
4. Monitor Firestore read/write usage
5. Consider adding notification batching for large audiences

