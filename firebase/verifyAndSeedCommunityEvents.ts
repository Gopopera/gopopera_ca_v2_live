/**
 * Verify and seed community events for eatezca@gmail.com
 * This function checks if events exist, verifies they're correct, and creates/updates them as needed
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, getDocs, query, where, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { geocodeAddress } from '../utils/geocoding';
import { POPERA_EMAIL } from '../src/constants/popera';
import { sanitizeFirestoreData } from '../utils/firestoreValidation';
import { seedCommunityEvents } from './seedCommunityEvents';

/**
 * Get or create user account for eatezca@gmail.com
 * Returns the user ID (uid)
 */
async function getOrCreateHostAccount(): Promise<string | null> {
  const db = getDbSafe();
  if (!db) {
    console.warn('[VERIFY_EVENTS] Firestore not available');
    return null;
  }

  try {
    // Method 1: Try to find existing user by email
    const usersCol = collection(db, 'users');
    const userQuery = query(usersCol, where('email', '==', POPERA_EMAIL));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      const userId = userSnapshot.docs[0].id;
      const userData = userSnapshot.docs[0].data();
      console.log('[VERIFY_EVENTS] ✅ Found existing user account:', userId, userData.email);
      return userId;
    }

    // Method 2: Try Firebase Auth (if user is logged in)
    try {
      const { getAuthSafe } = await import('../src/lib/firebase');
      const auth = getAuthSafe();
      if (auth?.currentUser?.email?.toLowerCase() === POPERA_EMAIL.toLowerCase()) {
        const userId = auth.currentUser.uid;
        console.log('[VERIFY_EVENTS] ✅ Found user via Auth:', userId);
        
        // Ensure user profile exists in Firestore
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          console.log('[VERIFY_EVENTS] Creating user profile in Firestore...');
          await setDoc(userRef, {
            uid: userId,
            id: userId,
            email: POPERA_EMAIL,
            name: 'Popera Community',
            displayName: 'Popera Community',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }, { merge: true });
          console.log('[VERIFY_EVENTS] ✅ Created user profile');
        }
        
        return userId;
      }
    } catch (error) {
      console.warn('[VERIFY_EVENTS] Could not access Auth:', error);
    }

    // Method 3: Create a new user document (if we have a way to generate ID)
    // For now, we'll need the user to be logged in or have an existing account
    console.warn('[VERIFY_EVENTS] ⚠️ User account not found. User must be logged in as', POPERA_EMAIL);
    console.warn('[VERIFY_EVENTS] Please log in as', POPERA_EMAIL, 'and try again');
    return null;
  } catch (error: any) {
    // Handle permission errors gracefully - don't spam console with errors
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.warn('[VERIFY_EVENTS] Permission denied when getting/creating host account (user may not be logged in)');
    } else {
      console.error('[VERIFY_EVENTS] Error getting/creating host account:', error);
    }
    return null;
  }
}

/**
 * Verify existing events match requirements
 */
async function verifyExistingEvents(hostId: string): Promise<{ correct: number; missing: number; incorrect: number }> {
  const db = getDbSafe();
  if (!db) return { correct: 0, missing: 0, incorrect: 0 };

  try {
    const eventsCol = collection(db, 'events');
    const hostQuery = query(eventsCol, where('hostId', '==', hostId));
    const eventsSnapshot = await getDocs(hostQuery);
    
    const existingEvents = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`[VERIFY_EVENTS] Found ${existingEvents.length} existing events for host ${hostId}`);

    // Expected event titles (from seedCommunityEvents.ts)
    const expectedTitles = [
      'Montreal Art Walk & Community Gathering',
      'Montreal Food Market Discovery & Tasting',
      'Toronto Music Scene Exploration & Meetup',
      'Toronto Wellness Workshop & Community Connection',
      'Vancouver Outdoor Adventure & Community Meetup',
      'Vancouver Creative Workshop & Networking',
      'Ottawa History Walk & Community Gathering',
      'Ottawa Market Day & Local Discovery',
      'Quebec City Cultural Tour & Community Meetup',
      'Quebec City Food & Culture Experience',
      'Gatineau Nature Walk & Community Connection',
      'Gatineau Local Art & Craft Discovery',
    ];

    let correct = 0;
    let incorrect = 0;
    const foundTitles = new Set<string>();

    for (const event of existingEvents) {
      const title = event.title as string;
      if (expectedTitles.includes(title)) {
        // Verify event is public and not draft
        const isPublic = event.isPublic !== false; // undefined or true = public
        const isDraft = event.isDraft === true;
        
        if (isPublic && !isDraft && event.price === 'Free') {
          correct++;
          foundTitles.add(title);
          console.log(`[VERIFY_EVENTS] ✅ Verified: ${title}`);
        } else {
          incorrect++;
          console.log(`[VERIFY_EVENTS] ⚠️ Event exists but incorrect: ${title}`, {
            isPublic: event.isPublic,
            isDraft: event.isDraft,
            price: event.price
          });
        }
      } else {
        // Event exists but not one of our expected events
        console.log(`[VERIFY_EVENTS] ℹ️ Other event found: ${title}`);
      }
    }

    const missing = expectedTitles.filter(title => !foundTitles.has(title)).length;

    return { correct, missing, incorrect };
  } catch (error) {
    console.error('[VERIFY_EVENTS] Error verifying events:', error);
    return { correct: 0, missing: 12, incorrect: 0 };
  }
}

/**
 * Main function to verify and seed community events
 */
export async function verifyAndSeedCommunityEvents(): Promise<void> {
  console.log('[VERIFY_EVENTS] Starting verification and seeding process...');

  // Step 1: Get or create host account
  const hostId = await getOrCreateHostAccount();
  if (!hostId) {
    // Use warn instead of error - this is expected when user is not logged in
    console.warn('[VERIFY_EVENTS] ⚠️ Cannot proceed without host account');
    console.warn('[VERIFY_EVENTS] Please ensure you are logged in as', POPERA_EMAIL);
    return;
  }

  console.log('[VERIFY_EVENTS] ✅ Host ID:', hostId);

  // Step 2: Verify existing events
  const verification = await verifyExistingEvents(hostId);
  console.log('[VERIFY_EVENTS] Verification results:', verification);

  // Step 3: If events are missing or incorrect, seed them
  if (verification.missing > 0 || verification.incorrect > 0) {
    console.log('[VERIFY_EVENTS] Missing or incorrect events detected. Seeding events...');
    try {
      await seedCommunityEvents();
      console.log('[VERIFY_EVENTS] ✅ Seeding completed');
      
      // Verify again after seeding
      const reVerification = await verifyExistingEvents(hostId);
      console.log('[VERIFY_EVENTS] Re-verification results:', reVerification);
    } catch (error) {
      console.error('[VERIFY_EVENTS] ❌ Error during seeding:', error);
    }
  } else {
    console.log('[VERIFY_EVENTS] ✅ All events are correct and present');
  }

  // Step 4: Final summary
  const finalVerification = await verifyExistingEvents(hostId);
  console.log('[VERIFY_EVENTS] 📊 Final status:', {
    correct: finalVerification.correct,
    missing: finalVerification.missing,
    incorrect: finalVerification.incorrect,
    totalExpected: 12
  });
}

