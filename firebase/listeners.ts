/**
 * CYCLES DETECTED BY MADGE: None
 * 
 * Static imports only from src/lib/firebase.ts
 * No imports from stores or App
 * Pure subscription functions only
 */

import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { getAuthSafe, getDbSafe, type Unsubscribe } from "../src/lib/firebase";
import { FirestoreChatMessage } from "./types";

/**
 * Attach auth state listener (store-agnostic)
 * @param onChange Callback when auth state changes
 * @returns Unsubscribe function
 */
export function attachAuthListener(onChange: (user: FirebaseUser | null) => void): Unsubscribe {
  const auth = getAuthSafe();
  if (!auth) {
    if (import.meta.env.DEV) {
      console.warn('[FIREBASE] Auth not available, returning no-op unsubscribe');
    }
    onChange(null);
    return () => {};
  }
  return onAuthStateChanged(auth, onChange);
}

export function subscribeToChat(
  eventId: string,
  cb: (messages: FirestoreChatMessage[]) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    if (import.meta.env.DEV) {
      console.warn('[FIREBASE] Firestore not available, returning no-op unsubscribe');
    }
    cb([]);
    return () => {};
  }
  try {
    const messagesCol = collection(db, "events", eventId, "messages");
    const q = query(messagesCol, orderBy("createdAt", "asc"));

    return onSnapshot(q, (snap) => {
      const msgs: FirestoreChatMessage[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as FirestoreChatMessage[];
      cb(msgs);
    }, (error) => {
      if (import.meta.env.DEV) {
        console.error("[FIREBASE] Error in chat subscription:", error);
      }
      cb([]);
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[FIREBASE] Error setting up chat subscription:", error);
    }
    return () => {};
  }
}
