/**
 * API: Send bulk marketing email campaign
 * POST /api/marketing/send-bulk
 * 
 * Protected: Admin only (eatezca@gmail.com)
 * 
 * Sends emails in batches with rate limiting to respect Resend limits
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { getAdminFirestore, verifyAdminToken, generateUnsubscribeToken } from '../_utils/firebaseAdmin';
import { buildMarketingEmailHtml } from '../_utils/marketingEmailBuilder';

const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || process.env.VITE_RESEND_FROM || 'support@gopopera.ca';
const BASE_URL = process.env.VITE_APP_URL || 'https://gopopera.ca';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Batch size for sending (Resend allows up to 100 per batch)
const BATCH_SIZE = 50;
// Delay between batches (ms) to respect rate limits
const BATCH_DELAY = 1000;

interface Recipient {
  uid: string;
  email: string;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    const { audience, campaignId, ...emailParams } = req.body;
    
    const db = getAdminFirestore();
    if (!db) {
      return res.status(500).json({ success: false, error: 'Firebase Admin not configured' });
    }
    
    // Fetch recipients
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    let recipients: Recipient[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = data.email;
      const optIn = data.notification_settings?.email_opt_in;
      const preferences = data.preferences;
      
      // Skip if no email or explicitly opted out
      if (!email || !email.includes('@') || optIn === false) {
        return;
      }
      
      // Filter by audience
      if (audience === 'hosts' && preferences !== 'host' && preferences !== 'both') {
        return;
      }
      if (audience === 'attendees' && preferences !== 'attend' && preferences !== 'both' && preferences !== undefined) {
        return;
      }
      
      recipients.push({ uid: doc.id, email });
    });
    
    console.log(`[Marketing Bulk] Sending to ${recipients.length} recipients`);
    
    // Build base HTML
    const { html: baseHtml } = buildMarketingEmailHtml(emailParams);
    
    // Track results
    let sentCount = 0;
    let failedCount = 0;
    const failedEmails: string[] = [];
    
    // Create campaign log document
    const campaignLogRef = db.collection('marketing_campaigns_log').doc();
    await campaignLogRef.set({
      campaignId: campaignId || null,
      subject: emailParams.subject,
      audience,
      totalRecipients: recipients.length,
      sentCount: 0,
      failedCount: 0,
      status: 'sending',
      startedAt: Date.now(),
      adminEmail: admin.email,
    });
    
    // Process in batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      
      // Send each email individually (for personalized unsubscribe links)
      const batchPromises = batch.map(async (recipient) => {
        try {
          // Generate personalized unsubscribe URL
          const unsubToken = generateUnsubscribeToken(recipient.uid);
          const unsubUrl = `${BASE_URL}/unsubscribe?uid=${recipient.uid}&token=${unsubToken}`;
          
          // Replace placeholder
          const personalizedHtml = baseHtml.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubUrl);
          
          const result = await resend.emails.send({
            from: RESEND_FROM,
            to: [recipient.email],
            subject: emailParams.subject,
            html: personalizedHtml,
          });
          
          if (result.error) {
            throw new Error(result.error.message);
          }
          
          // Log individual email
          await db.collection('email_logs').add({
            to: recipient.email,
            userId: recipient.uid,
            subject: emailParams.subject,
            type: 'marketing_campaign',
            campaignLogId: campaignLogRef.id,
            status: 'sent',
            messageId: result.data?.id,
            timestamp: Date.now(),
          });
          
          return { success: true, email: recipient.email };
        } catch (error: any) {
          console.error(`[Marketing Bulk] Failed to send to ${recipient.email}:`, error.message);
          
          // Log failure
          await db.collection('email_logs').add({
            to: recipient.email,
            userId: recipient.uid,
            subject: emailParams.subject,
            type: 'marketing_campaign',
            campaignLogId: campaignLogRef.id,
            status: 'failed',
            error: error.message,
            timestamp: Date.now(),
          });
          
          return { success: false, email: recipient.email, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(r => {
        if (r.success) {
          sentCount++;
        } else {
          failedCount++;
          failedEmails.push(r.email);
        }
      });
      
      // Update campaign log progress
      await campaignLogRef.update({
        sentCount,
        failedCount,
        lastUpdatedAt: Date.now(),
      });
      
      // Rate limiting delay between batches
      if (i + BATCH_SIZE < recipients.length) {
        await sleep(BATCH_DELAY);
      }
    }
    
    // Finalize campaign log
    await campaignLogRef.update({
      sentCount,
      failedCount,
      status: failedCount === recipients.length ? 'failed' : 'completed',
      completedAt: Date.now(),
    });
    
    // Update campaign document if provided
    if (campaignId) {
      await db.collection('marketing_campaigns').doc(campaignId).update({
        status: 'sent',
        recipientCount: recipients.length,
        sentCount,
        failedCount,
        sentAt: Date.now(),
      });
    }
    
    console.log(`[Marketing Bulk] Complete: ${sentCount} sent, ${failedCount} failed`);
    
    return res.status(200).json({
      success: true,
      sentCount,
      failedCount,
      totalRecipients: recipients.length,
      logId: campaignLogRef.id,
    });
    
  } catch (error: any) {
    console.error('[Marketing Bulk] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
}

