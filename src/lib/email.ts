/**
 * Resend Email Service
 * Universal email sending with logging
 */

import { Resend } from 'resend';
import { getDbSafe } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const RESEND_FROM = import.meta.env.VITE_RESEND_FROM || 'support@gopopera.ca';
const IS_DEV = import.meta.env.DEV;

// Validate Resend environment variables
if (typeof window !== 'undefined' && !RESEND_API_KEY) {
  console.warn('⚠️ Missing Resend environment variable: VITE_RESEND_API_KEY');
  console.warn('⚠️ Email sending will be disabled. Please configure VITE_RESEND_API_KEY in your deployment platform.');
}

// Initialize Resend client with API key
export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Timeout helper for email requests (8 seconds max)
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Email request timeout after 8 seconds')), timeoutMs)
    )
  ]);
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  metadata?: Record<string, string>;
  templateName?: string; // For logging purposes
  eventId?: string; // For idempotency checks
  notificationType?: string; // For idempotency checks (e.g., 'follow_new_event', 'rsvp_host')
  skippedByPreference?: boolean; // If email was skipped due to user preferences
}

/**
 * Check if email was already sent (idempotency check)
 */
async function checkEmailAlreadySent(eventId?: string, notificationType?: string, toEmail?: string): Promise<boolean> {
  if (!eventId || !notificationType) return false;
  
  try {
    const db = getDbSafe();
    if (!db) return false;
    
    const logsRef = collection(db, 'email_logs');
    const q = query(
      logsRef,
      where('eventId', '==', eventId),
      where('type', '==', notificationType),
      ...(toEmail ? [where('to', '==', toEmail)] : []),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    if (IS_DEV) {
      console.error('[EMAIL] Error checking idempotency:', error);
    }
    return false; // On error, allow sending (fail open)
  }
}

/**
 * Universal email sending helper with Firestore logging
 * Never blocks UI - all errors are caught and logged
 * Includes 8s timeout failsafe and idempotency checks
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const logId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const toEmail = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  
  try {
    // Idempotency check: skip if already sent
    if (options.eventId && options.notificationType) {
      const alreadySent = await checkEmailAlreadySent(options.eventId, options.notificationType, toEmail);
      if (alreadySent) {
        if (IS_DEV) {
          console.log('[EMAIL] Email already sent, skipping (idempotency):', { eventId: options.eventId, type: options.notificationType });
        }
        return { success: true, messageId: 'duplicate' };
      }
    }
    
    // Check if Resend is configured
    if (!resend || !RESEND_API_KEY) {
      if (IS_DEV) {
        console.warn('[EMAIL] Resend not configured, skipping email send');
      }
      await logEmailToFirestore({
        id: logId,
        to: toEmail,
        subject: options.subject,
        status: 'skipped',
        error: 'Resend API key not configured',
        templateName: options.templateName,
        type: options.notificationType,
        eventId: options.eventId,
        skippedByPreference: options.skippedByPreference,
        timestamp: Date.now(),
      });
      return { success: false, error: 'Email service not configured' };
    }
    
    // Skip if user preference disabled
    if (options.skippedByPreference) {
      if (IS_DEV) {
        console.log('[EMAIL] Email skipped by user preference');
      }
      await logEmailToFirestore({
        id: logId,
        to: toEmail,
        subject: options.subject,
        status: 'skipped',
        error: 'Skipped by user preference',
        templateName: options.templateName,
        type: options.notificationType,
        eventId: options.eventId,
        skippedByPreference: true,
        timestamp: Date.now(),
      });
      return { success: true, messageId: 'skipped' };
    }

    if (IS_DEV) {
      console.log('[EMAIL] Sending email:', { to: toEmail, subject: options.subject, template: options.templateName });
    }

    // Send email via Resend with 8s timeout failsafe
    // Resend expects attachments as base64 strings
    const emailPayload = {
      from: RESEND_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.attachments && options.attachments.length > 0 && { attachments: options.attachments }),
      ...(options.metadata && { metadata: options.metadata }),
    };

    const result = await withTimeout(
      resend.emails.send(emailPayload),
      8000 // 8 second timeout
    );

    if (result.error) {
      throw new Error(result.error.message || 'Unknown Resend error');
    }

    if (IS_DEV) {
      console.log('[EMAIL] Email sent successfully:', { messageId: result.data?.id, to: toEmail });
    }

    // Log success to Firestore (non-blocking)
    logEmailToFirestore({
      id: logId,
      to: toEmail,
      subject: options.subject,
      status: 'sent',
      messageId: result.data?.id,
      templateName: options.templateName,
      type: options.notificationType,
      eventId: options.eventId,
      skippedByPreference: false,
      timestamp: Date.now(),
    }).catch((logError) => {
      if (IS_DEV) {
        console.error('[EMAIL] Error logging to Firestore:', logError);
      }
    });

    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    
    if (IS_DEV) {
      console.error('[EMAIL] Error sending email:', error);
    }
    
    // Log error to Firestore (non-blocking)
    logEmailToFirestore({
      id: logId,
      to: toEmail,
      subject: options.subject,
      status: 'failed',
      error: errorMessage,
      templateName: options.templateName,
      type: options.notificationType,
      eventId: options.eventId,
      skippedByPreference: false,
      timestamp: Date.now(),
    }).catch((logError) => {
      if (IS_DEV) {
        console.error('[EMAIL] Error logging failure to Firestore:', logError);
      }
    });

    // If timeout, still return success to UI (failsafe)
    if (errorMessage.includes('timeout')) {
      if (IS_DEV) {
        console.warn('[EMAIL] Timeout occurred, but returning success to UI');
      }
      return { success: true, error: 'Email may have been sent (timeout)' };
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Log email to Firestore for audit trail
 */
async function logEmailToFirestore(log: {
  id: string;
  to: string;
  subject: string;
  status: 'sent' | 'failed' | 'skipped';
  messageId?: string;
  error?: string;
  templateName?: string;
  type?: string;
  eventId?: string;
  skippedByPreference?: boolean;
  timestamp: number;
}): Promise<void> {
  try {
    const db = getDbSafe();
    if (!db) {
      if (IS_DEV) {
        console.warn('[EMAIL] Firestore not available for logging');
      }
      return;
    }

    await addDoc(collection(db, 'email_logs'), {
      ...log,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Don't throw - logging failure shouldn't break email sending
    if (IS_DEV) {
      console.error('[EMAIL] Error logging to Firestore:', error);
    }
  }
}

