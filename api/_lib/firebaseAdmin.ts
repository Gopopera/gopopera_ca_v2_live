/**
 * Firebase Admin SDK Singleton Helper
 * ESM-safe imports for Vercel serverless functions
 * 
 * Robust credential resolution with proper PEM key normalization
 */

import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const ADMIN_EMAIL = 'eatezca@gmail.com';

let cachedApp: App | null = null;
let cachedAuth: Auth | null = null;
let cachedFirestore: Firestore | null = null;

interface Credentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

interface DebugInfo {
  projectId: string | undefined;
  hasClientEmail: boolean;
  privateKeyLength: number;
  privateKeyStartsWithBegin: boolean;
  source: string;
}

/**
 * Normalize private key to proper PEM format
 * Handles all common edge cases from Vercel env vars
 */
function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  
  let key = raw;
  
  // 1. Trim whitespace
  key = key.trim();
  
  // 2. Remove wrapping double quotes
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }
  // 3. Remove wrapping single quotes
  if (key.startsWith("'") && key.endsWith("'")) {
    key = key.slice(1, -1);
  }
  
  // 4. Replace ALL forms of escaped newlines with actual newlines
  // Handle \\\\n (quadruple backslash from double JSON encoding)
  key = key.split('\\\\n').join('\n');
  // Handle \\n (double backslash - literal \n in the string)  
  key = key.split('\\n').join('\n');
  // Handle Windows line endings
  key = key.split('\r\n').join('\n');
  key = key.split('\r').join('\n');
  
  // 5. Clean up any double newlines that might have been created
  while (key.includes('\n\n\n')) {
    key = key.split('\n\n\n').join('\n\n');
  }
  
  // 6. Final trim
  key = key.trim();
  
  return key;
}

/**
 * Resolve admin credentials from environment variables
 * Priority: FIREBASE_ADMIN_* > FIREBASE_*
 */
function resolveAdminCreds(): { credentials: Credentials; debugInfo: DebugInfo } {
  // Determine which env vars to use
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
  
  const source = process.env.FIREBASE_ADMIN_PRIVATE_KEY 
    ? 'FIREBASE_ADMIN_*' 
    : process.env.FIREBASE_PRIVATE_KEY 
      ? 'FIREBASE_*' 
      : 'none';

  // Normalize private key
  const privateKey = normalizePrivateKey(privateKeyRaw);
  
  // Build debug info (safe to return in errors)
  const debugInfo: DebugInfo = {
    projectId,
    hasClientEmail: !!clientEmail,
    privateKeyLength: privateKey?.length || 0,
    privateKeyStartsWithBegin: privateKey?.includes('BEGIN PRIVATE KEY') || false,
    source,
  };

  // Validate required vars
  if (!projectId) {
    const error = new Error('Missing FIREBASE_ADMIN_PROJECT_ID or FIREBASE_PROJECT_ID');
    (error as any).debugInfo = debugInfo;
    throw error;
  }
  if (!clientEmail) {
    const error = new Error('Missing FIREBASE_ADMIN_CLIENT_EMAIL or FIREBASE_CLIENT_EMAIL');
    (error as any).debugInfo = debugInfo;
    throw error;
  }
  if (!privateKey) {
    const error = new Error('Missing FIREBASE_ADMIN_PRIVATE_KEY or FIREBASE_PRIVATE_KEY');
    (error as any).debugInfo = debugInfo;
    throw error;
  }

  // Validate PEM format
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    const error = new Error('Invalid private key: missing BEGIN PRIVATE KEY header');
    (error as any).debugInfo = debugInfo;
    throw error;
  }
  if (!privateKey.includes('-----END PRIVATE KEY-----')) {
    const error = new Error('Invalid private key: missing END PRIVATE KEY footer');
    (error as any).debugInfo = debugInfo;
    throw error;
  }

  // Check if key still has escaped newlines (bad sign)
  if (privateKey.includes('\\n')) {
    const error = new Error('Invalid private key: still contains escaped \\n after normalization');
    (error as any).debugInfo = debugInfo;
    throw error;
  }

  return {
    credentials: { projectId, clientEmail, privateKey },
    debugInfo,
  };
}

export interface AdminAppResult {
  app: App | null;
  initError: string | null;
  debugInfo?: DebugInfo;
}

/**
 * Get or initialize Firebase Admin app (singleton)
 */
export function getAdminApp(): AdminAppResult {
  // Return cached app if available
  if (cachedApp) {
    return { app: cachedApp, initError: null };
  }

  // Check if any apps already exist (warm lambda)
  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedApp = existingApps[0];
    return { app: cachedApp, initError: null };
  }

  // Resolve credentials
  let credentials: Credentials;
  let debugInfo: DebugInfo;
  
  try {
    const resolved = resolveAdminCreds();
    credentials = resolved.credentials;
    debugInfo = resolved.debugInfo;
  } catch (e: any) {
    const errorMsg = e?.message || 'Failed to resolve credentials';
    console.error('[FirebaseAdmin] Credential resolution failed:', errorMsg);
    return {
      app: null,
      initError: errorMsg,
      debugInfo: e?.debugInfo,
    };
  }

  // Initialize Firebase Admin
  try {
    cachedApp = initializeApp({
      credential: cert({
        projectId: credentials.projectId,
        clientEmail: credentials.clientEmail,
        privateKey: credentials.privateKey,
      }),
      projectId: credentials.projectId,
    });

    console.log('[FirebaseAdmin] Initialized successfully for project:', credentials.projectId);
    
    return {
      app: cachedApp,
      initError: null,
      debugInfo,
    };
  } catch (e: any) {
    const errorMsg = e?.message || 'Unknown initialization error';
    console.error('[FirebaseAdmin] Init failed:', errorMsg);
    
    // Add extra debug for DECODER errors
    if (errorMsg.includes('DECODER') || errorMsg.includes('unsupported')) {
      console.error('[FirebaseAdmin] DECODER error - key details:', {
        keyLength: credentials.privateKey.length,
        hasBeginMarker: credentials.privateKey.includes('-----BEGIN'),
        hasEndMarker: credentials.privateKey.includes('-----END'),
        newlineCount: (credentials.privateKey.match(/\n/g) || []).length,
        firstChars: credentials.privateKey.substring(0, 30),
        lastChars: credentials.privateKey.substring(credentials.privateKey.length - 30),
      });
    }
    
    return {
      app: null,
      initError: errorMsg,
      debugInfo,
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
  const { app, initError, debugInfo } = getAdminApp();

  if (!app) {
    return {
      success: false,
      reason: 'admin_not_configured',
      details: {
        initError,
        projectId: debugInfo?.projectId,
        hasClientEmail: debugInfo?.hasClientEmail,
        privateKeyLength: debugInfo?.privateKeyLength,
        privateKeyStartsWithBegin: debugInfo?.privateKeyStartsWithBegin,
        source: debugInfo?.source,
        tokenEmail: unverifiedPayload?.email,
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
        projectId: debugInfo?.projectId,
        tokenEmail: unverifiedPayload?.email,
      },
    };
  }
}
