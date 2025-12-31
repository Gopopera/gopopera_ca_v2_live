/**
 * API: Send bulk marketing email campaign
 * POST /api/marketing/send-bulk
 * 
 * Protected: Admin only (eatezca@gmail.com)
 * NOTE: Firebase Admin + helpers are INLINED to avoid Vercel module resolution issues.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

export const config = { runtime: 'nodejs' };

const ADMIN_EMAIL = 'eatezca@gmail.com';
const APP_NAME = 'send-bulk-admin';
const BATCH_SIZE = 50;
const BATCH_DELAY = 1000;

// ============ INLINED: Firebase Admin ============
let adminApp: admin.app.App | null = null;

function getFirebaseAdmin(): admin.app.App | null {
  if (adminApp) return adminApp;
  try { 
    adminApp = admin.app(APP_NAME); 
    console.log('[Bulk Send] Reusing existing Firebase Admin app');
    return adminApp; 
  } catch {}
  
  const projectId = process.env.FIREBASE_PROJECT_ID || 'gopopera2026';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  console.log('[Bulk Send] Env check:', {
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    hasPrivateKey: !!privateKey,
    privateKeyLength: privateKey?.length || 0,
  });
  
  if (!clientEmail || !privateKey) {
    console.error('[Bulk Send] MISSING CREDENTIALS');
    return null;
  }
  
  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId,
    }, APP_NAME);
    console.log('[Bulk Send] Firebase Admin initialized');
    return adminApp;
  } catch (error: any) { 
    console.error('[Bulk Send] Firebase Admin init failed:', error?.message);
    return null; 
  }
}

function getAdminFirestore(): admin.firestore.Firestore | null {
  const app = getFirebaseAdmin();
  return app ? app.firestore() : null;
}

async function verifyAdminToken(authHeader: string | undefined): Promise<{ uid: string; email: string } | null> {
  console.log('[Bulk Send] verifyAdminToken called, hasHeader:', !!authHeader);
  
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('[Bulk Send] Invalid auth header format');
    return null;
  }
  
  const app = getFirebaseAdmin();
  if (!app) {
    console.error('[Bulk Send] Firebase Admin app is null');
    return null;
  }
  
  const token = authHeader.split('Bearer ')[1];
  console.log('[Bulk Send] Token extracted, length:', token?.length || 0);
  
  try {
    const decoded = await app.auth().verifyIdToken(token);
    
    console.log('[Bulk Send] Token verified:', {
      email: decoded.email,
      uid: decoded.uid,
      aud: decoded.aud,
    });
    
    if (decoded.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.warn('[Bulk Send] ACCESS DENIED - email mismatch:', decoded.email);
      return null;
    }
    
    return { uid: decoded.uid, email: decoded.email || '' };
  } catch (error: any) { 
    console.error('[Bulk Send] verifyIdToken FAILED:', {
      message: error?.message,
      code: error?.code,
    });
    return null; 
  }
}

function generateUnsubscribeToken(uid: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || 'popera-marketing-2024';
  return Buffer.from(`${uid}:${secret}`).toString('base64url');
}

// ============ INLINED: Email Builder ============
function buildMarketingEmailHtml(params: any): { html: string } {
  const { subject, preheader, theme = 'dark', density = 'normal', heroImageUrl, heroAlt, markdownBody, ctaText, ctaUrl, campaignName } = params;
  const themes: any = {
    dark: { bg: '#15383c', text: '#f2f2f2', textMuted: 'rgba(242,242,242,0.7)', accent: '#e35e25', cardBg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.12)' },
    light: { bg: '#ffffff', text: '#15383c', textMuted: '#6b7280', accent: '#e35e25', cardBg: '#f8fafb', border: '#e5e7eb' },
    minimal: { bg: '#ffffff', text: '#1f2937', textMuted: '#6b7280', accent: '#e35e25', cardBg: '#ffffff', border: '#e5e7eb' },
  };
  const t = themes[theme] || themes.dark;
  const d = density === 'compact' ? { padding: '24px', gap: '12px' } : { padding: '40px', gap: '20px' };
  
  let bodyHtml = (markdownBody || '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" style="color:${t.accent};">$1</a>`)
    .replace(/\n\n+/g, '</p><p style="margin:0 0 16px;line-height:1.7;">');
  bodyHtml = `<p style="margin:0 0 16px;line-height:1.7;">${bodyHtml}</p>`;
  
  const ctaStyle = theme === 'dark'
    ? `display:inline-block;padding:14px 32px;border:2px solid ${t.accent};color:${t.accent};text-decoration:none;border-radius:8px;font-weight:600;`
    : `display:inline-block;padding:14px 32px;background:${t.accent};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;`;
  
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;background:${t.bg};color:${t.text};">
${preheader ? `<div style="display:none;">${preheader}</div>` : ''}
<table style="width:100%;"><tr><td align="center" style="padding:24px;">
<table style="max-width:600px;width:100%;">
<tr><td style="padding:${d.padding};text-align:center;"><span style="font-size:28px;font-weight:700;">Popera</span></td></tr>
<tr><td><table style="width:100%;background:${t.cardBg};border:1px solid ${t.border};border-radius:16px;"><tr><td style="padding:${d.padding};">
${campaignName ? `<p style="margin:0 0 8px;font-size:12px;color:${t.textMuted};">${campaignName}</p>` : ''}
${heroImageUrl ? `<img src="${heroImageUrl}" alt="${heroAlt || ''}" style="width:100%;border-radius:12px;margin-bottom:${d.gap};">` : ''}
<div>${bodyHtml}</div>
${ctaText && ctaUrl ? `<div style="margin-top:28px;text-align:center;"><a href="${ctaUrl}" style="${ctaStyle}">${ctaText}</a></div>` : ''}
</td></tr></table></td></tr>
<tr><td style="padding:32px;text-align:center;color:${t.textMuted};font-size:12px;">
<p>Popera, Canada | <a href="mailto:support@gopopera.ca" style="color:${t.accent};">support@gopopera.ca</a></p>
<p><a href="{{UNSUBSCRIBE_URL}}" style="color:${t.textMuted};">Unsubscribe</a></p>
</td></tr></table></td></tr></table></body></html>`;
  return { html };
}

// ============ HANDLER ============
async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  
  try {
    const adminUser = await verifyAdminToken(req.headers.authorization);
    if (!adminUser) return res.status(403).json({ success: false, error: 'Access denied' });
    
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const RESEND_FROM = process.env.RESEND_FROM || 'support@gopopera.ca';
    const BASE_URL = process.env.VITE_APP_URL || 'https://gopopera.ca';
    
    if (!RESEND_API_KEY) return res.status(500).json({ success: false, error: 'Missing RESEND_API_KEY' });
    
    const db = getAdminFirestore();
    if (!db) return res.status(500).json({ success: false, error: 'Firebase not configured' });
    
    const { audience, campaignId, ...emailParams } = req.body;
    
    // Fetch recipients
    const snapshot = await db.collection('users').get();
    const recipients: { uid: string; email: string }[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.email?.includes('@') || data.notification_settings?.email_opt_in === false) return;
      if (audience === 'hosts' && data.preferences !== 'host' && data.preferences !== 'both') return;
      if (audience === 'attendees' && data.preferences !== 'attend' && data.preferences !== 'both' && data.preferences !== undefined) return;
      recipients.push({ uid: doc.id, email: data.email });
    });
    
    console.log(`[Bulk Send] Sending to ${recipients.length} recipients`);
    
    const { html: baseHtml } = buildMarketingEmailHtml(emailParams);
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);
    
    let sentCount = 0, failedCount = 0;
    
    const logRef = db.collection('marketing_campaigns_log').doc();
    await logRef.set({ campaignId, subject: emailParams.subject, audience, totalRecipients: recipients.length, sentCount: 0, failedCount: 0, status: 'sending', startedAt: Date.now(), adminEmail: adminUser.email });
    
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async (r) => {
        try {
          const unsubUrl = `${BASE_URL}/unsubscribe?uid=${r.uid}&token=${generateUnsubscribeToken(r.uid)}`;
          const html = baseHtml.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubUrl);
          const result = await resend.emails.send({ from: RESEND_FROM, to: [r.email], subject: emailParams.subject, html });
          if (result.error) throw new Error(result.error.message);
          await db.collection('email_logs').add({ to: r.email, userId: r.uid, subject: emailParams.subject, type: 'marketing_campaign', status: 'sent', messageId: result.data?.id, timestamp: Date.now() });
          return true;
        } catch (e: any) {
          await db.collection('email_logs').add({ to: r.email, userId: r.uid, subject: emailParams.subject, type: 'marketing_campaign', status: 'failed', error: e.message, timestamp: Date.now() });
          return false;
        }
      }));
      results.forEach(ok => ok ? sentCount++ : failedCount++);
      await logRef.update({ sentCount, failedCount, lastUpdatedAt: Date.now() });
      if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY);
    }
    
    await logRef.update({ sentCount, failedCount, status: failedCount === recipients.length ? 'failed' : 'completed', completedAt: Date.now() });
    if (campaignId) await db.collection('marketing_campaigns').doc(campaignId).update({ status: 'sent', recipientCount: recipients.length, sentCount, failedCount, sentAt: Date.now() });
    
    return res.status(200).json({ success: true, sentCount, failedCount, totalRecipients: recipients.length });
  } catch (error: any) {
    console.error('[Bulk Send] Error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
}
