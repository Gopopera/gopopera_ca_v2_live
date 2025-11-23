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

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

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
      if (existingApps.length > 0) {
        app = existingApps[0];
      } else {
        app = initializeApp(cfg);
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
  if (!a) return null;
  if (!_db) {
    try {
      _db = getFirestore(a);
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
