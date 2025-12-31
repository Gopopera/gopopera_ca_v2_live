/**
 * API: Send test marketing email to admin
 * POST /api/marketing/test-send
 * 
 * Protected: Admin only (eatezca@gmail.com)
 * 
 * NOTE: Firebase Admin + email builder are INLINED to avoid Vercel module resolution issues.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Force Node.js runtime (not Edge)
export const config = { runtime: 'nodejs' };

const ADMIN_EMAIL = 'eatezca@gmail.com';
const APP_NAME = 'test-send-admin';

// ============ INLINED: Firebase Admin Singleton ============
let adminApp: admin.app.App | null = null;

function getFirebaseAdmin(): admin.app.App | null {
  if (adminApp) return adminApp;
  
  try {
    adminApp = admin.app(APP_NAME);
    return adminApp;
  } catch {
    // App doesn't exist, continue to initialize
  }
  
  const projectId = process.env.FIREBASE_PROJECT_ID || 'gopopera2026';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!clientEmail || !privateKey) {
    console.error('[Test Send] Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY');
    return null;
  }
  
  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId,
    }, APP_NAME);
    console.log('[Test Send] Firebase Admin initialized');
    return adminApp;
  } catch (error) {
    console.error('[Test Send] Firebase Admin init failed:', error);
    return null;
  }
}

async function verifyAdminToken(authHeader: string | undefined): Promise<{ uid: string; email: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('[Test Send] Missing Authorization header');
    return null;
  }
  
  const app = getFirebaseAdmin();
  if (!app) return null;
  
  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await app.auth().verifyIdToken(token);
    
    if (decoded.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.warn('[Test Send] Access denied for:', decoded.email);
      return null;
    }
    
    return { uid: decoded.uid, email: decoded.email || '' };
  } catch (error) {
    console.error('[Test Send] Token verification failed:', error);
    return null;
  }
}

// ============ INLINED: Email Builder ============
interface EmailParams {
  subject: string;
  preheader?: string;
  theme?: 'dark' | 'light' | 'minimal';
  density?: 'compact' | 'normal';
  heroImageUrl?: string;
  heroAlt?: string;
  markdownBody: string;
  ctaText?: string;
  ctaUrl?: string;
  campaignName?: string;
}

function buildMarketingEmailHtml(params: EmailParams): { html: string } {
  const { subject, preheader, theme = 'dark', density = 'normal', heroImageUrl, heroAlt, markdownBody, ctaText, ctaUrl, campaignName } = params;
  
  const themes: Record<string, { bg: string; text: string; textMuted: string; accent: string; cardBg: string; border: string }> = {
    dark: { bg: '#15383c', text: '#f2f2f2', textMuted: 'rgba(242,242,242,0.7)', accent: '#e35e25', cardBg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.12)' },
    light: { bg: '#ffffff', text: '#15383c', textMuted: '#6b7280', accent: '#e35e25', cardBg: '#f8fafb', border: '#e5e7eb' },
    minimal: { bg: '#ffffff', text: '#1f2937', textMuted: '#6b7280', accent: '#e35e25', cardBg: '#ffffff', border: '#e5e7eb' },
  };
  const t = themes[theme] || themes.dark;
  const d = density === 'compact' ? { padding: '24px', lineHeight: '1.5', gap: '12px' } : { padding: '40px', lineHeight: '1.7', gap: '20px' };
  
  // Simple markdown conversion
  let bodyHtml = (markdownBody || '')
    .replace(/^### (.+)$/gm, '<h3 style="margin:0 0 12px;font-size:18px;font-weight:600;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin:0 0 16px;font-size:22px;font-weight:700;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="margin:0 0 20px;font-size:28px;font-weight:800;">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" style="color:${t.accent};text-decoration:underline;">$1</a>`)
    .replace(/\n\n+/g, '</p><p style="margin:0 0 16px;line-height:1.7;">');
  bodyHtml = `<p style="margin:0 0 16px;line-height:1.7;">${bodyHtml}</p>`;
  
  const ctaStyle = theme === 'dark'
    ? `display:inline-block;padding:14px 32px;border:2px solid ${t.accent};color:${t.accent};text-decoration:none;border-radius:8px;font-weight:600;`
    : `display:inline-block;padding:14px 32px;background:${t.accent};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;`;
  
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:${t.bg};color:${t.text};line-height:${d.lineHeight};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:24px 16px;">
<table role="presentation" style="max-width:600px;width:100%;">
<tr><td style="padding:${d.padding};text-align:center;"><span style="color:${t.text};font-size:28px;font-weight:700;">Popera</span><span style="display:inline-block;width:5px;height:5px;background:${t.accent};border-radius:50%;margin-left:2px;"></span></td></tr>
<tr><td><table role="presentation" style="width:100%;background:${t.cardBg};border:1px solid ${t.border};border-radius:16px;"><tr><td style="padding:${d.padding};">
${campaignName ? `<p style="margin:0 0 8px;font-size:12px;color:${t.textMuted};text-transform:uppercase;letter-spacing:1px;">${campaignName}</p>` : ''}
${heroImageUrl ? `<img src="${heroImageUrl}" alt="${heroAlt || ''}" style="width:100%;border-radius:12px;margin-bottom:${d.gap};">` : ''}
<div style="color:${t.text};font-size:16px;">${bodyHtml}</div>
${ctaText && ctaUrl ? `<div style="margin-top:28px;text-align:center;"><a href="${ctaUrl}" style="${ctaStyle}">${ctaText}</a></div>` : ''}
</td></tr></table></td></tr>
<tr><td style="padding:32px ${d.padding};text-align:center;">
<p style="margin:0 0 8px;color:${t.textMuted};font-size:14px;">Popera, Canada</p>
<p style="margin:0 0 8px;font-size:13px;"><a href="mailto:support@gopopera.ca" style="color:${t.accent};text-decoration:none;">support@gopopera.ca</a></p>
<p style="margin:0;color:${t.textMuted};font-size:12px;"><a href="{{UNSUBSCRIBE_URL}}" style="color:${t.textMuted};text-decoration:underline;">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
  
  return { html };
}

// ============ HANDLER ============
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') return res.status(200).json({ success: true });
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    
    console.log('[Test Send] Request received');
    
    const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    const RESEND_FROM = process.env.RESEND_FROM || 'support@gopopera.ca';
    
    if (!RESEND_API_KEY) {
      return res.status(500).json({ success: false, error: 'Missing RESEND_API_KEY' });
    }
    
    // Verify admin
    const adminUser = await verifyAdminToken(req.headers.authorization);
    if (!adminUser) {
      return res.status(403).json({ success: false, error: 'Access denied - admin auth required' });
    }
    console.log('[Test Send] Admin verified:', adminUser.email);
    
    const emailParams = req.body;
    if (!emailParams?.subject || !emailParams?.markdownBody) {
      return res.status(400).json({ success: false, error: 'Missing subject or body' });
    }
    
    const { html } = buildMarketingEmailHtml(emailParams);
    const finalHtml = html.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, 'https://gopopera.ca/unsubscribe?uid=test&token=test');
    
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);
    
    const result = await resend.emails.send({
      from: RESEND_FROM,
      to: [ADMIN_EMAIL],
      subject: `[TEST] ${emailParams.subject}`,
      html: finalHtml,
    });
    
    if (result.error) {
      console.error('[Test Send] Resend error:', result.error);
      return res.status(500).json({ success: false, error: result.error.message });
    }
    
    console.log('[Test Send] Email sent, messageId:', result.data?.id);
    return res.status(200).json({ success: true, messageId: result.data?.id });
    
  } catch (error: any) {
    console.error('[Test Send] Error:', error?.message, error?.stack);
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
}
