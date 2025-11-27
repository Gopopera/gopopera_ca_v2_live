/**
 * Seed fake reviews for all events belonging to eatezca@gmail.com
 * All reviews are 5 stars with good/great comments
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import type { FirestoreReview } from '../firebase/types';
import { sanitizeFirestoreData } from '../utils/firestoreValidation';
import { FAKE_REVIEW_ACCOUNTS, seedFakeReviewAccounts } from '../firebase/reviewSeed';

// Good/great review comments (all positive, 5-star worthy)
const GOOD_REVIEW_COMMENTS = [
  "Amazing event! The host was fantastic and everything was well organized.",
  "Absolutely loved it! Great atmosphere and wonderful people.",
  "One of the best events I've attended. Highly recommend!",
  "Incredible experience! The host really knows how to bring people together.",
  "Fantastic event with great energy. Can't wait for the next one!",
  "Wonderful time! Everything was perfect from start to finish.",
  "Excellent event! The host was welcoming and the community was amazing.",
  "Loved every minute! Great organization and friendly atmosphere.",
  "Outstanding experience! Would definitely attend again.",
  "Perfect event! The host created such a welcoming environment.",
  "Amazing community gathering! Everything exceeded my expectations.",
  "Fantastic pop-up! Great location and wonderful host.",
  "Incredible experience! Met so many great people.",
  "Loved it! The host was engaging and the event was well-planned.",
  "Excellent event! Highly recommend to anyone interested.",
];

/**
 * Get user ID by email
 */
async function getUserIdByEmail(email: string): Promise<string | null> {
  const db = getDbSafe();
  if (!db) {
    console.error('[SEED_REVIEWS] Firestore not available');
    return null;
  }

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.warn(`[SEED_REVIEWS] No user found with email: ${email}`);
      return null;
    }
    
    return snapshot.docs[0].id;
  } catch (error: any) {
    // Handle permission errors gracefully
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.warn('[SEED_REVIEWS] Permission denied when finding user (user may not be logged in)');
    } else {
      console.error('[SEED_REVIEWS] Error finding user:', error);
    }
    return null;
  }
}

/**
 * Get all events for a host
 */
async function getEventsForHost(hostId: string): Promise<string[]> {
  const db = getDbSafe();
  if (!db) {
    console.error('[SEED_REVIEWS] Firestore not available');
    return [];
  }

  try {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('hostId', '==', hostId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('[SEED_REVIEWS] Error fetching events:', error);
    return [];
  }
}

/**
 * Check if review already exists (idempotent)
 */
async function reviewExists(eventId: string, userId: string): Promise<boolean> {
  const db = getDbSafe();
  if (!db) return false;

  try {
    const reviewsRef = collection(db, 'events', eventId, 'reviews');
    const q = query(reviewsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('[SEED_REVIEWS] Error checking review existence:', error);
    return false;
  }
}

/**
 * Add a fake review to an event (always 5 stars)
 */
async function addFakeReview(
  eventId: string,
  reviewer: typeof FAKE_REVIEW_ACCOUNTS[0],
  comment: string
): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not available');
  }

  // Check if review already exists (idempotent)
  if (await reviewExists(eventId, reviewer.id)) {
    console.log(`[SEED_REVIEWS] Review already exists for ${reviewer.name} on event ${eventId}, skipping`);
    return;
  }

  const review: Omit<FirestoreReview, 'id'> = {
    eventId,
    userId: reviewer.id,
    userName: reviewer.name,
    rating: 5, // Always 5 stars as requested
    comment,
    createdAt: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000), // Random time in last 30 days
  };

  const sanitizedReview = sanitizeFirestoreData(review);
  const reviewsRef = collection(db, 'events', eventId, 'reviews');
  await addDoc(reviewsRef, sanitizedReview);
}

/**
 * Seed 3 reviews per event for all events belonging to eatezca@gmail.com
 * All reviews are 5 stars with good/great comments
 */
export async function seedReviewsForEatezca(): Promise<void> {
  const EMAIL = 'eatezca@gmail.com';
  const REVIEWS_PER_EVENT = 3;

  console.log(`[SEED_REVIEWS] Starting review seeding for ${EMAIL}...`);

  // Ensure fake review accounts exist
  await seedFakeReviewAccounts();

  // Get user ID
  const hostId = await getUserIdByEmail(EMAIL);
  if (!hostId) {
    // Silently fail - user might not be logged in, which is expected
    // Only log if it's not a permission error (which would be logged elsewhere)
    return;
  }

  console.log(`[SEED_REVIEWS] Found user ID: ${hostId}`);

  // Get all events for this host
  const eventIds = await getEventsForHost(hostId);
  if (eventIds.length === 0) {
    console.warn(`[SEED_REVIEWS] No events found for host ${hostId}`);
    return;
  }

  console.log(`[SEED_REVIEWS] Found ${eventIds.length} events for host`);

  let totalReviewsAdded = 0;
  let totalReviewsSkipped = 0;

  // Add 3 reviews per event (all 5 stars)
  for (const eventId of eventIds) {
    console.log(`[SEED_REVIEWS] Processing event: ${eventId}`);
    
    // Shuffle reviewers to get variety
    const shuffledReviewers = [...FAKE_REVIEW_ACCOUNTS].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < REVIEWS_PER_EVENT; i++) {
      const reviewer = shuffledReviewers[i % shuffledReviewers.length];
      const comment = GOOD_REVIEW_COMMENTS[i % GOOD_REVIEW_COMMENTS.length];
      
      try {
        await addFakeReview(eventId, reviewer, comment);
        totalReviewsAdded++;
        console.log(`[SEED_REVIEWS] ✅ Added 5-star review ${i + 1}/${REVIEWS_PER_EVENT} by ${reviewer.name} for event ${eventId}`);
      } catch (error) {
        console.error(`[SEED_REVIEWS] ❌ Failed to add review ${i + 1} for event ${eventId}:`, error);
      }
    }
  }

  console.log(`[SEED_REVIEWS] ✅ Complete! Added ${totalReviewsAdded} reviews (all 5 stars), skipped ${totalReviewsSkipped} duplicates`);
  console.log(`[SEED_REVIEWS] Total events processed: ${eventIds.length}`);
  console.log(`[SEED_REVIEWS] Reviews per event: ${REVIEWS_PER_EVENT}`);
  console.log(`[SEED_REVIEWS] Profile page will show ${totalReviewsAdded} total reviews across all events`);
}

