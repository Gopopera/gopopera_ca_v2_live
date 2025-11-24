/**
 * Popera Profile Management
 * Ensures Popera account has correct profile fields and seeds launch events
 */

import { getDbSafe } from "../src/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, setDoc, addDoc } from "firebase/firestore";
import { FirestoreUser, FirestoreEvent } from "./types";
import { POPERA_EMAIL } from "../stores/userStore";
import { sanitizeFirestoreData } from "../utils/firestoreValidation";

/**
 * Ensure Popera profile has correct fields
 * Called after successful login for eatezca@gmail.com
 */
export async function ensurePoperaProfile(uid: string, email: string): Promise<void> {
  if (email !== POPERA_EMAIL) {
    return; // Only update Popera account
  }

  console.log('[POPERA_SEED] Ensuring Popera profile for user', uid, email);

  const db = getDbSafe();
  if (!db) {
    console.warn('[POPERA_SEED] Firestore not available');
    return;
  }

  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    const updateData: Partial<FirestoreUser> = {
      displayName: "Popera",
      username: "Popera",
      bio: "Official Popera host account used for launch events, onboarding, and example use cases.",
      isVerified: true,
      isDemoHost: true,
      updatedAt: Date.now(),
    };

    if (userSnap.exists()) {
      // Update existing profile (merge to preserve existing stats)
      await setDoc(userRef, updateData, { merge: true });
      console.log('[POPERA_SEED] Updated Popera profile successfully');
    } else {
      // Create new profile with all required fields
      await setDoc(userRef, {
        id: uid,
        uid: uid,
        name: "Popera",
        email: email,
        ...updateData,
        createdAt: Date.now(),
      });
      console.log('[POPERA_SEED] Created Popera profile successfully');
    }
  } catch (error: any) {
    console.error('[POPERA_SEED] Error updating profile:', error.message || error);
    // Don't throw - this should not block login
  }
}

/**
 * Seed Popera launch events for 5 cities
 * Called once after Popera profile is updated
 */
export async function seedPoperaLaunchEvents(hostUid: string): Promise<void> {
  console.log('[POPERA_SEED] Starting seeding for user', hostUid);
  
  const db = getDbSafe();
  if (!db) {
    console.warn('[POPERA_SEED] Firestore not available');
    return;
  }

  try {
    // Check if launch events already exist (idempotent check)
    const eventsCol = collection(db, "events");
    const existingQuery = query(
      eventsCol,
      where("demoType", "==", "city-launch"),
      where("managedBy", "==", POPERA_EMAIL)
    );
    const existingSnap = await getDocs(existingQuery);
    
    if (existingSnap.size > 0) {
      console.log('[POPERA_SEED] Demo city-launch events already exist, skipping.');
      console.log(`[POPERA_SEED] Found ${existingSnap.size} existing city-launch events`);
      return;
    }
    
    console.log('[POPERA_SEED] No existing city-launch events found, proceeding with seeding');

    // Calculate dates: today + 3 days, 2 hour duration
    const now = new Date();
    const startDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    const cities = [
      { name: "Ottawa-Gatineau", slug: "ottawa-gatineau" },
      { name: "Montréal", slug: "montreal" },
      { name: "Toronto", slug: "toronto" },
      { name: "Vancouver", slug: "vancouver" },
      { name: "Québec City", slug: "quebec-city" },
    ];

    const eventsToCreate = cities.map(city => {
      const eventData: Omit<FirestoreEvent, 'id'> = {
        title: `Popera Launch Meetup — ${city.name}`,
        description: "This Popera launch meetup is an opportunity to connect with early users, ask questions about the platform, and discover how Popera helps you bring your crowd anywhere. This is an example event and may be updated as we onboard new users.",
        date: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
        time: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
        price: "Free",
        category: "Community",
        city: city.name,
        address: "",
        location: city.name,
        tags: ["Popera", "Community", "Launch", "Meetup"],
        host: "Popera",
        hostName: "Popera",
        hostId: hostUid,
        imageUrl: `https://picsum.photos/seed/popera-launch-${city.slug}/800/600`,
        rating: 0,
        reviewCount: 0,
        attendeesCount: 0,
        createdAt: Date.now(),
        isDemo: true,
        demoType: "city-launch",
        managedBy: POPERA_EMAIL,
        isPoperaOwned: false,
        isOfficialLaunch: false,
        subtitle: "Join us, ask questions, and meet early users from your city.",
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
        isPublic: true,
        allowChat: true,
        allowRsvp: true,
      };

      return eventData;
    });

    // Create all events
    let successCount = 0;
    for (const eventData of eventsToCreate) {
      try {
        console.log('[POPERA_SEED] Creating event for city', eventData.city);
        const sanitizedEvent = sanitizeFirestoreData(eventData);
        const docRef = await addDoc(eventsCol, sanitizedEvent);
        console.log('[POPERA_SEED] Created event', docRef.id, 'for city', eventData.city);
        successCount++;
      } catch (error: any) {
        console.error('[POPERA_SEED] Failed to create event for city', eventData.city, error);
        // Continue with next event even if one fails
      }
    }

    console.log(`[POPERA_SEED] Successfully seeded ${successCount}/${eventsToCreate.length} launch events`);
  } catch (error: any) {
    console.error('[POPERA_SEED] Error seeding events:', error.message || error);
    // Don't throw - this should not block login
  }
}

