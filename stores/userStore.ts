import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  auth,
  initAuthListener as firebaseInitAuthListener,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  googleProvider,
  signInWithPopup,
  doc,
  setDoc,
  serverTimestamp,
  db,
} from '../src/lib/firebase';
import type { FirestoreUser } from '../firebase/types';
import {
  getUserProfile,
  createOrUpdateUserProfile,
  listUserReservations,
  createReservation,
  cancelReservation,
  listReservationsForUser,
} from '../firebase/db';

// Simplified User interface matching Firebase Auth user
export interface User {
  uid: string;
  email: string;
  photoURL?: string;
  displayName?: string;
  // Extended fields for backward compatibility
  id?: string; // Alias for uid
  name?: string; // Alias for displayName
  createdAt?: string;
  preferences?: 'attend' | 'host' | 'both';
  favorites: string[]; // Event IDs - always an array, never undefined
  rsvps: string[]; // Event IDs user has RSVP'd to - always an array, never undefined
  hostedEvents: string[]; // Event IDs user has created - always an array, never undefined
  attendingEvents?: string[]; // Event IDs user is attending
  profileImageUrl?: string; // Alias for photoURL
}

interface UserStore {
  user: User | null;
  loading: boolean;
  ready: boolean; // True when auth state has been determined
  // Core auth functions
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUserProfile: (uid: string) => Promise<void>;
  // Backward compatibility aliases
  currentUser: User | null;
  signUp: (email: string, password: string, name: string, preferences: 'attend' | 'host' | 'both') => Promise<User>;
  signInWithGoogle: () => Promise<User | null>;
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

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      ready: false, // Auth state not yet determined
      currentUser: null, // Alias for backward compatibility

      // Core auth functions
      signup: async (email: string, password: string) => {
        try {
          set({ loading: true });
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;
          
          // Create Firestore user document
          const userDoc: FirestoreUser = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            name: '',
            email: firebaseUser.email || '',
            displayName: '',
            photoURL: '',
            createdAt: Date.now(),
          };
          
          // Create user document in Firestore
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            ...userDoc,
            createdAt: serverTimestamp(),
          });
          
          // Update local state with safe defaults
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            displayName: firebaseUser.displayName || '',
            // Backward compatibility aliases
            id: firebaseUser.uid,
            name: firebaseUser.displayName || '',
            profileImageUrl: firebaseUser.photoURL || '',
            favorites: [],
            rsvps: [],
            hostedEvents: [],
            attendingEvents: [],
          };
          
          set({ user, currentUser: user, loading: false, ready: true });
        } catch (error) {
          console.error("Signup error:", error);
          set({ loading: false });
          throw error;
        }
      },

      login: async (email: string, password: string) => {
        try {
          set({ loading: true });
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;
          
          // Fetch user profile from Firestore
          await get().fetchUserProfile(firebaseUser.uid);
        } catch (error) {
          console.error("Login error:", error);
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ loading: true });
          await signOut(auth);
          set({ user: null, currentUser: null, loading: false });
        } catch (error) {
          console.error("Logout error:", error);
          set({ loading: false });
          throw error;
        }
      },

      fetchUserProfile: async (uid: string) => {
        try {
          const firestoreUser = await getUserProfile(uid);
          const firebaseUser = auth.currentUser;
          
          if (!firebaseUser) {
            set({ user: null, currentUser: null, loading: false, ready: true });
            return;
          }
          
          // Load favorites and RSVPs from Firestore with safe defaults
          const favorites = Array.isArray(firestoreUser?.favorites) ? firestoreUser.favorites : [];
          const reservationEvents = await listUserReservations(uid);
          const rsvps = Array.isArray(reservationEvents) ? reservationEvents.map(e => e?.id).filter(Boolean) : [];
          
          // Ensure hostedEvents is always an array
          const hostedEvents = Array.isArray(firestoreUser?.hostedEvents) ? firestoreUser.hostedEvents : [];
          
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || firestoreUser?.photoURL || '',
            displayName: firebaseUser.displayName || firestoreUser?.displayName || '',
            // Backward compatibility aliases
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firestoreUser?.displayName || '',
            profileImageUrl: firebaseUser.photoURL || firestoreUser?.photoURL || '',
            createdAt: firestoreUser?.createdAt ? new Date(firestoreUser.createdAt).toISOString() : new Date().toISOString(),
            preferences: firestoreUser?.preferences || 'both',
            favorites,
            rsvps,
            hostedEvents,
            attendingEvents: [],
          };
          
          console.log('[Popera] userStore initialized', { userId: user.uid });
          set({ user, currentUser: user, loading: false, ready: true });
        } catch (error) {
          console.error("Error fetching user profile:", error);
          set({ user: null, currentUser: null, loading: false, ready: true });
        }
      },

      signUp: async (email: string, password: string, name: string, preferences: 'attend' | 'host' | 'both') => {
        try {
          // Use core signup function
          await get().signup(email, password);
          
          // Update displayName and preferences
          const currentUser = get().user;
          if (currentUser) {
            await createOrUpdateUserProfile(currentUser.uid, {
              displayName: name,
              name: name,
              preferences,
            });
            
            // Reload profile
            await get().fetchUserProfile(currentUser.uid);
          }
          
          return get().user || null;
        } catch (error) {
          console.error("Sign up error:", error);
          throw error;
        }
      },

      signInWithGoogle: async () => {
        try {
          set({ loading: true });
          const userCredential = await signInWithPopup(auth, googleProvider);
          const firebaseUser = userCredential.user;
          
          // Upsert user profile in Firestore
          const firestoreUser = await getUserProfile(firebaseUser.uid);
          if (!firestoreUser) {
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              photoURL: firebaseUser.photoURL || '',
              createdAt: serverTimestamp(),
            });
          } else {
            // Update photo if changed
            if (firebaseUser.photoURL && firestoreUser.photoURL !== firebaseUser.photoURL) {
              await createOrUpdateUserProfile(firebaseUser.uid, {
                photoURL: firebaseUser.photoURL,
              });
            }
          }
          
          // Fetch updated profile (this will set ready: true)
          await get().fetchUserProfile(firebaseUser.uid);
          return get().user || null;
        } catch (error) {
          console.error("Google sign in error:", error);
          set({ loading: false, ready: true });
          throw error;
        }
      },

      getCurrentUser: () => {
        return get().user || get().currentUser;
      },

      updateUser: async (userId: string, updates: Partial<User>) => {
        try {
          // Update Firestore
          const firestoreUpdates: Partial<FirestoreUser> = {};
          if (updates.name || updates.displayName) {
            firestoreUpdates.name = updates.name || updates.displayName || '';
            firestoreUpdates.displayName = updates.name || updates.displayName || '';
          }
          if (updates.preferences) firestoreUpdates.preferences = updates.preferences;
          if (updates.profileImageUrl || updates.photoURL) {
            firestoreUpdates.photoURL = updates.profileImageUrl || updates.photoURL || '';
          }
          
          await createOrUpdateUserProfile(userId, firestoreUpdates);
          
          // Update local state
          const currentUser = get().user;
          if (currentUser && currentUser.uid === userId) {
            const updatedUser = { ...currentUser, ...updates };
            set({ user: updatedUser, currentUser: updatedUser });
          }
        } catch (error) {
          console.error("Update user error:", error);
          throw error;
        }
      },

      addFavorite: async (userId: string, eventId: string) => {
        try {
          const currentUser = get().user;
          const currentFavorites = Array.isArray(currentUser?.favorites) ? currentUser.favorites : [];
          if (currentFavorites.includes(eventId)) {
            return; // Already favorited
          }
          
          const updatedFavorites = [...currentFavorites, eventId];
          
          // Update Firestore
          await createOrUpdateUserProfile(userId, {
            favorites: updatedFavorites,
          });
          
          // Update local state
          if (currentUser && currentUser.uid === userId) {
            const updatedUser = { ...currentUser, favorites: updatedFavorites };
            set({ user: updatedUser, currentUser: updatedUser });
          }
        } catch (error) {
          console.error("Add favorite error:", error);
          throw error;
        }
      },

      removeFavorite: async (userId: string, eventId: string) => {
        try {
          const currentUser = get().user;
          const currentFavorites = Array.isArray(currentUser?.favorites) ? currentUser.favorites : [];
          const updatedFavorites = currentFavorites.filter(id => id !== eventId);
          
          // Update Firestore
          await createOrUpdateUserProfile(userId, {
            favorites: updatedFavorites,
          });
          
          // Update local state
          if (currentUser && currentUser.uid === userId) {
            const updatedUser = { ...currentUser, favorites: updatedFavorites };
            set({ user: updatedUser, currentUser: updatedUser });
          }
        } catch (error) {
          console.error("Remove favorite error:", error);
          throw error;
        }
      },

      addRSVP: async (userId: string, eventId: string) => {
        try {
          const currentUser = get().user;
          const currentRSVPs = Array.isArray(currentUser?.rsvps) ? currentUser.rsvps : [];
          if (currentRSVPs.includes(eventId)) {
            return; // Already RSVP'd
          }
          
          // Create reservation in Firestore
          await createReservation(eventId, userId);
          
          // Reload RSVPs from Firestore to get updated list
          const reservationEvents = await listUserReservations(userId);
          const updatedRSVPs = Array.isArray(reservationEvents) ? reservationEvents.map(e => e?.id).filter(Boolean) : [];
          
          // Update local state
          if (currentUser && currentUser.uid === userId) {
            const updatedUser = { ...currentUser, rsvps: updatedRSVPs };
            set({ user: updatedUser, currentUser: updatedUser });
          }
        } catch (error) {
          console.error("Add RSVP error:", error);
          throw error;
        }
      },

      removeRSVP: async (userId: string, eventId: string) => {
        try {
          // Find and cancel reservation in Firestore
          const reservations = await listReservationsForUser(userId);
          const reservation = reservations.find(r => r.eventId === eventId && r.status === "reserved");
          
          if (reservation) {
            await cancelReservation(reservation.id);
          }
          
          // Reload RSVPs from Firestore
          const reservationEvents = await listUserReservations(userId);
          const updatedRSVPs = Array.isArray(reservationEvents)
            ? reservationEvents.map(e => e?.id).filter(Boolean) 
            : [];
          
          // Update local state
          const currentUser = get().user;
          if (currentUser && currentUser.uid === userId) {
            const updatedUser = { ...currentUser, rsvps: updatedRSVPs };
            set({ user: updatedUser, currentUser: updatedUser });
          }
        } catch (error) {
          console.error("Remove RSVP error:", error);
          throw error;
        }
      },

      getUserFavorites: (userId: string) => {
        const user = get().user || get().currentUser;
        if (user && (user.uid === userId || user.id === userId)) {
          return Array.isArray(user.favorites) ? user.favorites : [];
        }
        return [];
      },

      getUserRSVPs: (userId: string) => {
        const user = get().user || get().currentUser;
        if (user && (user.uid === userId || user.id === userId)) {
          return Array.isArray(user.rsvps) ? user.rsvps : [];
        }
        return [];
      },

      getUserHostedEvents: (userId: string) => {
        const user = get().user || get().currentUser;
        if (user && (user.uid === userId || user.id === userId)) {
          return Array.isArray(user.hostedEvents) ? user.hostedEvents : [];
        }
        return [];
      },

      initAuthListener: () => {
        set({ loading: true, ready: false });
        // Use initAuthListener from firebase.ts - it doesn't import any stores
        firebaseInitAuthListener(async (firebaseUser) => {
          if (firebaseUser) {
            try {
              await get().fetchUserProfile(firebaseUser.uid);
            } catch (error) {
              console.error("Error restoring user session:", error);
              set({ user: null, currentUser: null, loading: false, ready: true });
            }
          } else {
            set({ user: null, currentUser: null, loading: false, ready: true });
          }
        });
      },
    }),
    {
      name: 'popera-user-storage',
      partialize: (state) => ({ user: state.user, currentUser: state.user }),
    }
  )
);
