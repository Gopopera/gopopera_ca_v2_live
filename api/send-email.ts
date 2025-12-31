/**
 * Vercel Serverless Function for Sending Emails via Resend
 * This runs server-side to keep API keys secure
 * 
 * SECURITY NOTE: This endpoint is for transactional emails only.
 * Marketing/bulk emails should use /api/marketing/send-bulk which 
 * requires admin authentication.
 * 
 * If a request includes metadata indicating marketing (type='marketing' or source='marketinghub'),
 * admin authentication is required.
 */

import { Resend } from 'resend';
import * as admin from 'firebase-admin';
import { RESEND_FROM, RESEND_REPLY_TO, RESEND_API_KEY } from './_lib/emailConfig.js';

// Rate limiting: max emails per IP per minute (simple in-memory, resets on cold start)
const RATE_LIMIT_PER_MINUTE = 10;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Initialize Resend client
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Firebase Admin singleton for marketing email auth
let firebaseAdminApp: admin.app.App | null = null;
const ADMIN_EMAIL = 'eatezca@gmail.com';

function getFirebaseAdminApp(): admin.app.App | null {
  if (firebaseAdminApp) return firebaseAdminApp;
  
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n');
  
  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[API] Firebase Admin not configured for marketing auth');
    return null;
  }
  
  try {
    firebaseAdminApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId,
    }, 'send-email-admin');
    return firebaseAdminApp;
  } catch (error) {
    console.error('[API] Failed to initialize Firebase Admin:', error);
    return null;
  }
}

async function verifyMarketingAuth(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.split('Bearer ')[1];
  const app = getFirebaseAdminApp();
  if (!app) return false;
  
  try {
    const decoded = await admin.auth(app).verifyIdToken(token);
    return decoded.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  } catch (error) {
    console.error('[API] Marketing auth verification failed:', error);
    return false;
  }
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_PER_MINUTE) {
    return false;
  }
  
  record.count++;
  return true;
}

export default async function handler(req: any, res: any) {
  // CORS headers for production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Rate limiting
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    console.warn('[API] Rate limit exceeded for IP:', clientIp);
    return res.status(429).json({ success: false, error: 'Rate limit exceeded. Please try again later.' });
  }
  
  // Check if this is a marketing email (requires admin auth)
  const md = req.body?.metadata;
  const isMarketing = md?.type === 'marketing' || md?.source === 'marketinghub';
  
  if (isMarketing) {
    const isAdmin = await verifyMarketingAuth(req.headers.authorization);
    if (!isAdmin) {
      console.warn('[API] Unauthorized marketing email attempt');
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
  }

  try {
    // Validate Resend is configured
    if (!resend || !RESEND_API_KEY) {
      console.error('[API] Resend not configured - missing RESEND_API_KEY');
      return res.status(500).json({ 
        success: false, 
        error: 'Email service not configured' 
      });
    }

    // Extract email data from request
    const { to, subject, html, attachments, metadata } = req.body;

    // Validate required fields
    if (!to || !subject || !html) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, subject, html' 
      });
    }
    
    // Limit recipients for transactional emails (bulk emails should use /api/marketing/send-bulk)
    const recipients = Array.isArray(to) ? to : [to];
    if (recipients.length > 5) {
      console.warn('[API] Attempted to send to too many recipients:', recipients.length);
      return res.status(400).json({ 
        success: false, 
        error: 'Too many recipients. Use marketing API for bulk emails.' 
      });
    }

    console.log('[API] Sending email:', { 
      to: Array.isArray(to) ? to.join(', ') : to, 
      subject,
      hasAttachments: !!attachments?.length 
    });

    // Send email via Resend
    const result = await resend.emails.send({
      from: RESEND_FROM,
      replyTo: RESEND_REPLY_TO,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(attachments && attachments.length > 0 && { attachments }),
      ...(metadata && { metadata }),
    });

    if (result.error) {
      console.error('[API] Resend error:', result.error);
      return res.status(500).json({ 
        success: false, 
        error: result.error.message || 'Unknown Resend error' 
      });
    }

    console.log('[API] Email sent successfully:', { messageId: result.data?.id });

    return res.status(200).json({ 
      success: true, 
      messageId: result.data?.id 
    });

  } catch (error: any) {
    console.error('[API] Error sending email:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Unknown error' 
    });
  }
}

