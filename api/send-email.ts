/**
 * Vercel Serverless Function for Sending Emails via Resend
 * This runs server-side to keep API keys secure
 * 
 * SECURITY NOTE: This endpoint is for transactional emails only.
 * Marketing/bulk emails should use /api/marketing/send-bulk which 
 * requires admin authentication.
 */

import { Resend } from 'resend';

// Use server-side env vars only - never expose VITE_ prefixed keys at runtime
const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || process.env.VITE_RESEND_FROM || 'support@gopopera.ca';

// Rate limiting: max emails per IP per minute (simple in-memory, resets on cold start)
const RATE_LIMIT_PER_MINUTE = 10;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Initialize Resend client
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

