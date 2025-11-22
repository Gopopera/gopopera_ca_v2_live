import { Event } from '../types';
import { FAKE_HOSTS } from './fakeHosts';

// Generate fake events - 1 per fake host
export const generateFakeEvents = (): Event[] => {
  const events: Event[] = [];
  
  FAKE_HOSTS.forEach((host, index) => {
    // Determine event details based on host use case
    let eventData: Partial<Event> = {};
    
    switch (host.useCase) {
      case 'musician':
        eventData = {
          title: `Live Acoustic Session: ${host.city} Music Night`,
          description: `Join us for an intimate acoustic music session featuring local artists. Experience live performances in a cozy setting.`,
          category: 'Music' as const,
          price: index % 2 === 0 ? '$15.00' : 'Free',
          imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2070&auto=format&fit=crop',
          tags: ['music', 'acoustic', 'live-performance', 'entertainment'],
        };
        break;
        
      case 'fitness-coach':
        eventData = {
          title: `Morning Yoga Flow: ${host.city} Park Session`,
          description: `Start your day with a rejuvenating yoga session in the park. All levels welcome. Bring your mat and join our community.`,
          category: 'Wellness' as const,
          price: index % 2 === 0 ? '$12.00' : 'Free',
          imageUrl: 'https://images.unsplash.com/photo-1544367563-12123d8965cd?q=80&w=2070&auto=format&fit=crop',
          tags: ['yoga', 'wellness', 'fitness', 'outdoor'],
        };
        break;
        
      case 'art-workshop':
        eventData = {
          title: `Pottery Workshop: ${host.city} Creative Session`,
          description: `Learn the basics of pottery in this hands-on workshop. Create your own ceramic piece to take home.`,
          category: 'Workshop' as const,
          price: index % 2 === 0 ? '$45.00' : 'Free',
          imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a64eb732e26?q=80&w=2070&auto=format&fit=crop',
          tags: ['workshop', 'pottery', 'art', 'creative'],
        };
        break;
        
      case 'small-business':
        eventData = {
          title: `${host.city} Artisan Market: Local Crafts & Goods`,
          description: `Discover unique handmade items from local artisans. Support small businesses and find one-of-a-kind treasures.`,
          category: 'Market' as const,
          price: 'Free',
          imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
          tags: ['market', 'shopping', 'local', 'artisan'],
        };
        break;
        
      case 'community-organizer':
        eventData = {
          title: `${host.city} Community Meetup: Networking & Social`,
          description: `Connect with neighbors and community members. Share ideas, build connections, and strengthen our local network.`,
          category: 'Social' as const,
          price: 'Free',
          imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop',
          tags: ['networking', 'community', 'social', 'meetup'],
        };
        break;
    }
    
    // Set city-specific location
    const locations: Record<string, { address: string; lat: number; lng: number }> = {
      'Vancouver': { address: 'Stanley Park, Seawall', lat: 49.3027, lng: -123.1417 },
      'Toronto': { address: 'Harbourfront Centre, 235 Queens Quay W', lat: 43.6332, lng: -79.3732 },
      'Montreal': { address: 'Place des Festivals, Quartier des Spectacles', lat: 45.5017, lng: -73.5673 },
      'Calgary': { address: 'Prince\'s Island Park, Central Plaza', lat: 51.0447, lng: -114.0719 },
      'Ottawa': { address: 'ByWard Market, 55 ByWard Market Square', lat: 45.4215, lng: -75.6972 },
    };
    
    const location = locations[host.city] || { address: `${host.city} Downtown`, lat: 0, lng: 0 };
    
    // Create event date (various dates in 2026)
    const eventDates = [
      '2026-03-15',
      '2026-03-22',
      '2026-04-05',
      '2026-04-12',
      '2026-04-19',
      '2026-05-03',
      '2026-05-10',
      '2026-05-17',
      '2026-05-24',
      '2026-06-01',
    ];
    
    const event: Event = {
      id: `fake-event-${host.id}`,
      title: eventData.title!,
      description: eventData.description!,
      city: host.city,
      address: location.address,
      date: eventDates[index % eventDates.length],
      time: host.useCase === 'fitness-coach' ? '8:00 AM' : host.useCase === 'musician' ? '7:30 PM' : '2:00 PM',
      tags: eventData.tags || [],
      host: host.name,
      hostName: host.name,
      hostId: host.id,
      imageUrl: eventData.imageUrl!,
      attendeesCount: Math.floor(Math.random() * 50) + 10, // Fake static count
      createdAt: new Date('2024-01-20').toISOString(),
      location: `${location.address}, ${host.city}`,
      category: eventData.category!,
      price: eventData.price!,
      rating: 4.5 + Math.random() * 0.5, // Fake rating
      reviewCount: Math.floor(Math.random() * 100) + 20, // Fake review count
      capacity: 50,
      lat: location.lat,
      lng: location.lng,
      isPoperaOwned: false,
      isFakeEvent: true,
    };
    
    events.push(event);
  });
  
  return events;
};


