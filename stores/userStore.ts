/**
 * CYCLES DETECTED BY MADGE: None
 * 
 * Static imports from src/lib/firebase.ts and firebase/db.ts
 * No dynamic imports of Firebase modules
 * init() method must be called explicitly from App.tsx
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAuthInstance, initFirebaseAuth, listenToAuthChanges, signOutUser } from '../src/lib/firebaseAuth';
import { doc, getDoc } from 'firebase/firestore';
import { getUserProfile, createOrUpdateUserProfile, listUserReservations, createReservation, cancelReservation, listReservationsForUser } from '../firebase/db';
import { getDbSafe, firebaseEnabled } from '../src/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import type { FirestoreUser } from '../firebase/types';
import type { Unsubscribe } from 'firebase/auth';
import type { ViewState } from '../types';
import { completeGoogleRedirect, loginWithEmail, loginWithGoogle, signupWithEmail } from '../src/lib/authHelpers';
import { ensurePoperaProfileAndSeed } from '../firebase/poperaProfile';

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
  phone_verified?: boolean;
  phone_number?: string;
}

interface UserStore {
  user: User | null;
  userProfile: FirestoreUser | null; // Full Firestore user profile including phoneVerifiedForHosting
  loading: boolean;
  ready: boolean; // True when auth state has been determined
  isAuthReady: boolean;
  authInitialized: boolean; // True when auth state has been determined (prevents premature redirects)
  _authUnsub: Unsubscribe | null; // Internal unsubscribe function
  _initialized: boolean; // Track if init() has been called
  redirectAfterLogin: ViewState | null; // Redirect destination after login
  // Core auth functions
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUserProfile: (uid: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>; // Refresh current user's profile from Firestore
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
  handleAuthSuccess: (firebaseUser: FirebaseUser) => Promise<void>;
  init: () => void; // Explicit initialization method
  _redirectHandled: boolean;
  _justLoggedInFromRedirect: boolean; // Track if user just logged in from redirect (for navigation)
  setRedirectAfterLogin: (view: ViewState | null) => void;
  getRedirectAfterLogin: () => ViewState | null;
  clearJustLoggedInFlag: () => void; // Clear the redirect login flag after navigation
}

// Official Popera account constants
export const POPERA_HOST_ID = 'popera-official';
export const POPERA_HOST_NAME = 'Popera';
export const POPERA_EMAIL = 'eatezca@gmail.com';

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      userProfile: null,
      loading: true,
      ready: false,
      isAuthReady: false,
      authInitialized: false,
      currentUser: null,
      _authUnsub: null,
      _initialized: false,
      _redirectHandled: false,
      _justLoggedInFromRedirect: false, // Track if user just logged in from redirect (for navigation)
      redirectAfterLogin: null,
      async handleAuthSuccess(firebaseUser: FirebaseUser) {
        console.log('[USER_STORE] handleAuthSuccess called', {
          uid: firebaseUser?.uid,
          email: firebaseUser?.email,
        });
        if (!firebaseUser?.uid) return;

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
          phone_number: (firebaseUser as any)?.phoneNumber,
        };

        set({ user: immediateUser, currentUser: immediateUser, loading: false, ready: true, isAuthReady: true });

        const baseProfile = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL || '',
        };

        createOrUpdateUserProfile(firebaseUser.uid, baseProfile).catch(err => {
          console.error('[AUTH] Background profile creation error:', err);
        });

        get().fetchUserProfile(firebaseUser.uid).catch(err => {
          console.error('Background profile fetch error:', err);
        });

        // Ensure Popera profile and seed events (only runs for Popera account)
        try {
          await ensurePoperaProfileAndSeed(firebaseUser);
        } catch (err) {
          console.error('[AUTH] Popera profile/seeding failed, continuing', err);
        }
      },

      init: () => {
        if (get()._initialized) return; // Already initialized
        // Clear redirect flag on init (don't persist across page refreshes)
        set({ _initialized: true, loading: true, ready: false, isAuthReady: false, _redirectHandled: false, _justLoggedInFromRedirect: false });
        
        if (!firebaseEnabled) {
          console.error('[AUTH] Firebase disabled due to missing env vars; skipping auth init');
          set({
            user: null,
            currentUser: null,
            loading: false,
            ready: true,
            isAuthReady: true,
            authInitialized: true,
          });
          return;
        }
        
        (async () => {
          try {
            await initFirebaseAuth();

            // CRITICAL: Mobile redirects are unreliable - onAuthStateChanged is the ONLY reliable way
            // Don't try to process redirect result - just wait for onAuthStateChanged to fire
            // This prevents timing issues where we check before Firebase is ready
            if (!get()._redirectHandled) {
              // Just try getRedirectResult() for logging, but don't rely on it
              try {
                const redirectResult = await completeGoogleRedirect();
                if (redirectResult?.user) {
                  console.log('[AUTH] ✅ Redirect result found (unusual on mobile):', redirectResult.user.email);
                  await get().handleAuthSuccess(redirectResult.user);
                  await ensurePoperaProfileAndSeed(redirectResult.user);
                  const isOnLanding = typeof window !== 'undefined' && window.location.pathname === '/';
                  set({ _redirectHandled: true, _justLoggedInFromRedirect: isOnLanding, authInitialized: true, isAuthReady: true });
                } else {
                  console.log('[AUTH] ⚠️ getRedirectResult() returned null (normal on mobile) - waiting for onAuthStateChanged');
                  // Don't mark as handled - onAuthStateChanged will handle it
                  // This is the correct flow for mobile
                }
              } catch (error) {
                console.error('[AUTH] Error in getRedirectResult() (expected on mobile):', error);
                // Don't mark as handled - onAuthStateChanged will handle it
              }
            }
            
            // Set up auth state listener - PRIMARY mechanism for mobile redirects
            // onAuthStateChanged is the ONLY reliable way to detect mobile redirects
            // CRITICAL: This MUST fire with the user after redirect completes
            const unsub = listenToAuthChanges(async (firebaseUser) => {
              try {
                console.log('[AUTH] 🔔 onAuthStateChanged fired', {
                  hasUser: !!firebaseUser,
                  uid: firebaseUser?.uid,
                  email: firebaseUser?.email,
                  _redirectHandled: get()._redirectHandled,
                  currentStoreUser: get().user?.email,
                  pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
                });
                
                if (firebaseUser) {
                  // If we already have this user in store, just ensure authInitialized is set
                  const currentUser = get().user;
                  if (currentUser && currentUser.uid === firebaseUser.uid) {
                    console.log('[AUTH] ✅ User already in store');
                    const isOnLanding = typeof window !== 'undefined' && window.location.pathname === '/';
                    set({ 
                      authInitialized: true, 
                      isAuthReady: true,
                      _redirectHandled: true,
                      _justLoggedInFromRedirect: isOnLanding
                    });
                    return;
                  }
                  
                  // User exists in Firebase but not in store - SET IT NOW
                  console.log('[AUTH] ✅✅✅ CRITICAL: Setting user from onAuthStateChanged:', firebaseUser.email);
                  await get().handleAuthSuccess(firebaseUser);
                  await ensurePoperaProfileAndSeed(firebaseUser);
                  
                  // Check if this is a redirect login (user on landing page)
                  const isOnLanding = typeof window !== 'undefined' && window.location.pathname === '/';
                  console.log('[AUTH] User set, redirect flags:', { isOnLanding, pathname: window.location.pathname });
                  set({ 
                    authInitialized: true, 
                    isAuthReady: true, 
                    _redirectHandled: true,
                    _justLoggedInFromRedirect: isOnLanding
                  });
                } else {
                  // No user - ONLY clear if we're NOT on landing page (landing = might be redirect in progress)
                  const isOnLanding = typeof window !== 'undefined' && window.location.pathname === '/';
                  if (!isOnLanding && get()._redirectHandled) {
                    console.log('[AUTH] No user and not on landing - clearing state');
                    set({ user: null, userProfile: null, currentUser: null, loading: false, ready: true, isAuthReady: true, authInitialized: true });
                  } else {
                    console.log('[AUTH] ⚠️ No user but on landing page - redirect might be in progress, NOT clearing');
                    // Don't clear user state if on landing page - wait for redirect to complete
                    set({ authInitialized: true });
                  }
                }
              } catch (error) {
                console.error('[AUTH] onAuthStateChanged error', error);
                set({ authInitialized: true });
              }
            });
            set({ _authUnsub: unsub });

            setTimeout(() => {
              if (!get().authInitialized) {
                console.warn('[AUTH] Fallback: onAuthStateChanged did not fire in time, marking authInitialized');
                set({ authInitialized: true, isAuthReady: true, loading: false, ready: true, user: null, userProfile: null, currentUser: null });
              }
            }, 2000);
          } catch (error) {
            console.error('[AUTH] Initialization failed:', error);
            set({ user: null, userProfile: null, currentUser: null, loading: false, ready: true, isAuthReady: true, authInitialized: true });
          }
        })();
      },

      // Core auth functions
      signup: async (email: string, password: string) => {
        try {
          set({ loading: true });
          const userCredential = await signupWithEmail(email, password);
          await get().handleAuthSuccess(userCredential.user);
        } catch (error) {
          console.error("Signup error:", error);
          set({ loading: false });
          throw error;
        }
      },

      login: async (email: string, password: string) => {
        try {
          set({ loading: true });
          const userCredential = await loginWithEmail(email, password);
          await get().handleAuthSuccess(userCredential.user);
          await ensurePoperaProfileAndSeed(userCredential.user);
        } catch (error: any) {
          console.error("Login error:", error);
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ loading: true });
          console.log('[USER_STORE] Logging out');
          await signOutUser();
          
          // Clean up auth listener
          const unsub = get()._authUnsub;
          if (unsub) {
            unsub();
            set({ _authUnsub: null });
          }
          
          set({ user: null, userProfile: null, currentUser: null, loading: false, ready: true, isAuthReady: true });
          console.log('[USER_STORE] User signed out');
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

          let firebaseUser: FirebaseUser | null = null;
          try {
            firebaseUser = getAuthInstance().currentUser;
          } catch {
            firebaseUser = null;
          }
          if (!firebaseUser) {
            set({ user: null, currentUser: null, loading: false, ready: true, isAuthReady: true });
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
            set({ user: minimalUser, currentUser: minimalUser, loading: false, ready: true, isAuthReady: true });
            return;
          }

          // OPTIMIZATION: Run Firestore queries in parallel for faster loading
          // Use lightweight reservation IDs instead of full event objects
          const [firestoreUser, reservationDocs] = await Promise.all([
            getUserProfile(uid),
            listReservationsForUser(uid) // Lightweight - only gets reservation IDs, not full events
          ]);
          
          // Store full Firestore user profile (includes phoneVerifiedForHosting, hostPhoneNumber, etc.)
          set({ userProfile: firestoreUser });
          
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
          set({ user, currentUser: user, loading: false, ready: true, isAuthReady: true });
        } catch (error) {
          console.error("Error fetching user profile:", error);
          set({ user: null, currentUser: null, loading: false, ready: true, isAuthReady: true });
        }
      },

      refreshUserProfile: async () => {
        const currentUser = get().user;
        if (!currentUser?.uid) {
          console.warn('[USER_STORE] Cannot refresh profile: no user logged in');
          return;
        }
        try {
          const firebaseUser = getAuthInstance().currentUser;
          if (!firebaseUser) {
            console.warn('[USER_STORE] Cannot refresh profile: no Firebase user');
            return;
          }
          // Fetch and update both user and userProfile
          await get().fetchUserProfile(currentUser.uid);
        } catch (error) {
          console.error('[USER_STORE] Error refreshing user profile:', error);
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
          const cred = await loginWithGoogle();
          if (cred?.user) {
            await get().handleAuthSuccess(cred.user);
            await ensurePoperaProfileAndSeed(cred.user);
            return get().user;
          }
          return null; // redirect path
        } catch (error: any) {
          console.error("Google sign in error:", error);
          set({ loading: false, ready: true, isAuthReady: true });
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
          if (updates.phone_number) {
            firestoreUpdates.phone_number = updates.phone_number;
          }
          if (updates.phone_verified !== undefined) {
            firestoreUpdates.phone_verified = updates.phone_verified;
            firestoreUpdates.phoneVerified = updates.phone_verified;
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
      
      clearJustLoggedInFlag: () => {
        set({ _justLoggedInFromRedirect: false });
      },
    }),
    {
      name: 'popera-user-storage',
      partialize: (state) => ({ user: state.user, currentUser: state.user }),
    }
  )
);
