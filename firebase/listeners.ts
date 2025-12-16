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
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => onChange(null));
    return () => {};
  }
  return onAuthStateChanged(auth, onChange);
}

export function subscribeToChat(
  eventId: string,
  cb: (messages: FirestoreChatMessage[]) => void
): Unsubscribe {
  // CRITICAL DIAGNOSTIC: Log when subscribeToChat is called
  console.log(`[DIAGNOSTIC] 🔵 subscribeToChat() CALLED for eventId: ${eventId}`, {
    eventId,
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack,
  });
  
  const db = getDbSafe();
  if (!db) {
    console.error(`[DIAGNOSTIC] ❌ subscribeToChat() FAILED - Firestore not available for eventId: ${eventId}`);
    if (import.meta.env.DEV) {
      console.warn('[FIREBASE] Firestore not available, returning no-op unsubscribe');
    }
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => cb([]));
    return () => {};
  }
  
  try {
    const messagesCol = collection(db, "events", eventId, "messages");
    
    // CRITICAL DIAGNOSTIC: Log collection path
    console.log(`[DIAGNOSTIC] 📍 subscribeToChat() creating collection reference: events/${eventId}/messages`, {
      eventId,
      collectionPath: `events/${eventId}/messages`,
    });
    
    // CRITICAL FIX: Try with orderBy first, but fallback to no orderBy if index doesn't exist
    // This ensures the subscription works even if the Firestore index hasn't been created yet
    let useOrderBy = true;
    let q = query(messagesCol, orderBy("createdAt", "asc"));
    
    // CRITICAL DIAGNOSTIC: Log when onSnapshot is about to be registered
    console.log(`[DIAGNOSTIC] 🎯 subscribeToChat() registering onSnapshot listener for eventId: ${eventId}`, {
      eventId,
      useOrderBy,
      queryPath: `events/${eventId}/messages`,
    });

    const unsubscribe = onSnapshot(q, (snap) => {
      // CRITICAL DIAGNOSTIC: Log when onSnapshot callback fires
      console.log(`[DIAGNOSTIC] 🟢 onSnapshot() CALLBACK FIRED for eventId: ${eventId}`, {
        eventId,
        documentCount: snap.docs.length,
        hasPendingWrites: snap.metadata.hasPendingWrites,
        fromCache: snap.metadata.fromCache,
        timestamp: new Date().toISOString(),
      });
      
      // CRITICAL: Log raw Firestore documents before any processing
      console.log(`[CHAT LISTENER FIRESTORE RAW] 📥 Received ${snap.docs.length} documents for event ${eventId}`);
      snap.docs.forEach((doc) => {
        const rawData = doc.data();
        console.log(`[CHAT LISTENER FIRESTORE RAW] 📄 Document ${doc.id}:`, {
          id: doc.id,
          senderId: rawData.senderId,
          userId: rawData.userId,
          text: rawData.text?.substring(0, 50),
          createdAt: rawData.createdAt,
          createdAtType: typeof rawData.createdAt,
          isHost: rawData.isHost,
          type: rawData.type,
          eventId: rawData.eventId,
          fullData: rawData,
        });
      });
      
      const msgs: FirestoreChatMessage[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const processedMessage = {
          id: d.id,
          ...data,
          // Ensure createdAt is a number (Firestore timestamp or number)
          createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
        };
        
        // Log each processed message
        console.log(`[CHAT LISTENER PROCESSED] 🔄 Processed message ${d.id}:`, {
          id: processedMessage.id,
          senderId: processedMessage.senderId,
          userId: processedMessage.userId,
          createdAt: processedMessage.createdAt,
          createdAtType: typeof processedMessage.createdAt,
          isHost: processedMessage.isHost,
          text: processedMessage.text?.substring(0, 50),
        });
        
        return processedMessage;
      });
      
      // Always sort client-side to ensure correct order (even with orderBy, this is safe)
      msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      
      console.log(`[FIREBASE] 📨 Chat subscription update for ${eventId}:`, {
        eventId,
        messageCount: msgs.length,
        useOrderBy,
        messages: msgs.map(m => ({ 
          id: m.id, 
          senderId: m.senderId,  // ✅ Added senderId
          userId: m.userId, 
          userName: m.userName, 
          isHost: m.isHost,
          createdAt: m.createdAt,
          text: m.text?.substring(0, 50) 
        })),
      });
      
      // CRITICAL DIAGNOSTIC: Log before calling callback
      console.log(`[DIAGNOSTIC] 🟡 subscribeToChat() calling callback with ${msgs.length} messages for eventId: ${eventId}`, {
        eventId,
        messageCount: msgs.length,
        messageIds: msgs.map(m => m.id),
        messageSenderIds: msgs.map(m => ({ id: m.id, senderId: m.senderId, userId: m.userId })),
      });
      
      cb(msgs);
    }, (error) => {
      // CRITICAL DIAGNOSTIC: Log subscription errors
      console.error(`[DIAGNOSTIC] 🔴 onSnapshot() ERROR for eventId: ${eventId}`, {
        eventId,
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      });
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
          // Log raw documents in fallback query
          console.log(`[CHAT LISTENER FIRESTORE RAW] 📥 Fallback query received ${snap.docs.length} documents for event ${eventId}`);
          snap.docs.forEach((doc) => {
            const rawData = doc.data();
            console.log(`[CHAT LISTENER FIRESTORE RAW] 📄 Fallback document ${doc.id}:`, {
              id: doc.id,
              senderId: rawData.senderId,
              userId: rawData.userId,
              text: rawData.text?.substring(0, 50),
              createdAt: rawData.createdAt,
              isHost: rawData.isHost,
              fullData: rawData,
            });
          });
          
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
              senderId: m.senderId,  // ✅ Added senderId
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
    
    // CRITICAL DIAGNOSTIC: Log successful listener registration
    console.log(`[DIAGNOSTIC] ✅ subscribeToChat() successfully registered listener for eventId: ${eventId}`, {
      eventId,
      unsubscribeFunction: typeof unsubscribe === 'function' ? 'present' : 'missing',
    });
    
    return unsubscribe;
  } catch (error) {
    console.error(`[DIAGNOSTIC] 🔴 subscribeToChat() SETUP ERROR for eventId: ${eventId}`, {
      eventId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
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
          // Log raw documents in setup fallback query
          console.log(`[CHAT LISTENER FIRESTORE RAW] 📥 Setup fallback received ${snap.docs.length} documents for event ${eventId}`);
          snap.docs.forEach((doc) => {
            const rawData = doc.data();
            console.log(`[CHAT LISTENER FIRESTORE RAW] 📄 Setup fallback document ${doc.id}:`, {
              id: doc.id,
              senderId: rawData.senderId,
              userId: rawData.userId,
              text: rawData.text?.substring(0, 50),
              createdAt: rawData.createdAt,
              isHost: rawData.isHost,
              fullData: rawData,
            });
          });
          
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
            messages: msgs.map(m => ({
              id: m.id,
              senderId: m.senderId,  // ✅ Added senderId
              userId: m.userId,
              isHost: m.isHost,
            })),
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
