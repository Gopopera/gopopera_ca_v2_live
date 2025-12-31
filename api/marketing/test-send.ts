/**
 * API: Send test marketing email to admin
 * POST /api/marketing/test-send
 * 
 * Protected: Admin only (eatezca@gmail.com)
 * 
 * VALIDATION CHECKLIST:
 * 1. Go to /marketinghub as eatezca@gmail.com
 * 2. Fill in Subject and Body fields
 * 3. Click "Send Test to Me"
 * 4. Expected: 200 OK with { success: true, messageId: "..." }
 * 5. If 403: Check Firebase Admin env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 * 6. If 500: Check Vercel Logs → Functions → /api/marketing/test-send for [Marketing Test] messages
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Force Node.js runtime (not Edge)
export const config = { runtime: 'nodejs' };

const ADMIN_EMAIL = 'eatezca@gmail.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set JSON content type FIRST to ensure we never return HTML
  res.setHeader('Content-Type', 'application/json');
  
  // Top-level try-catch to ensure we ALWAYS return JSON
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).json({ success: true });
    }
    
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    console.log('[Marketing Test] Request received');
    
    // Parse env vars INSIDE handler to avoid import-time crashes
    const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    const RESEND_FROM = process.env.RESEND_FROM || process.env.VITE_RESEND_FROM || 'support@gopopera.ca';
    
    if (!RESEND_API_KEY) {
      console.error('[Marketing Test] Missing RESEND_API_KEY');
      return res.status(500).json({ success: false, error: 'Email service not configured (missing RESEND_API_KEY)' });
    }
    
    // Lazy import Resend to avoid import-time issues
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);
    
    // Lazy import Firebase Admin utils
    const { verifyAdminToken } = await import('../_utils/firebaseAdmin');
    const { buildMarketingEmailHtml } = await import('../_utils/marketingEmailBuilder');
    
    // Verify admin access
    console.log('[Marketing Test] Verifying admin token...');
    const authHeader = req.headers.authorization;
    console.log('[Marketing Test] Auth header present:', !!authHeader);
    
    const admin = await verifyAdminToken(authHeader);
    if (!admin) {
      console.warn('[Marketing Test] Admin verification failed - check Firebase env vars');
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied - admin authentication required. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars.' 
      });
    }
    console.log('[Marketing Test] Admin verified:', admin.email);
    
    const emailParams = req.body;
    
    if (!emailParams || !emailParams.subject) {
      return res.status(400).json({ success: false, error: 'Missing email subject' });
    }
    
    if (!emailParams.markdownBody) {
      return res.status(400).json({ success: false, error: 'Missing email body' });
    }
    
    // Build HTML
    console.log('[Marketing Test] Building email HTML...');
    const { html } = buildMarketingEmailHtml(emailParams);
    
    // Replace unsubscribe placeholder with test URL
    const finalHtml = html.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, 'https://gopopera.ca/unsubscribe?uid=test&token=test');
    
    // Send test email to admin
    console.log('[Marketing Test] Sending email via Resend to:', ADMIN_EMAIL);
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
    
    console.log('[Marketing Test] Email sent successfully, messageId:', result.data?.id);
    
    return res.status(200).json({
      success: true,
      messageId: result.data?.id,
    });
    
  } catch (error: any) {
    // Catch ANY error and return proper JSON
    console.error('[Marketing Test] Unhandled error:', error?.message || error);
    console.error('[Marketing Test] Stack:', error?.stack);
    return res.status(500).json({ 
      success: false, 
      error: error?.message || 'Internal server error',
    });
  }
}
