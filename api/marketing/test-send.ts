/**
 * API: Send test marketing email to admin
 * POST /api/marketing/test-send
 * 
 * Protected: Admin only (eatezca@gmail.com)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { verifyAdminToken } from '../_utils/firebaseAdmin';
import { buildMarketingEmailHtml } from '../../src/lib/marketingEmailBuilder';

const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || process.env.VITE_RESEND_FROM || 'support@gopopera.ca';
const ADMIN_EMAIL = 'eatezca@gmail.com';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
  
  // Verify admin access
  const admin = await verifyAdminToken(req.headers.authorization);
  if (!admin) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  
  if (!resend) {
    return res.status(500).json({ success: false, error: 'Email service not configured' });
  }
  
  try {
    const emailParams = req.body;
    
    // Build HTML
    const { html, text } = buildMarketingEmailHtml(emailParams);
    
    // Replace unsubscribe placeholder with test URL
    const finalHtml = html.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, 'https://gopopera.ca/unsubscribe?uid=test&token=test');
    
    // Send test email to admin
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
    
    console.log('[Marketing Test] Email sent to:', ADMIN_EMAIL);
    
    return res.status(200).json({
      success: true,
      messageId: result.data?.id,
    });
    
  } catch (error: any) {
    console.error('[Marketing Test] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
}

