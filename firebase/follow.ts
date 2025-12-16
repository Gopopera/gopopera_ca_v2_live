/**
 * Follow System - Firestore Operations
 * Handles following/followers relationships
 */

import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, getDocs, collection, query, where, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { getDbSafe } from '../src/lib/firebase';

/**
 * Follow a host
 * Uses atomic arrayUnion operations to prevent duplicates
 */
export async function followHost(followerId: string, hostId: string): Promise<void> {
  const db = getDbSafe();
  if (!db) throw new Error('Database not available');

  // Prevent users from following themselves
  if (followerId === hostId) {
    if (import.meta.env.DEV) {
      console.warn('[FOLLOW] User attempted to follow themselves:', followerId);
    }
    return;
  }

  // Check if already following to avoid unnecessary writes
  const followerRef = doc(db, 'users', followerId);
  const followerDoc = await getDoc(followerRef);
  const following = followerDoc.data()?.following || [];
  
  // If already following, return early (arrayUnion is idempotent, but this saves a write)
  if (following.includes(hostId)) {
    return;
  }

  // Add host to follower's following list (atomic - arrayUnion prevents duplicates)
  await updateDoc(followerRef, {
    following: arrayUnion(hostId),
  });

  // Add follower to host's followers list (atomic - arrayUnion prevents duplicates)
  const hostRef = doc(db, 'users', hostId);
  await updateDoc(hostRef, {
    followers: arrayUnion(followerId),
  });

  // Notify host of new follower (non-blocking, fire-and-forget)
  import('../utils/notificationHelpers').then(({ notifyHostOfNewFollower }) => {
    notifyHostOfNewFollower(hostId, followerId).catch((error) => {
      if (import.meta.env.DEV) {
        console.error('Error notifying host of new follower:', error);
      }
    });
  }).catch((error) => {
    if (import.meta.env.DEV) {
      console.error('Error loading notification helpers for new follower:', error);
    }
  });
}

/**
 * Unfollow a host
 * Uses atomic arrayRemove operations
 */
export async function unfollowHost(followerId: string, hostId: string): Promise<void> {
  const db = getDbSafe();
  if (!db) throw new Error('Database not available');

  // Check if not following to avoid unnecessary writes
  const followerRef = doc(db, 'users', followerId);
  const followerDoc = await getDoc(followerRef);
  const following = followerDoc.data()?.following || [];
  
  // If not following, return early (arrayRemove is idempotent, but this saves a write)
  if (!following.includes(hostId)) {
    return;
  }

  // Remove host from follower's following list (atomic - arrayRemove is safe even if not present)
  await updateDoc(followerRef, {
    following: arrayRemove(hostId),
  });

  // Remove follower from host's followers list (atomic - arrayRemove is safe even if not present)
  const hostRef = doc(db, 'users', hostId);
  await updateDoc(hostRef, {
    followers: arrayRemove(followerId),
  });
}

/**
 * Check if user is following a host
 */
export async function isFollowing(followerId: string, hostId: string): Promise<boolean> {
  const db = getDbSafe();
  if (!db) return false;

  try {
    const userRef = doc(db, 'users', followerId);
    const userDoc = await getDoc(userRef);
    const following = userDoc.data()?.following || [];
    return following.includes(hostId);
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

/**
 * Get all hosts a user is following
 */
export async function getFollowingHosts(userId: string): Promise<string[]> {
  const db = getDbSafe();
  if (!db) return [];

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    return userDoc.data()?.following || [];
  } catch (error) {
    console.error('Error fetching following hosts:', error);
    return [];
  }
}

/**
 * Get all followers of a host
 */
export async function getHostFollowers(hostId: string): Promise<string[]> {
  const db = getDbSafe();
  if (!db) return [];

  try {
    const hostRef = doc(db, 'users', hostId);
    const hostDoc = await getDoc(hostRef);
    return hostDoc.data()?.followers || [];
  } catch (error) {
    console.error('Error fetching host followers:', error);
    return [];
  }
}

/**
 * Subscribe to followers count in real-time
 */
export function subscribeToFollowersCount(
  hostId: string,
  callback: (count: number) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    // CRITICAL: Defer callback to prevent React Error #310
    // (Cannot update a component while rendering a different component)
    queueMicrotask(() => callback(0));
    return () => {};
  }

  try {
    const hostRef = doc(db, 'users', hostId);
    
    return onSnapshot(
      hostRef,
      (snapshot) => {
        const followers = snapshot.data()?.followers || [];
        callback(Array.isArray(followers) ? followers.length : 0);
      },
      (error) => {
        console.error('Error in followers count subscription:', error);
        callback(0);
      }
    );
  } catch (error) {
    console.error('Error setting up followers count subscription:', error);
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
    return () => {};
  }
}

/**
 * Subscribe to following count in real-time
 */
export function subscribeToFollowingCount(
  userId: string,
  callback: (count: number) => void
): Unsubscribe {
  const db = getDbSafe();
  if (!db) {
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
    return () => {};
  }

  try {
    const userRef = doc(db, 'users', userId);
    
    return onSnapshot(
      userRef,
      (snapshot) => {
        const following = snapshot.data()?.following || [];
        callback(Array.isArray(following) ? following.length : 0);
      },
      (error) => {
        console.error('Error in following count subscription:', error);
        callback(0);
      }
    );
  } catch (error) {
    console.error('Error setting up following count subscription:', error);
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
    return () => {};
  }
}

/**
 * Notify all followers when a host creates a new event
 * This is now handled by notificationHelpers.ts for comprehensive notifications (in-app + email + SMS)
 */
export async function notifyFollowersOfNewEvent(
  hostId: string,
  eventId: string,
  eventTitle: string
): Promise<void> {
  // Delegate to notificationHelpers for comprehensive notifications
  try {
    const { notifyFollowersOfNewEvent: notifyFollowers } = await import('../utils/notificationHelpers');
    await notifyFollowers(hostId, eventId, eventTitle);
  } catch (error) {
    console.error('Error notifying followers:', error);
  }
}

