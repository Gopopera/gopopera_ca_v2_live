import { initializeApp, type FirebaseApp, getApps } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore, serverTimestamp, Timestamp } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

type Services = { app: FirebaseApp; auth: Auth; db: Firestore; storage: FirebaseStorage };
let _svc: Services | null = null;

export function getFirebase(): Services {
  if (_svc) return _svc;
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  const app = getApps().length ? getApps()[0]! : initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  _svc = { app, auth, db, storage };
  return _svc;
}

// Re-export common helpers (no Unsubscribe import; define locally if needed)
export { serverTimestamp, Timestamp };
export type Unsubscribe = () => void;
