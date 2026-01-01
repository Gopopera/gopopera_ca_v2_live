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
const IS_DEV = process.env.NODE_ENV !== 'production';

let cachedApp: App | null = null;
let cachedAuth: Auth | null = null;
let cachedFirestore: Firestore | null = null;

interface Credentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

interface CredentialSource {
  projectIdKey: string;
  clientEmailKey: string;
  privateKeyKey: string;
}

/**
 * Normalize private key to proper PEM format
 * Handles: wrapped quotes, escaped newlines, double-escaped newlines
 */
function normalizePrivateKey(raw: string): string {
  let key = raw;
  
  // 1. Trim whitespace
  key = key.trim();
  
  // 2. Remove wrapping quotes (single or double)
  if ((key.startsWith('"') && key.endsWith('"')) || 
      (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  
  // 3. Handle double-escaped newlines first (\\\\n -> \n)
  key = key.replace(/\\\\n/g, '\n');
  
  // 4. Handle single-escaped newlines (\\n -> \n)
  key = key.replace(/\\n/g, '\n');
  
  // 5. Handle literal backslash-n that might remain
  key = key.replace(/\r\n/g, '\n');
  key = key.replace(/\r/g, '\n');
  
  // 6. Trim again after processing
  key = key.trim();
  
  return key;
}

/**
 * Validate that the key is proper PEM format
 */
function validatePrivateKey(key: string): { valid: boolean; error?: string } {
  if (!key) {
    return { valid: false, error: 'Private key is empty' };
  }
  
  if (!key.includes('-----BEGIN')) {
    return { valid: false, error: 'Missing BEGIN marker - key may be base64 encoded or corrupted' };
  }
  
  if (!key.includes('PRIVATE KEY-----')) {
    return { valid: false, error: 'Missing PRIVATE KEY header' };
  }
  
  if (!key.includes('-----END')) {
    return { valid: false, error: 'Missing END marker' };
  }
  
  // Check for common corruption patterns
  if (key.includes('\\n')) {
    return { valid: false, error: 'Key still contains escaped newlines (\\n) after normalization' };
  }
  
  return { valid: true };
}

/**
 * Resolve admin credentials from environment variables
 * Priority: FIREBASE_SERVICE_ACCOUNT JSON > FIREBASE_ADMIN_* > FIREBASE_*
 */
function resolveAdminCreds(): { credentials: Credentials; source: CredentialSource } {
  // 1. Try FIREBASE_SERVICE_ACCOUNT JSON first
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        const privateKey = normalizePrivateKey(parsed.private_key);
        const validation = validatePrivateKey(privateKey);
        
        if (!validation.valid) {
          throw new Error(`Invalid private key from FIREBASE_SERVICE_ACCOUNT: ${validation.error}`);
        }
        
        if (IS_DEV) {
          console.log('[FirebaseAdmin] Using FIREBASE_SERVICE_ACCOUNT JSON');
          console.log('[FirebaseAdmin] projectId:', parsed.project_id);
          console.log('[FirebaseAdmin] clientEmail present:', !!parsed.client_email);
          console.log('[FirebaseAdmin] privateKey length:', privateKey.length);
        }
        
        return {
          credentials: {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey,
          },
          source: {
            projectIdKey: 'FIREBASE_SERVICE_ACCOUNT.project_id',
            clientEmailKey: 'FIREBASE_SERVICE_ACCOUNT.client_email',
            privateKeyKey: 'FIREBASE_SERVICE_ACCOUNT.private_key',
          },
        };
      }
    } catch (e: any) {
      if (IS_DEV) {
        console.warn('[FirebaseAdmin] FIREBASE_SERVICE_ACCOUNT parse failed:', e.message);
      }
    }
  }

  // 2. Resolve individual environment variables
  const projectIdKey = process.env.FIREBASE_ADMIN_PROJECT_ID ? 'FIREBASE_ADMIN_PROJECT_ID' 
    : process.env.FIREBASE_PROJECT_ID ? 'FIREBASE_PROJECT_ID' 
    : null;
  const clientEmailKey = process.env.FIREBASE_ADMIN_CLIENT_EMAIL ? 'FIREBASE_ADMIN_CLIENT_EMAIL'
    : process.env.FIREBASE_CLIENT_EMAIL ? 'FIREBASE_CLIENT_EMAIL'
    : null;
  const privateKeyKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY ? 'FIREBASE_ADMIN_PRIVATE_KEY'
    : process.env.FIREBASE_PRIVATE_KEY ? 'FIREBASE_PRIVATE_KEY'
    : null;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

  // Validate presence of required vars
  if (!projectId) {
    throw new Error('Missing FIREBASE_ADMIN_PROJECT_ID or FIREBASE_PROJECT_ID');
  }
  if (!clientEmail) {
    throw new Error('Missing FIREBASE_ADMIN_CLIENT_EMAIL or FIREBASE_CLIENT_EMAIL');
  }
  if (!privateKeyRaw) {
    throw new Error('Missing FIREBASE_ADMIN_PRIVATE_KEY or FIREBASE_PRIVATE_KEY');
  }

  // Normalize private key
  const privateKey = normalizePrivateKey(privateKeyRaw);
  
  // Validate PEM format
  const validation = validatePrivateKey(privateKey);
  if (!validation.valid) {
    throw new Error(`Invalid Firebase private key format (expected PEM): ${validation.error}`);
  }

  if (IS_DEV) {
    console.log('[FirebaseAdmin] Using individual env vars');
    console.log('[FirebaseAdmin] projectId from:', projectIdKey);
    console.log('[FirebaseAdmin] clientEmail from:', clientEmailKey);
    console.log('[FirebaseAdmin] privateKey from:', privateKeyKey);
    console.log('[FirebaseAdmin] projectId:', projectId);
    console.log('[FirebaseAdmin] clientEmail present:', !!clientEmail);
    console.log('[FirebaseAdmin] privateKey length:', privateKey.length);
  }

  return {
    credentials: { projectId, clientEmail, privateKey },
    source: {
      projectIdKey: projectIdKey || 'unknown',
      clientEmailKey: clientEmailKey || 'unknown',
      privateKeyKey: privateKeyKey || 'unknown',
    },
  };
}

export interface AdminAppResult {
  app: App | null;
  initError: string | null;
  source: CredentialSource | null;
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
    return { app: cachedApp, initError: null, source: null };
  }

  // Check if any apps already exist (warm lambda)
  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedApp = existingApps[0];
    if (IS_DEV) {
      console.log('[FirebaseAdmin] Reusing existing app');
    }
    return { app: cachedApp, initError: null, source: null };
  }

  // Resolve credentials
  let credentials: Credentials;
  let source: CredentialSource;
  
  try {
    const resolved = resolveAdminCreds();
    credentials = resolved.credentials;
    source = resolved.source;
  } catch (e: any) {
    const errorMsg = e?.message || 'Failed to resolve credentials';
    console.error('[FirebaseAdmin] Credential resolution failed:', errorMsg);
    return {
      app: null,
      initError: errorMsg,
      source: null,
      hasClientEmail: false,
      privateKeyLength: 0,
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
      source,
      projectId: credentials.projectId,
      hasClientEmail: true,
      privateKeyLength: credentials.privateKey.length,
    };
  } catch (e: any) {
    const errorMsg = e?.message || 'Unknown initialization error';
    console.error('[FirebaseAdmin] Init failed:', errorMsg);
    
    // Log additional debug info for key-related errors
    if (errorMsg.includes('DECODER') || errorMsg.includes('PEM') || errorMsg.includes('key')) {
      console.error('[FirebaseAdmin] Key error details:', {
        keyLength: credentials.privateKey.length,
        startsWithBegin: credentials.privateKey.startsWith('-----BEGIN'),
        containsNewlines: credentials.privateKey.includes('\n'),
        newlineCount: (credentials.privateKey.match(/\n/g) || []).length,
      });
    }
    
    return {
      app: null,
      initError: errorMsg,
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
        source: source ? `${source.projectIdKey}, ${source.clientEmailKey}, ${source.privateKeyKey}` : 'unknown',
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
