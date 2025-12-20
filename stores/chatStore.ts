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
import { logger } from '../utils/logger';

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

// PERFORMANCE OPTIMIZED: Map Firestore message to ChatMessage
// Sender info (userName) is fetched from /users/{senderId} in real-time
const mapFirestoreMessageToChatMessage = (msg: FirestoreChatMessage): ChatMessage => {
  // Ensure we have a valid userId from either senderId or userId
  const messageUserId = msg.senderId || msg.userId || '';
  
  // Validate createdAt and handle edge cases
  let timestamp: string;
  try {
    if (msg.createdAt) {
      const date = typeof msg.createdAt === 'number' 
        ? new Date(msg.createdAt) 
        : new Date(msg.createdAt);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        timestamp = new Date().toISOString();
      } else {
        timestamp = date.toISOString();
      }
    } else {
      timestamp = new Date().toISOString();
    }
  } catch (error) {
    logger.error(`[CHAT_STORE] Error parsing createdAt for message ${msg.id}:`, error);
    timestamp = new Date().toISOString();
  }
  
  return {
    id: msg.id,
    eventId: msg.eventId,
    userId: messageUserId,
    userName: msg.userName || '', // Will be fetched from /users/{senderId} if empty
    message: msg.text || '',
    timestamp,
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
    
    // CRITICAL: Validate inputs before attempting write
    if (!eventId || !senderId || !message) {
      console.error('[CHAT_STORE] ❌ Invalid message parameters:', {
        eventId,
        senderId,
        hasMessage: !!message,
        messageLength: message?.length || 0,
        type,
        isHost,
      });
      throw new Error('Invalid message parameters: eventId, senderId, and message are required');
    }
    
    console.log('[CHAT_STORE] 📤 Calling addChatMessage:', {
      eventId,
      senderId,
      messageLength: message.length,
      type,
      isHost,
    });
    
    try {
      const messageId = await addChatMessage(eventId, senderId, message, type, isHost);
      console.log('[CHAT_STORE] ✅ Message added successfully:', {
        messageId,
        eventId,
        senderId,
      });
      // The realtime listener (onSnapshot) will update the messages automatically
      // This ensures messages are synced with past, current, and future content
    } catch (error: any) {
      console.error("[CHAT_STORE] ❌ Error adding message to Firestore:", {
        eventId,
        senderId,
        messageLength: message.length,
        type,
        isHost,
        error: error.message,
        code: error.code,
        stack: error.stack,
      });
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
      // Re-throw error so caller knows write failed
      throw error;
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
      // Update store with new messages (logging removed for performance)
      set((state) => ({
        firestoreMessages: {
          ...state.firestoreMessages,
          [eventId]: firestoreMessages,
        },
      }));
    });

    set((state) => ({
      unsubscribeCallbacks: {
        ...state.unsubscribeCallbacks,
        [eventId]: unsubscribe,
      },
    }));
    
    logger.debug(`[CHAT_STORE] Subscribed to chat for event ${eventId}`);
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
    // Always prefer Firestore messages (real-time, most up-to-date)
    const firestoreMsgs = get().firestoreMessages[eventId];
    
    if (firestoreMsgs && firestoreMsgs.length > 0) {
      // Map and sort all messages by timestamp
      return firestoreMsgs
        .map(mapFirestoreMessageToChatMessage)
        .sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          // Handle invalid dates gracefully
          if (isNaN(timeA) || isNaN(timeB)) return 0;
          return timeA - timeB;
        });
    }
    
    // Fallback to local messages (only if Firestore subscription hasn't loaded yet)
    return get().messages
      .filter(msg => msg.eventId === eventId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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
