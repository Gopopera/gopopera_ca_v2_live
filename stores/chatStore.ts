import { create } from 'zustand';
import type { FirestoreChatMessage } from '../firebase/types';
// Note: firebase/listeners and firebase/db are imported dynamically to avoid circular dependencies

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
  addMessage: (eventId: string, userId: string, userName: string, message: string, type?: ChatMessage['type'], isHost?: boolean) => Promise<void>;
  getMessagesForEvent: (eventId: string) => ChatMessage[];
  subscribeToEventChat: (eventId: string) => Promise<void>;
  unsubscribeFromEventChat: (eventId: string) => void;
  addPoll: (eventId: string, question: string, options: string[]) => Poll;
  voteOnPoll: (pollId: string, optionIndex: number) => void;
  getPollForEvent: (eventId: string) => Poll | null;
  initializeEventChat: (eventId: string, hostName: string) => void;
}

// Helper to convert FirestoreChatMessage to ChatMessage
const mapFirestoreMessageToChatMessage = (msg: FirestoreChatMessage): ChatMessage => {
  return {
    id: msg.id,
    eventId: msg.eventId,
    userId: msg.userId,
    userName: msg.userName,
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

  addMessage: async (eventId, userId, userName, message, type = 'message', isHost = false) => {
    try {
      // Dynamic import to avoid circular dependency
      const dbModule = await import('../firebase/db');
      // Add to Firestore
      await dbModule.addChatMessage(eventId, userId, userName, message, type, isHost);
      // The realtime listener will update the messages automatically
    } catch (error) {
      console.error("Error adding message to Firestore:", error);
      // Fallback to local state if Firestore fails
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        eventId,
        userId,
        userName,
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

  subscribeToEventChat: async (eventId: string) => {
    // Unsubscribe from previous subscription if exists
    const existingUnsubscribe = get().unsubscribeCallbacks[eventId];
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    // Dynamic import to avoid circular dependency
    const listenersModule = await import('../firebase/listeners');
    
    // Subscribe to Firestore realtime updates
    const unsubscribe = listenersModule.subscribeToChat(eventId, (firestoreMessages: FirestoreChatMessage[]) => {
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
    // Prefer Firestore messages if available
    const firestoreMsgs = get().firestoreMessages[eventId];
    if (firestoreMsgs && firestoreMsgs.length > 0) {
      return firestoreMsgs.map(mapFirestoreMessageToChatMessage)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    
    // Fallback to local messages
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
    // Check if chat already initialized
    const existingMessages = get().getMessagesForEvent(eventId);
    if (existingMessages.length > 0) {
      return; // Chat already initialized
    }

    // Add welcome message
    get().addMessage(
      eventId,
      'system',
      'System',
      `Welcome to the ${eventId} group chat! Start the conversation.`,
      'system',
      false
    );
  },
}));


