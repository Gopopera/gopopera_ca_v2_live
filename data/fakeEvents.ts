import { Event } from '../types';
import { FAKE_HOSTS } from './fakeHosts';

// Demo event locations per city
const DEMO_LOCATIONS: Record<string, { address: string; lat: number; lng: number }> = {
  'Vancouver': { address: 'Stanley Park, Seawall', lat: 49.3027, lng: -123.1417 },
  'Toronto': { address: 'Harbourfront Centre, 235 Queens Quay W', lat: 43.6332, lng: -79.3732 },
  'Montreal': { address: 'Place des Festivals, Quartier des Spectacles', lat: 45.5017, lng: -73.5673 },
  'Ottawa': { address: 'ByWard Market, 55 ByWard Market Square', lat: 45.4275, lng: -75.6931 },
  'Quebec': { address: 'Old Quebec, Rue Saint-Jean', lat: 46.8139, lng: -71.2080 },
  'Gatineau': { address: 'Canadian Museum of History, Laurier St', lat: 45.4292, lng: -75.7081 },
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
    
    events.push({
      id: `demo-${host.city.toLowerCase()}-showcase`,
      title: `${host.city} Pop-Up Showcase`,
      description: `Experience a live Popera demo in ${host.city}. This sample event highlights how hosts can bring locals together with clear details, RSVP flow, and discovery. Favoriting, search, and browsing are enabled for preview.`,
      city: host.city,
      address: location.address,
      date: '2026-03-01',
      time: '6:30 PM',
      tags: ['demo', 'community', 'local', 'popup'],
      host: host.name,
      hostName: host.name,
      hostId: host.id,
      imageUrl: `https://picsum.photos/seed/demo-${host.city.toLowerCase()}-showcase/800/600`,
      attendeesCount: Math.floor(Math.random() * 40) + 5,
      createdAt: new Date('2024-01-20').toISOString(),
      location: `${location.address}, ${host.city}`,
      category: 'Community',
      price: getRandomPrice(),
      rating: Math.round((4.4 + Math.random() * 0.6) * 10) / 10,
      reviewCount: Math.floor(Math.random() * 60) + 10,
      capacity: 60,
      lat: location.lat,
      lng: location.lng,
      isPoperaOwned: false,
      isFakeEvent: true,
      isDemo: true,
      isOfficialLaunch: false,
      aboutEvent: `This demo event is for display purposes so ${host.city} feeds are never empty. It shows how Popera events appear with host info, tags, and location.`,
      whatToExpect: `Browse the details, favorite, and search this event. Reservations and chat stay disabled because it's a fake listing for preview only.`,
    });
  });
  
  return events;
};
