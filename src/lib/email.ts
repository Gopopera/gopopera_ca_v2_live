/**
 * Email Service - Client-side wrapper for serverless email API
 * All emails are sent via Vercel serverless function to keep API keys secure
 */

import { getDbSafe } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';

const IS_DEV = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/server';

// Log API configuration
if (typeof window !== 'undefined') {
  console.log('[EMAIL] API configuration:', {
    apiBaseUrl: API_BASE_URL,
    isDev: IS_DEV,
  });
}

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
      console.log('[EMAIL] Sending email via serverless function:', { to: toEmail, subject: options.subject, template: options.templateName });
    }

    // Send email via Vercel serverless function (server-side)
    const emailPayload = {
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.attachments && options.attachments.length > 0 && { attachments: options.attachments }),
      ...(options.metadata && { metadata: options.metadata }),
    };

    const response = await withTimeout(
      fetch(`${API_BASE_URL}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      }),
      10000 // 10 second timeout
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Email send failed');
    }

    if (IS_DEV) {
      console.log('[EMAIL] Email sent successfully:', { messageId: result.messageId, to: toEmail });
    }

    // Log success to Firestore (non-blocking)
    logEmailToFirestore({
      id: logId,
      to: toEmail,
      subject: options.subject,
      status: 'sent',
      messageId: result.messageId,
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

    return { success: true, messageId: result.messageId };
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

