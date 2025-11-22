import { firebaseDb } from "./client";
import { collection, query, orderBy, onSnapshot, DocumentData, Unsubscribe } from "firebase/firestore";
import { FirestoreChatMessage } from "./types";

export function subscribeToChat(
  eventId: string,
  cb: (messages: FirestoreChatMessage[]) => void
): Unsubscribe {
  try {
    const messagesCol = collection(firebaseDb, "events", eventId, "messages");
    const q = query(messagesCol, orderBy("createdAt", "asc"));

    return onSnapshot(q, (snap) => {
      const msgs: FirestoreChatMessage[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as DocumentData),
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

