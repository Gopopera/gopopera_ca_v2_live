/**
 * CYCLES REMOVED:
 * - No imports from stores or App
 * - Only imports from src/lib/firebase.ts (accessors)
 * - Pure subscription functions (no side effects at import time)
 * 
 * DEPENDENCY GRAPH:
 * firebase/listeners.ts → src/lib/firebase.ts (accessors only)
 */

import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { getAuthInstance, getFirestoreDb, type Unsubscribe } from "../src/lib/firebase";
import { FirestoreChatMessage } from "./types";

/**
 * Attach auth state listener (store-agnostic)
 * @param onChange Callback when auth state changes
 * @returns Unsubscribe function
 */
export function attachAuthListener(onChange: (user: FirebaseUser | null) => void): Unsubscribe {
  const auth = getAuthInstance();
  return onAuthStateChanged(auth, onChange);
}

export function subscribeToChat(
  eventId: string,
  cb: (messages: FirestoreChatMessage[]) => void
): Unsubscribe {
  try {
    const db = getFirestoreDb();
    const messagesCol = collection(db, "events", eventId, "messages");
    const q = query(messagesCol, orderBy("createdAt", "asc"));

    return onSnapshot(q, (snap) => {
      const msgs: FirestoreChatMessage[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as FirestoreChatMessage[];
      cb(msgs);
    }, (error) => {
      console.error("Error in chat subscription:", error);
      cb([]);
    });
  } catch (error) {
    console.error("Error setting up chat subscription:", error);
    return () => {};
  }
}
