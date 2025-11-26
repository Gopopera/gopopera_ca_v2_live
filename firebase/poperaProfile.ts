/**
 * Popera Profile Management
 * Ensures Popera account has correct profile fields and seeds launch events
 */

import { getDbSafe } from "../src/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { FirestoreUser, FirestoreEvent } from "./types";
import { POPERA_EMAIL } from "../stores/userStore";
import { sanitizeFirestoreData } from "../utils/firestoreValidation";
import { createOrUpdateUserProfile } from "./db";
import type { User } from "firebase/auth";
import { seedPoperaLaunchEventsForUser } from "./demoSeed";

const POPERA_DEMO_BIO =
  "This is a Popera demo host for example scenarios. These events are examples only.";

/**
 * Ensure Popera profile has correct fields
 * Called after successful login for eatezca@gmail.com
 */
export async function ensurePoperaProfileAndSeed(user: User) {
  if (!user || !user.uid) {
    console.log('[POPERA_SEED] Missing user, skipping');
    return;
  }
  console.log('[POPERA_SEED] ensurePoperaProfileAndSeed called for', user.uid, user.email);
  console.log('[POPERA_SEED] ensurePoperaProfileAndSeed starting, user.uid:', user.uid);

  if (!user.email) {
    console.log('[POPERA_SEED] No email on user, skipping');
    return;
  }

  const email = user.email.toLowerCase().trim();
  if (email !== POPERA_EMAIL) {
    console.log('[POPERA_SEED] Not Popera account, skipping seeding');
    return;
  }

  try {
    await createOrUpdateUserProfile(user.uid, {
      uid: user.uid,
      email: POPERA_EMAIL,
      displayName: "Popera",
      name: "Popera",
      isOfficialHost: true,
      isDemoHost: true,
      isVerified: true,
      isPoperaDemoHost: true,
      bio: POPERA_DEMO_BIO,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[POPERA_SEED] Profile ensure failed but continuing', error);
  }

  console.log('[POPERA_SEED] Profile ensured for Popera user', user.uid);

  try {
    // Ensure exactly 1 event per city (manageable events)
    await ensureOneEventPerCity(user.uid);
    console.log('[POPERA_SEED] City events ensured for Popera user', user.uid);
  } catch (error) {
    console.error('[POPERA_SEED] City events seeding failed for Popera user', user.uid, error);
  }
}

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
      bio: POPERA_DEMO_BIO,
      isVerified: true,
      isDemoHost: true,
      isPoperaDemoHost: true,
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
 * Ensure exactly 1 event exists per city
 * Creates events with random categories, always free, infinite capacity
 * Called to maintain exactly 1 manageable event per city
 */
export async function ensureOneEventPerCity(hostUid: string): Promise<void> {
  console.log('[CITY_EVENT] Ensuring one event per city for user', hostUid);
  
  const db = getDbSafe();
  if (!db) {
    console.warn('[CITY_EVENT] Firestore not available');
    return;
  }

  try {
    const eventsCol = collection(db, "events");
    
    // Define all cities that should have exactly 1 event
    const cities = [
      { name: "Montreal, CA", slug: "montreal" },
      { name: "Toronto, CA", slug: "toronto" },
      { name: "Vancouver, CA", slug: "vancouver" },
      { name: "Ottawa, CA", slug: "ottawa" },
      { name: "Quebec City, CA", slug: "quebec" },
      { name: "Gatineau, CA", slug: "gatineau" },
      { name: "Calgary, CA", slug: "calgary" },
      { name: "Edmonton, CA", slug: "edmonton" },
    ];

    // Random categories for variety
    const categories = ['Music', 'Community', 'Markets', 'Workshop', 'Wellness', 'Shows', 'Food & Drink', 'Sports', 'Social'];
    
    // Calculate dates: today + 7 days, 2 hour duration
    const now = new Date();
    const startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    let createdCount = 0;
    let skippedCount = 0;

    for (const city of cities) {
      try {
        // Check if event already exists for this city (managed by Popera)
        const cityQuery = query(
          eventsCol,
          where("city", "==", city.name),
          where("managedBy", "==", POPERA_EMAIL)
        );
        const citySnap = await getDocs(cityQuery);
        
        if (citySnap.size > 0) {
          console.log(`[CITY_EVENT] Event already exists for ${city.name}, skipping`);
          skippedCount++;
          continue;
        }

        // Pick random category
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        
        // Generate event title based on category
        const eventTitles: Record<string, string> = {
          'Music': `Community Music Gathering in ${city.name.split(',')[0]}`,
          'Community': `Local Community Meetup in ${city.name.split(',')[0]}`,
          'Markets': `Pop-Up Market in ${city.name.split(',')[0]}`,
          'Workshop': `Creative Workshop in ${city.name.split(',')[0]}`,
          'Wellness': `Wellness Session in ${city.name.split(',')[0]}`,
          'Shows': `Local Showcase in ${city.name.split(',')[0]}`,
          'Food & Drink': `Food & Drink Social in ${city.name.split(',')[0]}`,
          'Sports': `Sports Activity in ${city.name.split(',')[0]}`,
          'Social': `Social Gathering in ${city.name.split(',')[0]}`,
        };

        // Generate searchable description with keywords
        const cityName = city.name.split(',')[0];
        const descriptions: Record<string, string> = {
          'Music': `Join us for a community music gathering in ${cityName}. Discover local musicians, enjoy live performances, and connect with music lovers in your area. Free event open to everyone.`,
          'Community': `Local community meetup in ${cityName}. Connect with neighbors, share ideas, and build meaningful relationships. Everyone is welcome to join this free community gathering.`,
          'Markets': `Pop-up market in ${cityName}. Explore local vendors, unique products, and support local businesses. Free to attend, open to all.`,
          'Workshop': `Creative workshop in ${cityName}. Learn new skills, meet like-minded people, and explore your creativity. Free workshop for all skill levels.`,
          'Wellness': `Wellness session in ${cityName}. Join us for activities focused on health, mindfulness, and well-being. Free event open to everyone.`,
          'Shows': `Local showcase in ${cityName}. Experience performances, exhibitions, and local talent. Free event, all are welcome.`,
          'Food & Drink': `Food and drink social in ${cityName}. Sample local flavors, meet food enthusiasts, and enjoy good company. Free event.`,
          'Sports': `Sports activity in ${cityName}. Join us for friendly games, exercise, and active fun. Free event for all fitness levels.`,
          'Social': `Social gathering in ${cityName}. Meet new people, make friends, and enjoy good conversation. Free event open to everyone.`,
        };

        const eventData: Omit<FirestoreEvent, 'id'> = {
          title: eventTitles[randomCategory] || `Community Event in ${cityName}`,
          description: descriptions[randomCategory] || `Join us for a ${randomCategory.toLowerCase()} event in ${cityName}. This is a community gathering open to everyone.`,
          date: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
          time: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
          price: "Free",
          category: randomCategory,
          city: city.name,
          address: "",
          location: city.name,
          tags: [randomCategory, "Community", cityName, "Free", "Popera", "Local"],
          host: "Popera",
          hostName: "Popera",
          hostId: hostUid,
          imageUrl: `https://picsum.photos/seed/popera-${city.slug}-${randomCategory}/800/600`,
          rating: 0,
          reviewCount: 0,
          attendeesCount: 0,
          createdAt: Date.now(),
          isDemo: false, // Not a demo - real manageable events
          managedBy: POPERA_EMAIL,
          isPoperaOwned: true,
          isOfficialLaunch: false,
          startDate: startDate.getTime(),
          endDate: endDate.getTime(),
          isPublic: true, // ✅ Will appear in all feeds
          allowChat: true,
          allowRsvp: true,
          // No capacity field = infinite limit
        };

        console.log(`[CITY_EVENT] Creating event for ${city.name} (${randomCategory})`);
        const sanitizedEvent = sanitizeFirestoreData(eventData);
        const docRef = await addDoc(eventsCol, sanitizedEvent);
        console.log(`[CITY_EVENT] ✅ Created event ${docRef.id} for ${city.name}`);
        createdCount++;
      } catch (error: any) {
        console.error(`[CITY_EVENT] ❌ Failed to create event for ${city.name}:`, error.message || error);
        // Continue with next city even if one fails
      }
    }

    console.log(`[CITY_EVENT] Completed: ${createdCount} created, ${skippedCount} already existed`);
  } catch (error: any) {
    console.error('[CITY_EVENT] Error ensuring events per city:', error.message || error);
  }
}

/**
 * Seed Popera launch events for 5 cities
 * Called once after Popera profile is updated
 * @deprecated Use ensureOneEventPerCity instead
 */
export async function seedPoperaLaunchEvents(hostUid: string): Promise<void> {
  // Redirect to new function
  await ensureOneEventPerCity(hostUid);
}
