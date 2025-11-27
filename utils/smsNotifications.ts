/**
 * SMS Notifications Helper
 * Uses Twilio API (mock until production)
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = import.meta.env.VITE_TWILIO_PHONE_NUMBER;
const TWILIO_API_URL = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
const IS_DEV = import.meta.env.DEV;

interface SMSOptions {
  to: string; // Phone number with country code (e.g., +1234567890)
  message: string;
}

/**
 * Log SMS attempt to Firestore
 */
async function logSMSToFirestore(log: {
  id: string;
  to: string;
  message: string;
  status: 'sent' | 'failed' | 'skipped';
  messageId?: string;
  error?: string;
  timestamp: number;
}): Promise<void> {
  try {
    const db = getDbSafe();
    if (!db) {
      if (IS_DEV) {
        console.warn('[SMS] Firestore not available for logging');
      }
      return;
    }

    await addDoc(collection(db, 'sms_logs'), {
      ...log,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Don't throw - logging failure shouldn't break SMS sending
    if (IS_DEV) {
      console.error('[SMS] Error logging to Firestore:', error);
    }
  }
}

/**
 * Send SMS notification using Twilio API (mock until production)
 * Logs all attempts to Firestore sms_logs collection
 */
export async function sendSMSNotification(options: SMSOptions): Promise<boolean> {
  const logId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    if (IS_DEV) {
      console.warn('[SMS] Twilio not configured. SMS notifications disabled.');
    }
    
    // Log skipped SMS
    logSMSToFirestore({
      id: logId,
      to: options.to,
      message: options.message,
      status: 'skipped',
      error: 'Twilio not configured',
      timestamp: Date.now(),
    }).catch(() => {});
    
    return false;
  }

  try {
    // Mock SMS sending for now (until production Twilio setup)
    // In production, uncomment the actual Twilio API call below
    
    if (IS_DEV) {
      console.log('[SMS] Mock SMS send:', { to: options.to, message: options.message.substring(0, 50) + '...' });
    }
    
    // Log successful mock send
    logSMSToFirestore({
      id: logId,
      to: options.to,
      message: options.message,
      status: 'sent',
      messageId: `mock_${logId}`,
      timestamp: Date.now(),
    }).catch(() => {});
    
    return true;
    
    /* Production Twilio API call (uncomment when ready):
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
      const success = data.sid ? true : false;
      
      // Log success
      logSMSToFirestore({
        id: logId,
        to: options.to,
        message: options.message,
        status: 'sent',
        messageId: data.sid,
        timestamp: Date.now(),
      }).catch(() => {});
      
      return success;
    } else {
      const error = await response.text();
      if (IS_DEV) {
        console.error('[SMS] Twilio API error:', error);
      }
      
      // Log failure
      logSMSToFirestore({
        id: logId,
        to: options.to,
        message: options.message,
        status: 'failed',
        error: error.substring(0, 200),
        timestamp: Date.now(),
      }).catch(() => {});
      
      return false;
    }
    */
  } catch (error: any) {
    if (IS_DEV) {
      console.error('[SMS] Error sending SMS:', error);
    }
    
    // Log error
    logSMSToFirestore({
      id: logId,
      to: options.to,
      message: options.message,
      status: 'failed',
      error: error.message || 'Unknown error',
      timestamp: Date.now(),
    }).catch(() => {});
    
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

