import { create } from 'zustand';

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
  addMessage: (eventId: string, userId: string, userName: string, message: string, type?: ChatMessage['type'], isHost?: boolean) => void;
  getMessagesForEvent: (eventId: string) => ChatMessage[];
  addPoll: (eventId: string, question: string, options: string[]) => Poll;
  voteOnPoll: (pollId: string, optionIndex: number) => void;
  getPollForEvent: (eventId: string) => Poll | null;
  initializeEventChat: (eventId: string, hostName: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  polls: [],

  addMessage: (eventId, userId, userName, message, type = 'message', isHost = false) => {
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

    return newMessage;
  },

  getMessagesForEvent: (eventId: string) => {
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


