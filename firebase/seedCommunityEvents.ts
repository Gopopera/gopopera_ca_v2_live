/**
 * Seed community events for eatezca@gmail.com account
 * Creates 2 events per city in different categories
 * All events are public, free, with unlimited capacity
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { geocodeAddress } from '../utils/geocoding';
import { POPERA_EMAIL } from '../stores/userStore';
import { sanitizeFirestoreData } from '../utils/firestoreValidation';
import type { FirestoreEvent } from './types';

interface CityEventConfig {
  city: string;
  events: Array<{
    title: string;
    category: string;
    description: string;
    whatToExpect: string;
    address: string;
    date: string;
    time: string;
    tags: string[];
  }>;
}

const EVENT_CONFIGS: CityEventConfig[] = [
  {
    city: 'Montreal, CA',
    events: [
      {
        title: 'Montreal Art Walk & Community Gathering',
        category: 'Community',
        description: 'Join us for an inspiring evening walk through Montreal\'s vibrant art scene, followed by a community gathering where we\'ll exchange ideas, share experiences, and connect with fellow early adopters. This is a chance to meet like-minded individuals, brainstorm together, and spark meaningful connections through our group chat platform. Let\'s build something amazing together before our official launch.',
        whatToExpect: 'Connect with early users and community members, ask questions directly to our team, and test our platform features before launch. Share your ideas, provide feedback, and help shape the future of local community engagement.',
        address: 'Place des Arts, 175 Sainte-Catherine St W, Montreal, QC H2X 1Z9',
        date: 'Sat, May 10',
        time: '2:00 PM',
        tags: ['art', 'community', 'networking', 'walking tour']
      },
      {
        title: 'Montreal Food Market Discovery & Tasting',
        category: 'Food & Drink',
        description: 'Explore Montreal\'s incredible food markets and join us for a tasting experience where we\'ll discover local flavors together. This gathering is designed to bring our community closer, exchange culinary ideas, and connect through meaningful conversations. Use our group chat to coordinate, share recommendations, and build connections that extend beyond this event.',
        whatToExpect: 'Connect with early users and community members, ask questions directly to our team, and test our platform features before launch. Share your ideas, provide feedback, and help shape the future of local community engagement.',
        address: 'Jean-Talon Market, 7070 Avenue Henri Julien, Montreal, QC H2S 3S3',
        date: 'Sun, May 11',
        time: '11:00 AM',
        tags: ['food', 'market', 'tasting', 'local']
      }
    ]
  },
  {
    city: 'Toronto, CA',
    events: [
      {
        title: 'Toronto Music Scene Exploration & Meetup',
        category: 'Music',
        description: 'Discover Toronto\'s thriving music scene with fellow community members. We\'ll explore local venues, share our favorite spots, and connect through music. This gathering is all about bringing people together, exchanging ideas about the local music culture, and building connections that matter. Join our group chat to coordinate, share playlists, and continue the conversation.',
        whatToExpect: 'Connect with early users and community members, ask questions directly to our team, and test our platform features before launch. Share your ideas, provide feedback, and help shape the future of local community engagement.',
        address: 'Harbourfront Centre, 235 Queens Quay W, Toronto, ON M5J 2G8',
        date: 'Sat, May 10',
        time: '4:00 PM',
        tags: ['music', 'exploration', 'venues', 'community']
      },
      {
        title: 'Toronto Wellness Workshop & Community Connection',
        category: 'Wellness',
        description: 'Join us for a wellness workshop focused on mindfulness and community connection. We\'ll practice together, share techniques, and build meaningful relationships. This event is designed to bring our community closer, exchange wellness ideas, and create lasting connections through our group chat platform. Let\'s grow together before our official launch.',
        whatToExpect: 'Connect with early users and community members, ask questions directly to our team, and test our platform features before launch. Share your ideas, provide feedback, and help shape the future of local community engagement.',
        address: 'Trinity Bellwoods Park, 790 Queen St W, Toronto, ON M6J 1G3',
        date: 'Sun, May 11',
        time: '10:00 AM',
        tags: ['wellness', 'mindfulness', 'workshop', 'community']
      }
    ]
  },
  {
    city: 'Vancouver, CA',
    events: [
      {
        title: 'Vancouver Outdoor Adventure & Community Meetup',
        category: 'Sports',
        description: 'Experience Vancouver\'s beautiful outdoors with a community adventure. We\'ll explore scenic trails, share outdoor tips, and connect with nature enthusiasts. This gathering brings our community together to exchange ideas, share experiences, and build connections through our group chat. Join us to brainstorm, connect, and prepare for an amazing launch.',
        whatToExpect: 'Connect with early users and community members, ask questions directly to our team, and test our platform features before launch. Share your ideas, provide feedback, and help shape the future of local community engagement.',
        address: 'Stanley Park, Vancouver, BC V6G 3E2',
        date: 'Sat, May 10',
        time: '9:00 AM',
        tags: ['outdoor', 'adventure', 'hiking', 'nature']
      },
      {
        title: 'Vancouver Creative Workshop & Networking',
        category: 'Workshop',
        description: 'Join us for a creative workshop where we\'ll explore local art techniques and connect with fellow creators. This event is designed to bring our community together, exchange creative ideas, and spark meaningful connections. Use our group chat to share your work, get feedback, and continue building relationships beyond this gathering.',
        whatToExpect: 'Connect with early users and community members, ask questions directly to our team, and test our platform features before launch. Share your ideas, provide feedback, and help shape the future of local community engagement.',
        address: 'Granville Island, Vancouver, BC V6H 3T2',
        date: 'Sun, May 11',
        time: '2:00 PM',
        tags: ['creative', 'workshop', 'art', 'networking']
      }
    ]
  },
  {
    city: 'Ottawa, CA',
    events: [
      {
        title: 'Ottawa History Walk & Community Gathering',
        category: 'Community',
        description: 'Explore Ottawa\'s rich history with a guided walk through the capital, followed by a community gathering. We\'ll learn together, exchange ideas about local history, and connect with fellow community members. This event brings people together to brainstorm, share knowledge, and build meaningful connections through our group chat platform.',
        whatToExpect: 'Connect with early users and community members, ask questions directly to our team, and test our platform features before launch. Share your ideas, provide feedback, and help shape the future of local community engagement.',
        address: 'Parliament Hill, Wellington St, Ottawa, ON K1A 0A6',
        date: 'Sat, May 10',
        time: '1:00 PM',
        tags: ['history', 'walking tour', 'community', 'education']
      },
      {
        title: 'Ottawa Market Day & Local Discovery',
        category: 'Markets',
        description: 'Join us for a day exploring Ottawa\'s local markets and discovering amazing local products. We\'ll shop together, share finds, and connect with vendors and community members. This gathering is all about bringing people together, exchanging ideas about local commerce, and building connections that extend beyond this event through our group chat.',
        whatToExpect: 'Connect with early users and community members, ask questions directly to our team, and test our platform features before launch. Share your ideas, provide feedback, and help shape the future of local community engagement.',
        address: 'ByWard Market, 55 ByWard Market Square, Ottawa, ON K1N 9C3',
        date: 'Sun, May 11',
        time: '10:00 AM',
        tags: ['market', 'local', 'shopping', 'discovery']
      }
    ]
  },
  {
    city: 'Quebec City, CA',
    events: [
      {
        title: 'Quebec City Cultural Tour & Community Meetup',
        category: 'Shows',
        description: 'Experience Quebec City\'s vibrant culture with a tour of local venues and cultural sites, followed by a community meetup. We\'ll explore together, share cultural insights, and connect with fellow enthusiasts. This event brings our community closer to exchange ideas, spark conversations, and build lasting connections through our group chat platform.',
        whatToExpect: 'Connect with early users and community members, ask questions directly to our team, and test our platform features before launch. Share your ideas, provide feedback, and help shape the future of local community engagement.',
        address: 'Place Royale, Quebec City, QC G1K 4G1',
        date: 'Sat, May 10',
        time: '3:00 PM',
        tags: ['culture', 'tour', 'community', 'heritage']
      },
      {
        title: 'Quebec City Food & Culture Experience',
        category: 'Food & Drink',
        description: 'Discover Quebec City\'s culinary heritage with a food and culture experience. We\'ll taste local specialties, learn about traditions, and connect with fellow food lovers. This gathering is designed to bring our community together, exchange culinary ideas, and create meaningful connections through our group chat. Join us to share, learn, and connect.',
        whatToExpect: 'Connect with early users and community members, ask questions directly to our team, and test our platform features before launch. Share your ideas, provide feedback, and help shape the future of local community engagement.',
        address: 'Rue du Petit-Champlain, Quebec City, QC G1K 4H4',
        date: 'Sun, May 11',
        time: '12:00 PM',
        tags: ['food', 'culture', 'culinary', 'heritage']
      }
    ]
  },
  {
    city: 'Gatineau, CA',
    events: [
      {
        title: 'Gatineau Nature Walk & Community Connection',
        category: 'Wellness',
        description: 'Join us for a peaceful nature walk in Gatineau\'s beautiful parks, followed by a community connection session. We\'ll explore nature together, share wellness tips, and connect with fellow outdoor enthusiasts. This event brings our community closer to exchange ideas, practice mindfulness, and build meaningful connections through our group chat.',
        whatToExpect: 'Connect with early users and community members, ask questions directly to our team, and test our platform features before launch. Share your ideas, provide feedback, and help shape the future of local community engagement.',
        address: 'Gatineau Park, Chelsea, QC J9B 1T5',
        date: 'Sat, May 10',
        time: '10:00 AM',
        tags: ['nature', 'wellness', 'walking', 'community']
      },
      {
        title: 'Gatineau Local Art & Craft Discovery',
        category: 'Community',
        description: 'Explore Gatineau\'s local art scene with a discovery tour of galleries and craft studios. We\'ll meet local artists, share our appreciation for art, and connect with creative community members. This gathering is all about bringing people together, exchanging artistic ideas, and building connections that extend beyond this event through our group chat.',
        whatToExpect: 'Connect with early users and community members, ask questions directly to our team, and test our platform features before launch. Share your ideas, provide feedback, and help shape the future of local community engagement.',
        address: 'Old Hull, Gatineau, QC J8X 3X7',
        date: 'Sun, May 11',
        time: '2:00 PM',
        tags: ['art', 'craft', 'local', 'discovery']
      }
    ]
  }
];

/**
 * Get host ID for eatezca@gmail.com
 */
async function getHostId(): Promise<string | null> {
  const db = getDbSafe();
  if (!db) {
    console.warn('[SEED_COMMUNITY_EVENTS] Firestore not available');
    return null;
  }

  try {
    const usersCol = collection(db, 'users');
    const userQuery = query(usersCol, where('email', '==', POPERA_EMAIL));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      console.warn('[SEED_COMMUNITY_EVENTS] User not found:', POPERA_EMAIL);
      return null;
    }
    
    return userSnapshot.docs[0].id;
  } catch (error) {
    console.error('[SEED_COMMUNITY_EVENTS] Error fetching host ID:', error);
    return null;
  }
}

/**
 * Seed community events for all cities
 */
export async function seedCommunityEvents(): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    console.warn('[SEED_COMMUNITY_EVENTS] Firestore not available');
    return;
  }

  const hostId = await getHostId();
  if (!hostId) {
    console.error('[SEED_COMMUNITY_EVENTS] Could not find host ID for', POPERA_EMAIL);
    return;
  }

  console.log('[SEED_COMMUNITY_EVENTS] Starting to seed community events...');
  console.log('[SEED_COMMUNITY_EVENTS] Host ID:', hostId);

  let createdCount = 0;
  let skippedCount = 0;

  for (const cityConfig of EVENT_CONFIGS) {
    for (const eventConfig of cityConfig.events) {
      try {
        // Check if event already exists (by title and city)
        const eventsCol = collection(db, 'events');
        const existingQuery = query(
          eventsCol,
          where('title', '==', eventConfig.title),
          where('city', '==', cityConfig.city),
          where('hostId', '==', hostId)
        );
        const existingSnapshot = await getDocs(existingQuery);

        if (!existingSnapshot.empty) {
          console.log(`[SEED_COMMUNITY_EVENTS] Event already exists: ${eventConfig.title} in ${cityConfig.city}`);
          skippedCount++;
          continue;
        }

        // Geocode address
        let lat: number | undefined;
        let lng: number | undefined;
        try {
          const coords = await geocodeAddress(eventConfig.address);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
            console.log(`[SEED_COMMUNITY_EVENTS] Geocoded ${eventConfig.address}:`, coords);
          }
        } catch (error) {
          console.warn(`[SEED_COMMUNITY_EVENTS] Geocoding failed for ${eventConfig.address}:`, error);
        }

        // Create event data
        const eventData: Omit<FirestoreEvent, 'id'> = {
          title: eventConfig.title,
          description: eventConfig.description,
          date: eventConfig.date,
          time: eventConfig.time,
          price: 'Free',
          category: eventConfig.category,
          city: cityConfig.city,
          address: eventConfig.address,
          location: eventConfig.address,
          tags: eventConfig.tags,
          host: 'Popera Community',
          hostName: 'Popera Community',
          hostId: hostId,
          imageUrl: '', // Will be set by user or default
          imageUrls: [],
          rating: 0,
          reviewCount: 0,
          attendeesCount: 0,
          createdAt: Date.now(),
          lat,
          lng,
          isPoperaOwned: false, // Not marked as Popera-owned
          isDemo: false, // Not a demo event
          isOfficialLaunch: false, // Not official launch
          aboutEvent: eventConfig.description,
          whatToExpect: eventConfig.whatToExpect,
          capacity: undefined, // Unlimited capacity
          // CRITICAL: Don't set isPublic or isDraft - let them default to public/non-draft
          // These fields will be removed by sanitizeFirestoreData, making events public by default
          allowChat: true,
          allowRsvp: true,
        };

        // Remove undefined values before sanitizing (sanitizeFirestoreData uses JSON.stringify which removes undefined)
        // This ensures isPublic and isDraft are not set, making events public by default
        const cleanedEventData: any = {};
        for (const [key, value] of Object.entries(eventData)) {
          if (value !== undefined) {
            cleanedEventData[key] = value;
          }
        }

        // Sanitize event data - removes any remaining undefined values
        const sanitizedEventData = sanitizeFirestoreData(cleanedEventData);

        // Add to Firestore with sanitized data
        await addDoc(eventsCol, sanitizedEventData);
        console.log(`[SEED_COMMUNITY_EVENTS] ✅ Created: ${eventConfig.title} in ${cityConfig.city}`);
        createdCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`[SEED_COMMUNITY_EVENTS] ❌ Error creating ${eventConfig.title} in ${cityConfig.city}:`, error);
      }
    }
  }

  console.log(`[SEED_COMMUNITY_EVENTS] ✅ Completed: ${createdCount} created, ${skippedCount} skipped`);
}

