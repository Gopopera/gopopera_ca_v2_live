/**
 * Real-time user profile subscriptions
 * Single source of truth for user data - all components should use these
 */

import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { getDbSafe } from '../src/lib/firebase';
import type { FirestoreUser } from './types';

/**
 * Subscribe to a user's profile in real-time
 * Returns displayName and photoURL - the only fields needed for UI
 */
export function subscribeToUserProfile(
  userId: string,
  callback: (user: { displayName: string; photoURL?: string } | null) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    callback(null);
    return () => {};
  }

  try {
    const userRef = doc(db, 'users', userId);
    
    return onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          callback(null);
          return;
        }
        
        const data = snap.data() as FirestoreUser;
        
        // REFACTORED: Use standardized fields only
        // Handle empty strings as null/undefined for photoURL
        const photoURL = data.photoURL || data.imageUrl || undefined;
        const userData = {
          displayName: data.displayName || data.name || 'Unknown User',
          photoURL: (photoURL && photoURL.trim() !== '') ? photoURL : undefined,
        };
        
        if (import.meta.env.DEV) {
          console.log('[USER_SUBSCRIPTION] ✅ User profile updated:', {
            userId,
            displayName: userData.displayName,
            hasPhoto: !!userData.photoURL,
          });
        }
        
        callback(userData);
      },
      (error) => {
        console.error('[USER_SUBSCRIPTION] ❌ Error subscribing to user profile:', {
          userId,
          error: error.message,
          code: error.code,
        });
        callback(null);
      }
    );
  } catch (error: any) {
    console.error('[USER_SUBSCRIPTION] ❌ Error setting up user subscription:', {
      userId,
      error: error.message,
    });
    callback(null);
    return () => {};
  }
}

/**
 * Subscribe to multiple user profiles in real-time
 * Useful for chat messages, attendee lists, etc.
 */
export function subscribeToMultipleUserProfiles(
  userIds: string[],
  callback: (profiles: Record<string, { displayName: string; photoURL?: string }>) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    callback({});
    return () => {};
  }

  const unsubscribes: Unsubscribe[] = [];
  const profiles: Record<string, { displayName: string; photoURL?: string }> = {};
  
  // Subscribe to each user
  userIds.forEach((userId) => {
    const unsubscribe = subscribeToUserProfile(userId, (userData) => {
      if (userData) {
        profiles[userId] = userData;
      } else {
        delete profiles[userId];
      }
      callback({ ...profiles });
    });
    unsubscribes.push(unsubscribe);
  });
  
  // Return cleanup function
  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}

