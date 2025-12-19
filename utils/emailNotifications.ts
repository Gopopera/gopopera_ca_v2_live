/**
 * Email Notifications Helper
 * Uses Resend API (or mailto fallback)
 */

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const RESEND_API_URL = 'https://api.resend.com/emails';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  name?: string;
}

/**
 * Send email notification using Resend API or mailto fallback
 */
export async function sendEmailNotification(options: EmailOptions): Promise<boolean> {
  // Try Resend API first if configured
  if (RESEND_API_KEY) {
    try {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Popera. <notifications@gopopera.ca>',
          to: options.to,
          subject: options.subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 16px;">
              <div style="background: linear-gradient(135deg, #15383c 0%, #1f4d52 100%); padding: 20px 32px; text-align: center; margin: -16px -16px 20px -16px; border-radius: 12px 12px 0 0;">
                <span style="color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: -0.5px; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Popera</span><span style="display: inline-block; width: 4px; height: 4px; background-color: #e35e25; border-radius: 50%; margin-left: 1px; vertical-align: baseline; margin-bottom: 3px;"></span>
              </div>
              <h2 style="color: #15383c; margin-top: 0;">${options.subject}</h2>
              <p>Hello ${options.name || 'there'},</p>
              <div style="color: #333; line-height: 1.6;">
                ${options.body.replace(/\n/g, '<br>')}
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">
                Popera Team<br>
                <a href="mailto:support@gopopera.ca" style="color: #e35e25;">support@gopopera.ca</a>
              </p>
            </div>
          `,
        }),
      });

      if (response.ok) {
        return true;
      }
    } catch (error) {
      console.error('Resend API error:', error);
      // Fall through to mailto fallback
    }
  }

  // Fallback to mailto
  const subject = encodeURIComponent(options.subject);
  const body = encodeURIComponent(`Hello ${options.name || 'there'},\n\n${options.body}\n\nPopera. Team\nsupport@gopopera.ca`);
  window.location.href = `mailto:${options.to}?subject=${subject}&body=${body}`;
  
  return false; // mailto doesn't guarantee delivery
}

/**
 * Send notification email for new event from followed host
 */
export async function notifyNewEventFromHost(
  userEmail: string,
  userName: string,
  hostName: string,
  eventTitle: string,
  eventId: string
): Promise<void> {
  await sendEmailNotification({
    to: userEmail,
    name: userName,
    subject: `New Event from ${hostName} on Popera`,
    body: `${hostName} just created a new pop-up: "${eventTitle}"\n\nCheck it out and reserve your spot!`,
  });
}

/**
 * Send notification email for announcement
 */
export async function notifyAnnouncement(
  userEmail: string,
  userName: string,
  eventTitle: string,
  announcementTitle: string,
  announcementMessage: string
): Promise<void> {
  await sendEmailNotification({
    to: userEmail,
    name: userName,
    subject: `Update: ${announcementTitle} - ${eventTitle}`,
    body: `${announcementTitle}\n\n${announcementMessage}\n\nEvent: ${eventTitle}`,
  });
}

/**
 * Send notification email for poll
 */
export async function notifyPoll(
  userEmail: string,
  userName: string,
  eventTitle: string,
  pollTitle: string,
  pollMessage: string
): Promise<void> {
  await sendEmailNotification({
    to: userEmail,
    name: userName,
    subject: `New Poll: ${pollTitle} - ${eventTitle}`,
    body: `${pollTitle}\n\n${pollMessage}\n\nEvent: ${eventTitle}\n\nVote now in the event chat!`,
  });
}

/**
 * Send notification email for new message
 */
export async function notifyNewMessage(
  userEmail: string,
  userName: string,
  eventTitle: string,
  senderName: string,
  messageSnippet: string
): Promise<void> {
  await sendEmailNotification({
    to: userEmail,
    name: userName,
    subject: `New message in ${eventTitle}`,
    body: `${senderName} sent a message:\n\n"${messageSnippet}"\n\nEvent: ${eventTitle}`,
  });
}

