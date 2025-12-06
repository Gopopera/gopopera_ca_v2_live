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
    
    // CRITICAL FIX: Try with orderBy first, but fallback to no orderBy if index doesn't exist
    // This ensures the subscription works even if the Firestore index hasn't been created yet
    let useOrderBy = true;
    let q = query(messagesCol, orderBy("createdAt", "asc"));

    return onSnapshot(q, (snap) => {
      const msgs: FirestoreChatMessage[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          ...data,
          // Ensure createdAt is a number (Firestore timestamp or number)
          createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
        };
      });
      
      // Always sort client-side to ensure correct order (even with orderBy, this is safe)
      msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      
      console.log(`[FIREBASE] 📨 Chat subscription update for ${eventId}:`, {
        eventId,
        messageCount: msgs.length,
        useOrderBy,
        messages: msgs.map(m => ({ 
          id: m.id, 
          userId: m.userId, 
          userName: m.userName, 
          isHost: m.isHost,
          createdAt: m.createdAt,
          text: m.text?.substring(0, 50) 
        })),
      });
      
      cb(msgs);
    }, (error) => {
      // CRITICAL: Log detailed error information for debugging
      console.error("[FIREBASE] ❌ Error in chat subscription:", {
        eventId,
        error: error.message,
        code: error.code,
        details: error,
      });
      
      // If it's a permission error, provide helpful information
      if (error.code === 'permission-denied') {
        console.error("[FIREBASE] ⚠️ Permission denied - check Firestore security rules for events/{eventId}/messages");
        console.error("[FIREBASE] Current user should be authenticated to read messages");
        cb([]);
        return;
      }
      
      // If it's a missing index error, try querying without orderBy
      if (error.code === 'failed-precondition' && (error.message?.includes('index') || error.message?.includes('query requires an index'))) {
        console.warn("[FIREBASE] ⚠️ Missing Firestore index - trying query without orderBy");
        useOrderBy = false;
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
          console.log(`[FIREBASE] 📨 Chat subscription (fallback, no orderBy) for ${eventId}:`, {
            eventId,
            messageCount: msgs.length,
            messages: msgs.map(m => ({ 
              id: m.id, 
              userId: m.userId, 
              userName: m.userName, 
              isHost: m.isHost,
              text: m.text?.substring(0, 50) 
            })),
          });
          cb(msgs);
        }, (fallbackError) => {
          console.error("[FIREBASE] ❌ Fallback query also failed:", fallbackError);
          cb([]);
        });
      } else {
        cb([]);
      }
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[FIREBASE] ❌ Error setting up chat subscription:", error);
    }
    // If orderBy fails during setup, try without it
    if (error instanceof Error && (error.message?.includes('index') || error.message?.includes('orderBy'))) {
      console.warn("[FIREBASE] ⚠️ OrderBy failed during setup, trying without orderBy");
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
          console.log(`[FIREBASE] 📨 Chat subscription (setup fallback) for ${eventId}:`, {
            eventId,
            messageCount: msgs.length,
          });
          cb(msgs);
        }, (fallbackError) => {
          console.error("[FIREBASE] ❌ Setup fallback query also failed:", fallbackError);
          cb([]);
        });
      } catch (fallbackError) {
        console.error("[FIREBASE] ❌ Setup fallback query setup failed:", fallbackError);
        return () => {};
      }
    }
    return () => {};
  }
}
