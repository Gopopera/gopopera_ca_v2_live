
import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './pages/LandingPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { EventFeed } from './components/events/EventFeed';
import { GroupChat } from './components/chat/GroupChat';
import { ReviewsModal } from './components/events/ReviewsModal';
import { HostProfile } from './components/profile/HostProfile';
import { AboutPage } from './pages/AboutPage';
import { CareersPage } from './pages/CareersPage';
import { ContactPage } from './pages/ContactPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { CancellationPage } from './pages/CancellationPage';
import { GuidelinesPage } from './pages/GuidelinesPage';
import { ReportPage } from './pages/ReportPage';
import { HelpPage } from './pages/HelpPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { MyPopsPage } from './pages/MyPopsPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { MyCalendarPage } from './pages/MyCalendarPage';
import { DeleteAccountPage } from './pages/DeleteAccountPage';
import { CreateEventPage } from './pages/CreateEventPage';

// Consoldiated Imports
import { BasicDetailsPage, NotificationSettingsPage, PrivacySettingsPage, StripeSettingsPage, MyReviewsPage } from './pages/ProfileSubPages';

import { Event, ViewState } from './types';
import { Search, ArrowRight, MapPin, PlusCircle } from 'lucide-react';
import { EventCard } from './components/events/EventCard';
import { useEventStore } from './stores/eventStore';
import { useUserStore } from './stores/userStore';
import { generatePoperaEvents } from './data/poperaEvents';
import { generateFakeEvents } from './data/fakeEvents';
import { categoryMatches } from './utils/categoryMapper';
// Note: firebase/db functions are imported dynamically to avoid circular dependencies

// Mock Data Generator - Initial seed data
const generateMockEvents = (): Event[] => [
  {
    id: '1',
    title: 'Urban Garden Workshop & Community Lunch',
    date: 'Sat, Oct 14',
    time: '11:00 AM',
    location: 'The Green House, Downtown',
    hostName: 'Sarah Jenkins',
    host: 'Sarah Jenkins',
    category: 'Workshop',
    imageUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?q=80&w=2070&auto=format&fit=crop',
    price: '$25.00',
    description: 'Learn how to grow your own vegetables in small urban spaces. Join us for a hands-on workshop followed by a farm-to-table lunch.',
    rating: 4.9,
    reviewCount: 84,
    attendees: 18,
    attendeesCount: 18,
    capacity: 25,
    city: 'Montreal',
    address: 'The Green House, Downtown',
    tags: ['workshop', 'community', 'food'],
    createdAt: new Date('2024-10-01').toISOString()
  },
  {
    id: '2',
    title: 'Sunset Jazz on the Rooftop',
    date: 'Fri, Oct 20',
    time: '7:30 PM',
    location: 'Skyline Lounge, Montreal',
    hostName: 'Marcus Cole',
    host: 'Marcus Cole',
    category: 'Music',
    imageUrl: 'https://images.unsplash.com/photo-1514525253440-b3933311f725?q=80&w=2078&auto=format&fit=crop',
    price: '$45.00',
    description: 'Enjoy an evening of smooth jazz on the rooftop with stunning city views.',
    rating: 4.7,
    reviewCount: 126,
    attendees: 85,
    attendeesCount: 85,
    capacity: 100,
    city: 'Montreal',
    address: 'Skyline Lounge',
    tags: ['music', 'jazz', 'nightlife'],
    createdAt: new Date('2024-10-05').toISOString()
  },
  {
    id: '3',
    title: 'Local Makers Market Fall Edition',
    date: 'Sun, Oct 22',
    time: '10:00 AM',
    location: 'Heritage Hall, Toronto',
    hostName: 'Creative Collective',
    host: 'Creative Collective',
    category: 'Market',
    imageUrl: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?q=80&w=2070&auto=format&fit=crop',
    price: 'Free',
    description: 'Discover unique handmade items from local artisans and creators.',
    rating: 4.8,
    reviewCount: 210,
    attendees: 450,
    attendeesCount: 450,
    capacity: 1000,
    city: 'Toronto',
    address: 'Heritage Hall',
    tags: ['market', 'shopping', 'local', 'artisan'],
    createdAt: new Date('2024-10-01').toISOString()
  },
  {
    id: '4',
    title: 'Charity Run for Clean Water',
    date: 'Sat, Oct 28',
    time: '8:00 AM',
    location: 'Riverfront Park, Vancouver',
    hostName: 'Global Aid Org',
    host: 'Global Aid Org',
    category: 'Community',
    imageUrl: 'https://images.unsplash.com/photo-1552674605-469523170d9e?q=80&w=2070&auto=format&fit=crop',
    price: 'Donation',
    description: 'Join us for a charity run to support clean water initiatives worldwide.',
    rating: 5.0,
    reviewCount: 42,
    attendees: 120,
    attendeesCount: 120,
    capacity: 500,
    city: 'Vancouver',
    address: 'Riverfront Park',
    tags: ['community', 'charity', 'fitness', 'social'],
    createdAt: new Date('2024-09-25').toISOString()
  },
  {
    id: '5',
    title: 'Pottery for Beginners',
    date: 'Wed, Nov 1',
    time: '6:00 PM',
    location: 'Clay Studio, New York',
    hostName: 'Emma Wright',
    host: 'Emma Wright',
    category: 'Workshop',
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a64eb732e26?q=80&w=2070&auto=format&fit=crop',
    price: '$60.00',
    description: 'Learn the basics of pottery in this hands-on workshop for beginners.',
    rating: 4.6,
    reviewCount: 35,
    attendees: 8,
    attendeesCount: 8,
    capacity: 10,
    city: 'New York',
    address: 'Clay Studio',
    tags: ['workshop', 'art', 'creative'],
    createdAt: new Date('2024-10-15').toISOString()
  },
  {
    id: '6',
    title: 'Tech Networking Night',
    date: 'Thu, Nov 2',
    time: '6:30 PM',
    location: 'Innovation Hub, San Francisco',
    hostName: 'TechCity',
    host: 'TechCity',
    category: 'Community',
    imageUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=2070&auto=format&fit=crop',
    price: 'Free',
    description: 'Connect with fellow tech professionals and entrepreneurs.',
    rating: 4.5,
    reviewCount: 156,
    attendees: 90,
    attendeesCount: 90,
    capacity: 150,
    city: 'San Francisco',
    address: 'Innovation Hub',
    tags: ['networking', 'tech', 'community', 'business'],
    createdAt: new Date('2024-10-10').toISOString()
  },
  {
    id: '7',
    title: 'Morning Yoga Flow in the Park',
    date: 'Sat, Nov 4',
    time: '9:00 AM',
    location: 'City Central Park, Austin',
    hostName: 'Yoga With Anna',
    host: 'Yoga With Anna',
    category: 'Wellness',
    imageUrl: 'https://images.unsplash.com/photo-1544367563-12123d8965cd?q=80&w=2070&auto=format&fit=crop',
    price: '$15.00',
    description: 'Start your weekend with a rejuvenating yoga session in the park.',
    rating: 4.9,
    reviewCount: 280,
    attendees: 45,
    attendeesCount: 45,
    capacity: 60,
    city: 'Austin',
    address: 'City Central Park',
    tags: ['wellness', 'yoga', 'fitness', 'outdoor'],
    createdAt: new Date('2024-10-01').toISOString()
  },
  {
    id: '8',
    title: 'Indie Film Screening: "Voices"',
    date: 'Sun, Nov 5',
    time: '8:00 PM',
    location: 'The Old Theater, London',
    hostName: 'Indie Cinema Club',
    host: 'Indie Cinema Club',
    category: 'Shows',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop',
    price: '$12.00',
    description: 'Join us for a screening of the independent film "Voices" followed by a Q&A with the director.',
    rating: 4.8,
    reviewCount: 67,
    attendees: 180,
    attendeesCount: 180,
    capacity: 200,
    city: 'London',
    address: 'The Old Theater',
    tags: ['shows', 'film', 'cinema', 'art'],
    createdAt: new Date('2024-10-12').toISOString()
  },
  {
    id: '9',
    title: 'Vegan Cooking Masterclass',
    date: 'Tue, Nov 7',
    time: '6:00 PM',
    location: 'Culinary Arts Center, Paris',
    hostName: 'Chef Mario',
    host: 'Chef Mario',
    category: 'Food & Drink',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070&auto=format&fit=crop',
    price: '$55.00',
    description: 'Learn to create delicious vegan dishes in this hands-on cooking masterclass.',
    rating: 4.7,
    reviewCount: 92,
    attendees: 12,
    attendeesCount: 12,
    capacity: 15,
    city: 'Paris',
    address: 'Culinary Arts Center',
    tags: ['food', 'cooking', 'vegan', 'workshop'],
    createdAt: new Date('2024-10-18').toISOString()
  },
  {
    id: '10',
    title: 'Live Acoustic Sessions',
    date: 'Fri, Nov 10',
    time: '8:00 PM',
    location: 'The Rustic Barn, Nashville',
    hostName: 'SoundWaves',
    host: 'SoundWaves',
    category: 'Music',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2070&auto=format&fit=crop',
    price: '$20.00',
    description: 'Enjoy intimate acoustic performances by local artists in a cozy setting.',
    rating: 4.8,
    reviewCount: 145,
    attendees: 75,
    attendeesCount: 75,
    capacity: 80,
    city: 'Nashville',
    address: 'The Rustic Barn',
    tags: ['music', 'acoustic', 'live', 'entertainment'],
    createdAt: new Date('2024-10-20').toISOString()
  },
  {
    id: '11',
    title: 'Startup Pitch Night',
    date: 'Wed, Nov 15',
    time: '7:00 PM',
    location: 'Co-Work Space A, Berlin',
    hostName: 'Venture Connect',
    host: 'Venture Connect',
    category: 'Community',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2032&auto=format&fit=crop',
    price: 'Free',
    description: 'Watch local startups pitch their ideas and network with entrepreneurs.',
    rating: 4.6,
    reviewCount: 88,
    attendees: 50,
    attendeesCount: 50,
    capacity: 100,
    city: 'Berlin',
    address: 'Co-Work Space A',
    tags: ['networking', 'startup', 'business', 'community'],
    createdAt: new Date('2024-10-25').toISOString()
  },
  {
    id: '12',
    title: 'Abstract Art Exhibition Opening',
    date: 'Sat, Nov 18',
    time: '6:00 PM',
    location: 'Modern Art Gallery, Amsterdam',
    hostName: 'Art Collective',
    host: 'Art Collective',
    category: 'Shows',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2071&auto=format&fit=crop',
    price: 'Free',
    description: 'Experience the opening of our latest abstract art exhibition featuring contemporary artists.',
    rating: 4.9,
    reviewCount: 53,
    attendees: 200,
    attendeesCount: 200,
    capacity: 300,
    city: 'Amsterdam',
    address: 'Modern Art Gallery',
    tags: ['art', 'exhibition', 'shows', 'culture'],
    createdAt: new Date('2024-10-28').toISOString()
  }
];

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  const [viewState, setViewState] = useState<ViewState>(ViewState.LANDING);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [reviewEvent, setReviewEvent] = useState<Event | null>(null); 
  const [selectedHost, setSelectedHost] = useState<string | null>(null); 
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  // Use Zustand stores
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  const ready = useUserStore((state) => state.ready);
  const addRSVP = useUserStore((state) => state.addRSVP);
  const removeRSVP = useUserStore((state) => state.removeRSVP);
  const addFavorite = useUserStore((state) => state.addFavorite);
  const removeFavorite = useUserStore((state) => state.removeFavorite);
  const updateEvent = useEventStore((state) => state.updateEvent);
  const currentUser = useUserStore((state) => state.getCurrentUser());
  
  // Backward compatibility with safe defaults - use nullish coalescing
  const isLoggedIn = !!user;
  const favorites = (user?.favorites ?? []);
  const rsvps = (user?.rsvps ?? []);
  
  // Use Zustand store for events (for backward compatibility with mock data)
  const storeEvents = useEventStore((state) => state.getEvents());
  const searchEvents = useEventStore((state) => state.searchEvents);
  const filterByCity = useEventStore((state) => state.filterByCity);
  const filterByTags = useEventStore((state) => state.filterByTags);
  const getEventsByCity = useEventStore((state) => state.getEventsByCity);
  
  // State for Firestore events
  const [firestoreEvents, setFirestoreEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Initialize auth listener on mount
  useEffect(() => {
    const initAuth = useUserStore.getState().initAuthListener;
    initAuth();
  }, []);

  // Handle redirect after successful login (including Google login)
  // Only redirect when userStore is ready and user is loaded
  useEffect(() => {
    if (ready && !loading && user && viewState === ViewState.AUTH) {
      // User just logged in, redirect to intended destination or FEED
      setViewState(redirectAfterLogin || ViewState.FEED);
      setRedirectAfterLogin(null);
    }
  }, [user, loading, ready, viewState, redirectAfterLogin]);
  
  // Load events from Firestore (with fallback to mock data)
  useEffect(() => {
    const loadFirestoreEvents = async () => {
      try {
        setLoadingEvents(true);
        // Dynamic import to avoid circular dependency
        const dbModule = await import('./firebase/db');
        const events = await dbModule.listUpcomingEvents();
        if (events.length > 0) {
          setFirestoreEvents(events);
        }
      } catch (error) {
        console.error("Error loading Firestore events:", error);
        // Fallback to mock data if Firestore fails
      } finally {
        setLoadingEvents(false);
      }
    };
    
    loadFirestoreEvents();
  }, []);
  
  // Initialize store with Popera events and fake events (first load only, as fallback)
  useEffect(() => {
    if (storeEvents.length === 0 && firestoreEvents.length === 0) {
      // 1. First, add official Popera launch events
      const poperaEvents = (generatePoperaEvents() ?? []);
      if (Array.isArray(poperaEvents)) {
        poperaEvents.forEach(event => {
          useEventStore.getState().addEvent({
            title: event.title,
            description: event.description,
            city: event.city,
            address: event.address,
            date: event.date,
            time: event.time,
            tags: event.tags,
            host: event.host,
            hostId: event.hostId,
            imageUrl: event.imageUrl,
            attendeesCount: 0, // Start at 0, will increase with real RSVPs
            category: event.category,
            price: event.price,
            rating: 0,
            reviewCount: 0,
            capacity: undefined,
            lat: event.lat,
            lng: event.lng,
            isPoperaOwned: true,
            isFakeEvent: false,
            isOfficialLaunch: event.isOfficialLaunch || false,
            aboutEvent: event.aboutEvent,
            whatToExpect: event.whatToExpect,
          });
        });
      }
      
      // 2. Then, add fake demo events (3 per city, one per value prop)
      const fakeEvents = (generateFakeEvents() ?? []);
      if (Array.isArray(fakeEvents)) {
        fakeEvents.forEach(event => {
        useEventStore.getState().addEvent({
          title: event.title,
          description: event.description,
          city: event.city,
          address: event.address,
          date: event.date,
          time: event.time,
          tags: event.tags,
          host: event.host,
          hostId: event.hostId,
          imageUrl: event.imageUrl,
          attendeesCount: event.attendeesCount,
          category: event.category,
          price: event.price,
          rating: event.rating,
          reviewCount: event.reviewCount,
          capacity: event.capacity,
          lat: event.lat,
          lng: event.lng,
          isPoperaOwned: false,
          isFakeEvent: true,
          isDemo: true,
          isOfficialLaunch: false,
          aboutEvent: event.aboutEvent,
          whatToExpect: event.whatToExpect,
        });
      });
      }
    }
  }, []); // Only run once on mount
  
  // Update attendee counts when RSVPs change
  useEffect(() => {
    if (!user) return;
    
    // Count RSVPs per event (using current user's RSVPs only)
    const eventRSVPCounts: Record<string, number> = {};
    const userRSVPs = (user?.rsvps ?? []);
    
    // Safe forEach with array check
    if (Array.isArray(userRSVPs)) {
      userRSVPs.forEach(eventId => {
        if (eventId) {
          eventRSVPCounts[eventId] = (eventRSVPCounts[eventId] || 0) + 1;
        }
      });
    }
    
    // Update event attendee counts (only for Popera events)
    const safeStoreEvents = (storeEvents ?? []);
    if (Array.isArray(safeStoreEvents)) {
      safeStoreEvents.forEach(event => {
        if (event?.isPoperaOwned && event?.id && eventRSVPCounts[event.id] !== undefined) {
          const newCount = eventRSVPCounts[event.id];
          if (event.attendeesCount !== newCount) {
            updateEvent(event.id, { attendeesCount: newCount });
          }
        }
      });
    }
  }, [user?.rsvps, storeEvents, updateEvent, user]);
  
  // Get all events from store
  const allEvents = useEventStore((state) => state.getEvents());

  // Filter events based on search, location, category, and tags
  // Apply all filters in sequence for proper combined filtering
  // Filters work together: Category + City + Tags all apply simultaneously
  let filteredEvents = allEvents;
  
  // Apply search filter first (text search)
  if (searchQuery.trim()) {
    filteredEvents = searchEvents(searchQuery);
  }
  
  // Apply city filter (works with category and tags)
  if (location.trim()) {
    const cityName = location.split(',')[0].trim();
    filteredEvents = filteredEvents.filter(event => 
      event.city.toLowerCase().includes(cityName.toLowerCase())
    );
  }
  
  // Apply category filter (e.g., "Sports", "Community") - works with city and tags
  // Uses category mapper to handle plural/singular variations (e.g., "Markets" -> "Market")
  if (activeCategory !== 'All') {
    filteredEvents = filteredEvents.filter(event => 
      categoryMatches(event.category, activeCategory)
    );
  }
  
  
  // Group events by time periods for display
  const now = new Date();
  const thisWeekEvents = allEvents
    .filter(event => {
      // Simple date parsing - you may want to improve this
      return true; // For now, just show first 4
    })
    .slice(0, 4);
  const thisMonthEvents = allEvents.slice(4, 8);
  const laterEvents = allEvents.slice(8, 12);
  
  // Get events grouped by city
  const eventsByCity = getEventsByCity();

  const categories = [
    'All', 'Community', 'Music', 'Workshops', 'Markets', 'Sports', 'Social', 'Shows', 'Food & Drink', 'Wellness'
  ];

  const popularCities = [
    "Montreal, CA", "Toronto, CA", "Vancouver, CA", "Ottawa, CA", "Quebec City, CA", "Calgary, CA", "Edmonton, CA",
    "New York, US", "Los Angeles, US", "Chicago, US", "Houston, US", "Phoenix, US", "Philadelphia, US", "San Antonio, US", "San Diego, US", "Dallas, US", "San Jose, US", "Austin, US", "Jacksonville, US", "San Francisco, US", "Columbus, US", "Fort Worth, US", "Indianapolis, US", "Charlotte, US", "Seattle, US", "Denver, US", "Washington, US", "Boston, US", "El Paso, US", "Nashville, US", "Detroit, US", "Oklahoma City, US", "Portland, US", "Las Vegas, US", "Memphis, US", "Louisville, US", "Baltimore, US", "Milwaukee, US", "Albuquerque, US", "Tucson, US", "Fresno, US", "Mesa, US", "Sacramento, US", "Atlanta, US", "Kansas City, US", "Colorado Springs, US", "Omaha, US", "Raleigh, US", "Miami, US",
    "London, UK", "Paris, FR", "Berlin, DE", "Madrid, ES", "Rome, IT", "Amsterdam, NL", "Vienna, AT", "Brussels, BE", "Lisbon, PT", "Dublin, IE", "Zurich, CH", "Barcelona, ES", "Munich, DE", "Milan, IT", "Prague, CZ", "Warsaw, PL", "Budapest, HU", "Stockholm, SE", "Copenhagen, DK", "Oslo, NO", "Helsinki, FI", "Athens, GR", "Istanbul, TR"
  ];

  const filteredCities = popularCities.filter(city => 
    city.toLowerCase().includes(location.toLowerCase())
  );

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setViewState(ViewState.DETAIL);
    window.scrollTo(0, 0);
  };

  const handleChatClick = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setViewState(ViewState.CHAT);
  };
  
  const handleReviewsClick = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    setReviewEvent(event);
  };


  const handleHostClick = (hostName: string) => {
    setSelectedHost(hostName);
    setViewState(ViewState.HOST_PROFILE);
    window.scrollTo(0, 0);
  };

  const handleCloseChat = () => setViewState(ViewState.FEED);
  const handleViewDetailsFromChat = () => setViewState(ViewState.DETAIL);

  const [redirectAfterLogin, setRedirectAfterLogin] = useState<ViewState | null>(null);

  const handleProtectedNav = (view: ViewState) => {
    setRedirectAfterLogin(view);
    setViewState(ViewState.AUTH);
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const userStore = useUserStore.getState();
      await userStore.login(email, password);
      // Auth listener will update state automatically
      // Redirect to intended destination or default to FEED
      setViewState(redirectAfterLogin || ViewState.FEED);
      setRedirectAfterLogin(null);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };
  
  const handleLogout = async () => {
    try {
      await useUserStore.getState().logout();
      setViewState(ViewState.LANDING);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  
  const handleRSVP = (eventId: string) => {
    if (!user) {
      // Redirect to auth if not logged in
      setRedirectAfterLogin(ViewState.DETAIL);
      setViewState(ViewState.AUTH);
      return;
    }
    
    if (rsvps.includes(eventId)) {
      removeRSVP(user.uid || user.id || '', eventId);
      // Decrease attendee count for Popera events
      const event = storeEvents.find(e => e.id === eventId);
      if (event?.isPoperaOwned && event.attendeesCount > 0) {
        updateEvent(eventId, { attendeesCount: event.attendeesCount - 1 });
      }
    } else {
      addRSVP(user.uid || user.id || '', eventId);
      // Increase attendee count for Popera events
      const event = storeEvents.find(e => e.id === eventId);
      if (event?.isPoperaOwned) {
        updateEvent(eventId, { attendeesCount: (event.attendeesCount || 0) + 1 });
      }
    }
  };
  
  const handleToggleFavorite = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    if (!user) {
      setRedirectAfterLogin(ViewState.FEED);
      setViewState(ViewState.AUTH);
      return;
    }
    
    if (favorites.includes(eventId)) {
      removeFavorite(user.uid || user.id || '', eventId);
    } else {
      addFavorite(user.uid || user.id || '', eventId);
    }
  };

  const handleProfileClick = () => {
    setViewState(ViewState.PROFILE);
    window.scrollTo(0, 0);
  };

  const handleNotificationsClick = () => {
    setViewState(ViewState.NOTIFICATIONS);
    window.scrollTo(0, 0);
  };

  const handleLocationSelect = (city: string) => {
      setLocation(city);
      setShowLocationSuggestions(false);
  }

  const handleNav = (view: ViewState) => {
    setViewState(view);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (viewState === ViewState.CHAT && selectedEvent) {
    return (
      <GroupChat 
        event={selectedEvent} 
        onClose={handleCloseChat} 
        onViewDetails={handleViewDetailsFromChat}
        onReserve={() => {
          if (!user) {
            setRedirectAfterLogin(ViewState.CHAT);
            setViewState(ViewState.AUTH);
          } else {
            handleRSVP(selectedEvent.id);
          }
        }}
        isLoggedIn={isLoggedIn}
      />
    );
  }

  const EventRow: React.FC<{ title: string; events: Event[] }> = ({ title, events }) => (
    <section className="mb-8 sm:mb-10 md:mb-12 lg:mb-16">
      <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-heading font-bold text-[#15383c]">{title}</h2>
        <button className="text-xs sm:text-sm font-bold text-[#e35e25] hover:text-[#15383c] transition-colors flex items-center gap-1 touch-manipulation active:scale-95 shrink-0">
          View All <ArrowRight size={14} className="sm:w-4 sm:h-4" />
        </button>
      </div>
      {/* Mobile: Horizontal scroll, Desktop: Grid layout */}
      <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 overflow-x-auto md:overflow-x-visible gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 pb-6 sm:pb-8 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none scroll-smooth hide-scrollbar relative z-0 w-full touch-pan-x overscroll-x-contain scroll-pl-4">
         {events.map(event => (
           <div key={event.id} className="w-[85vw] sm:min-w-[60vw] md:w-full lg:w-full xl:w-full snap-center h-full md:h-auto flex-shrink-0 md:flex-shrink lg:flex-shrink mr-4 md:mr-0">
              <EventCard 
                event={event} 
                onClick={handleEventClick} 
                onChatClick={handleChatClick} 
                onReviewsClick={handleReviewsClick}
                isLoggedIn={isLoggedIn}
                isFavorite={favorites.includes(event.id)}
                onToggleFavorite={handleToggleFavorite}
              />
           </div>
         ))}
      </div>
    </section>
  );

  // Show loading screen while auth is initializing
  // Show loading screen while auth is initializing
  // Wait for ready flag to ensure auth state is determined
  if (!ready || (loading && !user)) {
    return (
      <div className="font-sans text-popera-teal bg-gray-50 min-h-screen flex flex-col items-center justify-center w-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e35e25] mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans text-popera-teal bg-gray-50 min-h-screen flex flex-col w-full max-w-full overflow-x-hidden">
        {viewState !== ViewState.AUTH && (
          <Header 
           setViewState={setViewState} 
           viewState={viewState}
           isLoggedIn={isLoggedIn}
           onProfileClick={handleProfileClick}
           onNotificationsClick={handleNotificationsClick}
           onLogout={handleLogout}
        />
      )}

      <div className="flex-grow">
        {viewState === ViewState.LANDING && (
          <LandingPage 
            setViewState={setViewState} 
            events={allEvents} 
            onEventClick={handleEventClick}
            onChatClick={handleChatClick}
            onReviewsClick={handleReviewsClick}
            onHostClick={handleHostClick}
            isLoggedIn={isLoggedIn}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {viewState === ViewState.AUTH && <AuthPage setViewState={setViewState} onLogin={handleLogin} />}
        
        {viewState === ViewState.PROFILE && <ProfilePage setViewState={setViewState} userName={user?.displayName || user?.name || ''} onLogout={handleLogout} />}
        
        {/* PROFILE SUB-PAGES */}
        {viewState === ViewState.PROFILE_BASIC && <BasicDetailsPage setViewState={setViewState} />}
        {viewState === ViewState.PROFILE_NOTIFICATIONS && <NotificationSettingsPage setViewState={setViewState} />}
        {viewState === ViewState.PROFILE_PRIVACY && <PrivacySettingsPage setViewState={setViewState} />}
        {viewState === ViewState.PROFILE_STRIPE && <StripeSettingsPage setViewState={setViewState} />}
        {viewState === ViewState.PROFILE_REVIEWS && <MyReviewsPage setViewState={setViewState} />}
        {viewState === ViewState.DELETE_ACCOUNT && <DeleteAccountPage setViewState={setViewState} onConfirmDelete={handleLogout} />}

        {viewState === ViewState.CREATE_EVENT && <CreateEventPage setViewState={setViewState} />}

        {viewState === ViewState.NOTIFICATIONS && <NotificationsPage setViewState={setViewState} />}
        {viewState === ViewState.MY_POPS && (
          <MyPopsPage 
            setViewState={setViewState} 
            events={allEvents}
            onEventClick={handleEventClick}
            onChatClick={handleChatClick}
            onReviewsClick={handleReviewsClick}
            isLoggedIn={isLoggedIn}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
        {viewState === ViewState.FAVORITES && (
          <FavoritesPage 
            setViewState={setViewState} 
            events={allEvents}
            onEventClick={handleEventClick}
            onChatClick={handleChatClick}
            onReviewsClick={handleReviewsClick}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
        {viewState === ViewState.MY_CALENDAR && <MyCalendarPage setViewState={setViewState} events={allEvents} onEventClick={handleEventClick} />}

        {viewState === ViewState.ABOUT && <AboutPage setViewState={setViewState} />}
        {viewState === ViewState.CAREERS && <CareersPage setViewState={setViewState} />}
        {viewState === ViewState.CONTACT && <ContactPage setViewState={setViewState} />}
        {viewState === ViewState.TERMS && <TermsPage setViewState={setViewState} />}
        {viewState === ViewState.PRIVACY && <PrivacyPage setViewState={setViewState} />}
        {viewState === ViewState.CANCELLATION && <CancellationPage setViewState={setViewState} />}
        {viewState === ViewState.GUIDELINES && <GuidelinesPage setViewState={setViewState} />}
        {viewState === ViewState.REPORT_EVENT && <ReportPage setViewState={setViewState} />}
        {viewState === ViewState.HELP && <HelpPage setViewState={setViewState} />}

        {viewState === ViewState.HOST_PROFILE && selectedHost && (
          <HostProfile 
            hostName={selectedHost}
            onBack={() => setViewState(ViewState.FEED)}
            onEventClick={handleEventClick}
            allEvents={allEvents}
            isLoggedIn={isLoggedIn}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {viewState === ViewState.FEED && (
          <main className="min-h-screen pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-12 sm:pb-16 md:pb-20 lg:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header Section with Search */}
            <div className="mb-8 sm:mb-10 md:mb-12">
               <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 sm:gap-6 mb-6 sm:mb-8">
                  <div className="max-w-2xl">
                     <span className="inline-block py-1.5 sm:py-2 px-4 sm:px-5 rounded-full bg-[#15383c]/5 border border-[#15383c]/10 text-[#e35e25] text-[10px] sm:text-[11px] md:text-xs font-bold tracking-[0.2em] uppercase mb-3 sm:mb-4">
                       {t('feed.discover')}
                     </span>
                     <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-[#15383c] mb-2 sm:mb-3">{t('feed.explorePopups')}</h1>
                     <p className="text-gray-500 text-sm sm:text-base md:text-lg font-light leading-relaxed">{t('feed.description')}</p>
                  </div>

                  {/* Search Inputs Row - Location + Keyword */}
                  <div className="flex flex-col gap-3 w-full md:max-w-xl relative z-30">
                        
                        {/* Location Input */}
                        <div className="relative w-full group z-50">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <MapPin size={18} className="text-[#e35e25]" />
                            </div>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                onFocus={() => setShowLocationSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                                placeholder="City, Country (e.g. Montreal, CA)"
                                className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-white border border-gray-200 rounded-full text-sm sm:text-base font-bold text-[#15383c] focus:outline-none focus:border-[#15383c] focus:ring-2 focus:ring-[#15383c]/10 shadow-sm hover:shadow-md transition-all placeholder-gray-400"
                            />
                            
                            {/* Suggestions Dropdown */}
                            {showLocationSuggestions && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto animate-fade-in z-50">
                                    <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">
                                        Popular Cities
                                    </div>
                                    {filteredCities.length > 0 ? (
                                        filteredCities.map((city) => (
                                            <button
                                                key={city}
                                                onMouseDown={() => handleLocationSelect(city)}
                                                className="w-full text-left px-4 py-3 text-sm font-medium text-[#15383c] hover:bg-[#eef4f5] hover:text-[#e35e25] transition-colors border-b border-gray-50 last:border-0"
                                            >
                                                {city}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-gray-500 italic">
                                            Type to search...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Keyword Search Bar */}
                        <div className="relative w-full group z-40">
                             <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Search size={20} className="text-gray-400 group-focus-within:text-[#e35e25] transition-colors" />
                             </div>
                             <input
                               type="text"
                               placeholder="Search events, hosts, or venues..."
                               className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-white border border-gray-200 rounded-full text-sm sm:text-base focus:outline-none focus:border-[#15383c] focus:ring-2 focus:ring-[#15383c]/10 shadow-sm hover:shadow-md transition-all"
                               value={searchQuery}
                               onChange={(e) => setSearchQuery(e.target.value)}
                             />
                        </div>
                  </div>
               </div>

               {/* Horizontal Categories */}
               <div className="relative z-10">
                 <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-3 sm:pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 hide-scrollbar scroll-smooth w-full touch-pan-x overscroll-x-contain scroll-pl-4">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`
                          px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all border flex-shrink-0 touch-manipulation active:scale-95
                          ${activeCategory === cat
                            ? 'bg-[#15383c] text-white border-[#15383c] shadow-lg shadow-teal-900/20 scale-105'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-[#e35e25] hover:text-[#e35e25] hover:shadow-sm'}
                        `}
                      >
                        {cat}
                      </button>
                    ))}
                 </div>
                 <div className="absolute right-0 top-0 bottom-3 sm:bottom-4 w-8 sm:w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none md:hidden"></div>
               </div>
            </div>

            {/* Conditional Render: Horizontal Lists vs Grid */}
            {searchQuery === '' && activeCategory === 'All' && location === '' ? (
              <div className="space-y-4 animate-fade-in">
                 {/* Show events grouped by city if available */}
                 {Object.keys(eventsByCity).length > 0 ? (
                   Object.entries(eventsByCity).map(([city, cityEvents]) => (
                     <div key={city} className="mb-8 sm:mb-10 md:mb-12">
                       <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-[#15383c] mb-4 sm:mb-6">
                         {city}
                       </h2>
                       {/* Mobile: Horizontal scroll, Desktop: Grid layout */}
                       <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 overflow-x-auto md:overflow-x-visible gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 pb-6 sm:pb-8 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none scroll-smooth hide-scrollbar relative z-0 w-full touch-pan-x overscroll-x-contain scroll-pl-4">
                         {cityEvents.map(event => (
                           <div key={event.id} className="w-[85vw] sm:min-w-[60vw] md:w-full lg:w-full xl:w-full snap-center h-full md:h-auto flex-shrink-0 md:flex-shrink lg:flex-shrink mr-4 md:mr-0">
                             <EventCard
                               event={event}
                               onClick={handleEventClick}
                               onChatClick={handleChatClick}
                               onReviewsClick={handleReviewsClick}
                               isLoggedIn={isLoggedIn}
                               isFavorite={favorites.includes(event.id)}
                               onToggleFavorite={handleToggleFavorite}
                             />
                           </div>
                         ))}
                       </div>
                     </div>
                   ))
                 ) : (
                   <>
                     <EventRow title={t('feed.thisWeek')} events={thisWeekEvents} />
                     <EventRow title={t('feed.thisMonth')} events={thisMonthEvents} />
                     <EventRow title="Later" events={laterEvents} />
                   </>
                 )}
              </div>
            ) : (
              <div className="animate-fade-in">
                 <div className="mb-6 text-gray-500 text-sm font-medium">
                   Showing {filteredEvents.length} results 
                   {location && ` in ${location.split(',')[0]}`}
                 </div>
                 {filteredEvents.length > 0 ? (
                    // Group search results by category
                    (() => {
                      const groupedByCategory = filteredEvents.reduce((acc, event) => {
                        const category = event.category || 'Other';
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(event);
                        return acc;
                      }, {} as Record<string, Event[]>);

                      return (
                        <div className="space-y-8 sm:space-y-10 md:space-y-12">
                          {Object.entries(groupedByCategory).map(([category, categoryEvents]) => (
                            <div key={category}>
                              <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-[#15383c] mb-4 sm:mb-6">
                                {category}
                              </h2>
                              {/* Mobile: Horizontal scroll, Desktop: Grid layout */}
                              <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 overflow-x-auto md:overflow-x-visible gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 pb-6 sm:pb-8 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none scroll-smooth hide-scrollbar relative z-0 w-full touch-pan-x overscroll-x-contain scroll-pl-4">
                                {categoryEvents.map(event => (
                                  <div key={event.id} className="w-[85vw] sm:min-w-[60vw] md:w-full lg:w-full xl:w-full snap-center h-full md:h-auto flex-shrink-0 md:flex-shrink lg:flex-shrink mr-4 md:mr-0">
                                    <EventCard
                                      event={event}
                                      onClick={handleEventClick}
                                      onChatClick={handleChatClick}
                                      onReviewsClick={handleReviewsClick}
                                      isLoggedIn={isLoggedIn}
                                      isFavorite={favorites.includes(event.id)}
                                      onToggleFavorite={handleToggleFavorite}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                 ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                       <p className="text-gray-500">No events found matching your criteria.</p>
                       <button 
                         onClick={() => { 
                           setSearchQuery(''); 
                           setLocation(''); 
                           setActiveCategory('All');
                         }}
                         className="mt-4 text-[#e35e25] font-bold hover:underline"
                       >
                         Clear Filters
                       </button>
                    </div>
                 )}
              </div>
            )}
            
            {/* Mobile CTA FAB */}
            <button 
              onClick={() => handleNav(ViewState.CREATE_EVENT)}
              className="md:hidden fixed bottom-6 right-4 sm:right-6 w-14 h-14 bg-[#e35e25] rounded-full flex items-center justify-center text-white shadow-2xl shadow-orange-900/40 z-40 hover:scale-105 active:scale-95 transition-transform border-4 border-white touch-manipulation safe-area-inset-bottom"
              aria-label="Create Pop-up"
            >
               <PlusCircle size={28} />
            </button>
            
          </main>
        )}

        {viewState === ViewState.DETAIL && selectedEvent && (
          <EventDetailPage 
            event={selectedEvent} 
            setViewState={setViewState} 
            onReviewsClick={handleReviewsClick}
            onHostClick={handleHostClick}
            allEvents={allEvents}
            onEventClick={handleEventClick}
            isLoggedIn={isLoggedIn}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onRSVP={handleRSVP}
            rsvps={rsvps}
          />
        )}
      </div>

      {reviewEvent && <ReviewsModal event={reviewEvent} onClose={() => setReviewEvent(null)} />}

      {viewState !== ViewState.AUTH && <Footer setViewState={setViewState} isLoggedIn={isLoggedIn} onProtectedNav={handleProtectedNav} />}
      
      {viewState === ViewState.DETAIL && <div className="h-24 lg:hidden bg-[#15383c]" />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
