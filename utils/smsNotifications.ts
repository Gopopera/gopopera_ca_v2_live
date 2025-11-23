/**
 * SMS Notifications Helper
 * Uses Twilio API
 */

const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = import.meta.env.VITE_TWILIO_PHONE_NUMBER;
const TWILIO_API_URL = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

interface SMSOptions {
  to: string; // Phone number with country code (e.g., +1234567890)
  message: string;
}

/**
 * Send SMS notification using Twilio API
 */
export async function sendSMSNotification(options: SMSOptions): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('Twilio not configured. SMS notifications disabled.');
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('From', TWILIO_PHONE_NUMBER);
    formData.append('To', options.to);
    formData.append('Body', options.message);

    const response = await fetch(TWILIO_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (response.ok) {
      const data = await response.json();
      return data.sid ? true : false;
    } else {
      const error = await response.text();
      console.error('Twilio API error:', error);
      return false;
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}

/**
 * Send SMS for new event from followed host
 */
export async function notifyNewEventSMS(
  phoneNumber: string,
  hostName: string,
  eventTitle: string
): Promise<boolean> {
  return sendSMSNotification({
    to: phoneNumber,
    message: `Popera: ${hostName} created "${eventTitle}". Check it out!`,
  });
}

/**
 * Send SMS for announcement
 */
export async function notifyAnnouncementSMS(
  phoneNumber: string,
  eventTitle: string,
  announcementTitle: string
): Promise<boolean> {
  return sendSMSNotification({
    to: phoneNumber,
    message: `Popera Update: ${announcementTitle} - ${eventTitle}`,
  });
}

/**
 * Send SMS for poll
 */
export async function notifyPollSMS(
  phoneNumber: string,
  eventTitle: string,
  pollTitle: string
): Promise<boolean> {
  return sendSMSNotification({
    to: phoneNumber,
    message: `Popera Poll: ${pollTitle} - ${eventTitle}. Vote now!`,
  });
}

/**
 * Send SMS for new message (optional, can be disabled for high-volume chats)
 */
export async function notifyNewMessageSMS(
  phoneNumber: string,
  eventTitle: string,
  senderName: string
): Promise<boolean> {
  return sendSMSNotification({
    to: phoneNumber,
    message: `Popera: New message from ${senderName} in ${eventTitle}`,
  });
}

