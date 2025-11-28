# New Notifications Integration Plan
## Comprehensive Planning Document for Popera Notification System Expansion

**Status:** Planning Phase - No Code Changes Yet  
**Date:** Generated for review and approval  
**Based On:** Current notification system analysis (see `CURRENT_NOTIFICATION_SYSTEM_SUMMARY.md`)

---

## Executive Summary

This document provides a detailed integration plan for adding **9 new notification categories** (approximately **30+ individual notification types**) to the Popera platform. The plan ensures:

- ✅ No regressions to existing 7 notification flows
- ✅ Backward compatibility with current system
- ✅ Proper integration with user preferences
- ✅ Scalable architecture for future growth
- ✅ Minimal disruption to existing codebase

---

## Architecture Requirements

### New Infrastructure Needed

#### 1. Scheduled/Time-Based Notification System
**Current State:** No scheduled notifications exist  
**Requirement:** Need background job system for time-based triggers

**Options:**
- **Option A:** Firebase Cloud Functions with Cloud Scheduler (recommended)
  - Pros: Native Firebase integration, scalable, reliable
  - Cons: Requires Firebase Functions setup, additional cost
  - Implementation: Create scheduled functions for pre-event, same-day, post-event triggers

- **Option B:** Client-side polling with service worker
  - Pros: No additional infrastructure
  - Cons: Unreliable (device must be on), battery drain, not scalable
  - Implementation: Not recommended for production

- **Option C:** Hybrid approach
  - Scheduled notifications via Cloud Functions
  - Real-time notifications remain client-side
  - Implementation: Best of both worlds

**Recommendation:** Option A (Firebase Cloud Functions + Cloud Scheduler)

#### 2. AI/ML Integration Points
**Current State:** No AI features detected in codebase  
**Requirement:** Need AI service for chat summaries, insights, recommendations

**Options:**
- **Option A:** External AI API (OpenAI, Anthropic, etc.)
  - Pros: Powerful, fast to integrate
  - Cons: Cost per request, external dependency
  - Implementation: API calls from Cloud Functions

- **Option B:** In-house AI service
  - Pros: Full control, potentially lower cost at scale
  - Cons: Development time, infrastructure needed
  - Implementation: Not recommended initially

**Recommendation:** Option A (External AI API) with fallback to simple heuristics

#### 3. Real-Time Event Status Tracking
**Current State:** Event capacity tracked in Firestore  
**Requirement:** Need to detect and notify on capacity thresholds

**Implementation:** Firestore listeners or Cloud Functions triggers on event updates

---

## New Firestore Collections & Fields

### New Collections

#### 1. `scheduled_notifications/{notificationId}`
**Purpose:** Queue for scheduled notifications  
**Structure:**
```typescript
{
  id: string;
  userId: string;
  type: string; // e.g., 'pre-event-reminder', 'same-day-reconfirmation'
  eventId?: string;
  scheduledFor: number; // Unix timestamp
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  payload: Record<string, any>; // Notification-specific data
  createdAt: number;
  sentAt?: number;
  retryCount: number;
}
```

#### 2. `event_analytics/{eventId}`
**Purpose:** Store event analytics for post-event summaries  
**Structure:**
```typescript
{
  eventId: string;
  totalAttendees: number;
  confirmedAttendees: number;
  noShows: number;
  chatMessages: number;
  chatParticipants: number;
  aiSummary?: string; // AI-generated summary
  vibe?: string; // AI-detected vibe
  topInteractions?: Array<{userId: string, userName: string, interactionCount: number}>;
  createdAt: number;
  updatedAt: number;
}
```

#### 3. `user_interactions/{userId}/events/{eventId}`
**Purpose:** Track user interactions for recommendations  
**Structure:**
```typescript
{
  userId: string;
  eventId: string;
  interactions: Array<{
    type: 'message' | 'reply' | 'mention' | 'poll_vote' | 'announcement_view';
    timestamp: number;
    targetUserId?: string; // For replies/mentions
  }>;
  lastInteractionAt: number;
}
```

#### 4. `ai_insights/{eventId}`
**Purpose:** Cache AI-generated insights  
**Structure:**
```typescript
{
  eventId: string;
  chatSummary?: string;
  vibe?: string;
  highlights?: string[];
  topAnnouncement?: string;
  generatedAt: number;
  expiresAt: number; // Cache expiration
}
```

### Extended Collections

#### `users/{userId}` - New Fields
```typescript
{
  // ... existing fields ...
  
  // New fields for notifications
  lastActiveAt?: number; // For "running late" detection
  preferredNotificationTime?: number; // Hours before event (default: 12)
  notificationFrequency?: 'immediate' | 'digest' | 'daily'; // For message replies
  verifiedAt?: number; // Identity verification timestamp
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  reportedUsers?: string[]; // Users this user has reported
  blockedUsers?: string[]; // Users this user has blocked
  
  // For recommendations
  eventPreferences?: {
    categories?: string[];
    preferredCities?: string[];
    priceRange?: {min: number, max: number};
  };
  interactionHistory?: {
    lastEventInteraction?: number;
    totalEventsAttended?: number;
    favoriteHosts?: string[];
  };
}
```

#### `events/{eventId}` - New Fields
```typescript
{
  // ... existing fields ...
  
  // New fields for notifications
  capacityThreshold?: number; // Percentage (e.g., 80) to trigger "getting full" notification
  lastCapacityNotification?: number; // Prevent spam
  locationChangedAt?: number; // Track location changes
  timeChangedAt?: number; // Track time changes
  preEventReminderSent?: boolean; // Prevent duplicate reminders
  sameDayReconfirmationSent?: boolean;
  postEventSummarySent?: boolean;
  
  // For analytics
  confirmedAttendees?: number; // Separate from total attendees
  noShows?: string[]; // User IDs who didn't show
  chatActivity?: {
    totalMessages: number;
    uniqueParticipants: number;
    lastMessageAt: number;
  };
}
```

#### `reservations/{reservationId}` - New Fields
```typescript
{
  // ... existing fields ...
  
  // New fields for commitment/attendance
  sameDayReconfirmed?: boolean;
  reconfirmedAt?: number;
  runningLate?: boolean;
  lateCheckInAt?: number;
  commitmentFeeReminderSent?: boolean;
  commitmentFeeReminderCount?: number;
}
```

#### `notifications/{userId}/items/{notificationId}` - Extended Type
```typescript
{
  // ... existing fields ...
  
  // New notification types
  type: 
    | 'new-event' 
    | 'new-rsvp' 
    | 'announcement' 
    | 'poll' 
    | 'new-message' 
    | 'followed-host-event'
    // NEW TYPES:
    | 'pre-event-reminder'
    | 'same-day-reconfirmation'
    | 'running-late-checkin'
    | 'commitment-fee-reminder'
    | 'event-getting-full'
    | 'friend-joined-event'
    | 'event-details-changed'
    | 'message-reply'
    | 'mentioned-in-chat'
    | 'new-follower'
    | 'event-trending'
    | 'repeat-attendee-milestone'
    | 'post-event-summary'
    | 'post-event-what-missed'
    | 'post-event-interactions'
    | 'follow-host-suggestion'
    | 'identity-verified'
    | 'suspicious-link-removed'
    | 'reported-user-reviewed'
    | 'event-recommendation'
    | 'nearby-event'
    | 'trending-event-now'
    | 'group-vibe-insight'
    | 'host-tip'
    | 'compatibility-notification';
  
  // Additional metadata for new types
  metadata?: {
    friendName?: string;
    changeType?: 'location' | 'time' | 'date';
    oldValue?: string;
    newValue?: string;
    replyToMessageId?: string;
    mentionedBy?: string;
    followerName?: string;
    milestoneType?: string;
    recommendationReason?: string;
    // ... etc
  };
}
```

---

## Notification Categories - Detailed Integration Plan

### Category 1: Pre-Event Social Warm-Up

#### 1.1 "Say hi to the group" 12-24h before event
**Trigger Logic:**
- Scheduled notification 12-24 hours before event start time
- Only for events with active chat
- Only for users who have RSVP'd but haven't sent a message yet

**Channels:**
- ✅ In-App: Type `'pre-event-reminder'`
- ✅ Email: New template `PreEventReminderEmail`
- ✅ SMS: Optional (based on preference)

**Recipients:** All confirmed attendees who haven't sent a message  
**Implementation:**
- Cloud Function scheduled to run daily
- Query events starting in 12-24 hours
- For each event, get attendees from reservations
- Check chat messages to filter out users who already messaged
- Send notifications

**Firestore Changes:**
- Add `events/{eventId}.preEventReminderSent` (boolean)
- Add `scheduled_notifications` collection

**UI Components:**
- No new UI needed (uses existing notification system)

**Regression Risks:**
- Low - New notification type, doesn't affect existing flows
- Need to ensure scheduled jobs don't overlap with existing notifications

**Idempotency:**
- Check `preEventReminderSent` flag before sending
- Use `scheduled_notifications` collection to prevent duplicates

---

#### 1.2 Introductions for new attendees
**Trigger Logic:**
- When a new user RSVPs to an event
- Send to existing attendees (who have messaged in chat)
- Include new attendee's name and basic profile info

**Channels:**
- ✅ In-App: Type `'new-attendee-introduction'`
- ✅ Email: New template `NewAttendeeIntroductionEmail`
- ⚠️ SMS: Disabled (too frequent)

**Recipients:** Existing attendees who are active in chat  
**Implementation:**
- Hook into existing `addRSVP()` function in `stores/userStore.ts`
- After RSVP confirmation, check if event has active chat
- Get list of attendees who have sent messages
- Send introduction notification

**Firestore Changes:**
- None (uses existing data)

**UI Components:**
- No new UI needed

**Regression Risks:**
- Medium - Modifies existing RSVP flow
- Must ensure it doesn't block RSVP completion
- Must be non-blocking (fire-and-forget)

**Idempotency:**
- Only send once per new attendee per event
- Track in notification log

---

#### 1.3 AI chat summary for late joiners
**Trigger Logic:**
- When a user joins chat for the first time (after event has started or 1+ hour after first message)
- Generate AI summary of chat history
- Send summary as notification

**Channels:**
- ✅ In-App: Type `'chat-summary'`
- ✅ Email: New template `ChatSummaryEmail`
- ⚠️ SMS: Disabled

**Recipients:** Users joining chat late  
**Implementation:**
- Detect when user sends first message in chat
- Check if chat has been active for 1+ hour
- Call AI service to generate summary
- Cache summary in `ai_insights/{eventId}`
- Send notification with summary

**Firestore Changes:**
- Add `ai_insights` collection
- Add `users/{userId}.chatSummariesReceived` array

**UI Components:**
- No new UI needed (summary shown in notification)

**Regression Risks:**
- Low - New feature, doesn't affect existing chat
- AI API calls must be non-blocking
- Need fallback if AI service fails

**Idempotency:**
- Only send once per user per event
- Cache AI summary to avoid regenerating

---

#### 1.4 Host welcome-message reminder
**Trigger Logic:**
- 6-12 hours before event
- Only if host hasn't sent a welcome message/announcement

**Channels:**
- ✅ In-App: Type `'host-welcome-reminder'`
- ✅ Email: New template `HostWelcomeReminderEmail`
- ✅ SMS: Optional (host preference)

**Recipients:** Event host only  
**Implementation:**
- Scheduled Cloud Function
- Check if host has sent announcement/welcome message
- Send reminder if not

**Firestore Changes:**
- Add `events/{eventId}.hostWelcomeReminderSent` (boolean)

**UI Components:**
- No new UI needed

**Regression Risks:**
- Low - Host-only notification

**Idempotency:**
- Check flag before sending

---

### Category 2: Commitment & Attendance Controls

#### 2.1 Same-day reconfirmation
**Trigger Logic:**
- On event day, 6-8 hours before event start
- Send to all confirmed attendees
- Include "Confirm attendance" button/link

**Channels:**
- ✅ In-App: Type `'same-day-reconfirmation'`
- ✅ Email: New template `SameDayReconfirmationEmail`
- ✅ SMS: Recommended (high priority)

**Recipients:** All confirmed attendees  
**Implementation:**
- Scheduled Cloud Function runs daily
- Query events starting today (6-8 hours from now)
- Get all reservations with status 'reserved'
- Send reconfirmation notification

**Firestore Changes:**
- Add `reservations/{reservationId}.sameDayReconfirmed` (boolean)
- Add `reservations/{reservationId}.reconfirmedAt` (timestamp)
- Add `events/{eventId}.sameDayReconfirmationSent` (boolean)

**UI Components:**
- New: Reconfirmation button in notification
- New: Reconfirmation page/modal
- Update: Reservation status to include "reconfirmed"

**Regression Risks:**
- Medium - Affects reservation system
- Must not break existing reservation flow
- Need to handle reconfirmation response

**Idempotency:**
- Check flag before sending
- Only send once per event per attendee

---

#### 2.2 "Running late?" check-in
**Trigger Logic:**
- 30 minutes after event start time
- Send to attendees who haven't checked in
- Include "I'm running late" button

**Channels:**
- ✅ In-App: Type `'running-late-checkin'`
- ✅ Email: New template `RunningLateCheckInEmail`
- ✅ SMS: Recommended (time-sensitive)

**Recipients:** Attendees who haven't checked in 30 min after start  
**Implementation:**
- Scheduled Cloud Function
- Query events that started 30 minutes ago
- Get attendees who haven't checked in
- Send check-in notification

**Firestore Changes:**
- Add `reservations/{reservationId}.runningLate` (boolean)
- Add `reservations/{reservationId}.lateCheckInAt` (timestamp)
- Add check-in tracking system

**UI Components:**
- New: Check-in button/modal
- New: "Running late" response UI
- Update: Event detail page to show check-in status

**Regression Risks:**
- Medium - New check-in system
- Need to define what "checked in" means (QR scan? Button click?)

**Idempotency:**
- Only send once per attendee per event

---

#### 2.3 Commitment fee reminders
**Trigger Logic:**
- If commitment fee exists and not paid
- Remind 24h before event, 12h before, 2h before
- Stop if fee is paid or event cancelled

**Channels:**
- ✅ In-App: Type `'commitment-fee-reminder'`
- ✅ Email: New template `CommitmentFeeReminderEmail`
- ✅ SMS: Recommended (payment-related)

**Recipients:** Attendees with unpaid commitment fees  
**Implementation:**
- Scheduled Cloud Function
- Check payment status in reservations
- Send reminders at specified intervals
- Track reminder count to prevent spam

**Firestore Changes:**
- Add `reservations/{reservationId}.commitmentFeeReminderSent` (boolean)
- Add `reservations/{reservationId}.commitmentFeeReminderCount` (number)
- Add payment tracking fields

**UI Components:**
- New: Payment reminder UI
- Update: Reservation page to show fee status

**Regression Risks:**
- Medium - Payment system integration
- Must not interfere with existing payment flow

**Idempotency:**
- Track reminder count
- Don't send more than 3 reminders

---

### Category 3: Real-Time Event Status

#### 3.1 Event getting full
**Trigger Logic:**
- When event capacity reaches threshold (e.g., 80%)
- Only send once per threshold (e.g., 80%, 90%, 95%)
- Send to users who favorited but haven't RSVP'd

**Channels:**
- ✅ In-App: Type `'event-getting-full'`
- ✅ Email: New template `EventGettingFullEmail`
- ⚠️ SMS: Optional (user preference)

**Recipients:** Users who favorited event but haven't RSVP'd  
**Implementation:**
- Firestore listener on event capacity updates
- Or Cloud Function trigger on event update
- Check capacity percentage
- Compare to last notification sent
- Send if new threshold reached

**Firestore Changes:**
- Add `events/{eventId}.capacityThreshold` (number)
- Add `events/{eventId}.lastCapacityNotification` (number - percentage)
- Add `events/{eventId}.capacityNotifications` (array of percentages sent)

**UI Components:**
- No new UI needed

**Regression Risks:**
- Low - New notification type
- Must not spam users

**Idempotency:**
- Track which thresholds already notified
- Only send once per threshold

---

#### 3.2 A friend joined this event
**Trigger Logic:**
- When a user RSVPs to an event
- Check if any of their connections (friends/followers) have also RSVP'd
- Send notification to both users

**Channels:**
- ✅ In-App: Type `'friend-joined-event'`
- ✅ Email: New template `FriendJoinedEventEmail`
- ⚠️ SMS: Disabled (social, not urgent)

**Recipients:** Users who have RSVP'd and have a friend who just RSVP'd  
**Implementation:**
- Hook into `addRSVP()` function
- After RSVP, query other reservations for same event
- Check if any are in user's friend/follower list
- Send bidirectional notifications

**Firestore Changes:**
- Need friend/connection system (may not exist)
- Or use follower system as proxy

**UI Components:**
- No new UI needed

**Regression Risks:**
- Medium - Requires friend/connection system
- May need to build friend system first

**Idempotency:**
- Only send once per friend pair per event

---

#### 3.3 Host updated event details
**Trigger Logic:**
- When host updates event (location, time, date)
- Send to all confirmed attendees
- Highlight what changed

**Channels:**
- ✅ In-App: Type `'event-details-changed'`
- ✅ Email: New template `EventDetailsChangedEmail`
- ✅ SMS: Recommended (critical change)

**Recipients:** All confirmed attendees  
**Implementation:**
- Hook into event update function
- Compare old vs new values
- Detect changes to location, time, date
- Send notification with change details

**Firestore Changes:**
- Add `events/{eventId}.locationChangedAt` (timestamp)
- Add `events/{eventId}.timeChangedAt` (timestamp)
- Track previous values for comparison

**UI Components:**
- No new UI needed (change details in notification)

**Regression Risks:**
- Medium - Modifies event update flow
- Must not block event updates

**Idempotency:**
- Only send once per change type per event

---

### Category 4: Social Graph & Community

#### 4.1 Someone replied to your message
**Trigger Logic:**
- When a message is sent in chat
- Check if it's a reply to another message
- Notify original message sender

**Channels:**
- ✅ In-App: Type `'message-reply'`
- ✅ Email: Optional (user preference for frequency)
- ⚠️ SMS: Disabled (too frequent)

**Recipients:** Original message sender  
**Implementation:**
- Modify chat message sending logic
- Detect reply (via message metadata or thread system)
- Send notification to replied-to user

**Firestore Changes:**
- Add `FirestoreChatMessage.replyToMessageId` (string)
- Add `FirestoreChatMessage.replyToUserId` (string)

**UI Components:**
- New: Reply UI in chat
- Update: Chat to show reply threads

**Regression Risks:**
- High - Modifies core chat functionality
- Need to implement reply/thread system
- Must not break existing chat

**Idempotency:**
- Only notify once per reply
- Consider digest mode for frequent replies

---

#### 4.2 Someone mentioned you
**Trigger Logic:**
- When message contains @username or @mention
- Parse mentions from message text
- Notify mentioned users

**Channels:**
- ✅ In-App: Type `'mentioned-in-chat'`
- ✅ Email: Optional (user preference)
- ⚠️ SMS: Disabled

**Recipients:** Mentioned users  
**Implementation:**
- Parse message text for @mentions
- Look up mentioned users
- Send notifications

**Firestore Changes:**
- Add `FirestoreChatMessage.mentions` (array of userIds)

**UI Components:**
- New: Mention autocomplete in chat
- Update: Chat to highlight mentions

**Regression Risks:**
- Medium - New chat feature
- Must handle invalid mentions gracefully

**Idempotency:**
- Only notify once per mention per message

---

#### 4.3 You gained a new follower
**Trigger Logic:**
- When someone follows a host
- Notify the host

**Channels:**
- ✅ In-App: Type `'new-follower'`
- ✅ Email: Optional (host preference)
- ⚠️ SMS: Disabled (social, not urgent)

**Recipients:** Host being followed  
**Implementation:**
- Hook into `followHost()` function in `firebase/follow.ts`
- After follow, send notification to host

**Firestore Changes:**
- None (uses existing follow system)

**UI Components:**
- No new UI needed

**Regression Risks:**
- Low - Simple addition to existing follow system

**Idempotency:**
- Only send once per follower

---

#### 4.4 Someone you follow created a pop-up
**Status:** ✅ Already implemented  
**Location:** `firebase/db.ts` → `notifyFollowersOfNewEvent()`  
**Note:** No changes needed

---

### Category 5: Host Growth & Analytics

#### 5.1 Event trending
**Trigger Logic:**
- When event RSVP rate exceeds threshold (e.g., 10 RSVPs in 1 hour)
- Or when event views exceed threshold
- Send to host

**Channels:**
- ✅ In-App: Type `'event-trending'`
- ✅ Email: New template `EventTrendingEmail`
- ⚠️ SMS: Optional (host preference)

**Recipients:** Event host  
**Implementation:**
- Firestore listener on reservations
- Track RSVP rate over time windows
- Calculate trending score
- Send notification if threshold exceeded

**Firestore Changes:**
- Add `events/{eventId}.rsvpRate` (array of {timestamp, count})
- Add `events/{eventId}.trendingScore` (number)
- Add `events/{eventId}.trendingNotificationSent` (boolean)

**UI Components:**
- No new UI needed

**Regression Risks:**
- Low - Analytics only

**Idempotency:**
- Only send once per trending event

---

#### 5.2 Repeat attendee milestones
**Trigger Logic:**
- When user attends X events from same host (e.g., 3rd, 5th, 10th)
- Send to both host and attendee

**Channels:**
- ✅ In-App: Type `'repeat-attendee-milestone'`
- ✅ Email: New template `RepeatAttendeeMilestoneEmail`
- ⚠️ SMS: Optional

**Recipients:** Host and attendee  
**Implementation:**
- After event ends, check attendee's history with host
- Count past events attended
- Check if milestone reached
- Send notifications

**Firestore Changes:**
- Add `user_interactions` collection
- Track event attendance history

**UI Components:**
- New: Milestone badge/display

**Regression Risks:**
- Low - New feature

**Idempotency:**
- Only send once per milestone

---

#### 5.3 Post-event host summary
**Trigger Logic:**
- 24 hours after event ends
- Generate summary with attendance, no-shows, chat activity, AI insights
- Send to host

**Channels:**
- ✅ In-App: Type `'post-event-summary'`
- ✅ Email: New template `PostEventHostSummaryEmail`
- ✅ SMS: Optional (host preference)

**Recipients:** Event host  
**Implementation:**
- Scheduled Cloud Function
- Query events that ended 24 hours ago
- Gather analytics data
- Generate AI insights (if available)
- Compile summary
- Send notification

**Firestore Changes:**
- Add `event_analytics` collection
- Store analytics data for summary

**UI Components:**
- New: Post-event summary page/modal
- Update: Host dashboard to show summaries

**Regression Risks:**
- Low - Post-event, doesn't affect active events

**Idempotency:**
- Only send once per event

---

### Category 6: Post-Event Wrap-Up for Attendees

#### 6.1 AI "what you missed" summary
**Trigger Logic:**
- 24 hours after event ends
- For attendees who didn't attend or left early
- Generate AI summary of chat/announcements

**Channels:**
- ✅ In-App: Type `'post-event-what-missed'`
- ✅ Email: New template `PostEventWhatMissedEmail`
- ⚠️ SMS: Disabled

**Recipients:** Attendees who didn't check in or left early  
**Implementation:**
- Scheduled Cloud Function
- Check check-in status
- Generate AI summary of event chat/announcements
- Send notification

**Firestore Changes:**
- Use `event_analytics` collection
- Track check-in status

**UI Components:**
- New: "What you missed" summary view

**Regression Risks:**
- Low - Post-event only

**Idempotency:**
- Only send once per attendee per event

---

#### 6.2 People you interacted with
**Trigger Logic:**
- 24 hours after event ends
- Analyze chat messages, replies, mentions
- Generate list of people user interacted with
- Suggest connections

**Channels:**
- ✅ In-App: Type `'post-event-interactions'`
- ✅ Email: New template `PostEventInteractionsEmail`
- ⚠️ SMS: Disabled

**Recipients:** All attendees  
**Implementation:**
- Analyze chat messages for interactions
- Build interaction graph
- Generate personalized list
- Send notification

**Firestore Changes:**
- Use `user_interactions` collection
- Track interactions during event

**UI Components:**
- New: Interaction summary view
- New: Connection suggestions

**Regression Risks:**
- Low - Post-event only

**Idempotency:**
- Only send once per attendee per event

---

#### 6.3 "Follow the host for next pop-up"
**Trigger Logic:**
- 24-48 hours after event ends
- Only if user attended and hasn't followed host
- Suggest following host

**Channels:**
- ✅ In-App: Type `'follow-host-suggestion'`
- ✅ Email: New template `FollowHostSuggestionEmail`
- ⚠️ SMS: Disabled

**Recipients:** Attendees who haven't followed host  
**Implementation:**
- Check follow status
- Send suggestion notification

**Firestore Changes:**
- None (uses existing follow system)

**UI Components:**
- No new UI needed (uses existing follow button)

**Regression Risks:**
- Low - Simple suggestion

**Idempotency:**
- Only send once per attendee per host

---

### Category 7: Trust & Safety

#### 7.1 Host/attendee identity verified
**Trigger Logic:**
- When identity verification is completed
- Send to verified user
- Optionally notify event attendees (for hosts)

**Channels:**
- ✅ In-App: Type `'identity-verified'`
- ✅ Email: New template `IdentityVerifiedEmail`
- ⚠️ SMS: Optional

**Recipients:** Verified user (and optionally event attendees)  
**Implementation:**
- Hook into verification completion
- Send notification
- Update user profile

**Firestore Changes:**
- Add `users/{userId}.verifiedAt` (timestamp)
- Add `users/{userId}.verificationStatus` (string)

**UI Components:**
- New: Verification badge/indicator
- Update: Profile to show verification status

**Regression Risks:**
- Medium - New verification system needed
- May need to build verification flow first

**Idempotency:**
- Only send once per verification

---

#### 7.2 Suspicious link auto-removed
**Trigger Logic:**
- When system detects and removes suspicious link from chat
- Notify sender and optionally moderators

**Channels:**
- ✅ In-App: Type `'suspicious-link-removed'`
- ✅ Email: New template `SuspiciousLinkRemovedEmail`
- ⚠️ SMS: Disabled

**Recipients:** Message sender (and moderators)  
**Implementation:**
- Link scanning service (external or built-in)
- Detect suspicious links
- Remove message
- Send notification

**Firestore Changes:**
- Add link scanning logs
- Track removed messages

**UI Components:**
- New: Moderation UI
- Update: Chat to show removed messages

**Regression Risks:**
- High - New moderation system
- Must not break chat functionality
- Need link scanning service

**Idempotency:**
- Only notify once per removed message

---

#### 7.3 A user you reported has been reviewed
**Trigger Logic:**
- When reported user's case is reviewed
- Notify reporting user of outcome

**Channels:**
- ✅ In-App: Type `'reported-user-reviewed'`
- ✅ Email: New template `ReportedUserReviewedEmail`
- ⚠️ SMS: Disabled

**Recipients:** User who reported  
**Implementation:**
- Review system processes report
- Updates report status
- Sends notification to reporter

**Firestore Changes:**
- Add reporting system
- Add `reports/{reportId}` collection
- Track report status

**UI Components:**
- New: Report user UI
- New: Report status view

**Regression Risks:**
- High - New reporting system needed
- Must build reporting flow first

**Idempotency:**
- Only send once per report review

---

### Category 8: Recommendation Engine

#### 8.1 Suggested events based on history
**Trigger Logic:**
- Weekly digest or real-time
- Analyze user's event history, preferences, interactions
- Generate personalized recommendations
- Send notification

**Channels:**
- ✅ In-App: Type `'event-recommendation'`
- ✅ Email: New template `EventRecommendationEmail`
- ⚠️ SMS: Disabled

**Recipients:** All users (personalized)  
**Implementation:**
- Analyze user history
- Match with available events
- Score and rank recommendations
- Send top 3-5 recommendations

**Firestore Changes:**
- Add `users/{userId}.eventPreferences` (object)
- Add `users/{userId}.interactionHistory` (object)
- Add recommendation algorithm

**UI Components:**
- New: Recommendations page/section
- Update: Landing page to show recommendations

**Regression Risks:**
- Low - New feature, doesn't affect existing

**Idempotency:**
- Send weekly digest (not daily)

---

#### 8.2 New pop-ups in your area
**Trigger Logic:**
- When new event is created in user's preferred city/area
- Send notification within 24 hours of event creation

**Channels:**
- ✅ In-App: Type `'nearby-event'`
- ✅ Email: New template `NearbyEventEmail`
- ⚠️ SMS: Optional (user preference)

**Recipients:** Users in same city/area  
**Implementation:**
- Hook into event creation
- Get event location
- Query users in same area
- Send notifications

**Firestore Changes:**
- Use existing location data
- Add geolocation indexing

**UI Components:**
- No new UI needed

**Regression Risks:**
- Low - New notification type

**Idempotency:**
- Only send once per event per user

---

#### 8.3 Nearby trending events happening now
**Trigger Logic:**
- Real-time or hourly
- Find events happening now in user's area
- Filter by trending (high RSVP rate)
- Send notification

**Channels:**
- ✅ In-App: Type `'trending-event-now'`
- ✅ Email: New template `TrendingEventNowEmail`
- ✅ SMS: Recommended (time-sensitive)

**Recipients:** Users in area with trending events  
**Implementation:**
- Scheduled job (hourly)
- Query events happening now
- Filter by location and trending score
- Send notifications

**Firestore Changes:**
- Use existing event data
- Add trending score calculation

**UI Components:**
- No new UI needed

**Regression Risks:**
- Low - New notification type

**Idempotency:**
- Only send once per event per user

---

### Category 9: AI-Enhanced UX

#### 9.1 Group vibe insights
**Trigger Logic:**
- Periodically during event (e.g., every 2 hours)
- Analyze chat messages for sentiment/vibe
- Send to host and optionally attendees

**Channels:**
- ✅ In-App: Type `'group-vibe-insight'`
- ✅ Email: Optional (host preference)
- ⚠️ SMS: Disabled

**Recipients:** Host (and optionally active attendees)  
**Implementation:**
- AI service analyzes chat
- Detects vibe (excited, calm, engaged, etc.)
- Generates insight
- Sends notification

**Firestore Changes:**
- Use `ai_insights` collection
- Cache insights to avoid regenerating

**UI Components:**
- New: Vibe indicator in chat
- Update: Event page to show vibe

**Regression Risks:**
- Low - Analytics only

**Idempotency:**
- Cache insights, don't regenerate frequently

---

#### 9.2 Personalized tips for hosts
**Trigger Logic:**
- Based on host's event performance
- Send tips for improvement
- Weekly or after each event

**Channels:**
- ✅ In-App: Type `'host-tip'`
- ✅ Email: New template `HostTipEmail`
- ⚠️ SMS: Disabled

**Recipients:** Event hosts  
**Implementation:**
- Analyze host's events
- Compare to best practices
- Generate personalized tips
- Send notification

**Firestore Changes:**
- Use event analytics
- Add tip generation logic

**UI Components:**
- New: Tips section in host dashboard

**Regression Risks:**
- Low - New feature

**Idempotency:**
- Send weekly or per-event

---

#### 9.3 Compatibility notifications
**Trigger Logic:**
- When users with similar interests/interaction history RSVP to same event
- Notify both users

**Channels:**
- ✅ In-App: Type `'compatibility-notification'`
- ✅ Email: Optional
- ⚠️ SMS: Disabled

**Recipients:** Compatible users  
**Implementation:**
- Analyze user profiles and history
- Calculate compatibility score
- Match users in same events
- Send notifications

**Firestore Changes:**
- Use `user_interactions` collection
- Add compatibility algorithm

**UI Components:**
- New: Compatibility indicator

**Regression Risks:**
- Low - New feature

**Idempotency:**
- Only send once per user pair per event

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Priority: Critical Infrastructure**

1. **Set up Firebase Cloud Functions**
   - Create Functions project
   - Set up Cloud Scheduler
   - Create base scheduled notification system
   - Implement `scheduled_notifications` collection

2. **Set up AI Service Integration**
   - Choose AI provider (OpenAI/Anthropic)
   - Create API wrapper
   - Implement caching system
   - Add fallback heuristics

3. **Extend Firestore Types**
   - Add new notification types to `FirestoreNotification`
   - Create new collections (`scheduled_notifications`, `event_analytics`, etc.)
   - Add new fields to existing collections
   - Create migration scripts

4. **Update Notification Helpers**
   - Extend `notificationHelpers.ts` with new functions
   - Add new email templates
   - Update preference checking logic

**Deliverables:**
- Cloud Functions infrastructure
- AI service integration
- Extended Firestore schema
- Base notification functions

---

### Phase 2: High-Priority Notifications (Weeks 3-4)
**Priority: User-Requested Critical Features**

1. **Pre-Event Social Warm-Up**
   - Pre-event reminder (12-24h)
   - New attendee introductions
   - Host welcome reminder

2. **Commitment & Attendance**
   - Same-day reconfirmation
   - Running late check-in
   - Commitment fee reminders

3. **Real-Time Event Status**
   - Event getting full
   - Event details changed

**Deliverables:**
- 6 new notification flows
- 6 new email templates
- Scheduled job system working
- UI components for reconfirmation/check-in

---

### Phase 3: Social & Community (Weeks 5-6)
**Priority: Engagement Features**

1. **Social Graph Notifications**
   - Message replies
   - Mentions
   - New followers
   - Friend joined event

2. **Post-Event Summaries**
   - Host summary
   - Attendee "what you missed"
   - Interaction summaries

**Deliverables:**
- 7 new notification flows
- Reply/mention system in chat
- Post-event analytics
- 5 new email templates

---

### Phase 4: Advanced Features (Weeks 7-8)
**Priority: Growth & Intelligence**

1. **Host Growth & Analytics**
   - Event trending
   - Repeat attendee milestones

2. **Recommendation Engine**
   - Event recommendations
   - Nearby events
   - Trending events now

3. **AI-Enhanced UX**
   - Group vibe insights
   - Host tips
   - Compatibility notifications

**Deliverables:**
- 6 new notification flows
- Recommendation algorithm
- AI insights system
   - 4 new email templates

---

### Phase 5: Trust & Safety (Weeks 9-10)
**Priority: Platform Safety**

1. **Trust & Safety Notifications**
   - Identity verification
   - Suspicious link removal
   - Report review notifications

**Deliverables:**
- 3 new notification flows
- Verification system
- Moderation system
- Reporting system
- 3 new email templates

---

## Regression Prevention Strategy

### 1. Code Isolation
- All new notification functions in separate files
- New notification types don't modify existing types
- New collections don't affect existing queries

### 2. Feature Flags
- Add feature flags for each new notification category
- Allow gradual rollout
- Easy to disable if issues arise

### 3. Testing Strategy
- Unit tests for each new notification function
- Integration tests for scheduled jobs
- End-to-end tests for critical flows
- Load tests for scheduled notification system

### 4. Monitoring
- Log all new notification attempts
- Track success/failure rates
- Monitor AI API usage and costs
- Alert on high failure rates

### 5. Rollback Plan
- Keep old notification system intact
- New system can be disabled via feature flags
- Database migrations are reversible
- No destructive changes to existing data

---

## Migration Steps

### Step 1: Database Schema Updates
1. Add new Firestore collections
2. Add new fields to existing collections (with defaults)
3. Create indexes for new query patterns
4. Test queries with sample data

### Step 2: Code Updates
1. Extend type definitions
2. Add new notification helper functions
3. Create new email templates
4. Update UI components

### Step 3: Infrastructure Setup
1. Deploy Cloud Functions
2. Set up Cloud Scheduler jobs
3. Configure AI service API keys
4. Set up monitoring and alerts

### Step 4: Gradual Rollout
1. Enable for test users
2. Monitor for issues
3. Gradually increase user percentage
4. Full rollout after validation

---

## Cost Considerations

### Firebase Cloud Functions
- **Estimated Cost:** $0.40 per million invocations
- **Scheduled Jobs:** ~1,000 events/day = ~30,000 invocations/month = ~$0.01/month
- **Real-time Triggers:** Variable based on usage

### AI Service (OpenAI/Anthropic)
- **Estimated Cost:** $0.01-0.10 per summary/insight
- **Chat Summaries:** ~100 events/day = ~3,000/month = ~$30-300/month
- **Recommendations:** ~1,000 users = ~1,000 recommendations/week = ~$4-40/month

### Email (Resend)
- **Current:** Already in use
- **Additional:** ~10,000 new emails/month = ~$10/month

### SMS (Twilio)
- **Current:** Already in use (mocked)
- **Additional:** ~1,000 SMS/month = ~$5-10/month

**Total Estimated Additional Cost:** ~$50-350/month (depending on AI usage)

---

## Risk Assessment

### High Risk
- **Message Reply System:** Modifies core chat functionality
- **Suspicious Link Removal:** Requires moderation system
- **Report Review System:** Requires reporting infrastructure
- **AI Service Dependency:** External service, potential failures

### Medium Risk
- **Scheduled Notifications:** New infrastructure, potential failures
- **Event Details Changed:** Modifies event update flow
- **Same-Day Reconfirmation:** New reservation status logic
- **Check-in System:** New feature, needs definition

### Low Risk
- **Social Notifications:** Mostly new features
- **Post-Event Summaries:** Post-event, doesn't affect active events
- **Recommendations:** New feature, doesn't affect existing flows
- **Analytics Notifications:** Read-only, no data modifications

---

## Success Metrics

### Engagement Metrics
- Notification open rates
- Click-through rates
- User retention after notifications
- Event attendance rates

### Technical Metrics
- Notification delivery success rate
- Scheduled job success rate
- AI service response time
- System uptime

### Business Metrics
- Event RSVP rates
- User engagement in chats
- Host satisfaction
- Platform growth

---

## Open Questions & Decisions Needed

1. **Friend/Connection System:** Do we need to build this, or use follower system?
2. **Check-in Definition:** What constitutes "checked in"? QR code? Button click? Location?
3. **Commitment Fees:** Is payment system already built, or need to build?
4. **Identity Verification:** What verification method? Third-party service?
5. **Link Scanning:** Built-in or third-party service?
6. **Reporting System:** What's the review process? Who reviews?
7. **AI Provider:** Which service? OpenAI? Anthropic? Other?
8. **Notification Frequency:** How often for digest notifications?
9. **Feature Flags:** Which system? Firebase Remote Config? Custom?
10. **Testing Strategy:** Manual testing? Automated? Both?

---

## Next Steps (After Approval)

1. **Review and Approve Plan**
   - Address open questions
   - Prioritize features
   - Adjust timeline if needed

2. **Set up Infrastructure**
   - Firebase Cloud Functions
   - AI service account
   - Monitoring tools

3. **Begin Phase 1 Implementation**
   - Start with foundation
   - Test thoroughly
   - Iterate based on feedback

---

**Document Status:** Ready for Review  
**Next Action:** Awaiting approval to proceed with implementation

