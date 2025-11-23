/**
 * Follow System - Firestore Operations
 * Handles following/followers relationships
 */

import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, getDocs, collection, query, where } from 'firebase/firestore';
import { getDbSafe } from '../src/lib/firebase';

/**
 * Follow a host
 */
export async function followHost(followerId: string, hostId: string): Promise<void> {
  const db = getDbSafe();
  if (!db) throw new Error('Database not available');

  // Add host to follower's following list
  const followerRef = doc(db, 'users', followerId);
  await updateDoc(followerRef, {
    following: arrayUnion(hostId),
  });

  // Add follower to host's followers list
  const hostRef = doc(db, 'users', hostId);
  await updateDoc(hostRef, {
    followers: arrayUnion(followerId),
  });
}

/**
 * Unfollow a host
 */
export async function unfollowHost(followerId: string, hostId: string): Promise<void> {
  const db = getDbSafe();
  if (!db) throw new Error('Database not available');

  // Remove host from follower's following list
  const followerRef = doc(db, 'users', followerId);
  await updateDoc(followerRef, {
    following: arrayRemove(hostId),
  });

  // Remove follower from host's followers list
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
 * Notify all followers when a host creates a new event
 */
export async function notifyFollowersOfNewEvent(
  hostId: string,
  eventId: string,
  eventTitle: string
): Promise<void> {
  const db = getDbSafe();
  if (!db) return;

  try {
    const followers = await getHostFollowers(hostId);
    
    // Create notifications for all followers
    const { createNotification } = await import('./notifications');
    const notifications = followers.map(followerId =>
      createNotification(followerId, {
        userId: followerId,
        type: 'followed-host-event',
        title: 'New Event from Host You Follow',
        body: `${eventTitle} - Check it out!`,
        eventId,
        hostId,
      })
    );

    await Promise.all(notifications);
  } catch (error) {
    console.error('Error notifying followers:', error);
  }
}

