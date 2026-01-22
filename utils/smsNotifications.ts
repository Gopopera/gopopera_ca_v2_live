/**
 * SMS Notifications Helper
 * Uses Vercel serverless function to send SMS via Twilio (server-side)
 * EU-compatible: no auto-prefix, expects E.164 input
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const IS_DEV = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface SMSOptions {
  to: string; // Phone number in E.164 format (e.g., +14165551234, +32475123456)
  message: string;
}

/**
 * Validate E.164 formatted phone number
 * Must start with + followed by 7-15 digits, first digit 1-9
 */
function validateE164Phone(phone: string): boolean {
  const cleanPhone = phone.trim().replace(/\s/g, '');
  if (!cleanPhone.startsWith('+')) return false;
  const digitsOnly = cleanPhone.slice(1).replace(/\D/g, '');
  // E.164: 7-15 digits, first digit must be 1-9 (country codes don't start with 0)
  return /^[1-9]\d{6,14}$/.test(digitsOnly);
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
 * Send SMS notification via serverless function (Twilio on server-side)
 * Expects phone number in E.164 format - NO auto-prefix applied
 */
export async function sendSMSNotification(options: SMSOptions): Promise<boolean> {
  const logId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const phone = options.to.trim();
  
  // Validate E.164 format - do NOT modify the number
  if (!validateE164Phone(phone)) {
    console.error('[SMS] Invalid phone number format:', { phone });
    logSMSToFirestore({
      id: logId,
      to: options.to,
      message: options.message,
      status: 'failed',
      error: `Invalid phone number format: ${options.to}. Must be E.164 format (e.g., +14165551234)`,
      timestamp: Date.now(),
    }).catch(() => {});
    return false;
  }

  try {
    if (IS_DEV) {
      console.log('[SMS] Sending SMS via serverless function:', { 
        to: phone,
        messageLength: options.message.length 
      });
    }

    // Send SMS via Vercel serverless function - pass E.164 number directly
    const response = await fetch(`${API_BASE_URL}/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        message: options.message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'SMS send failed');
    }

    if (IS_DEV) {
      console.log('[SMS] ✅ SMS sent successfully:', { messageId: result.messageId, to: phone });
    }

    // Log success to Firestore (non-blocking)
    logSMSToFirestore({
      id: logId,
      to: phone,
      message: options.message,
      status: 'sent',
      messageId: result.messageId,
      timestamp: Date.now(),
    }).catch(() => {});

    return true;
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    
    if (IS_DEV) {
      console.error('[SMS] ❌ Error sending SMS:', error);
    }
    
    // Log error to Firestore (non-blocking)
    logSMSToFirestore({
      id: logId,
      to: options.to,
      message: options.message,
      status: 'failed',
      error: errorMessage,
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
