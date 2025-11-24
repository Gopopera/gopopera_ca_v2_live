/**
 * CYCLES DETECTED BY MADGE: None (verified with npx madge --circular)
 * 
 * This is the ONLY source of Firebase singletons.
 * All firebase/* modules import from here statically.
 * Stores import from firebase/* statically.
 * No dynamic imports of this module allowed.
 * 
 * BOOT FIX: Safe lazy initialization to prevent crashes when env vars are missing.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { serverTimestamp, Timestamp } from 'firebase/firestore';

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

// Log import.meta.env BEFORE using it
if (typeof window !== 'undefined') {
  console.log('[FIREBASE] import.meta.env check:', {
    hasVITE_FIREBASE_API_KEY: !!import.meta.env.VITE_FIREBASE_API_KEY,
    hasVITE_FIREBASE_AUTH_DOMAIN: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    hasVITE_FIREBASE_PROJECT_ID: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
    hasVITE_FIREBASE_STORAGE_BUCKET: !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    hasVITE_FIREBASE_MESSAGING_SENDER_ID: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    hasVITE_FIREBASE_APP_ID: !!import.meta.env.VITE_FIREBASE_APP_ID,
    hasVITE_FIREBASE_MEASUREMENT_ID: !!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  });
}

// Validate required Firebase environment variables
const requiredFirebaseVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Log missing variables in production
if (typeof window !== 'undefined') {
  const missingVars: string[] = [];
  if (!requiredFirebaseVars.apiKey) missingVars.push('VITE_FIREBASE_API_KEY');
  if (!requiredFirebaseVars.authDomain) missingVars.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!requiredFirebaseVars.projectId) missingVars.push('VITE_FIREBASE_PROJECT_ID');
  if (!requiredFirebaseVars.storageBucket) missingVars.push('VITE_FIREBASE_STORAGE_BUCKET');
  if (!requiredFirebaseVars.messagingSenderId) missingVars.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  if (!requiredFirebaseVars.appId) missingVars.push('VITE_FIREBASE_APP_ID');
  
  if (missingVars.length > 0) {
    console.warn('⚠️ Missing Firebase environment variables:', missingVars.join(', '));
    console.warn('⚠️ Firebase features will be disabled. Please configure environment variables in your deployment platform.');
  }
}

const cfg = {
  apiKey: requiredFirebaseVars.apiKey,
  authDomain: requiredFirebaseVars.authDomain,
  projectId: requiredFirebaseVars.projectId,
  storageBucket: requiredFirebaseVars.storageBucket,
  messagingSenderId: requiredFirebaseVars.messagingSenderId,
  appId: requiredFirebaseVars.appId,
  measurementId: requiredFirebaseVars.measurementId,
};

// Log config BEFORE initialization (redact sensitive values)
if (typeof window !== 'undefined') {
  console.log('[FIREBASE] Config BEFORE initializeApp:', {
    apiKey: cfg.apiKey ? `${cfg.apiKey.substring(0, 10)}...` : 'MISSING',
    authDomain: cfg.authDomain || 'MISSING',
    projectId: cfg.projectId || 'MISSING',
    storageBucket: cfg.storageBucket || 'MISSING',
    messagingSenderId: cfg.messagingSenderId || 'MISSING',
    appId: cfg.appId || 'MISSING',
    measurementId: cfg.measurementId || 'MISSING',
  });
}

const isDisabled =
  import.meta.env.VITE_DISABLE_FIREBASE === '1' ||
  !cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId;

export function getAppSafe(): FirebaseApp | null {
  if (isDisabled) {
    console.warn('[FIREBASE] Disabled (missing env or VITE_DISABLE_FIREBASE=1)');
    return null;
  }
  if (!app) {
    try {
      const existingApps = getApps();
      console.log('[FIREBASE] getApps() result:', existingApps.length, 'existing app(s)');
      if (existingApps.length > 0) {
        app = existingApps[0];
        console.log('[FIREBASE] Using existing app:', app.name);
      } else {
        console.log('[FIREBASE] Initializing new app...');
        app = initializeApp(cfg);
        console.log('[FIREBASE] App initialized successfully:', app.name);
      }
    } catch (error) {
      console.error('[FIREBASE] Initialization failed:', error);
      return null;
    }
  }
  return app;
}

export function getAuthSafe(): Auth | null {
  const a = getAppSafe();
  if (!a) return null;
  if (!_auth) {
    try {
      _auth = getAuth(a);
    } catch (error) {
      console.error('[FIREBASE] Auth initialization failed:', error);
      return null;
    }
  }
  return _auth;
}

export function getDbSafe(): Firestore | null {
  const a = getAppSafe();
  if (!a) {
    console.warn('[FIREBASE] getDbSafe: App not available');
    return null;
  }
  if (!_db) {
    try {
      console.log('[FIREBASE] Initializing Firestore...');
      _db = getFirestore(a);
      console.log('[FIREBASE] Firestore initialized successfully');
    } catch (error) {
      console.error('[FIREBASE] Firestore initialization failed:', error);
      return null;
    }
  }
  return _db;
}

export function getStorageSafe(): FirebaseStorage | null {
  const a = getAppSafe();
  if (!a) return null;
  if (!_storage) {
    try {
      _storage = getStorage(a);
    } catch (error) {
      console.error('[FIREBASE] Storage initialization failed:', error);
      return null;
    }
  }
  return _storage;
}

// Legacy exports for backward compatibility (lazy getters)
// TODO: Migrate all usages to *Safe() functions
// These Proxies allow existing code to work without changes, but will return undefined
// if Firebase is disabled, which may cause runtime errors in Firebase-dependent features
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const a = getAuthSafe();
    if (!a) {
      // Return a no-op object for common properties to prevent immediate crashes
      if (prop === 'app') return null;
      if (prop === 'currentUser') return null;
      return undefined;
    }
    const value = (a as any)[prop];
    // If it's a function, bind it to the auth instance
    if (typeof value === 'function') {
      return value.bind(a);
    }
    return value;
  }
});

export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    const d = getDbSafe();
    if (!d) return undefined;
    const value = (d as any)[prop];
    if (typeof value === 'function') {
      return value.bind(d);
    }
    return value;
  }
});

export const storage = new Proxy({} as FirebaseStorage, {
  get(_target, prop) {
    const s = getStorageSafe();
    if (!s) return undefined;
    const value = (s as any)[prop];
    if (typeof value === 'function') {
      return value.bind(s);
    }
    return value;
  }
});

// Re-export helpers
export { serverTimestamp, Timestamp };
export type Unsubscribe = () => void;
