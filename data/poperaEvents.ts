import { Event } from '../types';
import { POPERA_HOST_ID, POPERA_HOST_NAME } from '../stores/userStore';

// Official Popera Launch Cities - One event per value prop per city
const LAUNCH_CITIES = [
  { name: 'Vancouver', lat: 49.2827, lng: -123.1207, landmark: 'Stanley Park, Seawall Plaza' },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, landmark: 'Nathan Phillips Square' },
  { name: 'Montreal', lat: 45.5017, lng: -73.5673, landmark: 'Parc La Fontaine' },
];

// Official launch date and time
const LAUNCH_DATE = '2026-01-31';
const LAUNCH_TIME = '5:00 PM';

/**
 * Generates 3 official Popera launch events (one per value prop)
 * These are real, reservable events hosted by Popera
 */
export const generatePoperaEvents = (): Event[] => {
  const events: Event[] = [];

  LAUNCH_CITIES.forEach((city, cityIndex) => {
    // 1. Sell & Shop - Official Launch Event
    events.push({
      id: `popera-launch-${city.name.toLowerCase()}-sell-shop`,
      title: `Official Launch: Sell & Shop with Popera`,
      description: `Join Popera's official launch event in ${city.name}! This marketplace event showcases how Popera helps you sell tickets and manage your pop-up marketplace. Discover local artisans, creators, and small businesses selling unique products.`,
      city: city.name,
      address: city.landmark,
      date: LAUNCH_DATE,
      time: LAUNCH_TIME,
      tags: ['marketplace', 'shopping', 'local', 'artisan', 'popera', 'launch'],
      host: POPERA_HOST_NAME,
      hostName: POPERA_HOST_NAME,
      hostId: POPERA_HOST_ID,
      imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
      attendeesCount: 0, // Starts at 0, increases with real RSVPs
      createdAt: new Date('2024-01-15').toISOString(),
      location: `${city.landmark}, ${city.name}`,
      category: 'Market',
      price: 'Free',
      rating: 0,
      reviewCount: 0,
      capacity: undefined, // No limit
      lat: city.lat,
      lng: city.lng,
      isPoperaOwned: true,
      isFakeEvent: false,
      isOfficialLaunch: true,
      aboutEvent: `This is part of Popera's official launch. Early users are invited to reserve and join the group conversation. You can meet other early users, ask questions, collaborate, find partners, and connect with the Popera team. This helps shape Popera's direction through early-stage community feedback.`,
      whatToExpect: `Meet locals interested in creative buying and selling pop-ups. You'll see how Popera's marketplace features work in real-time, meet other creators, and discover how to create your own pop-up events. The group chat is open to all reservers—connect with the community!`,
    });

    // 2. Connect & Promote - Official Launch Event
    events.push({
      id: `popera-launch-${city.name.toLowerCase()}-connect-promote`,
      title: `Official Launch: Connect & Promote with Popera`,
      description: `Join Popera's official launch event in ${city.name}! This networking event showcases how Popera helps you build your profile, connect with your audience, and promote your events. Connect with fellow creators, influencers, and community organizers.`,
      city: city.name,
      address: city.landmark,
      date: LAUNCH_DATE,
      time: LAUNCH_TIME,
      tags: ['networking', 'creators', 'community', 'social', 'popera', 'launch'],
      host: POPERA_HOST_NAME,
      hostName: POPERA_HOST_NAME,
      hostId: POPERA_HOST_ID,
      imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop',
      attendeesCount: 0,
      createdAt: new Date('2024-01-15').toISOString(),
      location: `${city.landmark}, ${city.name}`,
      category: 'Social',
      price: 'Free',
      rating: 0,
      reviewCount: 0,
      capacity: undefined,
      lat: city.lat + 0.01,
      lng: city.lng + 0.01,
      isPoperaOwned: true,
      isFakeEvent: false,
      isOfficialLaunch: true,
      aboutEvent: `This is part of Popera's official launch. Early users are invited to reserve and join the group conversation. You can meet other early users, ask questions, collaborate, find partners, and connect with the Popera team. This helps shape Popera's direction through early-stage community feedback.`,
      whatToExpect: `Meet creators, hosts, brands, and experience builders. You'll discover how to build your Popera profile, connect with your crowd, and learn best practices from the Popera team. The group chat is open to all reservers—ask questions anytime!`,
    });

    // 3. Mobilize & Support - Official Launch Event
    events.push({
      id: `popera-launch-${city.name.toLowerCase()}-mobilize-support`,
      title: `Official Launch: Mobilize & Support with Popera`,
      description: `Join Popera's official launch event in ${city.name}! This community event showcases how Popera helps you mobilize your community for causes, raise funds, and create impact. Connect with community organizers and learn how to create meaningful gatherings.`,
      city: city.name,
      address: city.landmark,
      date: LAUNCH_DATE,
      time: LAUNCH_TIME,
      tags: ['community', 'fundraiser', 'wellness', 'popera', 'launch'],
      host: POPERA_HOST_NAME,
      hostName: POPERA_HOST_NAME,
      hostId: POPERA_HOST_ID,
      imageUrl: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=2070&auto=format&fit=crop',
      attendeesCount: 0,
      createdAt: new Date('2024-01-15').toISOString(),
      location: `${city.landmark}, ${city.name}`,
      category: 'Community',
      price: 'Free',
      rating: 0,
      reviewCount: 0,
      capacity: undefined,
      lat: city.lat - 0.01,
      lng: city.lng - 0.01,
      isPoperaOwned: true,
      isFakeEvent: false,
      isOfficialLaunch: true,
      aboutEvent: `This is part of Popera's official launch. Early users are invited to reserve and join the group conversation. You can meet other early users, ask questions, collaborate, find partners, and connect with the Popera team. This helps shape Popera's direction through early-stage community feedback.`,
      whatToExpect: `Meet people who want to bring communities together. You'll see how Popera helps you mobilize communities, meet other organizers, and discover how to create your own community events. The group chat is open to all reservers—connect with the team!`,
    });
  });

  return events;
};
