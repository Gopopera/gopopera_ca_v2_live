import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  preferences: 'attend' | 'host' | 'both';
  favorites: string[]; // Event IDs
  rsvps: string[]; // Event IDs user has RSVP'd to
  hostedEvents: string[]; // Event IDs user has created
  profileImageUrl?: string;
}

interface UserStore {
  currentUser: User | null;
  users: User[]; // Mock user database
  login: (email: string, password: string) => Promise<User | null>;
  signUp: (email: string, password: string, name: string, preferences: 'attend' | 'host' | 'both') => Promise<User>;
  logout: () => void;
  getCurrentUser: () => User | null;
  updateUser: (userId: string, updates: Partial<User>) => void;
  addFavorite: (userId: string, eventId: string) => void;
  removeFavorite: (userId: string, eventId: string) => void;
  addRSVP: (userId: string, eventId: string) => void;
  removeRSVP: (userId: string, eventId: string) => void;
  getUserFavorites: (userId: string) => string[];
  getUserRSVPs: (userId: string) => string[];
  getUserHostedEvents: (userId: string) => string[];
}

// Official Popera account
const POPERA_ACCOUNT_ID = 'popera-official';
const POPERA_EMAIL = 'eatezca@gmail.com';
const POPERA_USERNAME = 'Gopopera';
const POPERA_DISPLAY_NAME = 'Popera';

// Mock user database (in real app, this would be Firestore)
const mockUsers: User[] = [
  // Official Popera account
  {
    id: POPERA_ACCOUNT_ID,
    email: POPERA_EMAIL,
    name: POPERA_DISPLAY_NAME,
    createdAt: new Date('2024-01-01').toISOString(),
    preferences: 'host',
    favorites: [],
    rsvps: [],
    hostedEvents: [],
  },
  {
    id: 'user-1',
    email: 'demo@example.com',
    name: 'Demo User',
    createdAt: new Date().toISOString(),
    preferences: 'both',
    favorites: [],
    rsvps: [],
    hostedEvents: [],
  },
];

// Export constants for use in other files
export const POPERA_HOST_ID = POPERA_ACCOUNT_ID;
export const POPERA_HOST_NAME = POPERA_DISPLAY_NAME;

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: mockUsers,

      login: async (email: string, password: string) => {
        // Mock login - in real app, verify credentials with Firebase Auth
        // Special handling for Popera account
        if (email === POPERA_EMAIL && password === 'AIPMgopopera') {
          const poperaUser = get().users.find(u => u.id === POPERA_ACCOUNT_ID);
          if (poperaUser) {
            set({ currentUser: poperaUser });
            return poperaUser;
          }
        }
        
        const user = get().users.find(u => u.email === email);
        
        if (user) {
          set({ currentUser: user });
          return user;
        }
        
        // If user doesn't exist, create one (for demo purposes)
        const newUser: User = {
          id: `user-${Date.now()}`,
          email,
          name: email.split('@')[0],
          createdAt: new Date().toISOString(),
          preferences: 'both',
          favorites: [],
          rsvps: [],
          hostedEvents: [],
        };
        
        set((state) => ({
          users: [...state.users, newUser],
          currentUser: newUser,
        }));
        
        return newUser;
      },

      signUp: async (email: string, password: string, name: string, preferences: 'attend' | 'host' | 'both') => {
        // Check if user already exists
        const existingUser = get().users.find(u => u.email === email);
        if (existingUser) {
          throw new Error('User already exists');
        }

        const newUser: User = {
          id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          email,
          name,
          createdAt: new Date().toISOString(),
          preferences,
          favorites: [],
          rsvps: [],
          hostedEvents: [],
        };

        set((state) => ({
          users: [...state.users, newUser],
          currentUser: newUser,
        }));

        return newUser;
      },

      logout: () => {
        set({ currentUser: null });
      },

      getCurrentUser: () => {
        return get().currentUser;
      },

      updateUser: (userId: string, updates: Partial<User>) => {
        set((state) => ({
          users: state.users.map(user =>
            user.id === userId ? { ...user, ...updates } : user
          ),
          currentUser: state.currentUser?.id === userId
            ? { ...state.currentUser, ...updates }
            : state.currentUser,
        }));
      },

      addFavorite: (userId: string, eventId: string) => {
        set((state) => {
          const updatedUsers = state.users.map(user => {
            if (user.id === userId && !user.favorites.includes(eventId)) {
              return { ...user, favorites: [...user.favorites, eventId] };
            }
            return user;
          });

          return {
            users: updatedUsers,
            currentUser: state.currentUser?.id === userId
              ? { ...state.currentUser, favorites: [...(state.currentUser.favorites || []), eventId] }
              : state.currentUser,
          };
        });
      },

      removeFavorite: (userId: string, eventId: string) => {
        set((state) => {
          const updatedUsers = state.users.map(user => {
            if (user.id === userId) {
              return { ...user, favorites: user.favorites.filter(id => id !== eventId) };
            }
            return user;
          });

          return {
            users: updatedUsers,
            currentUser: state.currentUser?.id === userId
              ? { ...state.currentUser, favorites: state.currentUser.favorites.filter(id => id !== eventId) }
              : state.currentUser,
          };
        });
      },

      addRSVP: (userId: string, eventId: string) => {
        set((state) => {
          const updatedUsers = state.users.map(user => {
            if (user.id === userId && !user.rsvps.includes(eventId)) {
              return { ...user, rsvps: [...user.rsvps, eventId] };
            }
            return user;
          });

          return {
            users: updatedUsers,
            currentUser: state.currentUser?.id === userId
              ? { ...state.currentUser, rsvps: [...(state.currentUser.rsvps || []), eventId] }
              : state.currentUser,
          };
        });
      },

      removeRSVP: (userId: string, eventId: string) => {
        set((state) => {
          const updatedUsers = state.users.map(user => {
            if (user.id === userId) {
              return { ...user, rsvps: user.rsvps.filter(id => id !== eventId) };
            }
            return user;
          });

          return {
            users: updatedUsers,
            currentUser: state.currentUser?.id === userId
              ? { ...state.currentUser, rsvps: state.currentUser.rsvps.filter(id => id !== eventId) }
              : state.currentUser,
          };
        });
      },

      getUserFavorites: (userId: string) => {
        const user = get().users.find(u => u.id === userId);
        return user?.favorites || [];
      },

      getUserRSVPs: (userId: string) => {
        const user = get().users.find(u => u.id === userId);
        return user?.rsvps || [];
      },

      getUserHostedEvents: (userId: string) => {
        const user = get().users.find(u => u.id === userId);
        return user?.hostedEvents || [];
      },
    }),
    {
      name: 'popera-user-storage',
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);

