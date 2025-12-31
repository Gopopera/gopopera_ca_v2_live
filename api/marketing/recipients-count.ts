/**
 * API: Get recipient count for marketing email
 * POST /api/marketing/recipients-count
 * 
 * Protected: Admin only (eatezca@gmail.com)
 * NOTE: Firebase Admin is INLINED to avoid Vercel module resolution issues.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

export const config = { runtime: 'nodejs' };

const ADMIN_EMAIL = 'eatezca@gmail.com';
const APP_NAME = 'recipients-count-admin';

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

async function verifyAdminToken(authHeader: string | undefined): Promise<{ uid: string; email: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const app = getFirebaseAdmin();
  if (!app) return null;
  try {
    const decoded = await app.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
    if (decoded.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return null;
    return { uid: decoded.uid, email: decoded.email || '' };
  } catch { return null; }
}

// ============ HANDLER ============
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
