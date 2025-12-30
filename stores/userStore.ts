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
import { getUserProfile, createOrUpdateUserProfile, listUserReservations, createReservation, cancelReservation, listReservationsForUser, getEventById } from '../firebase/db';
import { getDbSafe, firebaseEnabled } from '../src/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import type { FirestoreUser } from '../firebase/types';
import type { Unsubscribe } from 'firebase/auth';
import type { ViewState } from '../types';
import { completeGoogleRedirect, loginWithEmail, loginWithGoogle, signupWithEmail } from '../src/lib/authHelpers';
import { ensurePoperaProfileAndSeed } from '../firebase/poperaProfile';
import { redditTrackCompleteRegistration } from '../src/lib/redditPixel';
import { isEventEnded } from '../utils/eventDateHelpers';

// Simplified User interface matching Firebase Auth user
export interface User {
  uid: string;
  email: string;
  photoURL?: string;
  displayName?: string;
  coverPhotoURL?: string; // Profile background/cover image
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
  notification_settings?: {
    email_opt_in?: boolean;
    sms_opt_in?: boolean;
    notification_opt_in?: boolean;
  };
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
  cleanupEndedFavorites: (userId: string, allEvents: any[]) => Promise<string[]>; // Remove ended events from favorites
  addRSVP: (userId: string, eventId: string, options?: { attendeeCount?: number; supportContribution?: number; paymentMethod?: string; totalAmount?: number; paymentIntentId?: string; subscriptionId?: string }) => Promise<string>; // Returns reservation ID
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

// Official Popera account constants - moved to src/constants/popera.ts to break circular dependency
// Re-exported for backward compatibility
export { POPERA_HOST_ID, POPERA_HOST_NAME, POPERA_EMAIL } from '../src/constants/popera';

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

        // Reddit Pixel: Track CompleteRegistration (deduplicated per session)
        // Fires once per browser session - safe to call on both login and signup
        const authMethod = firebaseUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email';
        redditTrackCompleteRegistration(authMethod);

        const baseProfile = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL || '',
          createdAt: Date.now(), // Set signup timestamp for new users (merge: true won't overwrite existing)
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
            
            // NOW check redirect result (but don't rely on it - onAuthStateChanged is primary)
            if (!get()._redirectHandled) {
              try {
                const redirectResult = await completeGoogleRedirect();
                if (redirectResult?.user) {
                  console.log('[AUTH] ✅ Redirect result found (bonus - onAuthStateChanged is primary):', redirectResult.user.email);
                  // onAuthStateChanged will also fire, but we can process this too
                  if (!get().user || get().user.uid !== redirectResult.user.uid) {
                    await get().handleAuthSuccess(redirectResult.user);
                    await ensurePoperaProfileAndSeed(redirectResult.user);
                  }
                  const isOnLanding = typeof window !== 'undefined' && window.location.pathname === '/';
                  set({ _redirectHandled: true, _justLoggedInFromRedirect: isOnLanding, authInitialized: true, isAuthReady: true });
                } else {
                  console.log('[AUTH] ⚠️ getRedirectResult() returned null (normal on mobile) - onAuthStateChanged will handle it');
                }
              } catch (error) {
                console.error('[AUTH] Error in getRedirectResult() (expected on mobile):', error);
              }
            }

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
          // Check if account is blocked
          const authRateLimit = await import('../utils/authRateLimit');
          const blockStatus = authRateLimit.isAccountBlocked(email);
          
          if (blockStatus.blocked) {
            const error = new Error(`Account temporarily blocked. Please try again in ${blockStatus.remainingTime} minute(s).`);
            (error as any).code = 'auth/too-many-requests';
            throw error;
          }
          
          set({ loading: true });
          const userCredential = await loginWithEmail(email, password);
          
          // Clear failed attempts on successful login
          authRateLimit.clearFailedAttempts(email);
          
          await get().handleAuthSuccess(userCredential.user);
          await ensurePoperaProfileAndSeed(userCredential.user);
        } catch (error: any) {
          console.error("Login error:", error);
          set({ loading: false });
          
          // Record failed attempt if it's a wrong password error
          if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential' || error?.code === 'auth/user-not-found') {
            const authRateLimit = await import('../utils/authRateLimit');
            const attempts = authRateLimit.recordFailedAttempt(email);
            const remaining = authRateLimit.getRemainingAttempts(email);
            
            // Update error message with remaining attempts
            if (attempts.count >= 5) {
              error.message = `Account temporarily blocked after 5 failed attempts. Please try again in 10 minutes.`;
              error.code = 'auth/too-many-requests';
            } else {
              error.message = `Incorrect password. ${remaining} attempt(s) remaining before account is blocked.`;
            }
          }
          
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ loading: true });
          console.log('[USER_STORE] Logging out');
          
          // Flush any pending favorite writes before logout
          const currentUser = get().user;
          if (currentUser?.uid) {
            try {
              // Ensure favorites are synced to Firestore before logout
              const firestoreUser = await getUserProfile(currentUser.uid);
              const firestoreFavorites = Array.isArray(firestoreUser?.favorites) ? firestoreUser.favorites : [];
              const localFavorites = Array.isArray(currentUser.favorites) ? currentUser.favorites : [];
              
              // If local and Firestore are out of sync, sync local to Firestore
              if (JSON.stringify(firestoreFavorites.sort()) !== JSON.stringify(localFavorites.sort())) {
                console.log('[USER_STORE] Syncing favorites before logout');
                await createOrUpdateUserProfile(currentUser.uid, { favorites: localFavorites });
              }
            } catch (error) {
              console.warn('[USER_STORE] Error syncing favorites before logout:', error);
              // Don't block logout on sync error
            }
          }
          
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
          const [firestoreUser, reservationResult] = await Promise.all([
            getUserProfile(uid),
            listReservationsForUser(uid) // Lightweight - only gets reservation IDs, not full events
          ]);
          
          // Store full Firestore user profile (includes phoneVerifiedForHosting, hostPhoneNumber, etc.)
          set({ userProfile: firestoreUser });
          
          // Build user object immediately with available data
          let favorites = Array.isArray(firestoreUser?.favorites) ? firestoreUser.favorites : [];
          
          // IMPORTANT: Clean up favorites - remove events that have ended
          // Favorites should persist until event ends or user unfavorites
          // Note: This cleanup runs on profile fetch, but we also have periodic cleanup in App.tsx
          // We do a lightweight check here - full cleanup happens in App.tsx with all events loaded
          if (favorites.length > 0) {
            // For now, just use the favorites as-is
            // Full cleanup with event data happens in App.tsx via cleanupEndedFavorites
            // This ensures we don't block user login/profile fetch
          }
          
          const rsvps = Array.isArray(reservationResult.reservations) ? reservationResult.reservations.map(r => r.eventId).filter(Boolean) : [];
          
          // Log reservation read errors in DEV
          if (import.meta.env.DEV && reservationResult.errorCode) {
            console.warn('[USER_STORE] Reservation read error during profile fetch:', {
              errorCode: reservationResult.errorCode,
              errorMessage: reservationResult.errorMessage,
              userId: uid
            });
          }
          const hostedEvents = Array.isArray(firestoreUser?.hostedEvents) ? firestoreUser.hostedEvents : [];
          
          // FIXED: Prioritize Firestore photoURL over Firebase Auth to ensure consistency
          // Firestore is the single source of truth for profile data
          const photoURL = firestoreUser?.photoURL || firestoreUser?.imageUrl || firebaseUser.photoURL || '';
          const displayName = firestoreUser?.displayName || firestoreUser?.name || firebaseUser.displayName || '';
          const coverPhotoURL = firestoreUser?.coverPhotoURL || undefined;
          
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            photoURL,
            displayName,
            coverPhotoURL,
            id: firebaseUser.uid,
            name: displayName,
            profileImageUrl: photoURL,
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
          // Fetch and update both user and userProfile (this will also clean up ended favorites)
          await get().fetchUserProfile(currentUser.uid);
        } catch (error) {
          console.error('[USER_STORE] Error refreshing user profile:', error);
        }
      },
      
      /**
       * Clean up favorites by removing events that have ended
       * This ensures favorites persist until event ends or user unfavorites
       */
      cleanupEndedFavorites: async (userId: string, allEvents: any[]): Promise<string[]> => {
        try {
          const firestoreUser = await getUserProfile(userId);
          const currentFavorites = Array.isArray(firestoreUser?.favorites) ? firestoreUser.favorites : [];
          
          if (currentFavorites.length === 0) {
            return currentFavorites;
          }
          
          // Check each favorited event
          const validFavorites: string[] = [];
          const endedEventIds: string[] = [];
          
          for (const eventId of currentFavorites) {
            // Try to find event in provided events list first (faster)
            let event = allEvents.find(e => e.id === eventId);
            
            // If not found, fetch from Firestore
            if (!event) {
              try {
                event = await getEventById(eventId);
              } catch (error) {
                console.warn(`[FAVORITES_CLEANUP] Could not fetch event ${eventId}:`, error);
                // Keep event in favorites if we can't verify it (might be temporary issue)
                validFavorites.push(eventId);
                continue;
              }
            }
            
            if (event && !isEventEnded(event)) {
              // Event exists and hasn't ended - keep in favorites
              validFavorites.push(eventId);
            } else if (event && isEventEnded(event)) {
              // Event has ended - remove from favorites
              endedEventIds.push(eventId);
            } else {
              // Event doesn't exist - keep it (might be deleted, but user should manually remove)
              validFavorites.push(eventId);
            }
          }
          
          // If any events ended, update favorites in Firestore
          if (endedEventIds.length > 0) {
            console.log(`[FAVORITES_CLEANUP] Removing ${endedEventIds.length} ended events from favorites:`, endedEventIds);
            
            // Update Firestore
            await createOrUpdateUserProfile(userId, { favorites: validFavorites });
            
            // Update local state if this is the current user
            const currentUser = get().user;
            if (currentUser && currentUser.uid === userId) {
              set({ 
                user: { ...currentUser, favorites: validFavorites }, 
                currentUser: { ...currentUser, favorites: validFavorites } 
              });
            }
          }
          
          return validFavorites;
        } catch (error) {
          console.error('[FAVORITES_CLEANUP] Error cleaning up favorites:', error);
          // Return original favorites if cleanup fails
          const firestoreUser = await getUserProfile(userId);
          return Array.isArray(firestoreUser?.favorites) ? firestoreUser.favorites : [];
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
              createdAt: Date.now(), // Set signup timestamp for new users
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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userStore.ts:618',message:'signInWithGoogle called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          const cred = await loginWithGoogle();
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userStore.ts:622',message:'loginWithGoogle returned',data:{hasCred:!!cred,hasUser:!!cred?.user,isRedirect:cred===null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          if (cred?.user) {
            await get().handleAuthSuccess(cred.user);
            await ensurePoperaProfileAndSeed(cred.user);
            return get().user;
          }
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userStore.ts:627',message:'Returning null (redirect path)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          return null; // redirect path
        } catch (error: any) {
          console.error("Google sign in error:", error);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userStore.ts:631',message:'ERROR in signInWithGoogle',data:{errorCode:error?.code,errorMessage:error?.message,errorName:error?.name,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
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
          // First, fetch current favorites from Firestore to ensure we have the latest state
          const firestoreUser = await getUserProfile(userId);
          const currentFavorites = Array.isArray(firestoreUser?.favorites) ? firestoreUser.favorites : [];
          
          // If already favorited, no-op
          if (currentFavorites.includes(eventId)) {
            console.log('[FAVORITES] Event already favorited, skipping');
            return;
          }
          
          const updatedFavorites = [...currentFavorites, eventId];
          
          // Persist to Firestore
          await createOrUpdateUserProfile(userId, { favorites: updatedFavorites });
          
          // Update local state
          const currentUser = get().user;
          if (currentUser && currentUser.uid === userId) {
            set({ user: { ...currentUser, favorites: updatedFavorites }, currentUser: { ...currentUser, favorites: updatedFavorites } });
          }
          
          // Notify host of new favorite (non-blocking, fire-and-forget)
          try {
            const { getEventById } = await import('../firebase/db');
            const event = await getEventById(eventId);
            if (event?.hostId && event.hostId !== userId) {
              // Only notify if favoriter is not the host themselves
              const { notifyHostOfNewFavorite } = await import('../utils/notificationHelpers');
              notifyHostOfNewFavorite(event.hostId, userId, eventId, event.title || 'Event').catch((error) => {
                if (import.meta.env.DEV) {
                  console.error('Error notifying host of new favorite:', error);
                }
              });
            }
          } catch (error) {
            // Don't fail favorite if notification fails
            if (import.meta.env.DEV) {
              console.error('Error setting up favorite notification:', error);
            }
          }
        } catch (error) {
          console.error("Add favorite error:", error);
          throw error;
        }
      },

      removeFavorite: async (userId: string, eventId: string) => {
        try {
          // First, fetch current favorites from Firestore to ensure we have the latest state
          const firestoreUser = await getUserProfile(userId);
          const currentFavorites = Array.isArray(firestoreUser?.favorites) ? firestoreUser.favorites : [];
          
          // If not favorited, no-op
          if (!currentFavorites.includes(eventId)) {
            console.log('[FAVORITES] Event not favorited, skipping');
            return;
          }
          
          const updatedFavorites = currentFavorites.filter(id => id !== eventId);
          
          // Persist to Firestore
          await createOrUpdateUserProfile(userId, { favorites: updatedFavorites });
          
          // Update local state
          const currentUser = get().user;
          if (currentUser && currentUser.uid === userId) {
            set({ user: { ...currentUser, favorites: updatedFavorites }, currentUser: { ...currentUser, favorites: updatedFavorites } });
          }
        } catch (error) {
          console.error("Remove favorite error:", error);
          throw error;
        }
      },

      addRSVP: async (userId: string, eventId: string, options?: { attendeeCount?: number; supportContribution?: number; paymentMethod?: string; totalAmount?: number; paymentIntentId?: string; subscriptionId?: string }): Promise<string> => {
        try {
          // TASK A: DEV-only debug logging
          if (import.meta.env.DEV) {
            console.log('[USER_STORE] 🔍 addRSVP called:', { userId, eventId });
          }
          
          const currentUser = get().user;
          const currentRSVPs = Array.isArray(currentUser?.rsvps) ? currentUser.rsvps : [];
          
          // TASK A: Log user.rsvps state
          if (import.meta.env.DEV) {
            console.log('[USER_STORE] 👤 user.rsvps check:', {
              rsvpsArray: currentRSVPs,
              includesEvent: currentRSVPs.includes(eventId)
            });
          }
          
          // Don't trust local state blindly - verify with Firestore if eventId appears in local rsvps
          if (currentRSVPs.includes(eventId)) {
            // Check Firestore for an actual active reservation
            const existingResult = await listReservationsForUser(userId);
            
            // TASK A: Log all reservations for this (userId, eventId)
            const allReservationsForEvent = existingResult.reservations.filter(r => r.eventId === eventId);
            if (import.meta.env.DEV) {
              console.log('[USER_STORE] 📋 All reservations for (userId, eventId):', {
                eventId,
                userId,
                count: allReservationsForEvent.length,
                reservations: allReservationsForEvent.map(r => ({
                  id: r.id,
                  status: r.status,
                  reservedAt: r.reservedAt
                }))
              });
            }
            
            const activeReservation = existingResult.reservations.find(r => r.eventId === eventId && r.status === 'reserved');
            
            if (activeReservation) {
              // Active reservation exists, return its ID (no duplicate needed)
              if (import.meta.env.DEV) {
                console.log('[USER_STORE] ✅ Active reservation already exists, returning existing ID:', activeReservation.id);
              }
              return activeReservation.id;
            }
            // No active reservation found - local state was stale (e.g., from cancelled reservation)
            // Proceed to create a new reservation
            console.log('[USER_STORE] Local rsvps stale - no active reservation found, creating new one for event:', eventId);
          }
          
          const reservationId = await createReservation(eventId, userId, options);
          
          // TASK A: Log reservation creation result
          if (import.meta.env.DEV) {
            console.log('[USER_STORE] ✅ Reservation created/updated:', { reservationId, eventId, userId });
          }
          
          const reservationEvents = await listUserReservations(userId);
          const updatedRSVPs = Array.isArray(reservationEvents) ? reservationEvents.map(e => e?.id).filter(Boolean) : [];
          
          if (currentUser && currentUser.uid === userId) {
            set({ user: { ...currentUser, rsvps: updatedRSVPs }, currentUser: { ...currentUser, rsvps: updatedRSVPs } });
          }

          // Get event details for notifications
          let eventData: any = null;
          try {
            const db = getDbSafe();
            if (db) {
              const eventDoc = await getDoc(doc(db, 'events', eventId));
              if (eventDoc.exists()) {
                eventData = eventDoc.data();
              }
            }
          } catch (error) {
            console.error('Error fetching event data:', error);
          }

          // Notify user of reservation confirmation (non-blocking)
          if (eventData) {
            try {
              const { notifyUserOfReservationConfirmation } = await import('../utils/notificationHelpers');
              const { formatDate } = await import('../utils/dateFormatter');
              
              await notifyUserOfReservationConfirmation(
                userId,
                eventId,
                reservationId,
                eventData.title || 'Event',
                formatDate(eventData.date || ''),
                eventData.time || '',
                eventData.location || `${eventData.address || ''}, ${eventData.city || ''}`.trim(),
                options?.attendeeCount || 1,
                options?.totalAmount
              );
            } catch (error) {
              console.error('Error notifying user of reservation confirmation:', error);
              // Don't fail RSVP if notification fails
            }
          }

          // Notify host of new RSVP (non-blocking)
          if (eventData?.hostId) {
            try {
              const { notifyHostOfRSVP } = await import('../utils/notificationHelpers');
              await notifyHostOfRSVP(eventData.hostId, userId, eventId, eventData.title || 'Event');
            } catch (error) {
              console.error('Error notifying host of RSVP:', error);
              // Don't fail RSVP if notification fails
            }
          }

          // Check for event getting full and trending (non-blocking)
          if (eventData) {
            // Fire-and-forget - don't block RSVP
            import('../utils/notificationHelpers').then(async ({ notifyUsersEventGettingFull, notifyHostEventTrending }) => {
              try {
                const db = getDbSafe();
                if (!db) return;

                // Get updated event data to check capacity
                const { getEventById } = await import('../firebase/db');
                const updatedEvent = await getEventById(eventId);
                if (!updatedEvent) return;

                // Check if event is getting full
                if (updatedEvent.capacity && updatedEvent.attendeesCount > 0) {
                  const capacityPercentage = Math.round((updatedEvent.attendeesCount / updatedEvent.capacity) * 100);
                  const thresholds = [80, 90, 95];
                  
                  // Check if we should notify (only at threshold points)
                  const shouldNotify = thresholds.some(threshold => 
                    capacityPercentage >= threshold && 
                    capacityPercentage < threshold + 5 // Small buffer to avoid duplicate notifications
                  );

                  if (shouldNotify) {
                    // Get users who favorited but haven't RSVP'd
                    // Note: This is a simplified implementation
                    // For production, consider using a Cloud Function with better querying
                    // For now, we'll check a limited set of users who might have favorited
                    const { collection, getDocs } = await import('firebase/firestore');
                    const usersRef = collection(db, 'users');
                    
                    // Get reservations to find users who RSVP'd
                    const reservationsRef = collection(db, 'reservations');
                    const { query, where } = await import('firebase/firestore');
                    const reservationsQuery = query(
                      reservationsRef,
                      where('eventId', '==', eventId),
                      where('status', '==', 'reserved')
                    );
                    const reservationsSnapshot = await getDocs(reservationsQuery);
                    const rsvpUserIds = new Set(reservationsSnapshot.docs.map(doc => doc.data().userId).filter(Boolean));
                    
                    // Get a sample of users (limited to avoid performance issues)
                    // In production, this should be done with a Cloud Function
                    const usersSnapshot = await getDocs(usersRef);
                    const favoriteUserIds: string[] = [];
                    
                    // Limit to first 100 users to avoid performance issues
                    let checked = 0;
                    const maxCheck = 100;
                    
                    for (const userDoc of usersSnapshot.docs) {
                      if (checked >= maxCheck) break;
                      checked++;
                      
                      const userData = userDoc.data();
                      const favorites = userData?.favorites || [];
                      
                      if (Array.isArray(favorites) && favorites.includes(eventId)) {
                        // Check if user has RSVP'd
                        if (!rsvpUserIds.has(userDoc.id)) {
                          favoriteUserIds.push(userDoc.id);
                        }
                      }
                    }
                    
                    if (favoriteUserIds.length > 0) {
                      await notifyUsersEventGettingFull(
                        eventId,
                        updatedEvent.title,
                        capacityPercentage,
                        favoriteUserIds
                      );
                    }
                  }
                }

                // Check for trending (RSVP rate in last hour)
                if (eventData.hostId) {
                  const { collection, query, where, getDocs } = await import('firebase/firestore');
                  const reservationsRef = collection(db, 'reservations');
                  const oneHourAgo = Date.now() - (60 * 60 * 1000);
                  
                  const recentReservationsQuery = query(
                    reservationsRef,
                    where('eventId', '==', eventId),
                    where('status', '==', 'reserved')
                  );
                  
                  const recentSnapshot = await getDocs(recentReservationsQuery);
                  const recentReservations = recentSnapshot.docs.filter(doc => {
                    const reservedAt = doc.data().reservedAt;
                    return reservedAt && reservedAt > oneHourAgo;
                  });

                  // If 10+ RSVPs in last hour, it's trending
                  if (recentReservations.length >= 10) {
                    const trendingReason = `${recentReservations.length} people reserved in the last hour!`;
                    await notifyHostEventTrending(
                      eventData.hostId,
                      eventId,
                      updatedEvent.title,
                      trendingReason
                    );
                  }
                }
              } catch (error) {
                if (import.meta.env.DEV) {
                  console.error('Error checking event capacity/trending:', error);
                }
              }
            }).catch((error) => {
              if (import.meta.env.DEV) {
                console.error('Error loading notification helpers for capacity/trending:', error);
              }
            });
          }
          
          // DEV-ONLY: Debug log for RSVP consistency tracking
          if (import.meta.env.DEV) {
            console.log('[RSVP_DEBUG] ✅ Reservation created successfully:', {
              userId,
              eventId,
              reservationId,
              updatedRsvpsCount: updatedRSVPs.length,
              updatedRsvps: updatedRSVPs,
              eventTitle: eventData?.title || 'Unknown',
              attendeeCount: eventData?.attendeeCount,
              timestamp: new Date().toISOString(),
            });
          }
          
          // Return reservation ID for confirmation page
          return reservationId;
        } catch (error) {
          console.error("Add RSVP error:", error);
          // DEV-ONLY: Log detailed error for debugging
          if (import.meta.env.DEV) {
            console.error('[RSVP_DEBUG] ❌ Reservation failed:', {
              userId,
              eventId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          throw error;
        }
      },

      removeRSVP: async (userId: string, eventId: string) => {
        try {
          const result = await listReservationsForUser(userId);
          const reservation = result.reservations.find(r => r.eventId === eventId && r.status === "reserved");
          
          if (!reservation) {
            // TASK C: If no reservation found, log warning but don't throw (idempotent)
            if (import.meta.env.DEV) {
              console.warn('[REMOVE_RSVP] No active reservation found for (userId, eventId):', { userId, eventId });
            }
            // Still update rsvps to remove eventId from local state
            const currentUser = get().user;
            if (currentUser && currentUser.uid === userId) {
              const updatedRSVPs = Array.isArray(currentUser.rsvps) ? currentUser.rsvps.filter(id => id !== eventId) : [];
              set({ user: { ...currentUser, rsvps: updatedRSVPs }, currentUser: { ...currentUser, rsvps: updatedRSVPs } });
            }
            return; // Idempotent - no error if already cancelled
          }
          
          await cancelReservation(reservation.id);
          
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
