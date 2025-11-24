/**
 * Demo Event Seeding System
 * Idempotent seeding of demo events for Popera host
 * Only accessible to eatezca@gmail.com
 */

import { auth } from '../src/lib/firebase';
import { getDbSafe } from '../src/lib/firebase';
import { collection, doc, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { createEvent } from './db';
import { createOrUpdateUserProfile } from './db';
import { POPERA_EMAIL, POPERA_HOST_ID, POPERA_HOST_NAME } from '../stores/userStore';
import type { FirestoreEvent } from './types';
import type { Event } from '../types';

interface DemoEventConfig {
  title: string;
  description: string;
  city: string;
  category: Event['category'];
  date: string; // ISO date string
  time: string;
  price: string;
  tags: string[];
  demoPurpose: string;
  theme: 'early-user' | 'sell-shop' | 'connect-promote' | 'mobilize-support';
}

/**
 * Generate deterministic event ID from config
 */
function getDemoEventId(city: string, theme: string, index: number): string {
  const citySlug = city.toLowerCase().replace(/\s+/g, '-');
  const themeSlug = theme.replace(/-/g, '');
  return `demo-${citySlug}-${themeSlug}-${index}`;
}

/**
 * Seed demo events for Popera host (idempotent)
 */
export async function seedDemoEventsForPoperaHost(options?: { dryRun?: boolean }): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  // Check authentication
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    console.warn('[DEMO SEED] User not authenticated');
    throw new Error('User must be authenticated to seed demo events');
  }

  if (firebaseUser.email !== POPERA_EMAIL) {
    console.warn(`[DEMO SEED] Access denied. Expected ${POPERA_EMAIL}, got ${firebaseUser.email}`);
    return; // Silently return - not an error, just not authorized
  }

  const hostUid = firebaseUser.uid;
  const dryRun = options?.dryRun || false;

  if (dryRun) {
    console.log('[DEMO SEED] DRY RUN MODE - No writes will be performed');
  }

  try {
    // Ensure Popera profile exists with demo host flag
    if (!dryRun) {
      await createOrUpdateUserProfile(hostUid, {
        displayName: POPERA_HOST_NAME,
        name: POPERA_HOST_NAME,
        email: POPERA_EMAIL,
        bio: "This is a Popera demo host profile used to showcase example use case scenarios. These events are not real and cannot be actually attended — they exist to help you imagine what you could host yourself.",
        isDemoHost: true,
      });
      console.log('[DEMO SEED] Popera profile updated with isDemoHost: true');
    } else {
      console.log('[DEMO SEED] Would update Popera profile with isDemoHost: true');
    }

    // Define demo events per city
    const cities = ['Montreal', 'Ottawa', 'Toronto', 'Quebec'];
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const demoEvents: DemoEventConfig[] = [];

    // For each city, create demo events
    cities.forEach(city => {
      // 2 "early user" events
      demoEvents.push({
        title: `Popera Q&A: Learn How to Host Your First Pop-Up in ${city}`,
        description: `Join us for an interactive Q&A session about hosting your first pop-up event in ${city}. This is a demo event to help you explore Popera's features and understand how to create your own events. Ask questions, see how reservations work, and imagine what you could host!`,
        city,
        category: 'Community',
        date: nextWeek.toISOString().split('T')[0],
        time: '18:00',
        price: 'Free',
        tags: ['Q&A', 'Workshop', 'Community'],
        demoPurpose: 'Demo Popera event — an example scenario for early users to explore the app, ask questions, and connect with others.',
        theme: 'early-user',
      });

      demoEvents.push({
        title: `Meet Other Early Popera Hosts (Demo Event – Ask Anything)`,
        description: `Connect with other early Popera users and hosts in ${city}. This demo event shows how Popera helps you build a community around your events. Explore the group chat, see how announcements work, and learn from others who are imagining their own pop-ups.`,
        city,
        category: 'Social',
        date: twoWeeks.toISOString().split('T')[0],
        time: '19:00',
        price: 'Free',
        tags: ['Networking', 'Community', 'Social'],
        demoPurpose: 'Demo Popera event — an example scenario for early users to explore the app, ask questions, and connect with others.',
        theme: 'early-user',
      });

      // Sell & Shop example
      demoEvents.push({
        title: `Garage-Style Pop Shop Demo — See How Popera Handles Local Sales`,
        description: `This demo event shows how Popera can power neighborhood pop-up sales and micro-vendor markets in ${city}. See how reservations work for limited spots, how group chat helps coordinate, and how transparent reviews build trust. This is an example scenario — not a real sale.`,
        city,
        category: 'Markets',
        date: nextWeek.toISOString().split('T')[0],
        time: '10:00',
        price: 'Free',
        tags: ['Markets', 'Shopping', 'Local'],
        demoPurpose: 'Demo Popera event — an example scenario for early users to explore the app, ask questions, and connect with others.',
        theme: 'sell-shop',
      });

      // Connect & Promote example
      demoEvents.push({
        title: `Creator Coffee Chat Demo — Ask Popera Anything About Building Your Crowd`,
        description: `This demo event demonstrates how creators, influencers, and organizers can use Popera to activate their audience in ${city}. See how group chats work, how announcements keep people engaged, and how RSVPs help you plan. This is an example — not a real meetup.`,
        city,
        category: 'Social',
        date: twoWeeks.toISOString().split('T')[0],
        time: '14:00',
        price: 'Free',
        tags: ['Creators', 'Networking', 'Community'],
        demoPurpose: 'Demo Popera event — an example scenario for early users to explore the app, ask questions, and connect with others.',
        theme: 'connect-promote',
      });

      // Mobilize & Support example
      demoEvents.push({
        title: `Community Causes Demo — Imagine Your Local Support Circle with Popera`,
        description: `This demo event shows how Popera can help rally people around causes and grassroots initiatives in ${city}. See how group coordination works, how announcements mobilize action, and how transparent communication builds trust. This is an example scenario — not a real event.`,
        city,
        category: 'Community',
        date: nextWeek.toISOString().split('T')[0],
        time: '16:00',
        price: 'Free',
        tags: ['Community', 'Support', 'Causes'],
        demoPurpose: 'Demo Popera event — an example scenario for early users to explore the app, ask questions, and connect with others.',
        theme: 'mobilize-support',
      });
    });

    // Process each demo event (idempotent)
    for (let i = 0; i < demoEvents.length; i++) {
      const config = demoEvents[i];
      // Create deterministic ID based on city and theme index (0-4 for the 5 event types per city)
      const themeIndex = i % 5;
      const eventId = getDemoEventId(config.city, config.theme, themeIndex);

      if (dryRun) {
        console.log(`[DEMO SEED] Would create/update event: ${eventId} - ${config.title}`);
        continue;
      }

      try {
        // Check if event already exists
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);

        const eventData: Omit<Event, 'id' | 'createdAt' | 'location' | 'hostName' | 'attendees'> = {
          title: config.title,
          description: config.description,
          city: config.city,
          address: '', // Demo events don't need real addresses
          date: config.date,
          time: config.time,
          tags: config.tags,
          host: POPERA_HOST_NAME,
          hostId: hostUid,
          imageUrl: `https://picsum.photos/seed/demo-${eventId}/800/600`,
          category: config.category,
          price: config.price,
          attendeesCount: 0,
          isDemo: true,
          demoPurpose: config.demoPurpose,
          isPoperaOwned: false, // Demo events are not "official" Popera events
          isOfficialLaunch: false,
        };

        if (eventSnap.exists()) {
          // Update existing event
          const existingData = eventSnap.data() as FirestoreEvent;
          await setDoc(eventRef, {
            ...existingData,
            title: config.title,
            description: config.description,
            demoPurpose: config.demoPurpose,
            updatedAt: Date.now(),
          }, { merge: true });
          console.log(`[DEMO SEED] Updated existing event: ${eventId}`);
        } else {
          // Create new event directly with deterministic ID
          const firestoreEventData: Omit<FirestoreEvent, 'id'> = {
            title: config.title,
            description: config.description,
            city: config.city,
            address: '',
            location: config.city,
            date: config.date,
            time: config.time,
            price: config.price,
            category: config.category,
            tags: config.tags,
            host: POPERA_HOST_NAME,
            hostName: POPERA_HOST_NAME,
            hostId: hostUid,
            imageUrl: `https://picsum.photos/seed/demo-${eventId}/800/600`,
            rating: 0,
            reviewCount: 0,
            attendeesCount: 0,
            createdAt: Date.now(),
            isDemo: true,
            demoPurpose: config.demoPurpose,
            isPoperaOwned: false,
            isOfficialLaunch: false,
          };
          
          await setDoc(eventRef, {
            id: eventId,
            ...firestoreEventData,
          });
          console.log(`[DEMO SEED] Created new event: ${eventId}`);
        }
      } catch (error: any) {
        console.error(`[DEMO SEED] Error processing event ${eventId}:`, error.message);
        // Continue with next event even if one fails
      }
    }

    console.log(`[DEMO SEED] Completed seeding ${demoEvents.length} demo events`);
  } catch (error: any) {
    console.error('[DEMO SEED] Error seeding demo events:', error);
    throw error;
  }
}

