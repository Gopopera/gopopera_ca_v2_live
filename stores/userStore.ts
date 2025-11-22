import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { firebaseAuth, firebaseDb } from '../firebase/client';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FirestoreUser } from '../firebase/types';
import { createOrUpdateUserProfile, getUserProfile } from '../firebase/db';

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
  users: User[]; // Keep for backward compatibility, but will be empty
  login: (email: string, password: string) => Promise<User | null>;
  signUp: (email: string, password: string, name: string, preferences: 'attend' | 'host' | 'both') => Promise<User>;
  signInWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
  getCurrentUser: () => User | null;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  addFavorite: (userId: string, eventId: string) => Promise<void>;
  removeFavorite: (userId: string, eventId: string) => Promise<void>;
  addRSVP: (userId: string, eventId: string) => Promise<void>;
  removeRSVP: (userId: string, eventId: string) => Promise<void>;
  getUserFavorites: (userId: string) => string[];
  getUserRSVPs: (userId: string) => string[];
  getUserHostedEvents: (userId: string) => string[];
  initAuthListener: () => void;
}

// Official Popera account constants
export const POPERA_HOST_ID = 'popera-official';
export const POPERA_HOST_NAME = 'Popera';
export const POPERA_EMAIL = 'eatezca@gmail.com';

// Helper to convert FirestoreUser to User (frontend type)
const mapFirestoreUserToUser = async (firebaseUser: FirebaseUser, firestoreUser?: FirestoreUser | null): Promise<User> => {
  const userDoc = firestoreUser || await getUserProfile(firebaseUser.uid);
  
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: userDoc?.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    createdAt: userDoc?.createdAt ? new Date(userDoc.createdAt).toISOString() : new Date().toISOString(),
    preferences: userDoc?.preferences || 'both',
    favorites: [], // Will be loaded from Firestore if needed
    rsvps: [], // Will be loaded from Firestore if needed
    hostedEvents: [], // Will be loaded from Firestore if needed
    profileImageUrl: userDoc?.photoURL || firebaseUser.photoURL,
  };
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [], // No longer used, kept for backward compatibility

      login: async (email: string, password: string) => {
        try {
          const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
          const firebaseUser = userCredential.user;
          
          // Fetch user profile from Firestore
          const firestoreUser = await getUserProfile(firebaseUser.uid);
          
          // If user doesn't exist in Firestore, create profile
          if (!firestoreUser) {
            await createOrUpdateUserProfile(firebaseUser.uid, {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              createdAt: Date.now(),
            });
          }
          
          const user = await mapFirestoreUserToUser(firebaseUser, firestoreUser);
          
          // Load favorites and RSVPs from Firestore
          // For now, we'll keep them in local state, but they should be synced with Firestore
          
          set({ currentUser: user });
          return user;
        } catch (error) {
          console.error("Login error:", error);
          throw error;
        }
      },

      signUp: async (email: string, password: string, name: string, preferences: 'attend' | 'host' | 'both') => {
        try {
          const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
          const firebaseUser = userCredential.user;
          
          // Create user profile in Firestore
          await createOrUpdateUserProfile(firebaseUser.uid, {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: name,
            preferences,
            createdAt: Date.now(),
          });
          
          const user: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name,
            createdAt: new Date().toISOString(),
            preferences,
            favorites: [],
            rsvps: [],
            hostedEvents: [],
          };
          
          set({ currentUser: user });
          return user;
        } catch (error) {
          console.error("Sign up error:", error);
          throw error;
        }
      },

      signInWithGoogle: async () => {
        try {
          const provider = new GoogleAuthProvider();
          const userCredential = await signInWithPopup(firebaseAuth, provider);
          const firebaseUser = userCredential.user;
          
          // Upsert user profile in Firestore
          const firestoreUser = await getUserProfile(firebaseUser.uid);
          if (!firestoreUser) {
            await createOrUpdateUserProfile(firebaseUser.uid, {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              photoURL: firebaseUser.photoURL,
              createdAt: Date.now(),
            });
          } else {
            // Update photo if changed
            if (firebaseUser.photoURL && firestoreUser.photoURL !== firebaseUser.photoURL) {
              await createOrUpdateUserProfile(firebaseUser.uid, {
                photoURL: firebaseUser.photoURL,
              });
            }
          }
          
          const user = await mapFirestoreUserToUser(firebaseUser, firestoreUser);
          set({ currentUser: user });
          return user;
        } catch (error) {
          console.error("Google sign in error:", error);
          throw error;
        }
      },

      logout: async () => {
        try {
          await signOut(firebaseAuth);
          set({ currentUser: null });
        } catch (error) {
          console.error("Logout error:", error);
          throw error;
        }
      },

      getCurrentUser: () => {
        return get().currentUser;
      },

      updateUser: async (userId: string, updates: Partial<User>) => {
        try {
          // Update Firestore
          const firestoreUpdates: Partial<FirestoreUser> = {};
          if (updates.name) firestoreUpdates.displayName = updates.name;
          if (updates.preferences) firestoreUpdates.preferences = updates.preferences;
          if (updates.profileImageUrl) firestoreUpdates.photoURL = updates.profileImageUrl;
          
          await createOrUpdateUserProfile(userId, firestoreUpdates);
          
          // Update local state
          set((state) => ({
            currentUser: state.currentUser?.id === userId
              ? { ...state.currentUser, ...updates }
              : state.currentUser,
          }));
        } catch (error) {
          console.error("Update user error:", error);
          throw error;
        }
      },

      addFavorite: async (userId: string, eventId: string) => {
        try {
          // TODO: Sync with Firestore user favorites subcollection
          // For now, update local state
          set((state) => {
            const updatedFavorites = state.currentUser?.favorites || [];
            if (!updatedFavorites.includes(eventId)) {
              return {
                currentUser: state.currentUser
                  ? { ...state.currentUser, favorites: [...updatedFavorites, eventId] }
                  : null,
              };
            }
            return state;
          });
        } catch (error) {
          console.error("Add favorite error:", error);
        }
      },

      removeFavorite: async (userId: string, eventId: string) => {
        try {
          // TODO: Sync with Firestore
          set((state) => ({
            currentUser: state.currentUser?.id === userId
              ? { ...state.currentUser, favorites: state.currentUser.favorites.filter(id => id !== eventId) }
              : state.currentUser,
          }));
        } catch (error) {
          console.error("Remove favorite error:", error);
        }
      },

      addRSVP: async (userId: string, eventId: string) => {
        try {
          // TODO: Create reservation in Firestore
          // For now, update local state
          set((state) => {
            const updatedRSVPs = state.currentUser?.rsvps || [];
            if (!updatedRSVPs.includes(eventId)) {
              return {
                currentUser: state.currentUser
                  ? { ...state.currentUser, rsvps: [...updatedRSVPs, eventId] }
                  : null,
              };
            }
            return state;
          });
        } catch (error) {
          console.error("Add RSVP error:", error);
        }
      },

      removeRSVP: async (userId: string, eventId: string) => {
        try {
          // TODO: Cancel reservation in Firestore
          set((state) => ({
            currentUser: state.currentUser?.id === userId
              ? { ...state.currentUser, rsvps: state.currentUser.rsvps.filter(id => id !== eventId) }
              : state.currentUser,
          }));
        } catch (error) {
          console.error("Remove RSVP error:", error);
        }
      },

      getUserFavorites: (userId: string) => {
        const user = get().currentUser;
        if (user?.id === userId) {
          return user.favorites || [];
        }
        return [];
      },

      getUserRSVPs: (userId: string) => {
        const user = get().currentUser;
        if (user?.id === userId) {
          return user.rsvps || [];
        }
        return [];
      },

      getUserHostedEvents: (userId: string) => {
        const user = get().currentUser;
        if (user?.id === userId) {
          return user.hostedEvents || [];
        }
        return [];
      },

      initAuthListener: () => {
        onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
          if (firebaseUser) {
            try {
              const firestoreUser = await getUserProfile(firebaseUser.uid);
              const user = await mapFirestoreUserToUser(firebaseUser, firestoreUser);
              set({ currentUser: user });
            } catch (error) {
              console.error("Error restoring user session:", error);
              set({ currentUser: null });
            }
          } else {
            set({ currentUser: null });
          }
        });
      },
    }),
    {
      name: 'popera-user-storage',
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
