/**
 * Debug Test Notifications Endpoint (Admin Only)
 * 
 * Tests email, SMS, and in-app notification delivery to a host.
 * Protected by Firebase admin token verification.
 * 
 * POST /api/debug/test-notifications
 * Headers: Authorization: Bearer <firebase-id-token>
 * Body: { eventId?: string; hostId?: string }
 * 
 * Returns JSON report with attempted/skipped/errors per channel.
 */

import { Resend } from 'resend';
import { getAdminFirestore, verifyAdminToken } from '../_lib/firebaseAdmin.js';
import { getBaseEmailTemplate, getGlassPanel, getInfoRow } from '../_lib/emailTemplates.js';
import { RESEND_FROM, RESEND_REPLY_TO, RESEND_API_KEY } from '../_lib/emailConfig.js';

// Twilio config
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_API_URL = TWILIO_ACCOUNT_SID
    ? `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
    : '';

interface ChannelResult {
    attempted: boolean;
    success: boolean;
    skipped?: boolean;
    reason?: string;
    details?: Record<string, any>;
}

interface TestResult {
    requestId: string;
    hostId: string;
    eventId?: string;
    hostEmail?: string;
    hostPhone?: string;
    hostPhoneMasked?: string;
    inApp: ChannelResult;
    email: ChannelResult;
    sms: ChannelResult;
    config: {
        resendConfigured: boolean;
        twilioConfigured: boolean;
    };
}

function generateRequestId(): string {
    return `test_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
}

function isValidE164(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    const cleaned = phone.trim();
    if (!cleaned.startsWith('+')) return false;
    const digits = cleaned.slice(1).replace(/\D/g, '');
    return /^[1-9]\d{6,14}$/.test(digits);
}

function maskPhone(phone: string): string {
    if (!phone || phone.length < 4) return '***';
    const match = phone.match(/^\+(\d{1,3})/);
    return match ? `+${match[1]}***` : '+***';
}

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const requestId = generateRequestId();

    // Verify admin authentication
    const authResult = await verifyAdminToken(req.headers.authorization);
    if (!authResult.success) {
        const failResult = authResult as { success: false; reason: string; details?: Record<string, unknown> };
        console.warn(`[TEST_NOTIFICATIONS] requestId=${requestId} status=unauthorized reason=${failResult.reason}`);
        return res.status(403).json({
            error: 'Unauthorized',
            reason: failResult.reason,
            ...(failResult.details ? { details: failResult.details } : {}),
        });
    }

    console.log(`[TEST_NOTIFICATIONS] requestId=${requestId} admin=${authResult.email} status=authorized`);

    try {
        const { eventId, hostId: inputHostId } = req.body || {};

        const db = getAdminFirestore();
        if (!db) {
            return res.status(500).json({ error: 'Firebase Admin not configured' });
        }

        let hostId = inputHostId;
        let eventTitle = 'Test Event';

        // If eventId provided, get hostId from event
        if (eventId && !hostId) {
            const eventDoc = await db.collection('events').doc(eventId).get();
            if (!eventDoc.exists) {
                return res.status(404).json({ error: 'Event not found' });
            }
            const eventData = eventDoc.data() || {};
            hostId = eventData.hostId;
            eventTitle = eventData.title || 'Test Event';
        }

        if (!hostId) {
            return res.status(400).json({ error: 'Either hostId or eventId is required' });
        }

        // Get host profile
        const hostDoc = await db.collection('users').doc(hostId).get();
        if (!hostDoc.exists) {
            return res.status(404).json({ error: 'Host not found' });
        }

        const hostData = hostDoc.data() || {};
        const hostName = hostData.displayName || hostData.name || 'Host';
        const hostEmail = hostData.email;
        const hostPhone = hostData.phone_number || hostData.hostPhoneNumber;
        const prefs = hostData.notification_settings || {};
        const emailOptIn = prefs.email_opt_in !== false;
        const smsOptIn = prefs.sms_opt_in !== false;

        const result: TestResult = {
            requestId,
            hostId,
            eventId,
            hostEmail,
            hostPhone: hostPhone ? '[REDACTED]' : undefined,
            hostPhoneMasked: hostPhone ? maskPhone(hostPhone) : undefined,
            inApp: { attempted: false, success: false },
            email: { attempted: false, success: false },
            sms: { attempted: false, success: false },
            config: {
                resendConfigured: !!RESEND_API_KEY,
                twilioConfigured: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && (TWILIO_MESSAGING_SERVICE_SID || TWILIO_PHONE_NUMBER)),
            },
        };

        // 1. Test In-App Notification
        result.inApp.attempted = true;
        try {
            const notifRef = db.collection('users').doc(hostId).collection('notifications');
            const testNotif = await notifRef.add({
                type: 'new-rsvp',
                title: '[TEST] New RSVP',
                body: `This is a test notification from /api/debug/test-notifications`,
                eventId: eventId || 'test-event',
                userId: hostId,
                read: false,
                timestamp: new Date(),
                timestampMs: Date.now(),
                createdAt: Date.now(),
                isTest: true,
            });
            result.inApp.success = true;
            result.inApp.details = { notificationId: testNotif.id };
            console.log(`[TEST_NOTIFICATIONS] requestId=${requestId} channel=inApp status=sent notifId=${testNotif.id}`);
        } catch (error: any) {
            result.inApp.reason = error.message?.substring(0, 100);
            console.error(`[TEST_NOTIFICATIONS] requestId=${requestId} channel=inApp status=failed error="${result.inApp.reason}"`);
        }

        // 2. Test Email
        if (!hostEmail) {
            result.email.skipped = true;
            result.email.reason = 'no_host_email';
        } else if (!emailOptIn) {
            result.email.skipped = true;
            result.email.reason = 'email_opt_out';
        } else if (!RESEND_API_KEY) {
            result.email.skipped = true;
            result.email.reason = 'resend_not_configured';
        } else {
            result.email.attempted = true;
            try {
                const resend = new Resend(RESEND_API_KEY);
                const emailHtml = getBaseEmailTemplate(`
          <h1 style="margin: 0 0 16px 0; color: #ffffff; font-size: 22px;">🧪 Test Notification</h1>
          <p style="margin: 0 0 16px 0; color: rgba(255, 255, 255, 0.8);">
            This is a test email from <code>/api/debug/test-notifications</code>.
          </p>
          ${getGlassPanel(`
            ${getInfoRow('Request ID', requestId)}
            ${getInfoRow('Host ID', hostId)}
            ${eventId ? getInfoRow('Event ID', eventId) : ''}
            ${getInfoRow('Timestamp', new Date().toISOString())}
          `)}
          <p style="margin: 16px 0 0 0; color: rgba(255, 255, 255, 0.6); font-size: 13px;">
            If you received this email, your host notification email delivery is working correctly.
          </p>
        `, 'Go to Popera', 'https://gopopera.ca');

                const emailResult = await resend.emails.send({
                    from: RESEND_FROM,
                    replyTo: RESEND_REPLY_TO,
                    to: hostEmail,
                    subject: `[TEST] Notification Test - ${requestId}`,
                    html: emailHtml,
                });

                if (emailResult.error) {
                    result.email.reason = emailResult.error.message;
                    console.error(`[TEST_NOTIFICATIONS] requestId=${requestId} channel=email status=failed error="${result.email.reason}"`);
                } else {
                    result.email.success = true;
                    result.email.details = { messageId: emailResult.data?.id };
                    console.log(`[TEST_NOTIFICATIONS] requestId=${requestId} channel=email status=sent messageId=${emailResult.data?.id}`);
                }
            } catch (error: any) {
                result.email.reason = error.message?.substring(0, 100);
                console.error(`[TEST_NOTIFICATIONS] requestId=${requestId} channel=email status=failed error="${result.email.reason}"`);
            }
        }

        // 3. Test SMS
        if (!hostPhone) {
            result.sms.skipped = true;
            result.sms.reason = 'no_host_phone';
        } else if (!smsOptIn) {
            result.sms.skipped = true;
            result.sms.reason = 'sms_opt_out';
        } else if (!isValidE164(hostPhone)) {
            result.sms.skipped = true;
            result.sms.reason = 'invalid_phone_format';
            result.sms.details = { phoneMasked: maskPhone(hostPhone) };
        } else if (!result.config.twilioConfigured) {
            result.sms.skipped = true;
            result.sms.reason = 'twilio_not_configured';
        } else {
            result.sms.attempted = true;
            try {
                const formData = new URLSearchParams();
                if (TWILIO_MESSAGING_SERVICE_SID) {
                    formData.append('MessagingServiceSid', TWILIO_MESSAGING_SERVICE_SID);
                } else if (TWILIO_PHONE_NUMBER) {
                    formData.append('From', TWILIO_PHONE_NUMBER);
                }
                formData.append('To', hostPhone);
                formData.append('Body', `Popera Test: This is a test SMS from /api/debug/test-notifications (${requestId})`);

                const smsResponse = await fetch(TWILIO_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const smsData = await smsResponse.json();

                if (!smsResponse.ok) {
                    const errorCode = smsData.code || smsData.error_code;
                    const errorMessage = smsData.message || smsData.error_message || 'Unknown error';
                    result.sms.reason = `twilio_${errorCode}: ${errorMessage.substring(0, 50)}`;
                    result.sms.details = { errorCode };
                    console.error(`[TEST_NOTIFICATIONS] requestId=${requestId} channel=sms status=failed error="${result.sms.reason}"`);
                } else if (!smsData.sid) {
                    result.sms.reason = 'twilio_no_sid';
                    console.error(`[TEST_NOTIFICATIONS] requestId=${requestId} channel=sms status=failed reason=no_sid`);
                } else {
                    result.sms.success = true;
                    result.sms.details = { messageSid: smsData.sid, phoneMasked: maskPhone(hostPhone) };
                    console.log(`[TEST_NOTIFICATIONS] requestId=${requestId} channel=sms status=sent sid=${smsData.sid} phone=${maskPhone(hostPhone)}`);
                }
            } catch (error: any) {
                result.sms.reason = error.message?.substring(0, 100);
                console.error(`[TEST_NOTIFICATIONS] requestId=${requestId} channel=sms status=failed error="${result.sms.reason}"`);
            }
        }

        console.log(`[TEST_NOTIFICATIONS] requestId=${requestId} status=complete inApp=${result.inApp.success} email=${result.email.success || result.email.skipped ? 'ok' : 'fail'} sms=${result.sms.success || result.sms.skipped ? 'ok' : 'fail'}`);

        return res.status(200).json(result);

    } catch (error: any) {
        console.error(`[TEST_NOTIFICATIONS] requestId=${requestId} status=exception error="${error.message?.substring(0, 100)}"`);
        return res.status(500).json({
            error: error.message?.substring(0, 100) || 'Unknown error',
            requestId,
        });
    }
}
