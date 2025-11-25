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

// Cached instances for performance
let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
let cachedStorage: FirebaseStorage | null = null;

// Legacy variables (for backward compatibility)
let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

// Track initialization state
let initializationWarningLogged = false;

// Environment variable logging removed for production

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

const missingVars: string[] = [];
if (!requiredFirebaseVars.apiKey) missingVars.push('VITE_FIREBASE_API_KEY');
if (!requiredFirebaseVars.authDomain) missingVars.push('VITE_FIREBASE_AUTH_DOMAIN');
if (!requiredFirebaseVars.projectId) missingVars.push('VITE_FIREBASE_PROJECT_ID');
if (!requiredFirebaseVars.storageBucket) missingVars.push('VITE_FIREBASE_STORAGE_BUCKET');
if (!requiredFirebaseVars.messagingSenderId) missingVars.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
if (!requiredFirebaseVars.appId) missingVars.push('VITE_FIREBASE_APP_ID');

export const firebaseEnabled =
  missingVars.length === 0 && import.meta.env.VITE_DISABLE_FIREBASE !== '1';

if (!firebaseEnabled) {
  console.error('[FIREBASE] Missing environment variables; Firebase disabled.', missingVars);
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

// Log Firebase project info on initialization (once)
let projectInfoLogged = false;

export function getAppSafe(): FirebaseApp | null {
  if (!firebaseEnabled) {
    if (!initializationWarningLogged) {
      console.error('[FIREBASE] Initialization skipped; firebaseEnabled is false');
      initializationWarningLogged = true;
    }
    return null;
  }
  if (!app && !cachedApp) {
    try {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        app = existingApps[0];
        cachedApp = app;
      } else {
        try {
          app = initializeApp(cfg);
          cachedApp = app;
          
          // Log Firebase project info once on initialization
          if (!projectInfoLogged) {
            console.log('[FIREBASE] ✅ Connected to Firebase project:', {
              projectId: cfg.projectId,
              authDomain: cfg.authDomain,
              appId: cfg.appId?.substring(0, 20) + '...',
              apiKey: cfg.apiKey?.substring(0, 20) + '...'
            });
            projectInfoLogged = true;
          }
        } catch (initError) {
          console.error('[FIREBASE] initializeApp failed:', initError);
          return null;
        }
      }
    } catch (error) {
      console.error('[FIREBASE] Initialization failed:', error);
      return null;
    }
  }
  return app || cachedApp;
}

export function getAuthSafe(): Auth | null {
  const a = getAppSafe();
  if (!a) return null;
  if (!_auth && !cachedAuth) {
    try {
      _auth = getAuth(a);
      cachedAuth = _auth;
    } catch (error) {
      console.error('[FIREBASE] Auth initialization failed:', error);
      return null;
    }
  }
  return _auth || cachedAuth;
}

export function getDbSafe(): Firestore | null {
  const a = getAppSafe();
  if (!a) {
    if (!initializationWarningLogged) {
      console.warn('[FIREBASE] getDbSafe: App not available');
      initializationWarningLogged = true;
    }
    return null;
  }
  if (!_db && !cachedDb) {
    try {
      _db = getFirestore(a);
      cachedDb = _db;
      // Verify Firestore is actually ready
      if (!_db) {
        console.error('[FIRESTORE] getFirestore returned null/undefined');
        return null;
      }
    } catch (error) {
      console.error('[FIREBASE] Firestore initialization failed:', error);
      return null;
    }
  }
  const dbInstance = _db || cachedDb;
  if (!dbInstance) {
    console.error('[FIRESTORE] db is null after initialization attempt');
    return null;
  }
  // Final validation: ensure it's a valid Firestore instance
  if (typeof dbInstance !== 'object' || !('type' in dbInstance)) {
    console.error('[FIRESTORE] Invalid Firestore instance');
    return null;
  }
  return dbInstance;
}


/**
 * Wrapper function that ensures Firebase app and Firestore are initialized
 * Never returns undefined - throws error if initialization fails
 */
export function getDb(): Firestore {
  const a = getAppSafe();
  if (!a) {
    throw new Error('Firebase app not initialized');
  }
  
  if (!_db && !cachedDb) {
    try {
      _db = getFirestore(a);
      cachedDb = _db;
    } catch (error) {
      throw new Error('Firestore not initialized');
    }
  }
  
  const db = _db || cachedDb;
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  
  return db;
}

export function getStorageSafe(): FirebaseStorage | null {
  const a = getAppSafe();
  if (!a) return null;
  if (!_storage && !cachedStorage) {
    try {
      _storage = getStorage(a);
      cachedStorage = _storage;
    } catch (error) {
      console.error('[FIREBASE] Storage initialization failed:', error);
      return null;
    }
  }
  return _storage || cachedStorage;
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

// Remove console.log spam in production
if (import.meta.env.PROD && typeof window !== 'undefined') {
  console.log = () => {};
  console.warn = () => {};
  // Keep console.error for production debugging
}
