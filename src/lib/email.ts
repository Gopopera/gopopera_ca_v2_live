/**
 * Resend Email Service
 * Universal email sending with logging
 */

import { Resend } from 'resend';
import { getDbSafe } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const RESEND_FROM = import.meta.env.VITE_RESEND_FROM || 'support@gopopera.ca';

export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

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
}

/**
 * Universal email sending helper with Firestore logging
 * Never blocks UI - all errors are caught and logged
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const logId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Check if Resend is configured
    if (!resend || !RESEND_API_KEY) {
      console.warn('[EMAIL] Resend not configured, skipping email send');
      await logEmailToFirestore({
        id: logId,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        status: 'skipped',
        error: 'Resend API key not configured',
        timestamp: Date.now(),
      });
      return { success: false, error: 'Email service not configured' };
    }

    // Send email via Resend
    // Resend expects attachments as base64 strings
    const result = await resend.emails.send({
      from: RESEND_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    if (result.error) {
      throw new Error(result.error.message || 'Unknown Resend error');
    }

    // Log success to Firestore
    await logEmailToFirestore({
      id: logId,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      status: 'sent',
      messageId: result.data?.id,
      timestamp: Date.now(),
    });

    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('[EMAIL] Error sending email:', error);
    
    // Log error to Firestore
    await logEmailToFirestore({
      id: logId,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      status: 'failed',
      error: error.message || 'Unknown error',
      timestamp: Date.now(),
    });

    return { success: false, error: error.message || 'Failed to send email' };
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
  timestamp: number;
}): Promise<void> {
  try {
    const db = getDbSafe();
    if (!db) {
      console.warn('[EMAIL] Firestore not available for logging');
      return;
    }

    await addDoc(collection(db, 'email_logs'), {
      ...log,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Don't throw - logging failure shouldn't break email sending
    console.error('[EMAIL] Error logging to Firestore:', error);
  }
}

