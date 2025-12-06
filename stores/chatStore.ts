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
  // CRITICAL: Ensure we have a valid userId from either senderId or userId
  const messageUserId = msg.senderId || msg.userId || '';
  
  // CRITICAL: Validate createdAt and handle edge cases
  let timestamp: string;
  try {
    if (msg.createdAt) {
      const date = typeof msg.createdAt === 'number' 
        ? new Date(msg.createdAt) 
        : new Date(msg.createdAt);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn(`[CHAT MAPPED MESSAGE] ⚠️ Invalid createdAt for message ${msg.id}, using current time:`, {
          messageId: msg.id,
          createdAt: msg.createdAt,
          createdAtType: typeof msg.createdAt,
        });
        timestamp = new Date().toISOString();
      } else {
        timestamp = date.toISOString();
      }
    } else {
      console.warn(`[CHAT MAPPED MESSAGE] ⚠️ Missing createdAt for message ${msg.id}, using current time:`, {
        messageId: msg.id,
      });
      timestamp = new Date().toISOString();
    }
  } catch (error) {
    console.error(`[CHAT MAPPED MESSAGE] ❌ Error parsing createdAt for message ${msg.id}:`, {
      messageId: msg.id,
      createdAt: msg.createdAt,
      error,
    });
    timestamp = new Date().toISOString();
  }
  
  const mappedMessage: ChatMessage = {
    id: msg.id,
    eventId: msg.eventId,
    userId: messageUserId,
    userName: msg.userName || '', // Will be fetched from /users/{senderId} if empty
    message: msg.text || '',
    timestamp,
    type: msg.type || 'message',
    isHost: msg.isHost || false,
  };
  
  // CRITICAL DIAGNOSTIC: Log each mapped message
  console.log(`[DIAGNOSTIC] 🟢 mapFirestoreMessageToChatMessage() MAPPED message ${msg.id}:`, {
    originalMessage: {
      id: msg.id,
      senderId: msg.senderId,
      userId: msg.userId,
      text: msg.text?.substring(0, 30),
      createdAt: msg.createdAt,
      isHost: msg.isHost,
    },
    mappedMessage: {
      id: mappedMessage.id,
      eventId: mappedMessage.eventId,
      userId: mappedMessage.userId,
      userName: mappedMessage.userName,
      messageLength: mappedMessage.message.length,
      timestamp: mappedMessage.timestamp,
      type: mappedMessage.type,
      isHost: mappedMessage.isHost,
    },
    mappingSuccess: !!mappedMessage.userId,
  });
  
  // CRITICAL DIAGNOSTIC: Warn if mapping failed
  if (!mappedMessage.userId) {
    console.error(`[DIAGNOSTIC] 🔴 mapFirestoreMessageToChatMessage() FAILED - no userId for message ${msg.id}`, {
      messageId: msg.id,
      originalSenderId: msg.senderId,
      originalUserId: msg.userId,
    });
  }
  
  return mappedMessage;
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
    // CRITICAL DIAGNOSTIC: Log when subscribeToEventChat is called
    console.log(`[DIAGNOSTIC] 🟣 subscribeToEventChat() CALLED for eventId: ${eventId}`, {
      eventId,
      timestamp: new Date().toISOString(),
      existingSubscription: !!get().unsubscribeCallbacks[eventId],
    });
    
    // Unsubscribe from previous subscription if exists
    const existingUnsubscribe = get().unsubscribeCallbacks[eventId];
    if (existingUnsubscribe) {
      console.log(`[DIAGNOSTIC] 🧹 subscribeToEventChat() unsubscribing from existing subscription for eventId: ${eventId}`);
      existingUnsubscribe();
    }

    // Subscribe to Firestore realtime updates
    console.log(`[DIAGNOSTIC] 📞 subscribeToEventChat() calling subscribeToChat() for eventId: ${eventId}`);
    const unsubscribe = subscribeToChat(eventId, (firestoreMessages: FirestoreChatMessage[]) => {
      // CRITICAL DIAGNOSTIC: Log when callback receives messages
      console.log(`[DIAGNOSTIC] 🟠 subscribeToEventChat() CALLBACK RECEIVED ${firestoreMessages.length} messages for eventId: ${eventId}`, {
        eventId,
        messageCount: firestoreMessages.length,
        messageIds: firestoreMessages.map(m => m.id),
        messageDetails: firestoreMessages.map(m => ({
          id: m.id,
          senderId: m.senderId,
          userId: m.userId,
          isHost: m.isHost,
          text: m.text?.substring(0, 30),
        })),
      });
      console.log(`[CHAT_STORE] 📨 Received ${firestoreMessages.length} messages for event ${eventId}`, {
        eventId,
        messageCount: firestoreMessages.length,
        messages: firestoreMessages.map(m => ({ 
          id: m.id, 
          senderId: m.senderId,  // ✅ Added senderId
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
      console.log(`[DIAGNOSTIC] 💾 subscribeToEventChat() updating store state for eventId: ${eventId}`, {
        eventId,
        messageCount: firestoreMessages.length,
        beforeUpdate: get().firestoreMessages[eventId]?.length || 0,
      });
      
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
        
        // CRITICAL DIAGNOSTIC: Log after state update
        console.log(`[DIAGNOSTIC] ✅ subscribeToEventChat() store state UPDATED for eventId: ${eventId}`, {
          eventId,
          storedMessageCount: updatedMessages[eventId]?.length || 0,
          storedMessageIds: updatedMessages[eventId]?.map(m => m.id) || [],
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
    // CRITICAL DIAGNOSTIC: Log when getMessagesForEvent is called
    console.log(`[DIAGNOSTIC] 🔵 getMessagesForEvent() CALLED for eventId: ${eventId}`, {
      eventId,
      timestamp: new Date().toISOString(),
      storeState: {
        hasFirestoreMessages: !!get().firestoreMessages[eventId],
        firestoreMessageCount: get().firestoreMessages[eventId]?.length || 0,
      },
    });
    
    // CRITICAL: Always prefer Firestore messages (real-time, most up-to-date)
    // NO FILTERING - All users (host and attendees) should see ALL messages
    const firestoreMsgs = get().firestoreMessages[eventId];
    
    console.log(`[CHAT_STORE] 🔍 getMessagesForEvent(${eventId}):`, {
      eventId,
      hasFirestoreMessages: !!firestoreMsgs,
      firestoreMessageCount: firestoreMsgs?.length || 0,
      rawFirestoreMessages: firestoreMsgs?.map(m => ({
        id: m.id,
        senderId: m.senderId,
        userId: m.userId,
        text: m.text?.substring(0, 50),
        createdAt: m.createdAt,
        isHost: m.isHost,
      })) || [],
    });
    
    if (firestoreMsgs && firestoreMsgs.length > 0) {
      // Map all messages
      const mappedMessages = firestoreMsgs.map(mapFirestoreMessageToChatMessage);
      
      // Sort by timestamp
      const sortedMessages = mappedMessages.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        
        // Handle invalid dates
        if (isNaN(timeA) || isNaN(timeB)) {
          console.warn(`[CHAT_STORE] ⚠️ Invalid timestamp in sort:`, {
            messageA: { id: a.id, timestamp: a.timestamp, timeA },
            messageB: { id: b.id, timestamp: b.timestamp, timeB },
          });
          return 0;
        }
        
        return timeA - timeB;
      });
      
      // CRITICAL: Log final sorted messages before returning
      console.log(`[CHAT_STORE] ✅ getMessagesForEvent(${eventId}) returning ${sortedMessages.length} messages:`, {
        eventId,
        messageCount: sortedMessages.length,
        messages: sortedMessages.map(m => ({ 
          id: m.id, 
          userId: m.userId, 
          userName: m.userName, 
          isHost: m.isHost,
          type: m.type,
          timestamp: m.timestamp,
          text: m.message.substring(0, 50) 
        })),
      });
      
      // CRITICAL DIAGNOSTIC: Log before returning
      console.log(`[DIAGNOSTIC] ✅ getMessagesForEvent() RETURNING ${sortedMessages.length} messages for eventId: ${eventId}`, {
        eventId,
        returnCount: sortedMessages.length,
        returnMessageIds: sortedMessages.map(m => m.id),
        returnMessageDetails: sortedMessages.map(m => ({
          id: m.id,
          userId: m.userId,
          isHost: m.isHost,
          text: m.message.substring(0, 30),
        })),
      });
      
      return sortedMessages;
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
