/**
 * CYCLES DETECTED BY MADGE: None (verified with npx madge --circular)
 * 
 * This is the ONLY source of Firebase singletons.
 * All firebase/* modules import from here statically.
 * Stores import from firebase/* statically.
 * No dynamic imports of this module allowed.
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { serverTimestamp, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Static exports - initialized at module load
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Re-export helpers
export { serverTimestamp, Timestamp };
export type Unsubscribe = () => void;
