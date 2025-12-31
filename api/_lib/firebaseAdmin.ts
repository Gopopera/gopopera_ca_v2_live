/**
 * Firebase Admin SDK Singleton Helper
 * ESM-safe imports for Vercel serverless functions
 */

import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const ADMIN_EMAIL = 'eatezca@gmail.com';

let cachedApp: App | null = null;
let cachedAuth: Auth | null = null;
let cachedFirestore: Firestore | null = null;
let initError: string | null = null;

interface Credentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Normalize private key: replace \\n with \n and trim whitespace
 */
function normalizePrivateKey(key: string): string {
  return key.replace(/\\n/g, '\n').trim();
}

/**
 * Try to resolve credentials from environment
 * Priority: FIREBASE_SERVICE_ACCOUNT (JSON) > individual vars
 */
function resolveCredentials(): { credentials: Credentials | null; source: string; error?: string } {
  // 1. Try FIREBASE_SERVICE_ACCOUNT JSON
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          credentials: {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: normalizePrivateKey(parsed.private_key),
          },
          source: 'FIREBASE_SERVICE_ACCOUNT',
        };
      }
      console.warn('[FirebaseAdmin] FIREBASE_SERVICE_ACCOUNT parsed but missing required fields');
    } catch (e) {
      console.warn('[FirebaseAdmin] FIREBASE_SERVICE_ACCOUNT JSON parse failed, falling back to individual vars');
    }
  }

  // 2. Fall back to individual environment variables
  const projectId = 
    process.env.FIREBASE_ADMIN_PROJECT_ID || 
    process.env.FIREBASE_PROJECT_ID || 
    process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = 
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL || 
    process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = 
    process.env.FIREBASE_ADMIN_PRIVATE_KEY || 
    process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) {
    return { credentials: null, source: 'individual_vars', error: 'Missing projectId (FIREBASE_PROJECT_ID)' };
  }
  if (!clientEmail) {
    return { credentials: null, source: 'individual_vars', error: 'Missing clientEmail (FIREBASE_CLIENT_EMAIL)' };
  }
  if (!privateKeyRaw) {
    return { credentials: null, source: 'individual_vars', error: 'Missing privateKey (FIREBASE_PRIVATE_KEY)' };
  }

  return {
    credentials: {
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKeyRaw),
    },
    source: 'individual_vars',
  };
}

export interface AdminAppResult {
  app: App | null;
  initError: string | null;
  source: string;
  projectId?: string;
  hasClientEmail?: boolean;
  privateKeyLength?: number;
}

/**
 * Get or initialize Firebase Admin app (singleton)
 */
export function getAdminApp(): AdminAppResult {
  // Return cached app if available
  if (cachedApp) {
    return { app: cachedApp, initError: null, source: 'cached' };
  }

  // Check if any apps already exist (warm lambda)
  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedApp = existingApps[0];
    console.log('[FirebaseAdmin] Reusing existing app');
    return { app: cachedApp, initError: null, source: 'existing' };
  }

  // Resolve credentials
  const { credentials, source, error: resolveError } = resolveCredentials();

  if (!credentials) {
    initError = resolveError || 'Failed to resolve credentials';
    console.error('[FirebaseAdmin] Credential resolution failed:', initError);
    return {
      app: null,
      initError,
      source,
      hasClientEmail: false,
      privateKeyLength: 0,
    };
  }

  console.log('[FirebaseAdmin] Initializing with:', {
    source,
    projectId: credentials.projectId,
    clientEmailPrefix: credentials.clientEmail?.substring(0, 20) + '...',
    privateKeyLength: credentials.privateKey.length,
  });

  // Initialize Firebase Admin using ESM-safe cert()
  try {
    cachedApp = initializeApp({
      credential: cert({
        projectId: credentials.projectId,
        clientEmail: credentials.clientEmail,
        privateKey: credentials.privateKey,
      }),
      projectId: credentials.projectId,
    });

    initError = null;
    console.log('[FirebaseAdmin] Initialized successfully');
    return {
      app: cachedApp,
      initError: null,
      source,
      projectId: credentials.projectId,
      hasClientEmail: true,
      privateKeyLength: credentials.privateKey.length,
    };
  } catch (e: any) {
    initError = e?.message || 'Unknown initialization error';
    console.error('[FirebaseAdmin] Init failed:', initError);
    return {
      app: null,
      initError,
      source,
      projectId: credentials.projectId,
      hasClientEmail: true,
      privateKeyLength: credentials.privateKey.length,
    };
  }
}

/**
 * Get Auth instance
 */
export function getAdminAuth(): Auth | null {
  if (cachedAuth) return cachedAuth;
  const { app } = getAdminApp();
  if (!app) return null;
  cachedAuth = getAuth(app);
  return cachedAuth;
}

/**
 * Get Firestore instance
 */
export function getAdminFirestore(): Firestore | null {
  if (cachedFirestore) return cachedFirestore;
  const { app } = getAdminApp();
  if (!app) return null;
  cachedFirestore = getFirestore(app);
  return cachedFirestore;
}

/**
 * Decode JWT payload without verification (for debugging)
 */
function decodeJwtPayload(token: string): { email?: string; aud?: string; iss?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export type AuthResult =
  | { success: true; uid: string; email: string }
  | { success: false; reason: string; details?: Record<string, unknown> };

/**
 * Verify admin token and check email allowlist
 */
export async function verifyAdminToken(authHeader: string | undefined): Promise<AuthResult> {
  // Check auth header
  if (!authHeader?.startsWith('Bearer ')) {
    return { success: false, reason: 'missing_auth_header' };
  }

  const token = authHeader.split('Bearer ')[1];
  const unverifiedPayload = decodeJwtPayload(token);

  // Get Firebase Admin app
  const { app, initError: adminInitError, source, projectId, hasClientEmail, privateKeyLength } = getAdminApp();

  if (!app) {
    return {
      success: false,
      reason: 'admin_not_configured',
      details: {
        initError: adminInitError,
        source,
        projectId,
        hasClientEmail,
        privateKeyLength,
        tokenEmail: unverifiedPayload?.email,
        tokenAud: unverifiedPayload?.aud,
      },
    };
  }

  // Get Auth and verify token
  const auth = getAdminAuth();
  if (!auth) {
    return {
      success: false,
      reason: 'admin_not_configured',
      details: { initError: 'Failed to get Auth instance' },
    };
  }

  try {
    const decoded = await auth.verifyIdToken(token);

    // Check admin email
    if (decoded.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return {
        success: false,
        reason: 'email_mismatch',
        details: { tokenEmail: decoded.email, expectedEmail: ADMIN_EMAIL },
      };
    }

    return { success: true, uid: decoded.uid, email: decoded.email || '' };
  } catch (e: any) {
    return {
      success: false,
      reason: 'verify_failed',
      details: {
        errorCode: e?.code,
        errorMessage: e?.message,
        projectId,
        tokenAud: unverifiedPayload?.aud,
        tokenEmail: unverifiedPayload?.email,
      },
    };
  }
}
