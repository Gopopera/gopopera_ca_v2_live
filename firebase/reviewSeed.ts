/**
 * Review Seed Data
 * Creates fake review accounts and reviews for events
 * This file contains all fake review data to ensure solid database structure
 */

import { getDbSafe } from "../src/lib/firebase";
import { collection, doc, setDoc, addDoc, query, where, getDocs } from "firebase/firestore";
import { FirestoreUser, FirestoreReview } from "./types";
import { createOrUpdateUserProfile } from "./db";
import { POPERA_EMAIL } from "../stores/userStore";
import { sanitizeFirestoreData } from "../utils/firestoreValidation";

// Fake review accounts - these will be created as user profiles
export interface FakeReviewAccount {
  id: string;
  name: string;
  email: string;
  photoURL: string;
  bio: string;
}

export const FAKE_REVIEW_ACCOUNTS: FakeReviewAccount[] = [
  {
    id: 'fake-reviewer-1',
    name: 'Jessica Martinez',
    email: 'jessica.martinez.demo@popera.app',
    photoURL: 'https://i.pravatar.cc/150?img=47',
    bio: 'Event enthusiast and pop-up lover. Always looking for the next great experience!',
  },
  {
    id: 'fake-reviewer-2',
    name: 'David Chen',
    email: 'david.chen.demo@popera.app',
    photoURL: 'https://i.pravatar.cc/150?img=12',
    bio: 'Foodie and culture explorer. Love discovering hidden gems in the city.',
  },
  {
    id: 'fake-reviewer-3',
    name: 'Sarah Johnson',
    email: 'sarah.johnson.demo@popera.app',
    photoURL: 'https://i.pravatar.cc/150?img=20',
    bio: 'Art lover and community builder. Passionate about supporting local creators.',
  },
  {
    id: 'fake-reviewer-4',
    name: 'Marcus Thompson',
    email: 'marcus.thompson.demo@popera.app',
    photoURL: 'https://i.pravatar.cc/150?img=33',
    bio: 'Music producer and event organizer. Always on the lookout for fresh vibes.',
  },
  {
    id: 'fake-reviewer-5',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez.demo@popera.app',
    photoURL: 'https://i.pravatar.cc/150?img=28',
    bio: 'Fashion blogger and trendsetter. Love exploring unique pop-up experiences.',
  },
  {
    id: 'fake-reviewer-6',
    name: 'Alex Kim',
    email: 'alex.kim.demo@popera.app',
    photoURL: 'https://i.pravatar.cc/150?img=15',
    bio: 'Tech entrepreneur and networking enthusiast. Building connections one event at a time.',
  },
];

// Review comments pool - randomly selected for reviews
const REVIEW_COMMENTS = [
  "Absolutely incredible experience! The host was so welcoming and the atmosphere was unmatched. Can't wait for the next one!",
  "Great event, very well organized. The setup was perfect and the flow of activities kept everyone engaged throughout.",
  "One of the best pop-ups I've been to in the city. The attention to detail was impressive and the community vibe was amazing.",
  "The popup and event were well-organized and engaging. The setup attracted good attention, and the flow of activities kept visitors interested throughout.",
  "Absolutely loved the vibe! The host was incredibly welcoming and the venue was perfect for the occasion.",
  "Great networking opportunity. I met some really interesting people. The only downside was that it ended too soon!",
  "Fantastic event with an amazing community. The host really knows how to create a memorable experience.",
  "Well worth the time! The event exceeded my expectations and I'll definitely be back for more.",
  "The energy was incredible and the host made everyone feel welcome. Highly recommend!",
  "Such a unique experience! The attention to detail and the welcoming atmosphere made it unforgettable.",
  "Perfect blend of fun and networking. Met some great people and had an amazing time!",
  "The host did an outstanding job organizing this. Everything was smooth and enjoyable from start to finish.",
  "One of the most engaging pop-ups I've attended. The community here is fantastic!",
  "Really enjoyed the event! Great atmosphere, friendly people, and well-organized activities.",
  "The event was a huge success! The host's passion really showed through in every detail.",
];

/**
 * Create fake review accounts in Firestore
 * NOTE: This may fail due to Firestore security rules, but that's OK
 * Reviews can still be created with just userId/userName without the user profile existing
 */
export async function seedFakeReviewAccounts(): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    console.warn('[REVIEW_SEED] Firestore not available');
    return;
  }

  console.log('[REVIEW_SEED] Attempting to seed fake review accounts (may fail due to security rules - that\'s OK)...');

  let successCount = 0;
  let failCount = 0;

  for (const account of FAKE_REVIEW_ACCOUNTS) {
    try {
      await createOrUpdateUserProfile(account.id, {
        uid: account.id,
        id: account.id,
        email: account.email,
        name: account.name,
        displayName: account.name,
        photoURL: account.photoURL,
        bio: account.bio,
        createdAt: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000, // Random date in past year
        updatedAt: Date.now(),
      });
      console.log(`[REVIEW_SEED] ✅ Created/updated account: ${account.name}`);
      successCount++;
    } catch (error: any) {
      // Silently fail - reviews don't require user profiles to exist
      // Firestore security rules may block this, which is expected
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.log(`[REVIEW_SEED] ⚠️ Skipped account ${account.name} (permission denied - reviews will still work)`);
      } else {
        console.warn(`[REVIEW_SEED] ⚠️ Error creating account ${account.name}:`, error?.message || error);
      }
      failCount++;
    }
  }

  console.log(`[REVIEW_SEED] Fake review accounts: ${successCount} created, ${failCount} skipped (reviews will still work without accounts)`);
}

/**
 * Get a random review comment
 */
function getRandomComment(): string {
  return REVIEW_COMMENTS[Math.floor(Math.random() * REVIEW_COMMENTS.length)];
}

/**
 * Get a random rating (weighted towards positive ratings)
 */
function getRandomRating(): number {
  const rand = Math.random();
  if (rand < 0.1) return 3; // 10% chance of 3
  if (rand < 0.3) return 4; // 20% chance of 4
  return 5; // 70% chance of 5
}

/**
 * Seed 3 reviews per event for a specific host
 * @param hostId - The user ID of the host
 * @param eventIds - Array of event IDs to seed reviews for
 */
export async function seedReviewsForEvents(hostId: string, eventIds: string[]): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    console.warn('[REVIEW_SEED] Firestore not available');
    return;
  }

  console.log(`[REVIEW_SEED] Seeding reviews for ${eventIds.length} events...`);

  for (const eventId of eventIds) {
    try {
      // Check if reviews already exist for this event
      const reviewsCol = collection(db, "events", eventId, "reviews");
      const existingReviews = await getDocs(reviewsCol);
      
      if (existingReviews.size >= 3) {
        console.log(`[REVIEW_SEED] Event ${eventId} already has ${existingReviews.size} reviews, skipping`);
        continue;
      }

      // Get 3 random reviewers (without replacement)
      const shuffled = [...FAKE_REVIEW_ACCOUNTS].sort(() => 0.5 - Math.random());
      const selectedReviewers = shuffled.slice(0, 3);

      // Create 3 reviews for this event
      for (let i = 0; i < selectedReviewers.length; i++) {
        const reviewer = selectedReviewers[i];
        const reviewData: Omit<FirestoreReview, 'id'> = {
          eventId,
          userId: reviewer.id,
          userName: reviewer.name,
          rating: getRandomRating(),
          comment: getRandomComment(),
          createdAt: Date.now() - (i * 7 * 24 * 60 * 60 * 1000), // Stagger dates (1 week apart)
        };

        const sanitized = sanitizeFirestoreData(reviewData);
        await addDoc(reviewsCol, sanitized);
        console.log(`[REVIEW_SEED] Added review by ${reviewer.name} for event ${eventId}`);
      }
    } catch (error: any) {
      // Handle permission errors gracefully - this is expected with Firestore security rules
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.log(`[REVIEW_SEED] Skipped seeding reviews for event ${eventId} (permission denied - expected)`);
      } else {
        console.warn(`[REVIEW_SEED] Error seeding reviews for event ${eventId} (non-critical):`, error?.message || error);
      }
    }
  }

  console.log('[REVIEW_SEED] Reviews seeded successfully');
}

/**
 * Seed reviews for all events hosted by a specific user
 * @param hostEmail - Email of the host (e.g., eatezca@gmail.com)
 */
export async function seedReviewsForHostEvents(hostEmail: string): Promise<void> {
  if (hostEmail !== POPERA_EMAIL) {
    console.log('[REVIEW_SEED] Only seeding reviews for Popera account');
    return;
  }

  const db = getDbSafe();
  if (!db) {
    console.warn('[REVIEW_SEED] Firestore not available');
    return;
  }

  try {
    // First, ensure fake review accounts exist
    await seedFakeReviewAccounts();

    // Find the host's user ID
    const usersCol = collection(db, "users");
    const hostQuery = query(usersCol, where("email", "==", hostEmail));
    const hostSnapshot = await getDocs(hostQuery);
    
    if (hostSnapshot.empty) {
      console.warn(`[REVIEW_SEED] Host with email ${hostEmail} not found`);
      return;
    }

    const hostDoc = hostSnapshot.docs[0];
    const hostId = hostDoc.id;

    // Find all events hosted by this user
    const eventsCol = collection(db, "events");
    const eventsQuery = query(eventsCol, where("hostId", "==", hostId));
    const eventsSnapshot = await getDocs(eventsQuery);

    const eventIds = eventsSnapshot.docs.map(doc => doc.id);
    console.log(`[REVIEW_SEED] Found ${eventIds.length} events for host ${hostEmail}`);

    if (eventIds.length === 0) {
      console.log('[REVIEW_SEED] No events found for host');
      return;
    }

    // Seed reviews for all events
    await seedReviewsForEvents(hostId, eventIds);

    console.log('[REVIEW_SEED] Successfully seeded reviews for all host events');
  } catch (error: any) {
    // Handle permission errors gracefully - this is expected with Firestore security rules
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.log('[REVIEW_SEED] Review seeding skipped (permission denied - expected with current security rules)');
      return; // Don't throw - this is not a critical error
    }
    console.warn('[REVIEW_SEED] Error seeding reviews for host events (non-critical):', error?.message || error);
    // Don't throw - review seeding is optional and shouldn't break login
  }
}

