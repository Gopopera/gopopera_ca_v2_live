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

interface SafeDiagnostics {
  hasProjectId: boolean;
  hasClientEmail: boolean;
  hasPrivateKey: boolean;
  privateKeyLength: number;
  newlineCount: number;
}

/**
 * Normalize private key to proper PEM format
 * 
 * Handles:
 * - Surrounding quotes (single or double)
 * - Windows line endings (\r\n)
 * - Escaped newlines (\\n as two chars: backslash + n)
 * - Double-escaped newlines (\\\\n as four chars)
 */
function normalizePrivateKey(raw: string): string {
  let key = raw;
  
  // 1. Trim whitespace
  key = key.trim();
  
  // 2. Remove surrounding double quotes
  if (key.length >= 2 && key[0] === '"' && key[key.length - 1] === '"') {
    key = key.substring(1, key.length - 1);
  }
  
  // 3. Remove surrounding single quotes
  if (key.length >= 2 && key[0] === "'" && key[key.length - 1] === "'") {
    key = key.substring(1, key.length - 1);
  }
  
  // 4. Replace Windows line endings with Unix
  key = key.replace(/\r\n/g, '\n');
  key = key.replace(/\r/g, '\n');
  
  // 5. Replace double-escaped newlines (literal \\n -> \n)
  // This handles the case where the key was JSON-stringified twice
  // The regex /\\\\n/g matches: backslash backslash n
  key = key.replace(/\\\\n/g, '\n');
  
  // 6. Replace single-escaped newlines (literal \n -> actual newline)
  // The regex /\\n/g matches: backslash n
  key = key.replace(/\\n/g, '\n');
  
  // 7. Final trim
  key = key.trim();
  
  return key;
}

/**
 * Build safe diagnostics (never includes secrets)
 */
function buildDiagnostics(
  projectId: string | undefined,
  clientEmail: string | undefined,
  privateKey: string | undefined
): SafeDiagnostics {
  const normalizedKey = privateKey ? normalizePrivateKey(privateKey) : '';
  return {
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    hasPrivateKey: !!privateKey,
    privateKeyLength: normalizedKey.length,
    newlineCount: (normalizedKey.match(/\n/g) || []).length,
  };
}

/**
 * Get or initialize Firebase Admin app (singleton)
 */
export function getAdminApp(): { app: App | null; initError: string | null; diagnostics?: SafeDiagnostics } {
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

  // Read environment variables
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

  // Build diagnostics
  const diagnostics = buildDiagnostics(projectId, clientEmail, privateKeyRaw);

  // Validate required vars
  if (!projectId) {
    return { app: null, initError: 'Missing FIREBASE_*_PROJECT_ID', diagnostics };
  }
  if (!clientEmail) {
    return { app: null, initError: 'Missing FIREBASE_*_CLIENT_EMAIL', diagnostics };
  }
  if (!privateKeyRaw) {
    return { app: null, initError: 'Missing FIREBASE_*_PRIVATE_KEY', diagnostics };
  }

  // Normalize private key
  const privateKey = normalizePrivateKey(privateKeyRaw);

  // Validate PEM format
  if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
    return { 
      app: null, 
      initError: 'Invalid private key: missing BEGIN/END PRIVATE KEY markers', 
      diagnostics 
    };
  }

  // Initialize Firebase Admin
  try {
    cachedApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });

    console.log('[FirebaseAdmin] Initialized for project:', projectId);
    return { app: cachedApp, initError: null, diagnostics };
    
  } catch (e: any) {
    const errorMsg = e?.message || 'Unknown initialization error';
    console.error('[FirebaseAdmin] Init failed:', errorMsg);
    console.error('[FirebaseAdmin] Diagnostics:', diagnostics);
    return { app: null, initError: errorMsg, diagnostics };
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
  if (!authHeader?.startsWith('Bearer ')) {
    return { success: false, reason: 'missing_auth_header' };
  }

  const token = authHeader.split('Bearer ')[1];
  const unverifiedPayload = decodeJwtPayload(token);

  const { app, initError, diagnostics } = getAdminApp();

  if (!app) {
    return {
      success: false,
      reason: 'admin_not_configured',
      details: {
        initError,
        ...diagnostics,
        tokenEmail: unverifiedPayload?.email,
      },
    };
  }

  const auth = getAdminAuth();
  if (!auth) {
    return {
      success: false,
      reason: 'auth_init_failed',
      details: { initError: 'Failed to get Auth instance' },
    };
  }

  try {
    const decoded = await auth.verifyIdToken(token);

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
        tokenEmail: unverifiedPayload?.email,
      },
    };
  }
}
