/**
 * CYCLES DETECTED BY MADGE: None
 * 
 * Static imports only from src/lib/firebase.ts
 * No imports from stores or App
 * Pure subscription functions only
 * 
 * PERFORMANCE OPTIMIZED: Removed verbose diagnostic logging
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
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => onChange(null));
    return () => {};
  }
  return onAuthStateChanged(auth, onChange);
}

/**
 * Subscribe to chat messages for an event
 * PERFORMANCE OPTIMIZED: Minimal logging, efficient message processing
 */
export function subscribeToChat(
  eventId: string,
  cb: (messages: FirestoreChatMessage[]) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => cb([]));
    return () => {};
  }
  
  try {
    const messagesCol = collection(db, "events", eventId, "messages");
    
    // Query with orderBy for sorted results
    const q = query(messagesCol, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      // Process messages efficiently
      const msgs: FirestoreChatMessage[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          ...data,
          // Ensure createdAt is a number (Firestore timestamp or number)
          createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
        };
      });
      
      // Sort client-side to ensure correct order
      msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      
      cb(msgs);
    }, (error) => {
      // Handle permission errors gracefully
      if (error.code === 'permission-denied') {
        cb([]);
        return;
      }
      
      // If it's a missing index error, try querying without orderBy
      if (error.code === 'failed-precondition' && 
          (error.message?.includes('index') || error.message?.includes('query requires an index'))) {
        if (import.meta.env.DEV) {
          console.warn("[FIREBASE] Missing Firestore index - trying query without orderBy");
        }
        const fallbackQ = query(messagesCol);
        return onSnapshot(fallbackQ, (snap) => {
          const msgs: FirestoreChatMessage[] = snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              ...data,
              createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
            };
          });
          // Sort client-side
          msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          cb(msgs);
        }, (fallbackError) => {
          console.error("[FIREBASE] Fallback query failed:", fallbackError.message);
          cb([]);
        });
      } else {
        if (import.meta.env.DEV) {
          console.error("[FIREBASE] Chat subscription error:", error.message);
        }
        cb([]);
      }
    });
    
    return unsubscribe;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[FIREBASE] Error setting up chat subscription:", error);
    }
    // If orderBy fails during setup, try without it
    if (error instanceof Error && (error.message?.includes('index') || error.message?.includes('orderBy'))) {
      try {
        const messagesCol = collection(db, "events", eventId, "messages");
        const fallbackQ = query(messagesCol);
        return onSnapshot(fallbackQ, (snap) => {
          const msgs: FirestoreChatMessage[] = snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              ...data,
              createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
            };
          });
          msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          cb(msgs);
        }, () => {
          cb([]);
        });
      } catch (fallbackError) {
        return () => {};
      }
    }
    return () => {};
  }
}
