/**
 * Notification Helpers - Orchestrates in-app, email, and SMS notifications
 */

import { createNotification } from '../firebase/notifications';
import { sendEmailNotification, notifyNewEventFromHost, notifyAnnouncement, notifyPoll, notifyNewMessage } from './emailNotifications';
import { sendSMSNotification, notifyNewEventSMS, notifyAnnouncementSMS, notifyPollSMS, notifyNewMessageSMS } from './smsNotifications';
import { getDbSafe } from '../src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface UserNotificationPreferences {
  email_opt_in?: boolean;
  sms_opt_in?: boolean;
  notification_opt_in?: boolean;
}

/**
 * Get user notification preferences
 */
async function getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences> {
  const db = getDbSafe();
  if (!db) return {};

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    return userDoc.data()?.notification_settings || {};
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return {};
  }
}

/**
 * Get user email and phone
 */
async function getUserContactInfo(userId: string): Promise<{ email?: string; phone?: string; name?: string }> {
  const db = getDbSafe();
  if (!db) return {};

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const data = userDoc.data();
    return {
      email: data?.email,
      phone: data?.phone_number,
      name: data?.name || data?.displayName,
    };
  } catch (error) {
    console.error('Error fetching user contact info:', error);
    return {};
  }
}

/**
 * Send comprehensive notification (in-app + email + SMS based on preferences)
 */
export async function sendComprehensiveNotification(
  userId: string,
  notification: {
    type: 'new-event' | 'new-rsvp' | 'announcement' | 'poll' | 'new-message' | 'followed-host-event';
    title: string;
    body: string;
    eventId?: string;
    hostId?: string;
  },
  emailContent?: { subject: string; body: string },
  smsContent?: { message: string }
): Promise<void> {
  const preferences = await getUserNotificationPreferences(userId);
  const contactInfo = await getUserContactInfo(userId);

  // Always create in-app notification if enabled
  if (preferences.notification_opt_in !== false) {
    try {
      await createNotification(userId, notification);
    } catch (error) {
      console.error('Error creating in-app notification:', error);
    }
  }

  // Send email if enabled
  if (preferences.email_opt_in && contactInfo.email && emailContent) {
    try {
      await sendEmailNotification({
        to: contactInfo.email,
        name: contactInfo.name,
        subject: emailContent.subject,
        body: emailContent.body,
      });
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // Send SMS if enabled and phone verified
  if (preferences.sms_opt_in && contactInfo.phone && smsContent) {
    try {
      await sendSMSNotification({
        to: contactInfo.phone,
        message: smsContent.message,
      });
    } catch (error) {
      console.error('Error sending SMS notification:', error);
    }
  }
}

/**
 * Notify followers of new event
 */
export async function notifyFollowersOfNewEvent(
  hostId: string,
  eventId: string,
  eventTitle: string
): Promise<void> {
  const { getHostFollowers } = await import('../firebase/follow');
  const followers = await getHostFollowers(hostId);

  const notifications = followers.map(async (followerId) => {
    const contactInfo = await getUserContactInfo(followerId);
    const preferences = await getUserNotificationPreferences(followerId);

    // In-app notification
    if (preferences.notification_opt_in !== false) {
      await createNotification(followerId, {
        userId: followerId,
        type: 'followed-host-event',
        title: 'New Event from Host You Follow',
        body: `${eventTitle} - Check it out!`,
        eventId,
        hostId,
      });
    }

    // Email
    if (preferences.email_opt_in && contactInfo.email) {
      await notifyNewEventFromHost(
        contactInfo.email,
        contactInfo.name || 'there',
        'Host', // Could fetch host name
        eventTitle,
        eventId
      );
    }

    // SMS
    if (preferences.sms_opt_in && contactInfo.phone) {
      await notifyNewEventSMS(contactInfo.phone, 'Host', eventTitle);
    }
  });

  await Promise.all(notifications);
}

/**
 * Notify event attendees of announcement
 */
export async function notifyAttendeesOfAnnouncement(
  eventId: string,
  announcementTitle: string,
  announcementMessage: string,
  eventTitle: string,
  attendeeIds: string[]
): Promise<void> {
  const notifications = attendeeIds.map(async (userId) => {
    const contactInfo = await getUserContactInfo(userId);
    const preferences = await getUserNotificationPreferences(userId);

    // In-app notification
    if (preferences.notification_opt_in !== false) {
      await createNotification(userId, {
        userId,
        type: 'announcement',
        title: announcementTitle,
        body: announcementMessage,
        eventId,
      });
    }

    // Email
    if (preferences.email_opt_in && contactInfo.email) {
      await notifyAnnouncement(
        contactInfo.email,
        contactInfo.name || 'there',
        eventTitle,
        announcementTitle,
        announcementMessage
      );
    }

    // SMS
    if (preferences.sms_opt_in && contactInfo.phone) {
      await notifyAnnouncementSMS(contactInfo.phone, eventTitle, announcementTitle);
    }
  });

  await Promise.all(notifications);
}

/**
 * Notify event attendees of poll
 */
export async function notifyAttendeesOfPoll(
  eventId: string,
  pollTitle: string,
  pollMessage: string,
  eventTitle: string,
  attendeeIds: string[]
): Promise<void> {
  const notifications = attendeeIds.map(async (userId) => {
    const contactInfo = await getUserContactInfo(userId);
    const preferences = await getUserNotificationPreferences(userId);

    // In-app notification
    if (preferences.notification_opt_in !== false) {
      await createNotification(userId, {
        userId,
        type: 'poll',
        title: pollTitle,
        body: pollMessage,
        eventId,
      });
    }

    // Email
    if (preferences.email_opt_in && contactInfo.email) {
      await notifyPoll(
        contactInfo.email,
        contactInfo.name || 'there',
        eventTitle,
        pollTitle,
        pollMessage
      );
    }

    // SMS
    if (preferences.sms_opt_in && contactInfo.phone) {
      await notifyPollSMS(contactInfo.phone, eventTitle, pollTitle);
    }
  });

  await Promise.all(notifications);
}

/**
 * Notify attendees of new message (except sender)
 */
export async function notifyAttendeesOfNewMessage(
  eventId: string,
  eventTitle: string,
  senderId: string,
  senderName: string,
  messageSnippet: string,
  attendeeIds: string[]
): Promise<void> {
  // Filter out sender
  const recipients = attendeeIds.filter(id => id !== senderId);

  const notifications = recipients.map(async (userId) => {
    const contactInfo = await getUserContactInfo(userId);
    const preferences = await getUserNotificationPreferences(userId);

    // In-app notification (always enabled for messages)
    await createNotification(userId, {
      userId,
      type: 'new-message',
      title: `New message in ${eventTitle}`,
      body: `${senderName}: ${messageSnippet}`,
      eventId,
    });

    // Email (optional, can be disabled for high-volume chats)
    if (preferences.email_opt_in && contactInfo.email) {
      await notifyNewMessage(
        contactInfo.email,
        contactInfo.name || 'there',
        eventTitle,
        senderName,
        messageSnippet
      );
    }

    // SMS (usually disabled for messages to avoid spam)
    // Uncomment if needed:
    // if (preferences.sms_opt_in && contactInfo.phone) {
    //   await notifyNewMessageSMS(contactInfo.phone, eventTitle, senderName);
    // }
  });

  await Promise.all(notifications);
}

