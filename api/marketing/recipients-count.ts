/**
 * API: Get recipient count for marketing email
 * POST /api/marketing/recipients-count
 * 
 * Protected: Admin only (eatezca@gmail.com)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminFirestore, verifyAdminToken } from '../utils/firebaseAdmin';

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
  
  try {
    const { audience } = req.body;
    
    const db = getAdminFirestore();
    if (!db) {
      return res.status(500).json({ success: false, error: 'Firebase Admin not configured' });
    }
    const usersRef = db.collection('users');
    
    // Build query based on audience
    let query = usersRef.where('notification_settings.email_opt_in', '!=', false);
    
    // Note: Firestore doesn't support complex AND queries easily
    // We'll filter in memory for audience type
    const snapshot = await query.get();
    
    let filteredUsers = snapshot.docs.map(doc => ({
      id: doc.id,
      email: doc.data().email,
      preferences: doc.data().preferences,
      notification_settings: doc.data().notification_settings,
    }));
    
    // Filter by email_opt_in (not explicitly false)
    filteredUsers = filteredUsers.filter(u => {
      const optIn = u.notification_settings?.email_opt_in;
      // Include if opt_in is true or undefined (not explicitly false)
      return optIn !== false;
    });
    
    // Filter by valid email
    filteredUsers = filteredUsers.filter(u => u.email && u.email.includes('@'));
    
    // Filter by audience
    if (audience === 'hosts') {
      filteredUsers = filteredUsers.filter(u => 
        u.preferences === 'host' || u.preferences === 'both'
      );
    } else if (audience === 'attendees') {
      filteredUsers = filteredUsers.filter(u => 
        u.preferences === 'attend' || u.preferences === 'both' || !u.preferences
      );
    }
    
    // Mask emails for preview (show first 3 chars + domain)
    const sampleMaskedEmails = filteredUsers.slice(0, 5).map(u => {
      const [local, domain] = (u.email || '').split('@');
      if (!domain) return '***@***';
      const masked = local.slice(0, 3) + '***';
      return `${masked}@${domain}`;
    });
    
    console.log(`[Marketing] Recipient count: ${filteredUsers.length} for audience: ${audience}`);
    
    return res.status(200).json({
      success: true,
      count: filteredUsers.length,
      sampleMaskedEmails,
    });
    
  } catch (error: any) {
    console.error('[Marketing] Error fetching recipient count:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
}

