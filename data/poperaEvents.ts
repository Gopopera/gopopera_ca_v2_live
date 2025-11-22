import { Event } from '../types';
import { POPERA_HOST_ID, POPERA_HOST_NAME } from '../stores/userStore';

// Cities for Popera events
const CITIES = [
  { name: 'Vancouver', lat: 49.2827, lng: -123.1207 },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832 },
  { name: 'Montreal', lat: 45.5017, lng: -73.5673 },
  { name: 'Calgary', lat: 51.0447, lng: -114.0719 },
  { name: 'Ottawa', lat: 45.4215, lng: -75.6972 },
];

// Official Popera events - 3 per city (Sell & Shop, Connect & Promote, Mobilize & Support)
export const generatePoperaEvents = (): Event[] => {
  const events: Event[] = [];
  const eventDate = '2026-02-01';

  CITIES.forEach((city, cityIndex) => {
    // 1. Sell & Shop event
    events.push({
      id: `popera-${city.name.toLowerCase()}-sell-${cityIndex}`,
      title: `Popera Marketplace: ${city.name} Local Artisan Fair`,
      description: `Join us for ${city.name}'s first Popera marketplace! Discover local artisans, creators, and small businesses selling unique products. This event demonstrates how Popera helps you sell tickets and manage your pop-up marketplace.`,
      city: city.name,
      address: city.name === 'Vancouver' ? 'Stanley Park, Seawall Plaza' : 
               city.name === 'Toronto' ? 'Harbourfront Centre, 235 Queens Quay W' :
               city.name === 'Montreal' ? 'Place des Festivals, Quartier des Spectacles' :
               city.name === 'Calgary' ? 'Prince\'s Island Park, Central Plaza' :
               'ByWard Market, 55 ByWard Market Square',
      date: eventDate,
      time: '10:00 AM',
      tags: ['marketplace', 'shopping', 'local', 'artisan', 'popera'],
      host: POPERA_HOST_NAME,
      hostName: POPERA_HOST_NAME,
      hostId: POPERA_HOST_ID,
      imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
      attendeesCount: 0, // Starts at 0, increases with real RSVPs
      createdAt: new Date('2024-01-15').toISOString(),
      location: city.name === 'Vancouver' ? 'Stanley Park, Seawall Plaza, Vancouver' :
                city.name === 'Toronto' ? 'Harbourfront Centre, 235 Queens Quay W, Toronto' :
                city.name === 'Montreal' ? 'Place des Festivals, Quartier des Spectacles, Montreal' :
                city.name === 'Calgary' ? 'Prince\'s Island Park, Central Plaza, Calgary' :
                'ByWard Market, 55 ByWard Market Square, Ottawa',
      category: 'Market',
      price: 'Free',
      rating: 0,
      reviewCount: 0,
      capacity: undefined, // No limit
      lat: city.lat,
      lng: city.lng,
      isPoperaOwned: true,
      isFakeEvent: false,
      aboutEvent: `This marketplace event showcases Popera's "Sell & Shop" value proposition. Learn how to create your own pop-up marketplace, sell tickets, manage vendors, and activate your local community. Perfect for artisans, creators, and small business owners looking to host their own events.`,
      whatToExpect: `This is a hub for early Popera users to learn, interact, and ask questions. You'll see how Popera's marketplace features work in real-time, meet other creators, and discover how to create your own pop-up events. The group chat is open to everyone—no reservation needed!`,
    });

    // 2. Connect & Promote event
    events.push({
      id: `popera-${city.name.toLowerCase()}-connect-${cityIndex}`,
      title: `Popera Networking: ${city.name} Creator Meetup`,
      description: `Connect with fellow creators, influencers, and community organizers in ${city.name}. This networking event demonstrates how Popera helps you build your profile, connect with your audience, and promote your events.`,
      city: city.name,
      address: city.name === 'Vancouver' ? 'Café Medina, 780 Richards St' :
               city.name === 'Toronto' ? 'Pilot Coffee Roasters, 50 Wagstaff Dr' :
               city.name === 'Montreal' ? 'Café Olimpico, 124 Rue Saint-Viateur O' :
               city.name === 'Calgary' ? 'Phil & Sebastian Coffee Roasters, 220 42 Ave SE' :
               'Bridgehead Coffee, 366 Bank St',
      date: eventDate,
      time: '2:00 PM',
      tags: ['networking', 'creators', 'community', 'social', 'popera'],
      host: POPERA_HOST_NAME,
      hostName: POPERA_HOST_NAME,
      hostId: POPERA_HOST_ID,
      imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop',
      attendeesCount: 0,
      createdAt: new Date('2024-01-15').toISOString(),
      location: city.name === 'Vancouver' ? 'Café Medina, 780 Richards St, Vancouver' :
                city.name === 'Toronto' ? 'Pilot Coffee Roasters, 50 Wagstaff Dr, Toronto' :
                city.name === 'Montreal' ? 'Café Olimpico, 124 Rue Saint-Viateur O, Montreal' :
                city.name === 'Calgary' ? 'Phil & Sebastian Coffee Roasters, 220 42 Ave SE, Calgary' :
                'Bridgehead Coffee, 366 Bank St, Ottawa',
      category: 'Social',
      price: 'Free',
      rating: 0,
      reviewCount: 0,
      capacity: undefined,
      lat: city.lat + 0.01,
      lng: city.lng + 0.01,
      isPoperaOwned: true,
      isFakeEvent: false,
      aboutEvent: `This networking event showcases Popera's "Connect & Promote" value proposition. See how creators build their profiles, connect with their audience, and use Popera's tools to grow their community. Perfect for influencers, content creators, and community organizers.`,
      whatToExpect: `Join early Popera users for networking, Q&A, and hands-on learning. You'll discover how to build your Popera profile, connect with your crowd, and learn best practices from the Popera team. The group chat is open—ask questions anytime!`,
    });

    // 3. Mobilize & Support event
    events.push({
      id: `popera-${city.name.toLowerCase()}-mobilize-${cityIndex}`,
      title: `Popera Community Run: ${city.name} Fundraiser`,
      description: `Join us for a community run/walk fundraiser in ${city.name}. This event demonstrates how Popera helps you mobilize your community for causes, raise funds, and create impact. All proceeds support local community initiatives.`,
      city: city.name,
      address: city.name === 'Vancouver' ? 'Stanley Park, Lost Lagoon' :
               city.name === 'Toronto' ? 'High Park, Bloor St W entrance' :
               city.name === 'Montreal' ? 'Mount Royal Park, Beaver Lake' :
               city.name === 'Calgary' ? 'Nose Hill Park, 14 St NW entrance' :
               'Rideau Canal, Colonel By Drive',
      date: eventDate,
      time: '8:00 AM',
      tags: ['fitness', 'fundraiser', 'community', 'wellness', 'popera'],
      host: POPERA_HOST_NAME,
      hostName: POPERA_HOST_NAME,
      hostId: POPERA_HOST_ID,
      imageUrl: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=2070&auto=format&fit=crop',
      attendeesCount: 0,
      createdAt: new Date('2024-01-15').toISOString(),
      location: city.name === 'Vancouver' ? 'Stanley Park, Lost Lagoon, Vancouver' :
                city.name === 'Toronto' ? 'High Park, Bloor St W entrance, Toronto' :
                city.name === 'Montreal' ? 'Mount Royal Park, Beaver Lake, Montreal' :
                city.name === 'Calgary' ? 'Nose Hill Park, 14 St NW entrance, Calgary' :
                'Rideau Canal, Colonel By Drive, Ottawa',
      category: 'Sports',
      price: '$10.00',
      rating: 0,
      reviewCount: 0,
      capacity: undefined,
      lat: city.lat - 0.01,
      lng: city.lng - 0.01,
      isPoperaOwned: true,
      isFakeEvent: false,
      aboutEvent: `This fundraiser event showcases Popera's "Mobilize & Support" value proposition. Learn how to organize community events, raise funds, and create real-world impact. Perfect for community organizers, non-profits, and anyone looking to mobilize their crowd for a cause.`,
      whatToExpect: `Join early Popera users for a morning run/walk and learn how Popera helps you mobilize communities. You'll see fundraising features in action, meet other organizers, and discover how to create your own community events. Chat is open—connect with the team!`,
    });
  });

  return events;
};


