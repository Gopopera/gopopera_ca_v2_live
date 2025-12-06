/**
 * CYCLES DETECTED BY MADGE: None
 * 
 * Static imports from firebase/listeners.ts and firebase/db.ts
 * No dynamic imports of Firebase modules
 */

import { create } from 'zustand';
import { subscribeToChat } from '../firebase/listeners';
import { addChatMessage } from '../firebase/db';
import type { FirestoreChatMessage } from '../firebase/types';

export interface ChatMessage {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
  type: 'message' | 'announcement' | 'poll' | 'system';
  isHost?: boolean;
}

export interface Poll {
  id: string;
  eventId: string;
  question: string;
  options: { label: string; votes: number; percentage: number }[];
  totalVotes: number;
  createdAt: string;
}

interface ChatStore {
  messages: ChatMessage[];
  polls: Poll[];
  firestoreMessages: Record<string, FirestoreChatMessage[]>; // eventId -> messages
  unsubscribeCallbacks: Record<string, () => void>; // eventId -> unsubscribe function
  // REFACTORED: Only senderId required - sender info fetched from /users/{senderId}
  addMessage: (eventId: string, senderId: string, message: string, type?: ChatMessage['type'], isHost?: boolean) => Promise<void>;
  getMessagesForEvent: (eventId: string) => ChatMessage[];
  subscribeToEventChat: (eventId: string) => void;
  unsubscribeFromEventChat: (eventId: string) => void;
  addPoll: (eventId: string, question: string, options: string[]) => Poll;
  voteOnPoll: (pollId: string, optionIndex: number) => void;
  getPollForEvent: (eventId: string) => Poll | null;
  initializeEventChat: (eventId: string, hostName: string) => void;
}

// REFACTORED: Map Firestore message to ChatMessage
// Sender info (userName) is fetched from /users/{senderId} in real-time
const mapFirestoreMessageToChatMessage = (msg: FirestoreChatMessage): ChatMessage => {
  return {
    id: msg.id,
    eventId: msg.eventId,
    userId: msg.senderId || msg.userId || '', // Use senderId (standardized), fallback to userId (backward compatibility)
    userName: msg.userName || '', // Will be fetched from /users/{senderId} if empty
    message: msg.text,
    timestamp: new Date(msg.createdAt).toISOString(),
    type: msg.type || 'message',
    isHost: msg.isHost || false,
  };
};

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  polls: [],
  firestoreMessages: {},
  unsubscribeCallbacks: {},

  // REFACTORED: Only senderId required - sender info fetched from /users/{senderId}
  addMessage: async (eventId, senderId, message, type = 'message', isHost = false) => {
    // CRITICAL: Save message to Firestore - real-time sync handles UI updates
    // Messages are constantly saved and synced across all devices via onSnapshot
    // Only host and attendees can send messages (enforced by GroupChat component)
    try {
      await addChatMessage(eventId, senderId, message, type, isHost);
      // The realtime listener (onSnapshot) will update the messages automatically
      // This ensures messages are synced with past, current, and future content
    } catch (error) {
      console.error("[CHAT_STORE] Error adding message to Firestore:", error);
      // Fallback to local state if Firestore fails (offline mode)
      // Note: userName will be fetched from /users/{senderId} when displaying
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        eventId,
        userId: senderId,
        userName: '', // Will be fetched from /users/{senderId}
        message,
        timestamp: new Date().toISOString(),
        type,
        isHost,
      };
      set((state) => ({
        messages: [...state.messages, newMessage],
      }));
    }
  },

  subscribeToEventChat: (eventId: string) => {
    // Unsubscribe from previous subscription if exists
    const existingUnsubscribe = get().unsubscribeCallbacks[eventId];
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    // Subscribe to Firestore realtime updates
    const unsubscribe = subscribeToChat(eventId, (firestoreMessages: FirestoreChatMessage[]) => {
      console.log(`[CHAT_STORE] 📨 Received ${firestoreMessages.length} messages for event ${eventId}`, {
        eventId,
        messageCount: firestoreMessages.length,
        messages: firestoreMessages.map(m => ({ 
          id: m.id, 
          userId: m.userId, 
          userName: m.userName, 
          isHost: m.isHost,
          text: m.text?.substring(0, 50),
          createdAt: m.createdAt,
        })),
        // CRITICAL: Log all message details for debugging host visibility issue
        allMessages: firestoreMessages,
      });
      
      // CRITICAL: Ensure messages are properly stored
      set((state) => {
        const updatedMessages = {
          ...state.firestoreMessages,
          [eventId]: firestoreMessages,
        };
        
        console.log(`[CHAT_STORE] ✅ Updated firestoreMessages for ${eventId}:`, {
          eventId,
          messageCount: firestoreMessages.length,
          storedCount: updatedMessages[eventId]?.length || 0,
        });
        
        return {
          firestoreMessages: updatedMessages,
        };
      });
    });

    set((state) => ({
      unsubscribeCallbacks: {
        ...state.unsubscribeCallbacks,
        [eventId]: unsubscribe,
      },
    }));
    
    console.log(`[CHAT_STORE] ✅ Subscribed to chat for event ${eventId}`);
  },

  unsubscribeFromEventChat: (eventId: string) => {
    const unsubscribe = get().unsubscribeCallbacks[eventId];
    if (unsubscribe) {
      unsubscribe();
      set((state) => {
        const newCallbacks = { ...state.unsubscribeCallbacks };
        delete newCallbacks[eventId];
        return { unsubscribeCallbacks: newCallbacks };
      });
    }
  },

  getMessagesForEvent: (eventId: string) => {
    // CRITICAL: Always prefer Firestore messages (real-time, most up-to-date)
    // NO FILTERING - All users (host and attendees) should see ALL messages
    const firestoreMsgs = get().firestoreMessages[eventId];
    if (firestoreMsgs && firestoreMsgs.length > 0) {
      const mappedMessages = firestoreMsgs.map(mapFirestoreMessageToChatMessage)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Debug logging for host visibility
      if (import.meta.env.DEV) {
        console.log(`[CHAT_STORE] 📨 getMessagesForEvent(${eventId}):`, {
          eventId,
          messageCount: mappedMessages.length,
          messages: mappedMessages.map(m => ({ 
            id: m.id, 
            userId: m.userId, 
            userName: m.userName, 
            isHost: m.isHost,
            type: m.type,
            text: m.message.substring(0, 50) 
          })),
        });
      }
      
      return mappedMessages;
    }
    
    // Fallback to local messages (only if Firestore subscription hasn't loaded yet)
    const localMessages = get().messages
      .filter(msg => msg.eventId === eventId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    if (import.meta.env.DEV && localMessages.length > 0) {
      console.log(`[CHAT_STORE] ⚠️ Using fallback local messages for ${eventId}:`, {
        eventId,
        messageCount: localMessages.length,
      });
    }
    
    return localMessages;
  },

  addPoll: (eventId, question, options) => {
    const poll: Poll = {
      id: `poll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventId,
      question,
      options: options.map(label => ({ label, votes: 0, percentage: 0 })),
      totalVotes: 0,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      polls: [...state.polls, poll],
    }));

    return poll;
  },

  voteOnPoll: (pollId, optionIndex) => {
    set((state) => {
      const updatedPolls = state.polls.map(poll => {
        if (poll.id === pollId) {
          const updatedOptions = poll.options.map((opt, idx) => {
            if (idx === optionIndex) {
              return { ...opt, votes: opt.votes + 1 };
            }
            return opt;
          });
          const totalVotes = updatedOptions.reduce((sum, opt) => sum + opt.votes, 0);
          const optionsWithPercentage = updatedOptions.map(opt => ({
            ...opt,
            percentage: totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0,
          }));
          return {
            ...poll,
            options: optionsWithPercentage,
            totalVotes,
          };
        }
        return poll;
      });

      return { polls: updatedPolls };
    });
  },

  getPollForEvent: (eventId: string) => {
    const polls = get().polls.filter(p => p.eventId === eventId);
    return polls.length > 0 ? polls[polls.length - 1] : null; // Return most recent poll
  },

  initializeEventChat: (eventId, hostName) => {
    // NO AUTOMATIC MESSAGES - Chat is initialized silently
    // Only host and attendees can send messages manually
    // Messages are synced in real-time via Firestore subscriptions
    // This function exists for backward compatibility but does nothing
    return;
  },
}));
