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
import { ReservationConfirmationEmailTemplate } from '../src/emails/templates/ReservationConfirmationEmail';
import { FirstEventWelcomeEmailTemplate } from '../src/emails/templates/FirstEventWelcomeEmail';

/**
 * Get Popera logo header HTML for emails
 */
function getPoperaLogoHeader(): string {
  return `
    <div style="background: linear-gradient(135deg, #15383c 0%, #1f4d52 100%); padding: 24px 32px; text-align: center; margin: -20px -20px 20px -20px; border-radius: 16px 16px 0 0;">
      <div style="display: inline-flex; align-items: baseline; margin: 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: -0.5px; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Popera</h1>
        <span style="display: inline-block; width: 3.5px; height: 3.5px; background-color: #e35e25; border-radius: 50%; flex-shrink: 0; margin-left: 1px; align-self: baseline;"></span>
      </div>
    </div>
  `;
}

// Base URL for event links (fallback to window.location.origin if not set)
const BASE_URL = import.meta.env.VITE_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://gopopera.ca');

interface UserNotificationPreferences {
  email_opt_in?: boolean;
  sms_opt_in?: boolean;
  notification_opt_in?: boolean;
}

/**
 * Get user notification preferences
 * Backward compatible: defaults to opt-in if no preference exists
 */
async function getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences> {
  const db = getDbSafe();
  if (!db) {
    // Default to opt-in if no DB (all enabled by default)
    return { email_opt_in: true, sms_opt_in: true, notification_opt_in: true };
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const data = userDoc.data();
    
    // Check both notification_settings and notificationPreferences (backward compatibility)
    const settings = data?.notification_settings || data?.notificationPreferences || {};
    
    // Default to opt-in if preference doesn't exist (backward compatible, all enabled by default)
    return {
      email_opt_in: settings.email_opt_in !== undefined ? settings.email_opt_in : (settings.email !== undefined ? settings.email : true),
      sms_opt_in: settings.sms_opt_in !== undefined ? settings.sms_opt_in : (settings.sms !== undefined ? settings.sms : true),
      notification_opt_in: settings.notification_opt_in !== undefined ? settings.notification_opt_in : true,
    };
  } catch (error) {
    console.error('[NOTIFICATION_HELPERS] Error fetching notification preferences:', error);
    // Default to opt-in on error (all enabled by default)
    return { email_opt_in: true, sms_opt_in: true, notification_opt_in: true };
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
    type: 'new-event' | 'new-rsvp' | 'announcement' | 'poll' | 'new-message' | 'followed-host-event' | 'new-follower' | 'new-favorite' | 'event-getting-full' | 'event-trending' | 'follow-host-suggestion';
    title: string;
    body: string;
    eventId?: string;
    hostId?: string;
  },
  emailContent?: { subject: string; body: string },
  smsContent?: { message: string }
): Promise<void> {
  console.log('[NOTIFICATION_HELPERS] 📨 sendComprehensiveNotification called:', {
    userId,
    type: notification.type,
    title: notification.title,
    eventId: notification.eventId,
    hasEmailContent: !!emailContent,
    hasSmsContent: !!smsContent,
  });

  const preferences = await getUserNotificationPreferences(userId);
  const contactInfo = await getUserContactInfo(userId);

  console.log('[NOTIFICATION_HELPERS] 👤 User info retrieved:', {
    userId,
    hasEmail: !!contactInfo.email,
    hasPhone: !!contactInfo.phone,
    preferences: {
      email_opt_in: preferences.email_opt_in,
      sms_opt_in: preferences.sms_opt_in,
      notification_opt_in: preferences.notification_opt_in,
    },
  });

  // ALWAYS create in-app notification (cannot be disabled for better UX)
  // In-app notifications are essential for user engagement and should always be sent
  try {
    console.log('[NOTIFICATION_HELPERS] 📝 Creating in-app notification:', {
      userId,
      path: `users/${userId}/notifications`,
      type: notification.type,
    });
    await createNotification(userId, {
      ...notification,
      userId: userId,
    });
    console.log('[NOTIFICATION_HELPERS] ✅ In-app notification created successfully');
  } catch (error: any) {
    console.error('[NOTIFICATION_HELPERS] ❌ Error creating in-app notification:', {
      userId,
      path: `users/${userId}/notifications`,
      type: notification.type,
      error: error?.message || error,
      code: error?.code,
      stack: error?.stack,
    });
    // Don't throw - continue with email/SMS even if in-app fails
  }

  // Send email if enabled
  if (preferences.email_opt_in && contactInfo.email && emailContent) {
    try {
      // Use simple HTML email for generic notifications
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #15383c 0%, #1f4d52 100%); padding: 24px 32px; text-align: center; margin: -20px -20px 20px -20px; border-radius: 16px 16px 0 0;">
            <div style="display: inline-flex; align-items: baseline; margin: 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: -0.5px; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Popera</h1>
              <span style="display: inline-block; width: 3.5px; height: 3.5px; background-color: #e35e25; border-radius: 50%; flex-shrink: 0; margin-left: 1px; align-self: baseline;"></span>
            </div>
          </div>
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

    // ALWAYS send in-app notification (cannot be disabled)
    try {
      await createNotification(followerId, {
        userId: followerId,
        type: 'followed-host-event',
        title: 'New Event from Host You Follow',
        body: `${eventTitle} - Check it out!`,
        eventId,
        hostId,
      });
    } catch (error) {
      // Don't throw - continue with email/SMS
      console.error('[NOTIFICATION_HELPERS] ❌ Error creating follow event notification:', error);
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
          eventId,
          notificationType: 'follow_new_event',
          skippedByPreference: !preferences.email_opt_in,
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

    // ALWAYS send in-app notification (cannot be disabled)
    try {
      await createNotification(userId, {
        userId,
        type: 'announcement',
        title: announcementTitle,
        body: announcementMessage,
        eventId,
      });
    } catch (error) {
      console.error('[NOTIFICATION_HELPERS] ❌ Error creating announcement notification:', error);
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
          eventId,
          notificationType: 'announcement_created',
          skippedByPreference: false,
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending announcement email:', error);
      }
    } else if (contactInfo.email) {
      // Log skipped email due to preference
      try {
        await sendEmail({
          to: contactInfo.email,
          subject: `Update: ${announcementTitle} - ${eventTitle}`,
          html: '',
          templateName: 'announcement',
          eventId,
          notificationType: 'announcement_created',
          skippedByPreference: true,
        });
      } catch (error) {
        // Silent fail for skipped emails
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

    // ALWAYS send in-app notification (cannot be disabled)
    try {
      await createNotification(userId, {
        userId,
        type: 'poll',
        title: pollTitle,
        body: pollMessage,
        eventId,
      });
    } catch (error) {
      console.error('[NOTIFICATION_HELPERS] ❌ Error creating poll notification:', error);
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
          eventId,
          notificationType: 'poll_created',
          skippedByPreference: false,
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
    try {
      const contactInfo = await getUserContactInfo(userId);
      const preferences = await getUserNotificationPreferences(userId);

      // ALWAYS send in-app notification (cannot be disabled)
      try {
        console.log('[NOTIFICATIONS] 📬 Creating message notification:', {
          userId,
          eventId,
          senderId,
          senderName,
          messageSnippet: messageSnippet.substring(0, 50),
          path: `users/${userId}/notifications`,
        });
        await createNotification(userId, {
          userId,
          type: 'new-message',
          title: `New message in ${eventTitle}`,
          body: `${senderName}: ${messageSnippet}`,
          eventId,
        });
        console.log(`[NOTIFICATIONS] ✅ In-app notification sent to ${userId} for message in ${eventTitle}`);
      } catch (error: any) {
        console.error(`[NOTIFICATIONS] ❌ Error creating in-app notification for ${userId}:`, {
          userId,
          eventId,
          senderId,
          error: error?.message || error,
          code: error?.code,
          stack: error?.stack,
          path: `users/${userId}/notifications`,
        });
        // Continue with email/SMS even if in-app fails
      }

      // Email (optional, based on user preferences)
      if (preferences.email_opt_in && contactInfo.email) {
        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              ${getPoperaLogoHeader()}
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
          console.log(`[NOTIFICATIONS] ✅ Email notification sent to ${contactInfo.email} for message in ${eventTitle}`);
        } catch (error) {
          console.error(`[NOTIFICATIONS] ❌ Error sending email to ${contactInfo.email}:`, error);
        }
      } else if (contactInfo.email) {
        console.log(`[NOTIFICATIONS] ⏭️ Email skipped for ${userId} (preference: email_opt_in=${preferences.email_opt_in})`);
      }

      // SMS (optional, based on user preferences)
      if (preferences.sms_opt_in && contactInfo.phone) {
        try {
          await sendSMSNotification({
            to: contactInfo.phone,
            message: `New message in ${eventTitle} from ${senderName}: ${messageSnippet}`,
          });
          console.log(`[NOTIFICATIONS] ✅ SMS notification sent to ${contactInfo.phone} for message in ${eventTitle}`);
        } catch (error) {
          console.error(`[NOTIFICATIONS] ❌ Error sending SMS to ${contactInfo.phone}:`, error);
        }
      } else if (contactInfo.phone) {
        console.log(`[NOTIFICATIONS] ⏭️ SMS skipped for ${userId} (preference: sms_opt_in=${preferences.sms_opt_in})`);
      }
    } catch (error) {
      console.error(`[NOTIFICATIONS] ❌ Error processing notification for user ${userId}:`, error);
      // Continue with other recipients even if one fails
    }
  });

  await Promise.all(notifications);
  console.log(`[NOTIFICATIONS] ✅ Completed sending message notifications to ${recipients.length} recipients for event ${eventId}`);
}

/**
 * Notify user of their reservation confirmation
 */
export async function notifyUserOfReservationConfirmation(
  userId: string,
  eventId: string,
  reservationId: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  eventLocation: string,
  attendeeCount?: number,
  totalAmount?: number
): Promise<void> {
  try {
    const userInfo = await getUserContactInfo(userId);
    const preferences = await getUserNotificationPreferences(userId);
    const orderId = `#${reservationId.substring(0, 10).toUpperCase()}`;
    const eventUrl = `${BASE_URL}/event/${eventId}`;

    // ALWAYS send in-app notification (cannot be disabled)
    try {
      await createNotification(userId, {
        userId,
        type: 'new-rsvp',
        title: 'Reservation Confirmed! 🎉',
        body: `Your reservation for ${eventTitle} has been confirmed`,
        eventId,
      });
    } catch (error) {
      console.error('[NOTIFICATION_HELPERS] ❌ Error creating reservation confirmation notification:', error);
    }

    // Email notification
    if (preferences.email_opt_in && userInfo.email) {
      try {
        const emailHtml = ReservationConfirmationEmailTemplate({
          userName: userInfo.name || 'there',
          eventTitle,
          eventDate,
          eventTime,
          eventLocation,
          reservationId,
          orderId,
          eventUrl,
          attendeeCount,
          totalAmount,
        });

        await sendEmail({
          to: userInfo.email,
          subject: `Reservation Confirmed: ${eventTitle}`,
          html: emailHtml,
          templateName: 'reservation-confirmation',
          eventId,
          notificationType: 'reservation_confirmation',
          skippedByPreference: false,
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending reservation confirmation email:', error);
      }
    } else if (userInfo.email) {
      // Log skipped email due to preference
      try {
        await sendEmail({
          to: userInfo.email,
          subject: `Reservation Confirmed: ${eventTitle}`,
          html: '',
          templateName: 'reservation-confirmation',
          eventId,
          notificationType: 'reservation_confirmation',
          skippedByPreference: true,
        });
      } catch (error) {
        // Silent fail for skipped emails
      }
    }

    // SMS notification
    if (preferences.sms_opt_in && userInfo.phone) {
      try {
        await sendSMSNotification({
          to: userInfo.phone,
          message: `🎉 Reservation confirmed! ${eventTitle} on ${eventDate} at ${eventTime}. Order ID: ${orderId}. View details: ${eventUrl}`,
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending reservation confirmation SMS:', error);
      }
    }
  } catch (error) {
    console.error('[NOTIFICATION_HELPERS] ❌ Error notifying user of reservation confirmation:', error);
    // Don't throw - reservation should succeed even if notification fails
  }
}

/**
 * Notify host when a user RSVPs to their event
 */
export async function notifyHostOfRSVP(
  hostId: string,
  attendeeId: string,
  eventId: string,
  eventTitle: string
): Promise<void> {
  try {
    const hostInfo = await getUserContactInfo(hostId);
    const attendeeInfo = await getUserContactInfo(attendeeId);
    const preferences = await getUserNotificationPreferences(hostId);

    // ALWAYS send in-app notification (cannot be disabled)
    try {
      console.log('[NOTIFICATIONS] 📬 Creating RSVP notification:', {
        hostId,
        attendeeId,
        eventId,
        eventTitle,
        attendeeName: attendeeInfo.name,
      });
      await createNotification(hostId, {
        userId: hostId,
        type: 'new-rsvp',
        title: 'New RSVP',
        body: `${attendeeInfo.name || 'Someone'} RSVP'd to ${eventTitle}`,
        eventId,
      });
      console.log('[NOTIFICATIONS] ✅ RSVP notification created successfully:', {
        hostId,
        eventId,
      });
    } catch (error: any) {
      console.error('[NOTIFICATIONS] ❌ Error creating RSVP notification:', {
        hostId,
        eventId,
        error: error?.message || error,
        code: error?.code,
        stack: error?.stack,
      });
    }

    // Email notification
    if (preferences.email_opt_in && hostInfo.email) {
      try {
        const emailHtml = RSVPHostNotificationTemplate({
          hostName: hostInfo.name || 'Host',
          attendeeName: attendeeInfo.name || 'Someone',
          attendeeEmail: attendeeInfo.email || '',
          eventTitle,
          eventUrl: `${BASE_URL}/event/${eventId}`,
        });

        await sendEmail({
          to: hostInfo.email,
          subject: `New RSVP: ${eventTitle}`,
          html: emailHtml,
          templateName: 'rsvp-host-notification',
          eventId,
          notificationType: 'rsvp_host',
          skippedByPreference: false,
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending RSVP email to host:', error);
      }
    } else if (hostInfo.email) {
      // Log skipped email due to preference
      try {
        await sendEmail({
          to: hostInfo.email,
          subject: `New RSVP: ${eventTitle}`,
          html: '',
          templateName: 'rsvp-host-notification',
          eventId,
          notificationType: 'rsvp_host',
          skippedByPreference: true,
        });
      } catch (error) {
        // Silent fail for skipped emails
      }
    }

    // SMS (optional)
    if (preferences.sms_opt_in && hostInfo.phone) {
      try {
        await sendSMSNotification({
          to: hostInfo.phone,
          message: `New RSVP: ${attendeeInfo.name || 'Someone'} joined ${eventTitle}`,
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending RSVP SMS to host:', error);
      }
    }
  } catch (error) {
    console.error('[NOTIFICATION_HELPERS] ❌ Error notifying host of RSVP:', error);
    // Don't throw - RSVP should succeed even if notification fails
  }
}

/**
 * Notify user when they create their first event
 */
export async function notifyUserOfFirstEvent(
  userId: string,
  eventId: string,
  eventTitle: string
): Promise<void> {
  try {
    const userInfo = await getUserContactInfo(userId);
    const preferences = await getUserNotificationPreferences(userId);
    const eventUrl = `${BASE_URL}/event/${eventId}`;

    // ALWAYS send in-app notification (cannot be disabled)
    try {
      await createNotification(userId, {
        userId,
        type: 'new-event',
        title: 'Welcome to Popera! 🎉',
        body: `Your first event "${eventTitle}" has been created successfully`,
        eventId,
      });
    } catch (error) {
      console.error('[NOTIFICATION_HELPERS] ❌ Error creating first event notification:', error);
    }

    // Email notification
    if (preferences.email_opt_in && userInfo.email) {
      try {
        const emailHtml = FirstEventWelcomeEmailTemplate({
          userName: userInfo.name || 'there',
          eventTitle,
          eventUrl,
        });

        await sendEmail({
          to: userInfo.email,
          subject: 'Welcome to Popera! Your First Event is Live 🎉',
          html: emailHtml,
          templateName: 'first-event-welcome',
          eventId,
          notificationType: 'first_event_welcome',
          skippedByPreference: false,
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending first event welcome email:', error);
      }
    } else if (userInfo.email) {
      // Log skipped email due to preference
      try {
        await sendEmail({
          to: userInfo.email,
          subject: 'Welcome to Popera! Your First Event is Live 🎉',
          html: '',
          templateName: 'first-event-welcome',
          eventId,
          notificationType: 'first_event_welcome',
          skippedByPreference: true,
        });
      } catch (error) {
        // Silent fail for skipped emails
      }
    }

    // SMS notification (optional, but nice for first-time creators)
    if (preferences.sms_opt_in && userInfo.phone) {
      try {
        await sendSMSNotification({
          to: userInfo.phone,
          message: `🎉 Welcome to Popera! Your first event "${eventTitle}" is now live. Thank you for joining our community of creators. Questions? Contact us at support@gopopera.ca`,
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending first event welcome SMS:', error);
      }
    }
  } catch (error) {
    console.error('[NOTIFICATION_HELPERS] ❌ Error notifying user of first event:', error);
    // Don't throw - event creation should succeed even if notification fails
  }
}

/**
 * Notify host when they gain a new follower
 */
export async function notifyHostOfNewFollower(
  hostId: string,
  followerId: string
): Promise<void> {
  try {
    const hostInfo = await getUserContactInfo(hostId);
    const followerInfo = await getUserContactInfo(followerId);
    const preferences = await getUserNotificationPreferences(hostId);

    // ALWAYS send in-app notification (cannot be disabled)
    try {
      console.log('[NOTIFICATIONS] 📬 Creating follower notification:', {
        hostId,
        followerId,
        followerName: followerInfo.name,
        path: `users/${hostId}/notifications`,
      });
      await createNotification(hostId, {
        userId: hostId,
        type: 'new-follower',
        title: 'New Follower',
        body: `${followerInfo.name || 'Someone'} started following you`,
        hostId: hostId,
      });
      console.log('[NOTIFICATIONS] ✅ Follower notification created successfully:', {
        hostId,
        followerId,
      });
    } catch (error: any) {
      console.error('[NOTIFICATIONS] ❌ Error creating follower notification:', {
        hostId,
        followerId,
        error: error?.message || error,
        code: error?.code,
        stack: error?.stack,
        path: `users/${hostId}/notifications`,
      });
    }

    // Email (optional, host preference)
    if (preferences.email_opt_in && hostInfo.email) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${getPoperaLogoHeader()}
            <h2 style="color: #15383c;">New Follower on Popera</h2>
            <p>Hello ${hostInfo.name || 'there'},</p>
            <div style="background-color: #f8fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #333; line-height: 1.6;">
                <strong>${followerInfo.name || 'Someone'}</strong> started following you on Popera!
              </p>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              When you create new events, your followers will be notified automatically.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              Popera Team<br>
              <a href="mailto:support@gopopera.ca" style="color: #e35e25;">support@gopopera.ca</a>
            </p>
          </div>
        `;
        await sendEmail({
          to: hostInfo.email,
          subject: `New Follower: ${followerInfo.name || 'Someone'} is following you`,
          html: emailHtml,
          templateName: 'new-follower',
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending new follower email:', error);
      }
    }

    // SMS notification
    if (preferences.sms_opt_in && hostInfo.phone) {
      try {
        await sendSMSNotification({
          to: hostInfo.phone,
          message: `🎉 New follower! ${followerInfo.name || 'Someone'} started following you on Popera.`,
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending new follower SMS:', error);
      }
    }
  } catch (error) {
    console.error('[NOTIFICATION_HELPERS] ❌ Error notifying host of new follower:', error);
    // Don't throw - follow should succeed even if notification fails
  }
}

/**
 * Notify host when someone favorites their event
 */
export async function notifyHostOfNewFavorite(
  hostId: string,
  favoriterId: string,
  eventId: string,
  eventTitle: string
): Promise<void> {
  try {
    const hostInfo = await getUserContactInfo(hostId);
    const favoriterInfo = await getUserContactInfo(favoriterId);
    const preferences = await getUserNotificationPreferences(hostId);

    // ALWAYS send in-app notification (cannot be disabled)
    try {
      await createNotification(hostId, {
        userId: hostId,
        type: 'new-favorite',
        title: 'New Favorite',
        body: `${favoriterInfo.name || 'Someone'} favorited your event "${eventTitle}"`,
        eventId,
      });
    } catch (error) {
      console.error('[NOTIFICATION_HELPERS] ❌ Error creating new favorite notification:', error);
    }

    // Email notification (based on preferences)
    if (preferences.email_opt_in && hostInfo.email) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${getPoperaLogoHeader()}
            <h2 style="color: #15383c;">Someone Favorited Your Event</h2>
            <p>Hello ${hostInfo.name || 'there'},</p>
            <div style="background-color: #f8fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #333; line-height: 1.6;">
                <strong>${favoriterInfo.name || 'Someone'}</strong> favorited your event <strong>"${eventTitle}"</strong>!
              </p>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Keep creating amazing events to engage your community!
            </p>
            <div style="margin: 20px 0;">
              <a href="${BASE_URL}/event/${eventId}" style="display: inline-block; background-color: #e35e25; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Event</a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              Popera Team<br>
              <a href="mailto:support@gopopera.ca" style="color: #e35e25;">support@gopopera.ca</a>
            </p>
          </div>
        `;
        await sendEmail({
          to: hostInfo.email,
          subject: `Someone favorited your event: ${eventTitle}`,
          html: emailHtml,
          templateName: 'new-favorite',
          eventId,
          notificationType: 'favorite_event',
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending new favorite email:', error);
      }
    }

    // SMS notification (based on preferences)
    if (preferences.sms_opt_in && hostInfo.phone) {
      try {
        await sendSMSNotification({
          to: hostInfo.phone,
          message: `⭐ ${favoriterInfo.name || 'Someone'} favorited your event "${eventTitle}" on Popera!`,
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending new favorite SMS:', error);
      }
    }
  } catch (error) {
    console.error('[NOTIFICATION_HELPERS] ❌ Error notifying host of new favorite:', error);
    // Don't throw - favorite should succeed even if notification fails
  }
}

/**
 * Notify users who favorited an event that it's getting full
 */
export async function notifyUsersEventGettingFull(
  eventId: string,
  eventTitle: string,
  capacityPercentage: number,
  userIds: string[]
): Promise<void> {
  if (userIds.length === 0) return;

  const notifications = userIds.map(async (userId) => {
    const contactInfo = await getUserContactInfo(userId);
    const preferences = await getUserNotificationPreferences(userId);

    // ALWAYS send in-app notification (cannot be disabled)
    try {
      await createNotification(userId, {
        userId,
        type: 'event-getting-full',
        title: 'Event Getting Full!',
        body: `${eventTitle} is ${capacityPercentage}% full - Reserve your spot now!`,
        eventId,
      });
    } catch (error) {
      console.error('[NOTIFICATION_HELPERS] ❌ Error creating event getting full notification:', error);
    }

    // Email
    if (preferences.email_opt_in && contactInfo.email) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${getPoperaLogoHeader()}
            <h2 style="color: #15383c;">${eventTitle} is Getting Full!</h2>
            <p>Hello ${contactInfo.name || 'there'},</p>
            <div style="background-color: #fff7ed; border-left: 4px solid #e35e25; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #333; line-height: 1.6; font-size: 18px; font-weight: bold;">
                This event is ${capacityPercentage}% full!
              </p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              You favorited this event but haven't reserved yet. Don't miss out - secure your spot now!
            </p>
            <a href="${BASE_URL}/event/${eventId}" style="display: inline-block; background-color: #e35e25; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold;">Reserve Now</a>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              Popera Team<br>
              <a href="mailto:support@gopopera.ca" style="color: #e35e25;">support@gopopera.ca</a>
            </p>
          </div>
        `;
        await sendEmail({
          to: contactInfo.email,
          subject: `Hurry! ${eventTitle} is ${capacityPercentage}% full`,
          html: emailHtml,
          templateName: 'event-getting-full',
          eventId,
          notificationType: 'event_getting_full',
          skippedByPreference: false,
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending event getting full email:', error);
      }
    }

    // SMS (optional, user preference)
    if (preferences.sms_opt_in && contactInfo.phone) {
      try {
        await sendSMSNotification({
          to: contactInfo.phone,
          message: `Popera: ${eventTitle} is ${capacityPercentage}% full! Reserve now: ${BASE_URL}/event/${eventId}`,
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending event getting full SMS:', error);
      }
    }
  });

  await Promise.all(notifications);
}

/**
 * Notify host when their event is trending
 */
export async function notifyHostEventTrending(
  hostId: string,
  eventId: string,
  eventTitle: string,
  trendingReason: string
): Promise<void> {
  try {
    const hostInfo = await getUserContactInfo(hostId);
    const preferences = await getUserNotificationPreferences(hostId);

    // ALWAYS send in-app notification (cannot be disabled)
    try {
      await createNotification(hostId, {
        userId: hostId,
        type: 'event-trending',
        title: 'Your Event is Trending! 🔥',
        body: `${eventTitle} is getting lots of attention: ${trendingReason}`,
        eventId,
      });
    } catch (error) {
      console.error('[NOTIFICATION_HELPERS] ❌ Error creating event trending notification:', error);
    }

    // Email
    if (preferences.email_opt_in && hostInfo.email) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${getPoperaLogoHeader()}
            <h2 style="color: #15383c;">Your Event is Trending! 🔥</h2>
            <p>Hello ${hostInfo.name || 'there'},</p>
            <div style="background-color: #fff7ed; border-left: 4px solid #e35e25; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #333; line-height: 1.6; font-size: 18px; font-weight: bold;">
                ${eventTitle} is getting lots of attention!
              </p>
              <p style="margin: 8px 0 0 0; color: #666; line-height: 1.6;">
                ${trendingReason}
              </p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              Keep the momentum going! Engage with your attendees in the group chat and share updates.
            </p>
            <a href="${BASE_URL}/event/${eventId}" style="display: inline-block; background-color: #e35e25; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold;">View Event</a>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              Popera Team<br>
              <a href="mailto:support@gopopera.ca" style="color: #e35e25;">support@gopopera.ca</a>
            </p>
          </div>
        `;
        await sendEmail({
          to: hostInfo.email,
          subject: `🔥 Your Event "${eventTitle}" is Trending!`,
          html: emailHtml,
          templateName: 'event-trending',
          eventId,
          notificationType: 'event_trending',
          skippedByPreference: false,
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending event trending email:', error);
      }
    }

    // SMS (optional, host preference)
    if (preferences.sms_opt_in && hostInfo.phone) {
      try {
        await sendSMSNotification({
          to: hostInfo.phone,
          message: `🔥 Popera: Your event "${eventTitle}" is trending! ${trendingReason}`,
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending event trending SMS:', error);
      }
    }
  } catch (error) {
    console.error('[NOTIFICATION_HELPERS] ❌ Error notifying host of trending event:', error);
    // Don't throw - analytics notification shouldn't break anything
  }
}

/**
 * Suggest following host after event ends
 */
export async function suggestFollowingHost(
  attendeeId: string,
  hostId: string,
  eventId: string,
  eventTitle: string
): Promise<void> {
  try {
    const attendeeInfo = await getUserContactInfo(attendeeId);
    const hostInfo = await getUserContactInfo(hostId);
    const preferences = await getUserNotificationPreferences(attendeeId);

    // Check if already following (don't suggest if already following)
    const { isFollowing } = await import('../firebase/follow');
    const alreadyFollowing = await isFollowing(attendeeId, hostId);
    if (alreadyFollowing) {
      return; // Don't send suggestion if already following
    }

    // ALWAYS send in-app notification (cannot be disabled)
    try {
      await createNotification(attendeeId, {
        userId: attendeeId,
        type: 'follow-host-suggestion',
        title: 'Follow the Host',
        body: `Follow ${hostInfo.name || 'the host'} to get notified about their next pop-up!`,
        eventId,
        hostId,
      });
    } catch (error) {
      console.error('[NOTIFICATION_HELPERS] ❌ Error creating follow host suggestion notification:', error);
    }

    // Email (optional)
    if (preferences.email_opt_in && attendeeInfo.email) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #15383c;">Follow ${hostInfo.name || 'the host'} for More Pop-ups!</h2>
            <p>Hello ${attendeeInfo.name || 'there'},</p>
            <p style="color: #666; line-height: 1.6;">
              You recently attended <strong>${eventTitle}</strong>. Follow ${hostInfo.name || 'the host'} to get notified when they create their next pop-up!
            </p>
            <a href="${BASE_URL}/event/${eventId}" style="display: inline-block; background-color: #e35e25; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold;">Follow Host</a>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              Popera Team<br>
              <a href="mailto:support@gopopera.ca" style="color: #e35e25;">support@gopopera.ca</a>
            </p>
          </div>
        `;
        await sendEmail({
          to: attendeeInfo.email,
          subject: `Follow ${hostInfo.name || 'the host'} for More Pop-ups!`,
          html: emailHtml,
          templateName: 'follow-host-suggestion',
          eventId,
          notificationType: 'follow_host_suggestion',
          skippedByPreference: false,
        });
      } catch (error) {
        console.error('[NOTIFICATION_HELPERS] ❌ Error sending follow host suggestion email:', error);
      }
    }

    // SMS disabled (social, not urgent)
  } catch (error) {
    console.error('[NOTIFICATION_HELPERS] ❌ Error suggesting follow host:', error);
    // Don't throw - suggestion shouldn't break anything
  }
}

