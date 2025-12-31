/**
 * Vercel Serverless Function for Sending Emails via Resend
 * This runs server-side to keep API keys secure
 */

import { Resend } from 'resend';

// Centralized email config - always use display name format "Popera <email>"
const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM ?? 'Popera <support@gopopera.ca>';
const RESEND_REPLY_TO = 'support@gopopera.ca';

// Initialize Resend client
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers for production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

