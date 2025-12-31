/**
 * API: Send test marketing email to admin
 * POST /api/marketing/test-send
 * 
 * Protected: Admin only (eatezca@gmail.com)
 * NOTE: Firebase Admin + email builder are INLINED to avoid Vercel module resolution issues.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Force Node.js runtime (not Edge)
export const config = { runtime: 'nodejs' };

const ADMIN_EMAIL = 'eatezca@gmail.com';
const APP_NAME = 'test-send-admin';

// ============ HELPER: Decode JWT payload (unverified, for debugging only) ============
function decodeJwtPayload(token: string): { email?: string; aud?: string; iss?: string; sub?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

// ============ HELPER: Get env vars with fallback conventions ============
function getEnvVars() {
  // Try to parse FIREBASE_SERVICE_ACCOUNT JSON if available
  let serviceAccount: { project_id?: string; client_email?: string; private_key?: string } | null = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.warn('[Test Send] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON');
    }
  }
  
  // Resolve with priority: FIREBASE_ADMIN_* > FIREBASE_* > FIREBASE_SERVICE_ACCOUNT > VITE_*
  const projectId = 
    process.env.FIREBASE_ADMIN_PROJECT_ID || 
    process.env.FIREBASE_PROJECT_ID || 
    serviceAccount?.project_id ||
    process.env.VITE_FIREBASE_PROJECT_ID || 
    'gopopera2026';
  
  const clientEmail = 
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL || 
    process.env.FIREBASE_CLIENT_EMAIL ||
    serviceAccount?.client_email;
  
  // Get private key and normalize \\n to actual newlines
  let privateKey = 
    process.env.FIREBASE_ADMIN_PRIVATE_KEY || 
    process.env.FIREBASE_PRIVATE_KEY ||
    serviceAccount?.private_key;
  
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  
  // Log which env vars are present (for debugging)
  const envPresence = {
    FIREBASE_ADMIN_PROJECT_ID: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_SERVICE_ACCOUNT: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    VITE_FIREBASE_PROJECT_ID: !!process.env.VITE_FIREBASE_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    // Resolved values (what actually matters)
    resolvedProjectId: !!projectId,
    resolvedClientEmail: !!clientEmail,
    resolvedPrivateKey: !!privateKey,
    privateKeyLength: privateKey?.length || 0,
  };
  
  return { projectId, clientEmail, privateKey, envPresence };
}

// ============ INLINED: Firebase Admin Singleton ============
let adminApp: admin.app.App | null = null;
let initProjectId: string | null = null;

function getFirebaseAdmin(): { app: admin.app.App | null; projectId: string; envPresence: Record<string, boolean> } {
  const { projectId, clientEmail, privateKey, envPresence } = getEnvVars();
  
  if (adminApp) {
    return { app: adminApp, projectId: initProjectId || projectId, envPresence };
  }
  
  try {
    adminApp = admin.app(APP_NAME);
    console.log('[Test Send] Reusing existing Firebase Admin app');
    return { app: adminApp, projectId: initProjectId || projectId, envPresence };
  } catch {
    // App doesn't exist, continue to initialize
  }
  
  console.log('[Test Send] Env vars presence:', envPresence);
  console.log('[Test Send] Using projectId:', projectId);
  
  if (!clientEmail || !privateKey) {
    console.error('[Test Send] MISSING CREDENTIALS - clientEmail or privateKey not set');
    return { app: null, projectId, envPresence };
  }
  
  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId,
    }, APP_NAME);
    initProjectId = projectId;
    console.log('[Test Send] Firebase Admin initialized with project:', projectId);
    return { app: adminApp, projectId, envPresence };
  } catch (error: any) {
    console.error('[Test Send] Firebase Admin init FAILED:', error?.message || error);
    return { app: null, projectId, envPresence };
  }
}

type AuthResult = 
  | { success: true; uid: string; email: string }
  | { success: false; reason: 'missing_auth_header' | 'admin_not_configured' | 'verify_failed' | 'email_mismatch'; details?: Record<string, unknown> };

async function verifyAdminToken(authHeader: string | undefined): Promise<AuthResult> {
  console.log('[Test Send] verifyAdminToken called, hasHeader:', !!authHeader);
  
  // Check auth header
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('[Test Send] Missing or invalid Authorization header');
    return { success: false, reason: 'missing_auth_header' };
  }
  
  const token = authHeader.split('Bearer ')[1];
  console.log('[Test Send] Token extracted, length:', token?.length || 0);
  
  // Decode token payload (unverified) for debugging
  const unverifiedPayload = decodeJwtPayload(token);
  console.log('[Test Send] Unverified token payload:', {
    email: unverifiedPayload?.email,
    aud: unverifiedPayload?.aud,
    iss: unverifiedPayload?.iss,
  });
  
  // Initialize Firebase Admin
  const { app, projectId, envPresence } = getFirebaseAdmin();
  if (!app) {
    console.error('[Test Send] Firebase Admin not configured');
    return { 
      success: false, 
      reason: 'admin_not_configured',
      details: { envPresence, projectId }
    };
  }
  
  try {
    const decoded = await app.auth().verifyIdToken(token);
    
    console.log('[Test Send] Token verified successfully:', {
      uid: decoded.uid,
      email: decoded.email,
      aud: decoded.aud,
      iss: decoded.iss,
    });
    
    const tokenEmail = decoded.email?.toLowerCase();
    const adminEmail = ADMIN_EMAIL.toLowerCase();
    
    if (tokenEmail !== adminEmail) {
      console.warn('[Test Send] ACCESS DENIED - email mismatch:', { tokenEmail, adminEmail });
      return { 
        success: false, 
        reason: 'email_mismatch',
        details: { tokenEmail, expectedEmail: adminEmail }
      };
    }
    
    return { success: true, uid: decoded.uid, email: decoded.email || '' };
    
  } catch (error: any) {
    console.error('[Test Send] verifyIdToken FAILED:', {
      message: error?.message,
      code: error?.code,
      projectIdUsed: projectId,
      tokenAud: unverifiedPayload?.aud,
      tokenIss: unverifiedPayload?.iss,
      tokenEmail: unverifiedPayload?.email,
    });
    return { 
      success: false, 
      reason: 'verify_failed',
      details: {
        errorCode: error?.code,
        errorMessage: error?.message,
        projectIdUsed: projectId,
        tokenAud: unverifiedPayload?.aud,
        tokenIss: unverifiedPayload?.iss,
        tokenEmail: unverifiedPayload?.email,
      }
    };
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
    
    console.log('[Test Send] === REQUEST START ===');
    console.log('[Test Send] Headers received:', {
      hasAuth: !!req.headers.authorization,
      authPrefix: req.headers.authorization?.substring(0, 20) + '...',
    });
    
    // Verify admin FIRST with detailed reason codes
    const authResult = await verifyAdminToken(req.headers.authorization);
    
    if (!authResult.success) {
      console.error('[Test Send] Admin verification FAILED:', authResult.reason);
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden',
        reason: authResult.reason,
        details: authResult.details,
      });
    }
    
    console.log('[Test Send] Admin verified:', authResult.email);
    
    // Check Resend config
    const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    const RESEND_FROM = process.env.RESEND_FROM || 'support@gopopera.ca';
    
    if (!RESEND_API_KEY) {
      console.error('[Test Send] Missing RESEND_API_KEY');
      return res.status(500).json({ success: false, error: 'Missing RESEND_API_KEY' });
    }
    
    // Validate that RESEND_API_KEY looks like a real key (starts with "re_")
    if (!RESEND_API_KEY.startsWith('re_')) {
      console.error('[Test Send] RESEND_API_KEY does not start with "re_" - is it set correctly?');
      return res.status(500).json({ success: false, error: 'Invalid RESEND_API_KEY format' });
    }
    
    const emailParams = req.body;
    if (!emailParams?.subject || !emailParams?.markdownBody) {
      return res.status(400).json({ success: false, error: 'Missing subject or body' });
    }
    
    // Build and send email
    const { html } = buildMarketingEmailHtml(emailParams);
    const finalHtml = html.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, 'https://gopopera.ca/unsubscribe?uid=test&token=test');
    
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);
    
    console.log('[Test Send] Sending email to:', ADMIN_EMAIL);
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
    
    console.log('[Test Send] === SUCCESS === messageId:', result.data?.id);
    return res.status(200).json({ success: true, messageId: result.data?.id });
    
  } catch (error: any) {
    console.error('[Test Send] UNHANDLED ERROR:', error?.message, error?.stack);
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
}
