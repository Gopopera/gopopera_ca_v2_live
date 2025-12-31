/**
 * Shared Firebase Admin SDK initialization helper
 * Used by marketing API endpoints for admin token verification
 */

import * as admin from 'firebase-admin';

const APP_NAME = 'marketing-admin';
const ADMIN_EMAIL = 'eatezca@gmail.com';

let adminApp: admin.app.App | null = null;
let lastInitError: { message: string; code?: string } | null = null;

interface ServiceAccountCredentials {
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

interface EnvResolution {
  projectId: string;
  clientEmail: string | undefined;
  privateKey: string | undefined;
  source: 'service_account_json' | 'individual_env_vars' | 'none';
  hasBeginMarker: boolean;
  hasEndMarker: boolean;
  privateKeyLength: number;
}

/**
 * Normalize private key: replace escaped newlines and trim surrounding quotes
 */
function normalizePrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  
  // Trim surrounding quotes (single or double)
  let normalized = key.trim();
  if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.slice(1, -1);
  }
  
  // Replace escaped newlines with actual newlines
  normalized = normalized.replace(/\\n/g, '\n');
  
  return normalized;
}

/**
 * Resolve Firebase credentials from environment variables
 * Priority: FIREBASE_SERVICE_ACCOUNT (JSON) > individual FIREBASE_* vars
 */
function resolveCredentials(): EnvResolution {
  let projectId: string | undefined;
  let clientEmail: string | undefined;
  let privateKey: string | undefined;
  let source: EnvResolution['source'] = 'none';
  
  // Try FIREBASE_SERVICE_ACCOUNT JSON first
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    try {
      const sa: ServiceAccountCredentials = JSON.parse(serviceAccountJson);
      projectId = sa.project_id;
      clientEmail = sa.client_email;
      privateKey = normalizePrivateKey(sa.private_key);
      source = 'service_account_json';
      console.log('[FirebaseAdmin] Parsed FIREBASE_SERVICE_ACCOUNT JSON');
    } catch (e) {
      console.warn('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT:', (e as Error).message);
    }
  }
  
  // Fall back to individual env vars if any are missing
  if (!projectId) {
    projectId = process.env.FIREBASE_PROJECT_ID || 
                process.env.FIREBASE_ADMIN_PROJECT_ID || 
                'gopopera2026';
  }
  if (!clientEmail) {
    clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 
                  process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    if (clientEmail && source === 'none') source = 'individual_env_vars';
  }
  if (!privateKey) {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || 
                   process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    privateKey = normalizePrivateKey(rawKey);
    if (privateKey && source === 'none') source = 'individual_env_vars';
  }
  
  const hasBeginMarker = privateKey?.includes('-----BEGIN PRIVATE KEY-----') || false;
  const hasEndMarker = privateKey?.includes('-----END PRIVATE KEY-----') || false;
  
  return {
    projectId,
    clientEmail,
    privateKey,
    source,
    hasBeginMarker,
    hasEndMarker,
    privateKeyLength: privateKey?.length || 0,
  };
}

/**
 * Validate private key format
 */
function validatePrivateKey(resolution: EnvResolution): string | null {
  if (!resolution.privateKey) {
    return 'Private key is missing';
  }
  if (!resolution.hasBeginMarker) {
    return 'Private key missing "-----BEGIN PRIVATE KEY-----" marker';
  }
  if (!resolution.hasEndMarker) {
    return 'Private key missing "-----END PRIVATE KEY-----" marker';
  }
  if (resolution.privateKeyLength < 1000) {
    return `Private key too short (${resolution.privateKeyLength} chars, expected >1000)`;
  }
  return null; // Valid
}

export interface AdminInitResult {
  app: admin.app.App | null;
  resolution: EnvResolution;
  initError: { message: string; code?: string } | null;
}

/**
 * Get or initialize Firebase Admin app (singleton)
 */
export function getFirebaseAdmin(): AdminInitResult {
  const resolution = resolveCredentials();
  
  // Return existing app if available
  if (adminApp) {
    return { app: adminApp, resolution, initError: null };
  }
  
  // Try to get existing app by name
  try {
    adminApp = admin.app(APP_NAME);
    console.log('[FirebaseAdmin] Reusing existing app');
    return { app: adminApp, resolution, initError: null };
  } catch {
    // App doesn't exist, continue to initialize
  }
  
  // Log resolution details
  console.log('[FirebaseAdmin] Credential resolution:', {
    source: resolution.source,
    projectId: resolution.projectId,
    hasClientEmail: !!resolution.clientEmail,
    hasPrivateKey: !!resolution.privateKey,
    privateKeyLength: resolution.privateKeyLength,
    hasBeginMarker: resolution.hasBeginMarker,
    hasEndMarker: resolution.hasEndMarker,
  });
  
  // Validate credentials
  if (!resolution.clientEmail) {
    lastInitError = { message: 'Client email is missing' };
    console.error('[FirebaseAdmin]', lastInitError.message);
    return { app: null, resolution, initError: lastInitError };
  }
  
  const keyValidationError = validatePrivateKey(resolution);
  if (keyValidationError) {
    lastInitError = { message: keyValidationError };
    console.error('[FirebaseAdmin]', lastInitError.message);
    return { app: null, resolution, initError: lastInitError };
  }
  
  // Initialize Firebase Admin
  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: resolution.projectId,
        clientEmail: resolution.clientEmail,
        privateKey: resolution.privateKey!,
      }),
      projectId: resolution.projectId,
    }, APP_NAME);
    
    console.log('[FirebaseAdmin] Initialized successfully with project:', resolution.projectId);
    lastInitError = null;
    return { app: adminApp, resolution, initError: null };
    
  } catch (error: any) {
    lastInitError = {
      message: error?.message || 'Unknown initialization error',
      code: error?.code,
    };
    console.error('[FirebaseAdmin] Init failed:', lastInitError);
    return { app: null, resolution, initError: lastInitError };
  }
}

/**
 * Get Firestore instance from admin app
 */
export function getAdminFirestore(): admin.firestore.Firestore | null {
  const { app } = getFirebaseAdmin();
  return app ? app.firestore() : null;
}

/**
 * Decode JWT payload without verification (for debugging only)
 */
export function decodeJwtPayload(token: string): { email?: string; aud?: string; iss?: string; sub?: string } | null {
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
  | { 
      success: false; 
      reason: 'missing_auth_header' | 'admin_not_configured' | 'verify_failed' | 'email_mismatch'; 
      details?: Record<string, unknown>;
    };

/**
 * Verify admin token and check email allowlist
 */
export async function verifyAdminToken(authHeader: string | undefined): Promise<AuthResult> {
  console.log('[FirebaseAdmin] verifyAdminToken called, hasHeader:', !!authHeader);
  
  // Check auth header format
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('[FirebaseAdmin] Missing or invalid Authorization header');
    return { success: false, reason: 'missing_auth_header' };
  }
  
  const token = authHeader.split('Bearer ')[1];
  console.log('[FirebaseAdmin] Token extracted, length:', token?.length || 0);
  
  // Decode token payload (unverified) for debugging
  const unverifiedPayload = decodeJwtPayload(token);
  console.log('[FirebaseAdmin] Unverified token payload:', {
    email: unverifiedPayload?.email,
    aud: unverifiedPayload?.aud,
    iss: unverifiedPayload?.iss,
  });
  
  // Get Firebase Admin app
  const { app, resolution, initError } = getFirebaseAdmin();
  
  if (!app) {
    console.error('[FirebaseAdmin] Admin not configured');
    return { 
      success: false, 
      reason: 'admin_not_configured',
      details: {
        source: resolution.source,
        resolvedProjectId: resolution.projectId,
        resolvedClientEmail: !!resolution.clientEmail,
        privateKeyLength: resolution.privateKeyLength,
        hasBeginMarker: resolution.hasBeginMarker,
        hasEndMarker: resolution.hasEndMarker,
        initErrorMessage: initError?.message,
        initErrorCode: initError?.code,
      }
    };
  }
  
  // Verify token with Firebase Admin
  try {
    const decoded = await app.auth().verifyIdToken(token);
    
    console.log('[FirebaseAdmin] Token verified:', {
      uid: decoded.uid,
      email: decoded.email,
      aud: decoded.aud,
      iss: decoded.iss,
    });
    
    // Check admin email allowlist
    const tokenEmail = decoded.email?.toLowerCase();
    const adminEmail = ADMIN_EMAIL.toLowerCase();
    
    if (tokenEmail !== adminEmail) {
      console.warn('[FirebaseAdmin] ACCESS DENIED - email mismatch:', { tokenEmail, adminEmail });
      return { 
        success: false, 
        reason: 'email_mismatch',
        details: { tokenEmail, expectedEmail: adminEmail }
      };
    }
    
    return { success: true, uid: decoded.uid, email: decoded.email || '' };
    
  } catch (error: any) {
    console.error('[FirebaseAdmin] verifyIdToken FAILED:', {
      message: error?.message,
      code: error?.code,
      projectIdUsed: resolution.projectId,
      tokenAud: unverifiedPayload?.aud,
      tokenEmail: unverifiedPayload?.email,
    });
    
    return { 
      success: false, 
      reason: 'verify_failed',
      details: {
        errorCode: error?.code,
        errorMessage: error?.message,
        projectIdUsed: resolution.projectId,
        tokenAud: unverifiedPayload?.aud,
        tokenIss: unverifiedPayload?.iss,
        tokenEmail: unverifiedPayload?.email,
      }
    };
  }
}

