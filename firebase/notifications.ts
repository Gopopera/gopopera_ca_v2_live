/**
 * Notifications System - Firestore Operations
 * Handles in-app notifications, announcements, and polls
 */

import { getAuthInstance } from '../src/lib/firebaseAuth';
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
  increment,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { getDbSafe } from '../src/lib/firebase';
import type { FirestoreNotification, FirestoreAnnouncement, FirestorePollVote } from './types';

/**
 * Create a notification for a user with retry logic
 * Firestore security rules handle authentication - no client-side auth blocking
 */
export async function createNotification(
  userId: string,
  notification: Omit<FirestoreNotification, 'id' | 'timestamp' | 'read' | 'createdAt'>,
  retryCount: number = 0
): Promise<string> {
  const path = `users/${userId}/notifications`;
  const MAX_RETRIES = 3;
  
  console.log('[NOTIFICATIONS] 📝 Creating notification:', {
    userId,
    path,
    type: notification.type,
    title: notification.title,
    eventId: notification.eventId,
    retryCount,
  });

  const db = getDbSafe();
  if (!db) {
    console.error('[NOTIFICATIONS] ❌ Database not available for notification creation:', {
      userId,
      path,
      type: notification.type,
    });
    throw new Error('Database not available');
  }

  // Log auth state for debugging (but don't block on it - Firestore rules handle security)
  try {
    const auth = getAuthInstance();
    if (auth?.currentUser) {
      console.log('[NOTIFICATIONS] ✅ Auth verified, current user:', auth.currentUser.uid);
    } else {
      console.warn('[NOTIFICATIONS] ⚠️ No currentUser detected, proceeding anyway (Firestore rules will enforce auth):', {
        userId,
        path,
        type: notification.type,
      });
    }
  } catch (authError) {
    console.warn('[NOTIFICATIONS] ⚠️ Auth check failed, proceeding anyway:', authError);
  }

  try {
    // Use subcollection under user document: users/{userId}/notifications
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    
    // Use createdAt as both timestamp backup and for ordering
    const createdAtMs = Date.now();
    const notificationData = {
      ...notification,
      timestamp: serverTimestamp(),
      // Backup timestamp as number for fallback queries
      timestampMs: createdAtMs,
      read: false,
      createdAt: createdAtMs,
    };
    
    console.log('[NOTIFICATIONS] 📤 Writing to Firestore:', {
      path,
      data: {
        type: notificationData.type,
        title: notificationData.title,
        body: notificationData.body?.substring(0, 50),
        read: notificationData.read,
        createdAt: notificationData.createdAt,
      },
    });

    const docRef = await addDoc(notificationsRef, notificationData);

    console.log('[NOTIFICATIONS] ✅ Notification created successfully:', {
      notificationId: docRef.id,
      path: `${path}/${docRef.id}`,
      type: notification.type,
      userId,
    });

    return docRef.id;
  } catch (writeError: any) {
    console.error('[NOTIFICATIONS] ❌ Firestore write failed:', {
      userId,
      path,
      type: notification.type,
      error: writeError?.message || writeError,
      code: writeError?.code,
      retryCount,
    });
    
    // Retry with exponential backoff for transient errors
    const isTransientError = writeError?.code === 'unavailable' || 
                              writeError?.code === 'deadline-exceeded' ||
                              writeError?.message?.includes('network');
    
    if (isTransientError && retryCount < MAX_RETRIES) {
      const delayMs = Math.pow(2, retryCount) * 500; // 500ms, 1s, 2s
      console.log(`[NOTIFICATIONS] 🔄 Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return createNotification(userId, notification, retryCount + 1);
    }
    
    throw writeError;
  }
}

// 120 hours in milliseconds (5 days)
const NOTIFICATION_TTL_MS = 120 * 60 * 60 * 1000;

/**
 * Get notifications for a user
 * Also triggers background cleanup of expired notifications (older than 120 hours)
 * Falls back to createdAt ordering if timestamp query fails (missing index)
 */
export async function getUserNotifications(
  userId: string,
  limitCount: number = 50
): Promise<FirestoreNotification[]> {
  const path = `users/${userId}/notifications`;
  
  console.log('[NOTIFICATIONS] 📖 Fetching notifications:', {
    userId,
    path,
    limit: limitCount,
  });

  const db = getDbSafe();
  if (!db) {
    console.warn('[NOTIFICATIONS] ⚠️ Database not available for fetching notifications');
    return [];
  }

  let snapshot;
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    
    // Try timestamp ordering first
    try {
      const q = query(
        notificationsRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      snapshot = await getDocs(q);
    } catch (indexError: any) {
      // Fallback: If timestamp index is missing, query without ordering and sort client-side
      console.warn('[NOTIFICATIONS] ⚠️ Timestamp query failed, using fallback:', indexError?.code);
      const fallbackQuery = query(notificationsRef, limit(limitCount));
      snapshot = await getDocs(fallbackQuery);
    }
    
    console.log('[NOTIFICATIONS] 📊 Notifications fetched:', {
      userId,
      path,
      count: snapshot.size,
      docIds: snapshot.docs.map(d => d.id).slice(0, 5), // First 5 IDs for debugging
    });

    const now = Date.now();
    const cutoffTime = now - NOTIFICATION_TTL_MS;
    
    const notifications: FirestoreNotification[] = [];
    const expiredIds: string[] = [];
    
    snapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      // Use multiple fallbacks for timestamp
      const timestamp = data.timestamp?.toMillis?.() || 
                        data.timestampMs || 
                        data.timestamp || 
                        data.createdAt || 
                        now;
      
      if (timestamp < cutoffTime) {
        // Mark for deletion (older than 120 hours)
        expiredIds.push(docSnapshot.id);
      } else {
        notifications.push({
          id: docSnapshot.id,
          ...data,
          timestamp,
        } as FirestoreNotification);
      }
    });
    
    // Sort client-side to ensure proper ordering (handles fallback query case)
    notifications.sort((a, b) => b.timestamp - a.timestamp);
    
    // Clean up expired notifications in background (fire and forget)
    if (expiredIds.length > 0) {
      console.log('[NOTIFICATIONS] 🧹 Cleaning up expired notifications:', {
        userId,
        count: expiredIds.length,
        ids: expiredIds.slice(0, 5),
      });
      
      // Fire and forget - don't await
      Promise.all(
        expiredIds.map(id => {
          const notificationRef = doc(db, 'users', userId, 'notifications', id);
          return import('firebase/firestore').then(({ deleteDoc }) => deleteDoc(notificationRef));
        })
      ).then(() => {
        console.log('[NOTIFICATIONS] ✅ Expired notifications cleaned up:', expiredIds.length);
      }).catch(error => {
        console.warn('[NOTIFICATIONS] ⚠️ Error cleaning up expired notifications:', error);
      });
    }
    
    if (notifications.length === 0) {
      console.log('[NOTIFICATIONS] ⚠️ No notifications found for user:', {
        userId,
        path,
        message: 'This could indicate notifications are not being created or path is wrong',
        expiredCount: expiredIds.length,
      });
    }
    
    return notifications;
  } catch (error: any) {
    console.error('[NOTIFICATIONS] ❌ Error fetching notifications:', {
      userId,
      path,
      error: error?.message || error,
      code: error?.code,
    });
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

  const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
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

  // Log auth state for debugging (but don't block - Firestore rules handle auth)
  try {
    const auth = getAuthInstance();
    if (!auth?.currentUser) {
      console.warn('[NOTIFICATIONS] ⚠️ No currentUser for unread count, proceeding anyway');
    }
  } catch {
    // Ignore auth check errors
  }

  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(
      notificationsRef,
      where('read', '==', false),
      limit(100) // Cap at 100 for performance
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error: any) {
    // Silently handle permission errors - these are expected when user doesn't have access
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      return 0;
    }
    // Only log non-permission errors for debugging
    console.warn('Error counting unread notifications:', error);
    return 0;
  }
}

/**
 * Subscribe to unread notification count in real-time
 * Auth is handled by Firestore rules - we proceed with subscription even if auth check fails
 */
export function subscribeToUnreadNotificationCount(
  userId: string,
  callback: (count: number) => void
): Unsubscribe {
  const path = `users/${userId}/notifications`;
  
  console.log('[NOTIFICATIONS] 🔔 Setting up unread count subscription:', {
    userId,
    path,
  });

  const db = getDbSafe();
  if (!db) {
    console.warn('[NOTIFICATIONS] ⚠️ Database not available for unread count subscription');
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
    return () => {};
  }

  // Log auth state for debugging (but don't block on it)
  try {
    const auth = getAuthInstance();
    if (auth?.currentUser) {
      console.log('[NOTIFICATIONS] ✅ Auth verified for subscription, user:', auth.currentUser.uid);
    } else {
      console.warn('[NOTIFICATIONS] ⚠️ No currentUser for subscription, proceeding anyway (Firestore rules will handle auth)');
    }
  } catch {
    console.warn('[NOTIFICATIONS] ⚠️ Auth check failed for subscription, proceeding anyway');
  }

  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(
      notificationsRef,
      where('read', '==', false),
      limit(100) // Cap at 100 for performance
    );

    console.log('[NOTIFICATIONS] 📡 Subscribing to unread notifications at:', path);

    return onSnapshot(
      q,
      (snapshot) => {
        console.log('[NOTIFICATIONS] 📊 Unread count updated:', {
          userId,
          path,
          count: snapshot.size,
          docIds: snapshot.docs.map(d => d.id).slice(0, 3), // First 3 IDs
        });
        callback(snapshot.size);
      },
      (error: any) => {
        // Silently handle permission errors
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          console.warn('[NOTIFICATIONS] ⚠️ Permission denied for unread count:', {
            userId,
            path,
            error: error?.message,
          });
          callback(0);
          return;
        }
        console.error('[NOTIFICATIONS] ❌ Error in unread count subscription:', {
          userId,
          path,
          error: error?.message || error,
          code: error?.code,
        });
        callback(0);
      }
    );
  } catch (error: any) {
    console.error('[NOTIFICATIONS] ❌ Error setting up unread count subscription:', {
      userId,
      path,
      error: error?.message || error,
      code: error?.code,
    });
    // CRITICAL: Defer callback to prevent React Error #310
    queueMicrotask(() => callback(0));
    return () => {};
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

/**
 * DEBUG FUNCTION: Test notification creation
 * Call from browser console: debugTestNotification()
 * 
 * This function creates a test notification for the current user
 * and verifies it was written successfully.
 */
export async function debugTestNotification(): Promise<{ success: boolean; details: any }> {
  console.log('[DEBUG] 🧪 Starting notification test...');
  
  // Check auth
  let currentUserId: string | null = null;
  try {
    const auth = getAuthInstance();
    if (!auth?.currentUser) {
      console.error('[DEBUG] ❌ Not authenticated');
      return { success: false, details: { error: 'Not authenticated' } };
    }
    currentUserId = auth.currentUser.uid;
    console.log('[DEBUG] ✅ Authenticated as:', currentUserId);
  } catch (error: any) {
    console.error('[DEBUG] ❌ Auth error:', error);
    return { success: false, details: { error: 'Auth error', message: error?.message } };
  }

  // Check database
  const db = getDbSafe();
  if (!db) {
    console.error('[DEBUG] ❌ Database not available');
    return { success: false, details: { error: 'Database not available' } };
  }
  console.log('[DEBUG] ✅ Database available');

  // Create test notification
  const testNotification = {
    type: 'new-event' as const,
    title: '🧪 Test Notification',
    body: `This is a test notification created at ${new Date().toISOString()}`,
    userId: currentUserId,
  };

  console.log('[DEBUG] 📝 Creating test notification:', testNotification);

  try {
    const notificationId = await createNotification(currentUserId, testNotification);
    console.log('[DEBUG] ✅ Notification created with ID:', notificationId);

    // Verify it was written
    const notifications = await getUserNotifications(currentUserId, 10);
    const foundNotification = notifications.find(n => n.id === notificationId);
    
    if (foundNotification) {
      console.log('[DEBUG] ✅ Notification verified in database:', foundNotification);
      return { 
        success: true, 
        details: { 
          notificationId, 
          notification: foundNotification,
          path: `users/${currentUserId}/notifications/${notificationId}`,
          totalNotifications: notifications.length,
        } 
      };
    } else {
      console.error('[DEBUG] ⚠️ Notification created but not found in query');
      return { 
        success: false, 
        details: { 
          error: 'Notification created but not found',
          notificationId,
          totalNotifications: notifications.length,
        } 
      };
    }
  } catch (error: any) {
    console.error('[DEBUG] ❌ Error creating notification:', error);
    return { 
      success: false, 
      details: { 
        error: 'Create failed',
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      } 
    };
  }
}

/**
 * DEBUG FUNCTION: List all notifications for current user
 * Call from browser console: debugListNotifications()
 */
export async function debugListNotifications(): Promise<{ success: boolean; notifications: any[] }> {
  console.log('[DEBUG] 📖 Listing all notifications...');
  
  try {
    const auth = getAuthInstance();
    if (!auth?.currentUser) {
      console.error('[DEBUG] ❌ Not authenticated');
      return { success: false, notifications: [] };
    }
    
    const userId = auth.currentUser.uid;
    console.log('[DEBUG] User ID:', userId);
    console.log('[DEBUG] Path:', `users/${userId}/notifications`);
    
    const notifications = await getUserNotifications(userId, 100);
    
    console.log('[DEBUG] ✅ Found', notifications.length, 'notifications:');
    notifications.forEach((n, i) => {
      console.log(`  [${i + 1}] ${n.type}: "${n.title}" - ${n.read ? '✓ read' : '○ unread'} - ${new Date(n.timestamp).toLocaleString()}`);
    });
    
    return { success: true, notifications };
  } catch (error: any) {
    console.error('[DEBUG] ❌ Error listing notifications:', error);
    return { success: false, notifications: [] };
  }
}

// Expose debug functions to window for console access
if (typeof window !== 'undefined') {
  (window as any).debugTestNotification = debugTestNotification;
  (window as any).debugListNotifications = debugListNotifications;
  console.log('[NOTIFICATIONS] 🔧 Debug functions available: debugTestNotification(), debugListNotifications()');
}

