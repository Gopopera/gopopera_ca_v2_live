/**
 * API: Get recipient count for marketing email
 * POST /api/marketing/recipients-count
 * 
 * Protected: Admin only (eatezca@gmail.com)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminToken, getAdminFirestore } from '../_lib/firebaseAdmin.js';

export const config = { runtime: 'nodejs' };

// ============ HANDLER ============
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  
  try {
    console.log('[Recipients Count] === REQUEST START ===');
    
    // Verify admin with shared helper
    const authResult = await verifyAdminToken(req.headers.authorization);
    
    if (!authResult.success) {
      console.error('[Recipients Count] Admin verification FAILED:', authResult.reason);
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied',
        reason: authResult.reason,
        details: authResult.details,
      });
    }
    
    console.log('[Recipients Count] Admin verified:', authResult.email);
    
    const db = getAdminFirestore();
    if (!db) return res.status(500).json({ success: false, error: 'Firebase not configured' });
    
    const { audience } = req.body;
    const snapshot = await db.collection('users').get();
    
    let filteredUsers = snapshot.docs.map(doc => ({
      id: doc.id,
      email: doc.data().email,
      preferences: doc.data().preferences,
      notification_settings: doc.data().notification_settings,
    }));
    
    // Filter by email_opt_in (not explicitly false)
    filteredUsers = filteredUsers.filter(u => u.notification_settings?.email_opt_in !== false);
    
    // Filter by valid email
    filteredUsers = filteredUsers.filter(u => u.email?.includes('@'));
    
    // Filter by audience
    if (audience === 'hosts') {
      filteredUsers = filteredUsers.filter(u => u.preferences === 'host' || u.preferences === 'both');
    } else if (audience === 'attendees') {
      filteredUsers = filteredUsers.filter(u => u.preferences === 'attend' || u.preferences === 'both' || !u.preferences);
    }
    
    // Mask emails for preview
    const sampleMaskedEmails = filteredUsers.slice(0, 5).map(u => {
      const [local, domain] = (u.email || '').split('@');
      return domain ? `${local.slice(0, 3)}***@${domain}` : '***@***';
    });
    
    console.log(`[Recipients Count] ${filteredUsers.length} for audience: ${audience}`);
    
    return res.status(200).json({ success: true, count: filteredUsers.length, sampleMaskedEmails });
  } catch (error: any) {
    console.error('[Recipients Count] Error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
}
