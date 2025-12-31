/**
 * Firebase Admin SDK initialization for Vercel API routes
 * Singleton pattern to prevent multiple initializations
 */

import * as admin from 'firebase-admin';

const APP_NAME = 'marketing-hub-admin';
let adminApp: admin.app.App | null = null;

function getFirebaseAdmin(): admin.app.App | null {
  // Return cached app if exists
  if (adminApp) {
    return adminApp;
  }
  
  // Check if app already exists (from previous invocation)
  try {
    adminApp = admin.app(APP_NAME);
    return adminApp;
  } catch {
    // App doesn't exist, continue to initialize
  }
  
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gopopera2026';
  
  // Check if service account credentials are available
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      }, APP_NAME);
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
    try {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      }, APP_NAME);
      console.log('[Firebase Admin] Initialized with individual env vars');
      return adminApp;
    } catch (error) {
      console.error('[Firebase Admin] Failed to initialize with individual env vars:', error);
      return null;
    }
  }
  
  console.error('[Firebase Admin] Missing credentials - FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY required');
  return null;
}

// Get Firestore instance
export function getAdminFirestore(): admin.firestore.Firestore | null {
  const app = getFirebaseAdmin();
  if (!app) return null;
  return app.firestore();
}

// Get Auth instance
export function getAdminAuth(): admin.auth.Auth | null {
  const app = getFirebaseAdmin();
  if (!app) return null;
  return app.auth();
}

// Verify admin access (must be eatezca@gmail.com)
const ADMIN_EMAIL = 'eatezca@gmail.com';

export async function verifyAdminToken(authHeader: string | undefined): Promise<{ uid: string; email: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[Admin Auth] Missing or invalid Authorization header');
    return null;
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  const auth = getAdminAuth();
  if (!auth) {
    console.error('[Admin Auth] Firebase Admin not initialized - check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY env vars');
    return null;
  }
  
  try {
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

