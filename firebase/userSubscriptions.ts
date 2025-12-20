/**
 * Real-time user profile subscriptions
 * Single source of truth for user data - all components should use these
 */

import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { getDbSafe } from '../src/lib/firebase';
import type { FirestoreUser } from './types';

/**
 * User profile data returned from subscription
 */
export interface UserProfileData {
  displayName: string;
  photoURL?: string;
  coverPhotoURL?: string;
  bio?: string;
  followers?: string[];
  following?: string[];
  createdAt?: number; // Timestamp when user signed up
}

/**
 * Subscribe to a user's profile in real-time
 * Returns displayName, photoURL, coverPhotoURL, bio, followers, and following
 */
export function subscribeToUserProfile(
  userId: string,
  callback: (user: UserProfileData | null) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    // CRITICAL: Defer callback to prevent React Error #310
    // (Cannot update a component while rendering a different component)
    queueMicrotask(() => callback(null));
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
        const coverPhotoURL = data.coverPhotoURL || undefined;
        const userData: UserProfileData = {
          displayName: data.displayName || data.name || 'Unknown User',
          photoURL: (photoURL && photoURL.trim() !== '') ? photoURL : undefined,
          coverPhotoURL: (coverPhotoURL && coverPhotoURL.trim() !== '') ? coverPhotoURL : undefined,
          bio: data.bio || undefined,
          followers: Array.isArray(data.followers) ? data.followers : [],
          following: Array.isArray(data.following) ? data.following : [],
          createdAt: data.createdAt || undefined,
        };
        
        if (import.meta.env.DEV) {
          console.log('[USER_SUBSCRIPTION] ✅ User profile updated:', {
            userId,
            displayName: userData.displayName,
            hasPhoto: !!userData.photoURL,
            hasCoverPhoto: !!userData.coverPhotoURL,
            followersCount: userData.followers?.length || 0,
            followingCount: userData.following?.length || 0,
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
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(null));
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
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback({}));
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

