import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { getFirebase, type Unsubscribe } from "../src/lib/firebase";
import { FirestoreChatMessage } from "./types";

export function initAuthListener(onUser: (u: any | null) => void): Unsubscribe {
  const { auth } = getFirebase();
  return onAuthStateChanged(auth, onUser);
}

export function subscribeToChat(
  eventId: string,
  cb: (messages: FirestoreChatMessage[]) => void
): Unsubscribe {
  try {
    const { db } = getFirebase();
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
    // Return a no-op unsubscribe function
    return () => {};
  }
}
