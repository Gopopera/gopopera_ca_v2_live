/**
 * API: Send test marketing email to admin
 * POST /api/marketing/test-send
 * 
 * Protected: Admin only (eatezca@gmail.com)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { verifyAdminToken } from '../_utils/firebaseAdmin';
import { buildMarketingEmailHtml } from '../_utils/marketingEmailBuilder';

const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || process.env.VITE_RESEND_FROM || 'support@gopopera.ca';
const ADMIN_EMAIL = 'eatezca@gmail.com';

let resend: Resend | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Top-level try-catch to ensure we always return JSON
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    console.log('[Marketing Test] Request received');
    
    // Initialize Resend lazily
    if (!resend && RESEND_API_KEY) {
      resend = new Resend(RESEND_API_KEY);
    }
    
    if (!resend) {
      console.error('[Marketing Test] Resend not configured - missing RESEND_API_KEY');
      return res.status(500).json({ success: false, error: 'Email service not configured' });
    }
    
    // Verify admin access
    console.log('[Marketing Test] Verifying admin token...');
    const admin = await verifyAdminToken(req.headers.authorization);
    if (!admin) {
      console.warn('[Marketing Test] Admin verification failed');
      return res.status(403).json({ success: false, error: 'Access denied - admin authentication required' });
    }
    console.log('[Marketing Test] Admin verified:', admin.email);
    
    const emailParams = req.body;
    
    if (!emailParams || !emailParams.subject) {
      return res.status(400).json({ success: false, error: 'Missing email subject' });
    }
    
    // Build HTML
    console.log('[Marketing Test] Building email HTML...');
    const { html } = buildMarketingEmailHtml(emailParams);
    
    // Replace unsubscribe placeholder with test URL
    const finalHtml = html.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, 'https://gopopera.ca/unsubscribe?uid=test&token=test');
    
    // Send test email to admin
    console.log('[Marketing Test] Sending email via Resend...');
    const result = await resend.emails.send({
      from: RESEND_FROM,
      to: [ADMIN_EMAIL],
      subject: `[TEST] ${emailParams.subject}`,
      html: finalHtml,
    });
    
    if (result.error) {
      console.error('[Marketing Test] Resend error:', result.error);
      return res.status(500).json({ 
        success: false, 
        error: result.error.message || 'Failed to send test email' 
      });
    }
    
    console.log('[Marketing Test] Email sent successfully to:', ADMIN_EMAIL);
    
    return res.status(200).json({
      success: true,
      messageId: result.data?.id,
    });
    
  } catch (error: any) {
    // Catch ANY error and return proper JSON
    console.error('[Marketing Test] Unhandled error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error?.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });
  }
}
