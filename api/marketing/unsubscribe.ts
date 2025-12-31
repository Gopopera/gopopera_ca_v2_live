/**
 * API: Process unsubscribe request
 * POST /api/marketing/unsubscribe
 * 
 * Public endpoint (no auth required, but token verified)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminFirestore, verifyUnsubscribeToken } from '../_utils/firebaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { uid, token } = req.body;
    
    if (!uid || !token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing uid or token' 
      });
    }
    
    // Verify token
    const isValid = verifyUnsubscribeToken(uid, token);
    if (!isValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid unsubscribe link' 
      });
    }
    
    const db = getAdminFirestore();
    if (!db) {
      return res.status(500).json({ success: false, error: 'Firebase Admin not configured' });
    }
    
    // Update user's notification settings
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // User might have been deleted, but we don't want to expose this
      // Just return success
      console.log(`[Unsubscribe] User ${uid} not found, returning success anyway`);
      return res.status(200).json({ success: true });
    }
    
    // Set email_opt_in to false
    await userRef.update({
      'notification_settings.email_opt_in': false,
      'unsubscribedAt': Date.now(),
    });
    
    // Log the unsubscribe
    await db.collection('email_unsubscribes').add({
      userId: uid,
      email: userDoc.data()?.email || 'unknown',
      timestamp: Date.now(),
      source: 'marketing_email',
    });
    
    console.log(`[Unsubscribe] User ${uid} unsubscribed successfully`);
    
    return res.status(200).json({ success: true });
    
  } catch (error: any) {
    console.error('[Unsubscribe] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
}

