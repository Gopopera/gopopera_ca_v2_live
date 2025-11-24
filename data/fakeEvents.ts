import { Event } from '../types';
import { FAKE_HOSTS } from './fakeHosts';

// Demo event locations per city
const DEMO_LOCATIONS: Record<string, { address: string; lat: number; lng: number }> = {
  'Vancouver': { address: 'Stanley Park, Seawall', lat: 49.3027, lng: -123.1417 },
  'Toronto': { address: 'Harbourfront Centre, 235 Queens Quay W', lat: 43.6332, lng: -79.3732 },
  'Montreal': { address: 'Place des Festivals, Quartier des Spectacles', lat: 45.5017, lng: -73.5673 },
};

// Generate random price between $5-$20
const getRandomPrice = (): string => {
  const price = Math.floor(Math.random() * 16) + 5; // 5-20
  return `$${price}.00`;
};

/**
 * Generates 3 demo events per city (one per value prop)
 * These are fake, non-reservable events for demonstration
 */
export const generateFakeEvents = (): Event[] => {
  const events: Event[] = [];
  
  FAKE_HOSTS.forEach((host) => {
    const location = DEMO_LOCATIONS[host.city] || { 
      address: `${host.city} Downtown`, 
      lat: 0, 
      lng: 0 
    };
    
    // 1. Sell & Shop Demo Event
    events.push({
      id: `demo-${host.city.toLowerCase()}-sell-shop`,
      title: `${host.city} Artisan Market: Local Crafts & Goods`,
      description: `Discover unique handmade items from local artisans. Support small businesses and find one-of-a-kind treasures. This is a demo event created to show Popera use-case examples.`,
      city: host.city,
      address: location.address,
      date: '2026-02-15', // Future date
      time: '11:00 AM',
      tags: ['market', 'shopping', 'local', 'artisan', 'demo'],
      host: host.name,
      hostName: host.name,
      hostId: host.id,
      imageUrl: 'https://picsum.photos/seed/demo-market-' + host.city.toLowerCase() + '/800/600',
      attendeesCount: Math.floor(Math.random() * 50) + 10,
      createdAt: new Date('2024-01-20').toISOString(),
      location: `${location.address}, ${host.city}`,
      category: 'Markets',
      price: getRandomPrice(),
      rating: Math.round((4.5 + Math.random() * 0.5) * 10) / 10, // 4.5-5.0, max 1 decimal
      reviewCount: Math.floor(Math.random() * 100) + 20, // Integer only
      capacity: 50,
      lat: location.lat,
      lng: location.lng,
      isPoperaOwned: false,
      isFakeEvent: true,
      isDemo: true,
      isOfficialLaunch: false,
      aboutEvent: `This is a demo event showcasing Popera's "Sell & Shop" value proposition. See how creators can set up their own marketplace events, manage vendors, and activate their local community.`,
      whatToExpect: `This demo shows how a real marketplace event would work on Popera. You can browse the event details, but reservations and chat are disabled for demo purposes.`,
    });

    // 2. Connect & Promote Demo Event
    events.push({
      id: `demo-${host.city.toLowerCase()}-connect-promote`,
      title: `${host.city} Creator Meetup: Networking & Collaboration`,
      description: `Connect with fellow creators, influencers, and community organizers. Share ideas, build connections, and strengthen your network. This is a demo event created to show Popera use-case examples.`,
      city: host.city,
      address: location.address,
      date: '2026-02-20',
      time: '6:00 PM',
      tags: ['networking', 'creators', 'community', 'social', 'demo'],
      host: host.name,
      hostName: host.name,
      hostId: host.id,
      imageUrl: 'https://picsum.photos/seed/demo-networking-' + host.city.toLowerCase() + '/800/600',
      attendeesCount: Math.floor(Math.random() * 50) + 10,
      createdAt: new Date('2024-01-20').toISOString(),
      location: `${location.address}, ${host.city}`,
      category: 'Social',
      price: getRandomPrice(),
      rating: Math.round((4.5 + Math.random() * 0.5) * 10) / 10, // 4.5-5.0, max 1 decimal
      reviewCount: Math.floor(Math.random() * 100) + 20, // Integer only
      capacity: 50,
      lat: location.lat + 0.01,
      lng: location.lng + 0.01,
      isPoperaOwned: false,
      isFakeEvent: true,
      isDemo: true,
      isOfficialLaunch: false,
      aboutEvent: `This is a demo event showcasing Popera's "Connect & Promote" value proposition. See how creators build their profiles, connect with their audience, and use Popera's tools to grow their community.`,
      whatToExpect: `This demo shows how a real networking event would work on Popera. You can browse the event details, but reservations and chat are disabled for demo purposes.`,
    });

    // 3. Mobilize & Support Demo Event
    events.push({
      id: `demo-${host.city.toLowerCase()}-mobilize-support`,
      title: `${host.city} Community Gathering: Local Impact Event`,
      description: `Join us for a community gathering focused on local impact and support. Connect with neighbors, share resources, and strengthen our community bonds. This is a demo event created to show Popera use-case examples.`,
      city: host.city,
      address: location.address,
      date: '2026-02-25',
      time: '2:00 PM',
      tags: ['community', 'fundraiser', 'wellness', 'demo'],
      host: host.name,
      hostName: host.name,
      hostId: host.id,
      imageUrl: 'https://picsum.photos/seed/demo-community-' + host.city.toLowerCase() + '/800/600',
      attendeesCount: Math.floor(Math.random() * 50) + 10,
      createdAt: new Date('2024-01-20').toISOString(),
      location: `${location.address}, ${host.city}`,
      category: 'Community',
      price: getRandomPrice(),
      rating: Math.round((4.5 + Math.random() * 0.5) * 10) / 10, // 4.5-5.0, max 1 decimal
      reviewCount: Math.floor(Math.random() * 100) + 20, // Integer only
      capacity: 50,
      lat: location.lat - 0.01,
      lng: location.lng - 0.01,
      isPoperaOwned: false,
      isFakeEvent: true,
      isDemo: true,
      isOfficialLaunch: false,
      aboutEvent: `This is a demo event showcasing Popera's "Mobilize & Support" value proposition. See how community organizers can create events, raise funds, and mobilize their crowd for causes.`,
      whatToExpect: `This demo shows how a real community event would work on Popera. You can browse the event details, but reservations and chat are disabled for demo purposes.`,
    });
  });
  
  return events;
};
