/**
 * Firebase Admin SDK initialization for Vercel API routes
 * Singleton pattern to prevent multiple initializations
 */

import * as admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

function getFirebaseAdmin(): admin.app.App {
  if (adminApp) {
    return adminApp;
  }
  
  // Try to initialize from environment variables first
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gopopera2026';
  
  // Check if service account credentials are available
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
      console.log('[Firebase Admin] Initialized with service account from env');
      return adminApp;
    } catch (error) {
      console.error('[Firebase Admin] Failed to parse service account JSON:', error);
    }
  }
  
  // Fallback: Check for individual env vars
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (clientEmail && privateKey) {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
    console.log('[Firebase Admin] Initialized with individual env vars');
    return adminApp;
  }
  
  // Final fallback: Initialize without credentials (works in some environments)
  try {
    adminApp = admin.initializeApp({
      projectId,
    });
    console.log('[Firebase Admin] Initialized with default credentials');
    return adminApp;
  } catch (error) {
    console.error('[Firebase Admin] Failed to initialize:', error);
    throw new Error('Firebase Admin SDK could not be initialized');
  }
}

// Get Firestore instance
export function getAdminFirestore(): admin.firestore.Firestore {
  return getFirebaseAdmin().firestore();
}

// Get Auth instance
export function getAdminAuth(): admin.auth.Auth {
  return getFirebaseAdmin().auth();
}

// Verify admin access (must be eatezca@gmail.com)
const ADMIN_EMAIL = 'eatezca@gmail.com';

export async function verifyAdminToken(authHeader: string | undefined): Promise<{ uid: string; email: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    
    if (decoded.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.warn('[Admin Auth] Access denied for:', decoded.email);
      return null;
    }
    
    return { uid: decoded.uid, email: decoded.email || '' };
  } catch (error) {
    console.error('[Admin Auth] Token verification failed:', error);
    return null;
  }
}

// Generate unsubscribe token (simple hash for now)
export function generateUnsubscribeToken(uid: string): string {
  // Simple token: base64 of uid + timestamp + secret
  const secret = process.env.UNSUBSCRIBE_SECRET || 'popera-marketing-2024';
  const data = `${uid}:${secret}`;
  return Buffer.from(data).toString('base64url');
}

// Verify unsubscribe token
export function verifyUnsubscribeToken(uid: string, token: string): boolean {
  const expectedToken = generateUnsubscribeToken(uid);
  return token === expectedToken;
}

