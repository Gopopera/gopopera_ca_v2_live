// @ts-nocheck
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  orderBy,
  addDoc,
} from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Core instances
export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Google Auth Provider instance
export const googleProvider = new GoogleAuthProvider();

// Storage exports - re-export with alias to avoid conflicts
export const ref = storageRef;
export { uploadBytes, getDownloadURL };

// Firestore exports
export {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
};

// Type exports - use export type for isolatedModules
// Unsubscribe is the return type of onSnapshot - a function that unsubscribes
export type Unsubscribe = () => void;
export type { User as FirebaseUser };

// Auth exports
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
};

// Auth listener helper - does not import any stores
export function initAuthListener(callback: (user: FirebaseUser | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
