/**
 * API: Send outreach emails to selected leads using an Outreach Template
 * POST /api/leads/send-outreach
 * 
 * Protected: Admin only (eatezca@gmail.com)
 * 
 * Input: { leadIds: string[], templateId: string }
 * Output: { success: true, sent: number, failed: number, skipped: number, results: [...] }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminToken, getAdminFirestore } from '../_lib/firebaseAdmin.js';

export const config = { 
  runtime: 'nodejs',
  maxDuration: 300,  // 5 minutes - handles up to ~200 leads at 600ms each
};

// Resend rate limit: 2 emails/second on free plan
const EMAIL_DELAY_MS = 600;
const MAX_LEADS_PER_REQUEST = 200;

// ============ Email Builder (reused from send-bulk.ts) ============
function buildOutreachEmailHtml(params: {
  subject: string;
  preheader?: string;
  theme?: 'dark' | 'light' | 'minimal';
  markdownBody: string;
  ctaText?: string;
  ctaUrl?: string;
}): string {
  const { subject, preheader, theme = 'dark', markdownBody, ctaText, ctaUrl } = params;
  
  const themes = {
    dark: { bg: '#15383c', text: '#f2f2f2', textMuted: 'rgba(242,242,242,0.7)', accent: '#e35e25', cardBg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.12)' },
    light: { bg: '#ffffff', text: '#15383c', textMuted: '#6b7280', accent: '#e35e25', cardBg: '#f8fafb', border: '#e5e7eb' },
    minimal: { bg: '#ffffff', text: '#1f2937', textMuted: '#6b7280', accent: '#e35e25', cardBg: '#ffffff', border: '#e5e7eb' },
  };
  const t = themes[theme] || themes.dark;
  const padding = '40px';
  const gap = '20px';
  
  let bodyHtml = (markdownBody || '')
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${t.text};">$1</strong>`)
    .replace(/\*(.+?)\*/g, `<em style="color:${t.text};">$1</em>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" style="color:${t.accent};">$1</a>`)
    .replace(/\n\n+/g, `</p><p style="margin:0 0 16px;line-height:1.7;color:${t.text};">`);
  bodyHtml = `<p style="margin:0 0 16px;line-height:1.7;color:${t.text};">${bodyHtml}</p>`;
  
  const ctaStyle = theme === 'dark'
    ? `display:inline-block;padding:14px 32px;border:2px solid ${t.accent};color:${t.accent};text-decoration:none;border-radius:8px;font-weight:600;`
    : `display:inline-block;padding:14px 32px;background:${t.accent};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;`;
  
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;background:${t.bg};color:${t.text};">
${preheader ? `<div style="display:none;">${preheader}</div>` : ''}
<table style="width:100%;"><tr><td align="center" style="padding:24px;">
<table style="max-width:600px;width:100%;">
<tr><td style="padding:${padding};text-align:center;"><span style="font-size:28px;font-weight:700;">Popera</span></td></tr>
<tr><td><table style="width:100%;background:${t.cardBg};border:1px solid ${t.border};border-radius:16px;"><tr><td style="padding:${padding};">
<div style="color:${t.text};">${bodyHtml}</div>
${ctaText && ctaUrl ? `<div style="margin-top:28px;text-align:center;"><a href="${ctaUrl}" style="${ctaStyle}">${ctaText}</a></div>` : ''}
</td></tr></table></td></tr>
<tr><td style="padding:32px;text-align:center;color:${t.textMuted};font-size:12px;">
<p>Popera, Canada | <a href="mailto:support@gopopera.ca" style="color:${t.accent};">support@gopopera.ca</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

// Merge placeholders in text: {{business_name}}, {{city}}, {{category}}
function mergePlaceholders(text: string, lead: { businessName: string; city: string; categoryKey: string }): string {
  return text
    .replace(/\{\{business_name\}\}/gi, lead.businessName || '')
    .replace(/\{\{city\}\}/gi, lead.city || '')
    .replace(/\{\{category\}\}/gi, lead.categoryKey || '');
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ============ HANDLER ============
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  
  try {
    console.log('[Send Outreach] === REQUEST START ===');
    
    // Verify admin
    const authResult = await verifyAdminToken(req.headers.authorization);
    if (!authResult.success) {
      console.error('[Send Outreach] Admin verification FAILED:', authResult.reason);
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden',
        reason: authResult.reason,
      });
    }
    
    const adminEmail = authResult.email || 'admin';
    console.log('[Send Outreach] Admin verified:', adminEmail);
    
    // Validate input
    const { leadIds, templateId } = req.body;
    
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ success: false, error: 'leadIds must be a non-empty array' });
    }
    if (leadIds.length > MAX_LEADS_PER_REQUEST) {
      return res.status(400).json({ success: false, error: `Maximum ${MAX_LEADS_PER_REQUEST} leads per request` });
    }
    if (!templateId || typeof templateId !== 'string') {
      return res.status(400).json({ success: false, error: 'templateId is required' });
    }
    
    // Get Resend config
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const RESEND_FROM = process.env.RESEND_FROM ?? 'Popera <support@gopopera.ca>';
    const RESEND_REPLY_TO = 'support@gopopera.ca';
    
    if (!RESEND_API_KEY) {
      return res.status(500).json({ success: false, error: 'Missing RESEND_API_KEY' });
    }
    
    const db = getAdminFirestore();
    if (!db) {
      return res.status(500).json({ success: false, error: 'Firebase not configured' });
    }
    
    // Fetch template
    const templateDoc = await db.collection('outreach_templates').doc(templateId).get();
    if (!templateDoc.exists) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    const template = templateDoc.data()!;
    const templateName = template.name || 'Unknown Template';
    
    console.log('[Send Outreach] Using template:', templateName);
    
    // Fetch leads
    const leadsToProcess: Array<{
      id: string;
      businessName: string;
      city: string;
      categoryKey: string;
      email?: string;
      status: string;
    }> = [];
    
    for (const leadId of leadIds) {
      const leadDoc = await db.collection('leads').doc(leadId).get();
      if (leadDoc.exists) {
        const data = leadDoc.data()!;
        leadsToProcess.push({
          id: leadDoc.id,
          businessName: data.businessName || '',
          city: data.city || '',
          categoryKey: data.categoryKey || '',
          email: data.email,
          status: data.status || 'new',
        });
      }
    }
    
    console.log(`[Send Outreach] Found ${leadsToProcess.length} leads to process`);
    
    // Initialize Resend
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);
    
    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const results: Array<{
      leadId: string;
      businessName: string;
      email?: string;
      outcome: 'sent' | 'failed' | 'skipped';
      reason?: string;
    }> = [];
    
    const now = Date.now();
    
    // Process each lead
    for (let i = 0; i < leadsToProcess.length; i++) {
      const lead = leadsToProcess[i];
      
      // Skip if no email
      if (!lead.email || !lead.email.includes('@')) {
        results.push({
          leadId: lead.id,
          businessName: lead.businessName,
          email: lead.email,
          outcome: 'skipped',
          reason: 'No valid email',
        });
        skippedCount++;
        continue;
      }
      
      // Merge placeholders
      const mergedSubject = mergePlaceholders(template.subject || '', lead);
      const mergedPreheader = mergePlaceholders(template.preheader || '', lead);
      const mergedBody = mergePlaceholders(template.markdownBody || '', lead);
      const mergedCtaText = mergePlaceholders(template.ctaText || '', lead);
      const mergedCtaUrl = template.ctaUrl || '';
      
      // Build HTML
      const html = buildOutreachEmailHtml({
        subject: mergedSubject,
        preheader: mergedPreheader,
        theme: template.theme || 'dark',
        markdownBody: mergedBody,
        ctaText: mergedCtaText,
        ctaUrl: mergedCtaUrl,
      });
      
      try {
        // Send email
        const sendResult = await resend.emails.send({
          from: RESEND_FROM,
          replyTo: RESEND_REPLY_TO,
          to: [lead.email],
          subject: mergedSubject,
          html,
        });
        
        if (sendResult.error) {
          throw new Error(sendResult.error.message);
        }
        
        // Log to email_logs
        await db.collection('email_logs').add({
          to: lead.email,
          leadId: lead.id,
          templateId,
          subject: mergedSubject,
          type: 'lead_outreach',
          status: 'sent',
          messageId: sendResult.data?.id,
          timestamp: now,
        });
        
        // Update lead.lastContactedAt and status (only if 'new')
        const leadUpdate: Record<string, any> = {
          lastContactedAt: now,
          updatedAt: now,
        };
        if (lead.status === 'new') {
          leadUpdate.status = 'contacted';
        }
        await db.collection('leads').doc(lead.id).update(leadUpdate);
        
        // Add lead activity
        await db.collection('lead_activities').add({
          leadId: lead.id,
          type: 'email_sent',
          description: `Outreach email sent using template: ${templateName}`,
          performedBy: adminEmail,
          timestamp: now,
        });
        
        results.push({
          leadId: lead.id,
          businessName: lead.businessName,
          email: lead.email,
          outcome: 'sent',
        });
        sentCount++;
        
      } catch (err: any) {
        console.error(`[Send Outreach] Failed to send to ${lead.email}:`, err.message);
        
        // Log failed attempt
        await db.collection('email_logs').add({
          to: lead.email,
          leadId: lead.id,
          templateId,
          subject: mergedSubject,
          type: 'lead_outreach',
          status: 'failed',
          error: err.message,
          timestamp: now,
        });
        
        results.push({
          leadId: lead.id,
          businessName: lead.businessName,
          email: lead.email,
          outcome: 'failed',
          reason: err.message,
        });
        failedCount++;
      }
      
      // Rate limit delay (except for last email)
      if (i < leadsToProcess.length - 1) {
        await sleep(EMAIL_DELAY_MS);
      }
    }
    
    console.log('[Send Outreach] === COMPLETE ===', { sentCount, failedCount, skippedCount });
    
    return res.status(200).json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      skipped: skippedCount,
      results,
    });
    
  } catch (error: any) {
    console.error('[Send Outreach] UNHANDLED ERROR:', error?.message, error?.stack);
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
}

