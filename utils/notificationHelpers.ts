/**
 * Notification Helpers - Orchestrates in-app, email, and SMS notifications
 */

import { createNotification } from '../firebase/notifications';
import { sendSMSNotification, notifyNewEventSMS, notifyAnnouncementSMS, notifyPollSMS, notifyNewMessageSMS } from './smsNotifications';
import { getDbSafe } from '../src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { sendEmail } from '../src/lib/email';
import { AnnouncementEmailTemplate } from '../src/emails/templates/AnnouncementEmail';
import { PollEmailTemplate } from '../src/emails/templates/PollEmail';
import { FollowNotificationTemplate } from '../src/emails/templates/FollowNotification';
import { RSVPHostNotificationTemplate } from '../src/emails/templates/RSVPHostNotification';

// Base URL for event links (fallback to window.location.origin if not set)
const BASE_URL = import.meta.env.VITE_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://gopopera.ca');

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
      // Use simple HTML email for generic notifications
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #15383c;">${emailContent.subject}</h2>
          <p>Hello ${contactInfo.name || 'there'},</p>
          <div style="color: #333; line-height: 1.6;">
            ${emailContent.body.replace(/\n/g, '<br>')}
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Popera Team<br>
            <a href="mailto:support@gopopera.ca" style="color: #e35e25;">support@gopopera.ca</a>
          </p>
        </div>
      `;
      await sendEmail({
        to: contactInfo.email,
        subject: emailContent.subject,
        html: emailHtml,
        templateName: 'generic-notification',
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
      try {
        // Get host info
        const hostInfo = await getUserContactInfo(hostId);
        const hostName = hostInfo.name || 'Host';
        
        // Get event details for template
        const db = getDbSafe();
        let eventDescription = '';
        let eventImageUrl = '';
        if (db) {
          try {
            const eventDoc = await getDoc(doc(db, 'events', eventId));
            if (eventDoc.exists()) {
              const eventData = eventDoc.data();
              eventDescription = eventData.description || '';
              eventImageUrl = eventData.imageUrl || '';
            }
          } catch (error) {
            console.error('Error fetching event details:', error);
          }
        }

        const emailHtml = FollowNotificationTemplate({
          userName: contactInfo.name || 'there',
          hostName,
          eventTitle,
          eventDescription,
          eventUrl: `${BASE_URL}/event/${eventId}`,
          eventImageUrl,
        });

        await sendEmail({
          to: contactInfo.email,
          subject: `New Pop-up from ${hostName} on Popera`,
          html: emailHtml,
          templateName: 'follow-notification',
        });
      } catch (error) {
        console.error('Error sending follow notification email:', error);
      }
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
      try {
        const emailHtml = AnnouncementEmailTemplate({
          userName: contactInfo.name || 'there',
          eventTitle,
          announcementTitle,
          announcementMessage,
          eventUrl: `${BASE_URL}/event/${eventId}`,
        });

        await sendEmail({
          to: contactInfo.email,
          subject: `Update: ${announcementTitle} - ${eventTitle}`,
          html: emailHtml,
          templateName: 'announcement',
        });
      } catch (error) {
        console.error('Error sending announcement email:', error);
      }
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
      try {
        // Parse poll options from message if available
        const pollOptions = pollMessage.includes('Vote:') 
          ? pollMessage.split('Vote:')[1]?.split(' or ').map(opt => opt.trim()).filter(Boolean)
          : undefined;

        const emailHtml = PollEmailTemplate({
          userName: contactInfo.name || 'there',
          eventTitle,
          pollQuestion: pollTitle,
          pollOptions,
          eventUrl: `${BASE_URL}/event/${eventId}`,
        });

        await sendEmail({
          to: contactInfo.email,
          subject: `New Poll: ${pollTitle} - ${eventTitle}`,
          html: emailHtml,
          templateName: 'poll',
        });
      } catch (error) {
        console.error('Error sending poll email:', error);
      }
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
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #15383c;">New message in ${eventTitle}</h2>
            <p>Hello ${contactInfo.name || 'there'},</p>
            <div style="background-color: #f8fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;"><strong>${senderName}</strong> sent a message:</p>
              <p style="margin: 0; color: #333; line-height: 1.6;">"${messageSnippet}"</p>
            </div>
            <a href="${BASE_URL}/event/${eventId}" style="display: inline-block; background-color: #e35e25; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">View Event</a>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              Popera Team<br>
              <a href="mailto:support@gopopera.ca" style="color: #e35e25;">support@gopopera.ca</a>
            </p>
          </div>
        `;
        await sendEmail({
          to: contactInfo.email,
          subject: `New message in ${eventTitle}`,
          html: emailHtml,
          templateName: 'new-message',
        });
      } catch (error) {
        console.error('Error sending new message email:', error);
      }
    }

    // SMS (usually disabled for messages to avoid spam)
    // Uncomment if needed:
    // if (preferences.sms_opt_in && contactInfo.phone) {
    //   await notifyNewMessageSMS(contactInfo.phone, eventTitle, senderName);
    // }
  });

  await Promise.all(notifications);
}

