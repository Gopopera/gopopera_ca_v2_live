/**
 * CYCLES DETECTED BY MADGE: None
 * 
 * Static imports from src/lib/firebase.ts and firebase/db.ts
 * No dynamic imports of Firebase modules
 * init() method must be called explicitly from App.tsx
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth } from '../src/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { shouldUseRedirect } from '../src/lib/authHelpers';
import { doc, getDoc } from 'firebase/firestore';
import { attachAuthListener } from '../firebase/listeners';
import { getUserProfile, createOrUpdateUserProfile, listUserReservations, createReservation, cancelReservation, listReservationsForUser } from '../firebase/db';
import { getDbSafe } from '../src/lib/firebase';
import type { FirestoreUser } from '../firebase/types';
import type { Unsubscribe } from '../src/lib/firebase';
import type { ViewState } from '../types';

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
  _authUnsub: Unsubscribe | null; // Internal unsubscribe function
  _initialized: boolean; // Track if init() has been called
  redirectAfterLogin: ViewState | null; // Redirect destination after login
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
  init: () => void; // Explicit initialization method
  setRedirectAfterLogin: (view: ViewState | null) => void;
  getRedirectAfterLogin: () => ViewState | null;
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
      ready: false,
      currentUser: null,
      _authUnsub: null,
      _initialized: false,
      redirectAfterLogin: null,

      init: () => {
        if (get()._initialized) return; // Already initialized
        set({ _initialized: true, loading: true, ready: false });
        
        // OPTIMIZATION: Check redirect result quickly without blocking
        // Use Promise.resolve to make it non-blocking
        Promise.resolve().then(async () => {
          try {
            const redirectResult = await getRedirectResult(auth);
            if (redirectResult?.user) {
              // User just returned from redirect, handle profile creation/sync in background
              const firebaseUser = redirectResult.user;
              getUserProfile(firebaseUser.uid).then(async (firestoreUser) => {
                if (!firestoreUser) {
                  // Create user profile in background (non-blocking)
                  // Use createOrUpdateUserProfile which has proper Firestore guards and retry logic
                  createOrUpdateUserProfile(firebaseUser.uid, {
                    id: firebaseUser.uid,
                    uid: firebaseUser.uid,
                    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                    email: firebaseUser.email || '',
                    displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                    photoURL: firebaseUser.photoURL || '',
                  }).catch(err => console.error('Background profile creation error:', err));
                } else {
                  // Update photo if changed (non-blocking)
                  if (firebaseUser.photoURL && firestoreUser.photoURL !== firebaseUser.photoURL) {
                    createOrUpdateUserProfile(firebaseUser.uid, {
                      photoURL: firebaseUser.photoURL,
                    }).catch(err => console.error('Background profile update error:', err));
                  }
                }
              }).catch(err => {
                if (import.meta.env.DEV) {
                  console.warn('[AUTH] Error checking redirect result profile:', err);
                }
              });
            }
          } catch (error) {
            // Ignore redirect result errors - auth listener will handle state
            if (import.meta.env.DEV) {
              console.warn('[AUTH] Error checking redirect result:', error);
            }
          }
        });
        
        const unsub = attachAuthListener(async (firebaseUser) => {
          if (firebaseUser) {
            try {
              // OPTIMIZATION: Set user immediately with Firebase Auth data for fast UI
              const immediateUser: User = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                photoURL: firebaseUser.photoURL || '',
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                id: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                profileImageUrl: firebaseUser.photoURL || '',
                favorites: [],
                rsvps: [],
                hostedEvents: [],
                attendingEvents: [],
              };
              
              // Set user immediately for fast response
              set({ user: immediateUser, currentUser: immediateUser, loading: false, ready: true });
              
              // Fetch full profile in background (non-blocking)
              get().fetchUserProfile(firebaseUser.uid).catch(err => {
                console.error("Error fetching user profile in background:", err);
              });
              
              // Ensure Popera profile is updated and seed launch events (non-blocking)
              if (firebaseUser.email === POPERA_EMAIL) {
                import('../firebase/poperaProfile').then(({ ensurePoperaProfileAndSeed }) => {
                  ensurePoperaProfileAndSeed(firebaseUser).catch(err => {
                    console.error('[AUTH] Error ensuring Popera profile or seeding:', err);
                  });
                }).catch(err => {
                  console.error('[AUTH] Error loading poperaProfile module:', err);
                });
              }
            } catch (error) {
              console.error("Error restoring user session:", error);
              set({ user: null, currentUser: null, loading: false, ready: true });
            }
          } else {
            set({ user: null, currentUser: null, loading: false, ready: true });
          }
        });
        set({ _authUnsub: unsub });
      },

      // Core auth functions
      signup: async (email: string, password: string) => {
        try {
          set({ loading: true });
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;
          
          // OPTIMIZATION: Set user immediately with Firebase Auth data for fast UI
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            displayName: firebaseUser.displayName || '',
            id: firebaseUser.uid,
            name: firebaseUser.displayName || '',
            profileImageUrl: firebaseUser.photoURL || '',
            favorites: [],
            rsvps: [],
            hostedEvents: [],
            attendingEvents: [],
          };
          
          // Set user immediately for fast response
          set({ user, currentUser: user, loading: false, ready: true });
          
          // Create Firestore profile in background (non-blocking)
          // Use createOrUpdateUserProfile which has proper Firestore guards
          createOrUpdateUserProfile(firebaseUser.uid, {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            photoURL: firebaseUser.photoURL || '',
          }).catch(err => {
            console.error('Background profile creation error:', err);
          });
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
          
          // OPTIMIZATION: Set user immediately with Firebase Auth data for fast UI
          const immediateUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            profileImageUrl: firebaseUser.photoURL || '',
            favorites: [],
            rsvps: [],
            hostedEvents: [],
            attendingEvents: [],
          };
          
          // Set user immediately for fast response
          set({ user: immediateUser, currentUser: immediateUser, loading: false, ready: true });
          
          // Fetch full profile in background (non-blocking)
          get().fetchUserProfile(firebaseUser.uid).catch(err => {
            console.error('Background profile fetch error:', err);
          });
          
          // Ensure Popera profile is updated and seed launch events (non-blocking)
          if (firebaseUser.email === POPERA_EMAIL) {
            import('../firebase/poperaProfile').then(({ ensurePoperaProfileAndSeed }) => {
              ensurePoperaProfileAndSeed(firebaseUser).catch(err => {
                console.error('[AUTH] Error ensuring Popera profile or seeding:', err);
              });
            }).catch(err => {
              console.error('[AUTH] Error loading poperaProfile module:', err);
            });
          }
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
          
          // Clean up auth listener
          const unsub = get()._authUnsub;
          if (unsub) {
            unsub();
            set({ _authUnsub: null });
          }
          
          set({ user: null, currentUser: null, loading: false });
        } catch (error) {
          console.error("Logout error:", error);
          set({ loading: false });
          throw error;
        }
      },

      fetchUserProfile: async (uid: string) => {
        try {
          // Avoid redundant fetches if user is already loaded
          const currentUser = get().user;
          if (currentUser && currentUser.uid === uid && get().ready) {
            return;
          }

          const firebaseUser = auth.currentUser;
          if (!firebaseUser) {
            set({ user: null, currentUser: null, loading: false, ready: true });
            return;
          }

          // OPTIMIZATION: Ensure Firestore is ready before queries
          // Wait for Firestore with retry
          let dbReady = false;
          for (let i = 0; i < 5; i++) {
            const db = getDbSafe();
            if (db) {
              dbReady = true;
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          if (!dbReady) {
            console.warn('[fetchUserProfile] Firestore not ready, using minimal user data');
            // Still set user with Firebase Auth data
            const minimalUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              displayName: firebaseUser.displayName || '',
              id: firebaseUser.uid,
              name: firebaseUser.displayName || '',
              profileImageUrl: firebaseUser.photoURL || '',
              favorites: [],
              rsvps: [],
              hostedEvents: [],
              attendingEvents: [],
            };
            set({ user: minimalUser, currentUser: minimalUser, loading: false, ready: true });
            return;
          }

          // OPTIMIZATION: Run Firestore queries in parallel for faster loading
          // Use lightweight reservation IDs instead of full event objects
          const [firestoreUser, reservationDocs] = await Promise.all([
            getUserProfile(uid),
            listReservationsForUser(uid) // Lightweight - only gets reservation IDs, not full events
          ]);
          
          // Build user object immediately with available data
          const favorites = Array.isArray(firestoreUser?.favorites) ? firestoreUser.favorites : [];
          const rsvps = Array.isArray(reservationDocs) ? reservationDocs.map(r => r.eventId).filter(Boolean) : [];
          const hostedEvents = Array.isArray(firestoreUser?.hostedEvents) ? firestoreUser.hostedEvents : [];
          
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || firestoreUser?.photoURL || '',
            displayName: firebaseUser.displayName || firestoreUser?.displayName || '',
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
          
          // Set user state immediately - don't wait for anything else
          set({ user, currentUser: user, loading: false, ready: true });
        } catch (error) {
          console.error("Error fetching user profile:", error);
          set({ user: null, currentUser: null, loading: false, ready: true });
        }
      },

      signUp: async (email: string, password: string, name: string, preferences: 'attend' | 'host' | 'both') => {
        try {
          await get().signup(email, password);
          const currentUser = get().user;
          if (currentUser) {
            await createOrUpdateUserProfile(currentUser.uid, {
              displayName: name,
              name: name,
              preferences,
            });
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
          const authInstance = auth;
          if (authInstance) {
            // Set persistence before sign in
            await setPersistence(authInstance, browserLocalPersistence);
          }
          const provider = new GoogleAuthProvider();
          
          // Check if we should use redirect (mobile/iOS) or popup (desktop)
          if (shouldUseRedirect()) {
            // Mobile/iOS: always use redirect
            await signInWithRedirect(auth, provider);
            // Redirect will happen, return early
            return null;
          }
          
          // Desktop: try popup first, fallback to redirect on error
          let firebaseUser;
          try {
            const userCredential = await signInWithPopup(auth, provider);
            firebaseUser = userCredential.user;
          } catch (popupError: any) {
            // If popup fails (e.g., blocked), use redirect
            if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
              await signInWithRedirect(auth, provider);
              // Redirect will happen, return early
              return null;
            }
            // Check for redirect result (user returning from redirect)
            const redirectResult = await getRedirectResult(auth);
            if (redirectResult) {
              firebaseUser = redirectResult.user;
            } else {
              throw popupError;
            }
          }
          
          // Handle user creation/profile sync (only if we have a user from popup)
          if (firebaseUser) {
            // OPTIMIZATION: Set user state immediately with Firebase Auth data
            // Then update with Firestore data in background
            const immediateUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              profileImageUrl: firebaseUser.photoURL || '',
              favorites: [],
              rsvps: [],
              hostedEvents: [],
              attendingEvents: [],
            };
            
            // Set user immediately for fast UI response
            set({ user: immediateUser, currentUser: immediateUser, loading: false, ready: true });
            
            // OPTIMIZATION: Run profile operations in parallel and non-blocking
            Promise.all([
              getUserProfile(firebaseUser.uid),
              // Firestore operations in background
            ]).then(async ([firestoreUser]) => {
              if (!firestoreUser) {
                // Create user profile in background (non-blocking)
                // Use createOrUpdateUserProfile which has proper Firestore guards
                createOrUpdateUserProfile(firebaseUser.uid, {
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                  email: firebaseUser.email || '',
                  displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                  photoURL: firebaseUser.photoURL || '',
                }).catch(err => console.error('Background profile creation error:', err));
              } else {
                // Update photo if changed (non-blocking)
                if (firebaseUser.photoURL && firestoreUser.photoURL !== firebaseUser.photoURL) {
                  createOrUpdateUserProfile(firebaseUser.uid, {
                    photoURL: firebaseUser.photoURL,
                  }).catch(err => console.error('Background profile update error:', err));
                }
              }
              
              // Fetch full profile in background (non-blocking)
              get().fetchUserProfile(firebaseUser.uid).catch(err => {
                console.error('Background profile fetch error:', err);
              });
              
              // Ensure Popera profile is updated and seed launch events (non-blocking)
              if (firebaseUser.email === POPERA_EMAIL) {
                import('../firebase/poperaProfile').then(({ ensurePoperaProfileAndSeed }) => {
                  ensurePoperaProfileAndSeed(firebaseUser).catch(err => {
                    console.error('[AUTH] Error ensuring Popera profile or seeding:', err);
                  });
                }).catch(err => {
                  console.error('[AUTH] Error loading poperaProfile module:', err);
                });
              }
            }).catch(err => {
              console.error('Background profile operations error:', err);
              // Still fetch profile even if check failed
              get().fetchUserProfile(firebaseUser.uid).catch(() => {});
            });
            
            return immediateUser;
          }
          
          // If we used redirect, return null (auth listener will handle the result)
          return null;
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
          if (currentFavorites.includes(eventId)) return;
          
          const updatedFavorites = [...currentFavorites, eventId];
          await createOrUpdateUserProfile(userId, { favorites: updatedFavorites });
          
          if (currentUser && currentUser.uid === userId) {
            set({ user: { ...currentUser, favorites: updatedFavorites }, currentUser: { ...currentUser, favorites: updatedFavorites } });
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
          
          await createOrUpdateUserProfile(userId, { favorites: updatedFavorites });
          
          if (currentUser && currentUser.uid === userId) {
            set({ user: { ...currentUser, favorites: updatedFavorites }, currentUser: { ...currentUser, favorites: updatedFavorites } });
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
          if (currentRSVPs.includes(eventId)) return;
          
          await createReservation(eventId, userId);
          
          const reservationEvents = await listUserReservations(userId);
          const updatedRSVPs = Array.isArray(reservationEvents) ? reservationEvents.map(e => e?.id).filter(Boolean) : [];
          
          if (currentUser && currentUser.uid === userId) {
            set({ user: { ...currentUser, rsvps: updatedRSVPs }, currentUser: { ...currentUser, rsvps: updatedRSVPs } });
          }

          // Notify host of new RSVP (non-blocking)
          try {
            const db = getDbSafe();
            if (db) {
              const eventDoc = await getDoc(doc(db, 'events', eventId));
              if (eventDoc.exists()) {
                const eventData = eventDoc.data();
                const hostId = eventData.hostId;
                if (hostId) {
                  const { notifyHostOfRSVP } = await import('../utils/notificationHelpers');
                  await notifyHostOfRSVP(hostId, userId, eventId, eventData.title || 'Event');
                }
              }
            }
          } catch (error) {
            console.error('Error notifying host of RSVP:', error);
            // Don't fail RSVP if notification fails
          }
        } catch (error) {
          console.error("Add RSVP error:", error);
          throw error;
        }
      },

      removeRSVP: async (userId: string, eventId: string) => {
        try {
          const reservations = await listReservationsForUser(userId);
          const reservation = reservations.find(r => r.eventId === eventId && r.status === "reserved");
          
          if (reservation) {
            await cancelReservation(reservation.id);
          }
          
          const reservationEvents = await listUserReservations(userId);
          const updatedRSVPs = Array.isArray(reservationEvents) ? reservationEvents.map(e => e?.id).filter(Boolean) : [];
          
          const currentUser = get().user;
          if (currentUser && currentUser.uid === userId) {
            set({ user: { ...currentUser, rsvps: updatedRSVPs }, currentUser: { ...currentUser, rsvps: updatedRSVPs } });
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

      setRedirectAfterLogin: (view: ViewState | null) => {
        set({ redirectAfterLogin: view });
      },

      getRedirectAfterLogin: () => {
        return get().redirectAfterLogin;
      },
    }),
    {
      name: 'popera-user-storage',
      partialize: (state) => ({ user: state.user, currentUser: state.user }),
    }
  )
);
