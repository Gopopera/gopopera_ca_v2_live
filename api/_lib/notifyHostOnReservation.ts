/**
 * Server-Side Host RSVP Notification Helper
 * 
 * Single source of truth for notifying hosts when someone RSVPs.
 * Used by both guest and logged-in reservation flows.
 * 
 * Features:
 * - Per-channel idempotency tracking (inApp, email, SMS)
 * - Structured logging with requestId
 * - Never blocks reservation creation (all errors are caught)
 * - Country-safe: accepts any valid E.164 phone
 */

import { Resend } from 'resend';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { getBaseEmailTemplate, getGlassPanel, getInfoRow } from './emailTemplates.js';
import { RESEND_FROM, RESEND_REPLY_TO, RESEND_API_KEY } from './emailConfig.js';

// Twilio config
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_API_URL = TWILIO_ACCOUNT_SID
    ? `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
    : '';

// Types
export interface HostNotifyState {
    lastAttemptAt: number;
    inAppAt?: number;
    emailAt?: number;
    smsAt?: number;
    lastError?: string;
}

export interface NotifyHostParams {
    db: Firestore;
    reservationId: string;
    eventId: string;
    hostId: string;
    attendeeName: string;
    attendeeEmail: string;
    eventTitle: string;
    pricingType: 'free' | 'online' | 'door';
    isGuest: boolean;
    requestId: string;
}

export interface ChannelResult {
    attempted: boolean;
    success: boolean;
    skipped?: boolean;
    reason?: string;
}

export interface NotificationResult {
    inApp: ChannelResult;
    email: ChannelResult;
    sms: ChannelResult;
    hostNotify: HostNotifyState;
}

/**
 * Validate E.164 phone number format
 */
function isValidE164(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    const cleaned = phone.trim();
    if (!cleaned.startsWith('+')) return false;
    const digits = cleaned.slice(1).replace(/\D/g, '');
    return /^[1-9]\d{6,14}$/.test(digits);
}

/**
 * Mask phone for logging (e.g., +32*** for Belgium)
 */
function maskPhone(phone: string): string {
    if (!phone || phone.length < 4) return '***';
    const match = phone.match(/^\+(\d{1,3})/);
    return match ? `+${match[1]}***` : '+***';
}

/**
 * Generate host notification email HTML using existing template pattern
 */
function generateHostNotificationEmailHtml(data: {
    hostName: string;
    attendeeName: string;
    attendeeEmail: string;
    eventTitle: string;
    eventUrl: string;
}): string {
    const content = `
    <!-- Header Section -->
    <table role="presentation" style="width: 100%; margin-bottom: 28px;">
      <tr>
        <td>
          <!-- Notification badge -->
          <table role="presentation" style="margin-bottom: 16px;">
            <tr>
              <td>
                <span style="display: inline-block; background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 50px; padding: 8px 16px; color: #34d399; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">
                  ✨ New Attendee
                </span>
              </td>
            </tr>
          </table>
          <h1 style="margin: 0 0 12px 0; color: #ffffff; font-size: 24px; font-weight: 700; line-height: 1.3;">Someone Just Joined Your Event!</h1>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.6); font-size: 15px;">Hello ${data.hostName},</p>
        </td>
      </tr>
    </table>
    
    <!-- Event Info -->
    ${getGlassPanel(`
      ${getInfoRow('Event', data.eventTitle)}
    `)}
    
    <!-- Attendee Card -->
    ${getGlassPanel(`
      <table role="presentation" style="width: 100%;">
        <tr>
          <td align="center">
            <div style="width: 72px; height: 72px; border-radius: 50%; margin-bottom: 16px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.3) 0%, rgba(249, 115, 22, 0.15) 100%); border: 2px solid rgba(249, 115, 22, 0.4); display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 28px; line-height: 72px; display: block; text-align: center;">👋</span>
            </div>
            <h3 style="margin: 0 0 8px 0; color: #ffffff; font-size: 20px; font-weight: 600;">${data.attendeeName}</h3>
            <p style="margin: 0;">
              <a href="mailto:${data.attendeeEmail}" style="color: #f97316; text-decoration: none; font-size: 14px;">${data.attendeeEmail}</a>
            </p>
          </td>
        </tr>
      </table>
    `, 'rgba(249, 115, 22, 0.2)')}
  `;

    return getBaseEmailTemplate(content, 'View Event Dashboard', data.eventUrl);
}

/**
 * Send SMS via Twilio
 */
async function sendSmsViaTwilio(to: string, message: string, requestId: string): Promise<{ success: boolean; error?: string }> {
    const hasMessagingService = !!TWILIO_MESSAGING_SERVICE_SID;
    const hasFromNumber = !!TWILIO_PHONE_NUMBER;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || (!hasMessagingService && !hasFromNumber)) {
        return { success: false, error: 'twilio_not_configured' };
    }

    try {
        const formData = new URLSearchParams();
        if (hasMessagingService) {
            formData.append('MessagingServiceSid', TWILIO_MESSAGING_SERVICE_SID!);
        } else {
            formData.append('From', TWILIO_PHONE_NUMBER!);
        }
        formData.append('To', to);
        formData.append('Body', message);

        const response = await fetch(TWILIO_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const data = await response.json();

        if (!response.ok) {
            const errorCode = data.code || data.error_code;
            const errorMessage = data.message || data.error_message || 'Unknown error';
            console.error(`[HOST_NOTIFY] requestId=${requestId} sms_error code=${errorCode} message="${errorMessage.substring(0, 100)}"`);
            return { success: false, error: `twilio_${errorCode}` };
        }

        if (!data.sid) {
            return { success: false, error: 'twilio_no_sid' };
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: `twilio_exception: ${error.message?.substring(0, 50)}` };
    }
}

/**
 * Main function: Notify host of a new RSVP
 * 
 * Per-channel idempotency: Only sends to channels that haven't succeeded yet.
 * Never throws - all errors are logged and returned in result.
 */
export async function notifyHostOnReservation(params: NotifyHostParams): Promise<NotificationResult> {
    const { db, reservationId, eventId, hostId, attendeeName, attendeeEmail, eventTitle, pricingType, isGuest, requestId } = params;

    const baseUrl = process.env.VITE_BASE_URL || process.env.BASE_URL || 'https://gopopera.ca';
    const eventUrl = `${baseUrl.replace(/\/$/, '')}/event/${eventId}`;

    const result: NotificationResult = {
        inApp: { attempted: false, success: false },
        email: { attempted: false, success: false },
        sms: { attempted: false, success: false },
        hostNotify: { lastAttemptAt: Date.now() },
    };

    console.log(`[HOST_NOTIFY] requestId=${requestId} reservationId=${reservationId} eventId=${eventId} hostId=${hostId} pricingType=${pricingType} isGuest=${isGuest} status=starting`);

    try {
        // 1. Get existing hostNotify state from reservation (for idempotency)
        const reservationRef = db.collection('reservations').doc(reservationId);
        const reservationDoc = await reservationRef.get();
        const existingNotify = (reservationDoc.data()?.hostNotify || {}) as Partial<HostNotifyState>;

        // 2. Get host profile
        const hostDoc = await db.collection('users').doc(hostId).get();
        if (!hostDoc.exists) {
            console.warn(`[HOST_NOTIFY] requestId=${requestId} status=host_not_found hostId=${hostId}`);
            result.hostNotify.lastError = 'host_not_found';
            await reservationRef.update({ hostNotify: result.hostNotify });
            return result;
        }

        const hostData = hostDoc.data() || {};
        const hostName = hostData.displayName || hostData.name || 'Host';
        const hostEmail = hostData.email;
        const hostPhone = hostData.phone_number || hostData.hostPhoneNumber;
        const prefs = hostData.notification_settings || {};
        const emailOptIn = prefs.email_opt_in !== false; // Default true
        const smsOptIn = prefs.sms_opt_in !== false; // Default true

        // 3. In-App Notification (always attempt unless already sent)
        if (!existingNotify.inAppAt) {
            result.inApp.attempted = true;
            try {
                const notifRef = db.collection('users').doc(hostId).collection('notifications');
                await notifRef.add({
                    type: 'new-rsvp',
                    title: 'New RSVP',
                    body: `${attendeeName || 'Someone'} RSVP'd to ${eventTitle}`,
                    eventId,
                    userId: hostId,
                    read: false,
                    timestamp: new Date(),
                    timestampMs: Date.now(),
                    createdAt: Date.now(),
                });
                result.inApp.success = true;
                result.hostNotify.inAppAt = Date.now();
                console.log(`[HOST_NOTIFY] requestId=${requestId} channel=inApp status=sent`);
            } catch (error: any) {
                result.inApp.reason = error.message?.substring(0, 50);
                console.error(`[HOST_NOTIFY] requestId=${requestId} channel=inApp status=failed error="${result.inApp.reason}"`);
            }
        } else {
            result.inApp.skipped = true;
            result.inApp.reason = 'already_sent';
            result.hostNotify.inAppAt = existingNotify.inAppAt;
            console.log(`[HOST_NOTIFY] requestId=${requestId} channel=inApp status=skipped reason=already_sent`);
        }

        // 4. Email Notification
        if (!existingNotify.emailAt) {
            if (!hostEmail) {
                result.email.skipped = true;
                result.email.reason = 'no_host_email';
                console.log(`[HOST_NOTIFY] requestId=${requestId} channel=email status=skipped reason=no_host_email`);
            } else if (!emailOptIn) {
                result.email.skipped = true;
                result.email.reason = 'email_opt_out';
                console.log(`[HOST_NOTIFY] requestId=${requestId} channel=email status=skipped reason=email_opt_out`);
            } else if (!RESEND_API_KEY) {
                result.email.skipped = true;
                result.email.reason = 'resend_not_configured';
                console.log(`[HOST_NOTIFY] requestId=${requestId} channel=email status=skipped reason=resend_not_configured`);
            } else {
                result.email.attempted = true;
                try {
                    const resend = new Resend(RESEND_API_KEY);
                    const emailHtml = generateHostNotificationEmailHtml({
                        hostName,
                        attendeeName: attendeeName || 'Someone',
                        attendeeEmail,
                        eventTitle,
                        eventUrl,
                    });

                    const emailResult = await resend.emails.send({
                        from: RESEND_FROM,
                        replyTo: RESEND_REPLY_TO,
                        to: hostEmail,
                        subject: `New RSVP: ${eventTitle}`,
                        html: emailHtml,
                    });

                    if (emailResult.error) {
                        result.email.reason = emailResult.error.message?.substring(0, 50);
                        console.error(`[HOST_NOTIFY] requestId=${requestId} channel=email status=failed error="${result.email.reason}"`);
                    } else {
                        result.email.success = true;
                        result.hostNotify.emailAt = Date.now();
                        console.log(`[HOST_NOTIFY] requestId=${requestId} channel=email status=sent messageId=${emailResult.data?.id}`);
                    }
                } catch (error: any) {
                    result.email.reason = error.message?.substring(0, 50);
                    console.error(`[HOST_NOTIFY] requestId=${requestId} channel=email status=failed error="${result.email.reason}"`);
                }
            }
        } else {
            result.email.skipped = true;
            result.email.reason = 'already_sent';
            result.hostNotify.emailAt = existingNotify.emailAt;
            console.log(`[HOST_NOTIFY] requestId=${requestId} channel=email status=skipped reason=already_sent`);
        }

        // 5. SMS Notification
        if (!existingNotify.smsAt) {
            if (!hostPhone) {
                result.sms.skipped = true;
                result.sms.reason = 'no_host_phone';
                console.log(`[HOST_NOTIFY] requestId=${requestId} channel=sms status=skipped reason=no_host_phone`);
            } else if (!smsOptIn) {
                result.sms.skipped = true;
                result.sms.reason = 'sms_opt_out';
                console.log(`[HOST_NOTIFY] requestId=${requestId} channel=sms status=skipped reason=sms_opt_out`);
            } else if (!isValidE164(hostPhone)) {
                result.sms.skipped = true;
                result.sms.reason = 'invalid_phone_format';
                console.log(`[HOST_NOTIFY] requestId=${requestId} channel=sms status=skipped reason=invalid_phone_format phone=${maskPhone(hostPhone)}`);
            } else {
                result.sms.attempted = true;
                const smsMessage = `Popera: ${attendeeName || 'Someone'} just RSVP'd to "${eventTitle}"!`;
                const smsResult = await sendSmsViaTwilio(hostPhone, smsMessage, requestId);

                if (smsResult.success) {
                    result.sms.success = true;
                    result.hostNotify.smsAt = Date.now();
                    console.log(`[HOST_NOTIFY] requestId=${requestId} channel=sms status=sent phone=${maskPhone(hostPhone)}`);
                } else {
                    result.sms.reason = smsResult.error;
                    console.error(`[HOST_NOTIFY] requestId=${requestId} channel=sms status=failed error="${smsResult.error}" phone=${maskPhone(hostPhone)}`);
                }
            }
        } else {
            result.sms.skipped = true;
            result.sms.reason = 'already_sent';
            result.hostNotify.smsAt = existingNotify.smsAt;
            console.log(`[HOST_NOTIFY] requestId=${requestId} channel=sms status=skipped reason=already_sent`);
        }

        // 6. Update reservation with hostNotify state
        // Build lastError from any failures
        const errors: string[] = [];
        if (result.inApp.attempted && !result.inApp.success) errors.push(`inApp:${result.inApp.reason}`);
        if (result.email.attempted && !result.email.success) errors.push(`email:${result.email.reason}`);
        if (result.sms.attempted && !result.sms.success) errors.push(`sms:${result.sms.reason}`);
        if (errors.length > 0) {
            result.hostNotify.lastError = errors.join('; ');
        }

        await reservationRef.update({ hostNotify: result.hostNotify });

        console.log(`[HOST_NOTIFY] requestId=${requestId} status=complete inApp=${result.inApp.success ? 'sent' : (result.inApp.skipped ? 'skipped' : 'failed')} email=${result.email.success ? 'sent' : (result.email.skipped ? 'skipped' : 'failed')} sms=${result.sms.success ? 'sent' : (result.sms.skipped ? 'skipped' : 'failed')}`);

        return result;

    } catch (error: any) {
        const errorMsg = error.message?.substring(0, 100) || 'Unknown error';
        console.error(`[HOST_NOTIFY] requestId=${requestId} status=exception error="${errorMsg}"`);
        result.hostNotify.lastError = errorMsg;

        // Try to save the error state
        try {
            await db.collection('reservations').doc(reservationId).update({ hostNotify: result.hostNotify });
        } catch {
            // Ignore - don't fail if we can't save state
        }

        return result;
    }
}

/**
 * Generate a request ID for logging correlation
 */
export function generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
}
