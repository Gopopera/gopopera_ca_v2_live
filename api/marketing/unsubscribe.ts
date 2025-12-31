/**
 * API: Process unsubscribe request
 * POST /api/marketing/unsubscribe
 * 
 * Public endpoint (no auth required, but token verified)
 * NOTE: Firebase Admin is INLINED to avoid Vercel module resolution issues.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

export const config = { runtime: 'nodejs' };

const APP_NAME = 'unsubscribe-admin';

// ============ INLINED: Firebase Admin ============
let adminApp: admin.app.App | null = null;

function getFirebaseAdmin(): admin.app.App | null {
  if (adminApp) return adminApp;
  try { adminApp = admin.app(APP_NAME); return adminApp; } catch {}
  
  const projectId = process.env.FIREBASE_PROJECT_ID || 'gopopera2026';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!clientEmail || !privateKey) return null;
  
  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId,
    }, APP_NAME);
    return adminApp;
  } catch { return null; }
}

function getAdminFirestore(): admin.firestore.Firestore | null {
  const app = getFirebaseAdmin();
  return app ? app.firestore() : null;
}

function verifyUnsubscribeToken(uid: string, token: string): boolean {
  const secret = process.env.UNSUBSCRIBE_SECRET || 'popera-marketing-2024';
  const expected = Buffer.from(`${uid}:${secret}`).toString('base64url');
  return token === expected;
}

// ============ HANDLER ============
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  
  try {
    const { uid, token } = req.body;
    
    if (!uid || !token) {
      return res.status(400).json({ success: false, error: 'Missing uid or token' });
    }
    
    if (!verifyUnsubscribeToken(uid, token)) {
      return res.status(400).json({ success: false, error: 'Invalid unsubscribe link' });
    }
    
    const db = getAdminFirestore();
    if (!db) return res.status(500).json({ success: false, error: 'Firebase not configured' });
    
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log(`[Unsubscribe] User ${uid} not found, returning success`);
      return res.status(200).json({ success: true });
    }
    
    await userRef.update({
      'notification_settings.email_opt_in': false,
      'unsubscribedAt': Date.now(),
    });
    
    await db.collection('email_unsubscribes').add({
      userId: uid,
      email: userDoc.data()?.email || 'unknown',
      timestamp: Date.now(),
      source: 'marketing_email',
    });
    
    console.log(`[Unsubscribe] User ${uid} unsubscribed`);
    return res.status(200).json({ success: true });
    
  } catch (error: any) {
    console.error('[Unsubscribe] Error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
}
