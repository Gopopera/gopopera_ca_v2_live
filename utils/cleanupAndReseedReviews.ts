/**
 * Cleanup and re-seed reviews for eatezca@gmail.com account
 * 
 * This script:
 * 1. Deletes ALL existing reviews for all events hosted by eatezca@gmail.com
 * 2. Re-seeds exactly 3 reviews per event (all 5 stars with good comments)
 * 3. Ensures reviews are properly synced everywhere
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, query, where, getDocs, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { POPERA_EMAIL } from '../stores/userStore';
import { sanitizeFirestoreData } from '../utils/firestoreValidation';
import type { FirestoreReview } from '../firebase/types';
import { recalculateEventRating } from '../firebase/db';

// Fake review accounts (same as in reviewSeed.ts)
const FAKE_REVIEW_ACCOUNTS = [
  { id: 'reviewer1', name: 'Sarah Chen', email: 'sarah.chen@example.com', photoURL: 'https://i.pravatar.cc/150?img=1' },
  { id: 'reviewer2', name: 'Michael Torres', email: 'michael.torres@example.com', photoURL: 'https://i.pravatar.cc/150?img=2' },
  { id: 'reviewer3', name: 'Emily Johnson', email: 'emily.johnson@example.com', photoURL: 'https://i.pravatar.cc/150?img=3' },
  { id: 'reviewer4', name: 'David Kim', email: 'david.kim@example.com', photoURL: 'https://i.pravatar.cc/150?img=4' },
  { id: 'reviewer5', name: 'Jessica Martinez', email: 'jessica.martinez@example.com', photoURL: 'https://i.pravatar.cc/150?img=5' },
];

// Good review comments
const GOOD_REVIEW_COMMENTS = [
  "Amazing event! Great atmosphere and well-organized. Would definitely attend again!",
  "Really enjoyed this experience. The host was welcoming and the community vibe was fantastic.",
  "One of the best events I've been to. Highly recommend to anyone interested!",
  "Wonderful gathering with like-minded people. Can't wait for the next one!",
  "Excellent event with great energy. The host did an outstanding job organizing everything.",
  "Had a fantastic time! Met some great people and learned a lot. 5 stars!",
  "Perfect event for connecting with the community. Everything was well thought out.",
  "Absolutely loved it! The attention to detail and community engagement was impressive.",
];

async function getUserIdByEmail(email: string): Promise<string | null> {
  const db = getDbSafe();
  if (!db) {
    console.warn('[CLEANUP_REVIEWS] Firestore not available');
    return null;
  }
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }
    console.log(`[CLEANUP_REVIEWS] User with email ${email} not found.`);
    return null;
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.warn(`[CLEANUP_REVIEWS] Permission denied when fetching user by email ${email}`);
    } else {
      console.error(`[CLEANUP_REVIEWS] Error fetching user by email ${email}:`, error);
    }
    return null;
  }
}

async function getEventsForHost(hostId: string): Promise<string[]> {
  const db = getDbSafe();
  if (!db) {
    console.warn('[CLEANUP_REVIEWS] Firestore not available');
    return [];
  }
  try {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('hostId', '==', hostId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.id);
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.warn(`[CLEANUP_REVIEWS] Permission denied when fetching events for host ${hostId}`);
    } else {
      console.error(`[CLEANUP_REVIEWS] Error fetching events for host ${hostId}:`, error);
    }
    return [];
  }
}

async function deleteAllReviewsForEvent(eventId: string): Promise<number> {
  const db = getDbSafe();
  if (!db) {
    return 0;
  }
  
  try {
    const reviewsCol = collection(db, 'events', eventId, 'reviews');
    const reviewsSnapshot = await getDocs(reviewsCol);
    
    let deletedCount = 0;
    for (const reviewDoc of reviewsSnapshot.docs) {
      try {
        await deleteDoc(doc(db, 'events', eventId, 'reviews', reviewDoc.id));
        deletedCount++;
      } catch (error) {
        console.error(`[CLEANUP_REVIEWS] Error deleting review ${reviewDoc.id}:`, error);
      }
    }
    
    return deletedCount;
  } catch (error) {
    console.error(`[CLEANUP_REVIEWS] Error deleting reviews for event ${eventId}:`, error);
    return 0;
  }
}

async function addReview(eventId: string, reviewer: typeof FAKE_REVIEW_ACCOUNTS[0], comment: string): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  
  const reviewsCol = collection(db, 'events', eventId, 'reviews');
  const reviewData: Omit<FirestoreReview, 'id'> = {
    eventId,
    userId: reviewer.id,
    userName: reviewer.name,
    rating: 5, // Always 5 stars
    comment,
    createdAt: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000, // Random date in last 30 days
  };
  
  const sanitized = sanitizeFirestoreData(reviewData);
  await addDoc(reviewsCol, sanitized);
}

/**
 * Main cleanup and re-seed function
 */
export async function cleanupAndReseedReviews(): Promise<void> {
  const EMAIL = POPERA_EMAIL;
  const REVIEWS_PER_EVENT = 3;
  
  console.log(`[CLEANUP_REVIEWS] Starting cleanup and re-seed for ${EMAIL}...`);
  
  // Get user ID
  const hostId = await getUserIdByEmail(EMAIL);
  if (!hostId) {
    console.log(`[CLEANUP_REVIEWS] Could not find user with email: ${EMAIL}, skipping.`);
    return;
  }
  
  console.log(`[CLEANUP_REVIEWS] Found user ID: ${hostId}`);
  
  // Get all events for this host
  const eventIds = await getEventsForHost(hostId);
  if (eventIds.length === 0) {
    console.log(`[CLEANUP_REVIEWS] No events found for host ${hostId}, skipping.`);
    return;
  }
  
  console.log(`[CLEANUP_REVIEWS] Found ${eventIds.length} events for host`);
  
  let totalDeleted = 0;
  let totalAdded = 0;
  
  // Process each event
  for (const eventId of eventIds) {
    try {
      console.log(`[CLEANUP_REVIEWS] Processing event: ${eventId}`);
      
      // Step 1: Delete all existing reviews
      const deletedCount = await deleteAllReviewsForEvent(eventId);
      totalDeleted += deletedCount;
      console.log(`[CLEANUP_REVIEWS] Deleted ${deletedCount} reviews for event ${eventId}`);
      
      // Step 2: Add exactly 3 new reviews
      const shuffledReviewers = [...FAKE_REVIEW_ACCOUNTS].sort(() => 0.5 - Math.random());
      const shuffledComments = [...GOOD_REVIEW_COMMENTS].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < REVIEWS_PER_EVENT && i < shuffledReviewers.length; i++) {
        const reviewer = shuffledReviewers[i];
        const comment = shuffledComments[i % shuffledComments.length];
        
        await addReview(eventId, reviewer, comment);
        totalAdded++;
        console.log(`[CLEANUP_REVIEWS] ✅ Added review ${i + 1}/${REVIEWS_PER_EVENT} by ${reviewer.name} for event ${eventId}`);
      }
      
      // Step 3: Recalculate event rating (this syncs everywhere)
      await recalculateEventRating(eventId);
      console.log(`[CLEANUP_REVIEWS] ✅ Recalculated rating for event ${eventId}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`[CLEANUP_REVIEWS] ❌ Error processing event ${eventId}:`, error);
    }
  }
  
  console.log(`[CLEANUP_REVIEWS] ✅ Complete!`);
  console.log(`[CLEANUP_REVIEWS] Total deleted: ${totalDeleted}`);
  console.log(`[CLEANUP_REVIEWS] Total added: ${totalAdded} (${REVIEWS_PER_EVENT} per event)`);
  console.log(`[CLEANUP_REVIEWS] Events processed: ${eventIds.length}`);
}

