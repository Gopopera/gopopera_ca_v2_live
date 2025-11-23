/**
 * Notifications System - Firestore Operations
 * Handles in-app notifications, announcements, and polls
 */

import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  updateDoc, 
  serverTimestamp,
  Timestamp,
  getDoc,
  setDoc,
  increment
} from 'firebase/firestore';
import { getDbSafe } from '../src/lib/firebase';
import type { FirestoreNotification, FirestoreAnnouncement, FirestorePollVote } from './types';

/**
 * Create a notification for a user
 */
export async function createNotification(
  userId: string,
  notification: Omit<FirestoreNotification, 'id' | 'timestamp' | 'read' | 'createdAt'>
): Promise<string> {
  const db = getDbSafe();
  if (!db) throw new Error('Database not available');

  const notificationsRef = collection(db, 'notifications', userId, 'items');
  const docRef = await addDoc(notificationsRef, {
    ...notification,
    timestamp: serverTimestamp(),
    read: false,
    createdAt: Date.now(),
  });

  return docRef.id;
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  limitCount: number = 50
): Promise<FirestoreNotification[]> {
  const db = getDbSafe();
  if (!db) return [];

  try {
    const notificationsRef = collection(db, 'notifications', userId, 'items');
    const q = query(
      notificationsRef,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toMillis?.() || doc.data().timestamp || Date.now(),
    })) as FirestoreNotification[];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<void> {
  const db = getDbSafe();
  if (!db) return;

  const notificationRef = doc(db, 'notifications', userId, 'items', notificationId);
  await updateDoc(notificationRef, { read: true });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const db = getDbSafe();
  if (!db) return;

  const notifications = await getUserNotifications(userId, 100);
  const batch = notifications
    .filter(n => !n.read)
    .map(n => markNotificationAsRead(userId, n.id));
  
  await Promise.all(batch);
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const db = getDbSafe();
  if (!db) return 0;

  try {
    const notificationsRef = collection(db, 'notifications', userId, 'items');
    const q = query(
      notificationsRef,
      where('read', '==', false),
      limit(100) // Cap at 100 for performance
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
}

/**
 * Create an announcement for an event
 */
export async function createAnnouncement(
  eventId: string,
  announcement: Omit<FirestoreAnnouncement, 'id' | 'eventId' | 'timestamp' | 'createdAt'>
): Promise<string> {
  const db = getDbSafe();
  if (!db) throw new Error('Database not available');

  const announcementsRef = collection(db, 'announcements', eventId, 'items');
  const docRef = await addDoc(announcementsRef, {
    ...announcement,
    eventId,
    timestamp: serverTimestamp(),
    createdAt: Date.now(),
  });

  return docRef.id;
}

/**
 * Get announcements for an event
 */
export async function getEventAnnouncements(eventId: string): Promise<FirestoreAnnouncement[]> {
  const db = getDbSafe();
  if (!db) return [];

  try {
    const announcementsRef = collection(db, 'announcements', eventId, 'items');
    const q = query(announcementsRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      eventId,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toMillis?.() || doc.data().timestamp || Date.now(),
    })) as FirestoreAnnouncement[];
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }
}

/**
 * Vote on a poll
 */
export async function voteOnPoll(
  eventId: string,
  announcementId: string,
  userId: string,
  option: string
): Promise<void> {
  const db = getDbSafe();
  if (!db) throw new Error('Database not available');

  // Check if user already voted
  const voteRef = doc(db, 'announcements', eventId, 'items', announcementId, 'votes', userId);
  const voteDoc = await getDoc(voteRef);
  
  if (voteDoc.exists()) {
    throw new Error('You have already voted on this poll');
  }

  // Record vote
  await setDoc(voteRef, {
    userId,
    option,
    timestamp: serverTimestamp(),
  });
}

/**
 * Get poll results
 */
export async function getPollResults(
  eventId: string,
  announcementId: string
): Promise<Record<string, number>> {
  const db = getDbSafe();
  if (!db) return {};

  try {
    const votesRef = collection(db, 'announcements', eventId, 'items', announcementId, 'votes');
    const snapshot = await getDocs(votesRef);
    
    const results: Record<string, number> = {};
    snapshot.docs.forEach(doc => {
      const vote = doc.data() as FirestorePollVote;
      results[vote.option] = (results[vote.option] || 0) + 1;
    });

    return results;
  } catch (error) {
    console.error('Error fetching poll results:', error);
    return {};
  }
}

/**
 * Check if user has voted on a poll
 */
export async function hasUserVoted(
  eventId: string,
  announcementId: string,
  userId: string
): Promise<boolean> {
  const db = getDbSafe();
  if (!db) return false;

  const voteRef = doc(db, 'announcements', eventId, 'items', announcementId, 'votes', userId);
  const voteDoc = await getDoc(voteRef);
  return voteDoc.exists();
}

