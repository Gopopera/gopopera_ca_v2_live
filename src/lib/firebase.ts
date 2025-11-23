/**
 * CYCLES REMOVED:
 * - No imports from stores, App, or other app modules
 * - Only imports from Firebase SDK
 * - Exports factory accessors only (no top-level initialization)
 * 
 * DEPENDENCY GRAPH:
 * firebase.ts (base) → only Firebase SDK
 *   ↓
 * firebase/db.ts, firebase/listeners.ts → firebase.ts
 *   ↓
 * stores/userStore.ts → lazy imports of db/listeners
 *   ↓
 * App.tsx → stores only
 */

import { initializeApp, type FirebaseApp, getApps } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore, serverTimestamp, Timestamp } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Singleton instances (lazy initialization)
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

/**
 * Factory accessor for Firebase App instance (idempotent)
 */
export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  _app = getApps().length ? getApps()[0]! : initializeApp(cfg);
  return _app;
}

/**
 * Factory accessor for Auth instance (idempotent)
 */
export function getAuthInstance(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  return _auth;
}

/**
 * Factory accessor for Firestore instance (idempotent)
 */
export function getFirestoreDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getFirebaseApp());
  return _db;
}

/**
 * Factory accessor for Storage instance (idempotent)
 */
export function getStorageInstance(): FirebaseStorage {
  if (_storage) return _storage;
  _storage = getStorage(getFirebaseApp());
  return _storage;
}

// Re-export common helpers
export { serverTimestamp, Timestamp };
export type Unsubscribe = () => void;
