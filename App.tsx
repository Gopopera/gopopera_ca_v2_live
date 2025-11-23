import React, { useState, useEffect } from 'react';

console.log('[BOOT] App module loaded');
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CityInput } from './components/layout/CityInput';
// Route-level code splitting for performance
const LandingPage = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const EventDetailPage = React.lazy(() => import('./pages/EventDetailPage').then(m => ({ default: m.EventDetailPage })));
const EventFeed = React.lazy(() => import('./components/events/EventFeed').then(m => ({ default: m.EventFeed })));
const GroupChat = React.lazy(() => import('./components/chat/GroupChat').then(m => ({ default: m.GroupChat })));
const ReviewsModal = React.lazy(() => import('./components/events/ReviewsModal').then(m => ({ default: m.ReviewsModal })));
const HostProfile = React.lazy(() => import('./components/profile/HostProfile').then(m => ({ default: m.HostProfile })));
const AboutPage = React.lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const CareersPage = React.lazy(() => import('./pages/CareersPage').then(m => ({ default: m.CareersPage })));
const ContactPage = React.lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const TermsPage = React.lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const CancellationPage = React.lazy(() => import('./pages/CancellationPage').then(m => ({ default: m.CancellationPage })));
const GuidelinesPage = React.lazy(() => import('./pages/GuidelinesPage').then(m => ({ default: m.GuidelinesPage })));
const ReportPage = React.lazy(() => import('./pages/ReportPage').then(m => ({ default: m.ReportPage })));
const HelpPage = React.lazy(() => import('./pages/HelpPage').then(m => ({ default: m.HelpPage })));
const SafetyPage = React.lazy(() => import('./pages/SafetyPage').then(m => ({ default: m.SafetyPage })));
const PressPage = React.lazy(() => import('./pages/PressPage').then(m => ({ default: m.PressPage })));
const AuthPage = React.lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const MyPopsPage = React.lazy(() => import('./pages/MyPopsPage').then(m => ({ default: m.MyPopsPage })));
const FavoritesPage = React.lazy(() => import('./pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const MyCalendarPage = React.lazy(() => import('./pages/MyCalendarPage').then(m => ({ default: m.MyCalendarPage })));
const DeleteAccountPage = React.lazy(() => import('./pages/DeleteAccountPage').then(m => ({ default: m.DeleteAccountPage })));
const CreateEventPage = React.lazy(() => import('./pages/CreateEventPage').then(m => ({ default: m.CreateEventPage })));

// Consolidated Imports - lazy loaded
const BasicDetailsPage = React.lazy(() => import('./pages/ProfileSubPages').then(m => ({ default: m.BasicDetailsPage })));
const NotificationSettingsPage = React.lazy(() => import('./pages/ProfileSubPages').then(m => ({ default: m.NotificationSettingsPage })));
const PrivacySettingsPage = React.lazy(() => import('./pages/ProfileSubPages').then(m => ({ default: m.PrivacySettingsPage })));
const StripeSettingsPage = React.lazy(() => import('./pages/ProfileSubPages').then(m => ({ default: m.StripeSettingsPage })));
const MyReviewsPage = React.lazy(() => import('./pages/ProfileSubPages').then(m => ({ default: m.MyReviewsPage })));

import { Event, ViewState } from './types';
import { Search, ArrowRight, MapPin, PlusCircle } from 'lucide-react';
import { EventCard } from './components/events/EventCard';
import { useEventStore } from './stores/eventStore';
import { useUserStore } from './stores/userStore';
import { generatePoperaEvents } from './data/poperaEvents';
import { generateFakeEvents } from './data/fakeEvents';
import { categoryMatches } from './utils/categoryMapper';
import { listUpcomingEvents } from './firebase/db';
import { useDebouncedFavorite } from './hooks/useDebouncedFavorite';
import { ConversationButtonModal } from './components/chat/ConversationButtonModal';
import { useSelectedCity, useSetCity, type City } from './src/stores/cityStore';
import { NotificationsModal } from './components/notifications/NotificationsModal';

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

// Loading skeleton component
const PageSkeleton: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-pulse space-y-4 w-full max-w-md px-4">
      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  console.log("#BOOT: App mounted");
  const { t } = useLanguage();
  const city = useSelectedCity();
  
  // Dev guard for city state (no side effects, just for sanity)
  if (typeof window !== "undefined") {
    (window as any).__POPERA_CITY__ = city;
  }
  const [viewState, setViewState] = useState<ViewState>(ViewState.LANDING);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [reviewEvent, setReviewEvent] = useState<Event | null>(null); 
  const [selectedHost, setSelectedHost] = useState<string | null>(null); 
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const setCity = useSetCity();
  const location = city;
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [conversationModalEvent, setConversationModalEvent] = useState<Event | null>(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
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
  // City store auto-initializes via Zustand persist middleware
  useEffect(() => {
    useUserStore.getState().init();
  }, []);

  // Handle redirect after successful login (including Google login)
  // Redirect immediately when user is detected after auth
  const redirectAfterLogin = useUserStore((state) => state.redirectAfterLogin);
  const setRedirectAfterLogin = useUserStore((state) => state.setRedirectAfterLogin);
  
  useEffect(() => {
    if (user && viewState === ViewState.AUTH && !loading) {
      // User just logged in, redirect immediately to intended destination or FEED
      const redirect = redirectAfterLogin || ViewState.FEED;
      console.log('[AUTH] Login success, navigating to:', redirect);
      setViewState(redirect);
      setRedirectAfterLogin(null);
    }
  }, [user, loading, viewState, redirectAfterLogin, setRedirectAfterLogin]);
  
  // Load events from Firestore (with fallback to mock data)
  useEffect(() => {
    const loadFirestoreEvents = async () => {
      try {
        setLoadingEvents(true);
        const events = await listUpcomingEvents();
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
        poperaEvents?.forEach?.(event => {
          // Fire-and-forget for mock data initialization
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
          }).catch(err => console.warn('Failed to add Popera event to Firestore:', err));
        });
      }
      
      // 2. Then, add fake demo events (3 per city, one per value prop)
      const fakeEvents = (generateFakeEvents() ?? []);
      if (Array.isArray(fakeEvents)) {
        fakeEvents?.forEach?.(event => {
        // Fire-and-forget for mock data initialization
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
        }).catch(err => console.warn('Failed to add fake event to Firestore:', err));
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
      userRSVPs?.forEach?.(eventId => {
        if (eventId) {
          eventRSVPCounts[eventId] = (eventRSVPCounts[eventId] || 0) + 1;
        }
      });
    }
    
    // Update event attendee counts (only for Popera events)
    const safeStoreEvents = (storeEvents ?? []);
    if (Array.isArray(safeStoreEvents)) {
      safeStoreEvents?.forEach?.(event => {
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
  
  // Apply city filter - match by city slug or city name
  if (location && location.trim() && location !== 'montreal') {
    const citySlug = location.toLowerCase();
    filteredEvents = filteredEvents.filter(event => {
      const eventCityLower = event.city.toLowerCase();
      // Match by slug (e.g., "montreal" matches "Montreal, CA")
      return eventCityLower.includes(citySlug) || 
             eventCityLower.includes(citySlug.replace('-', ' '));
    });
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


  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setViewState(ViewState.DETAIL);
    window.scrollTo(0, 0);
  };

  const handleChatClick = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    
    if (!user) {
      useUserStore.getState().setRedirectAfterLogin(ViewState.CHAT);
      setViewState(ViewState.AUTH);
      return;
    }

    // Check if user RSVP'd or is host
    const hasRSVPed = rsvps.includes(event.id);
    const isHost = event.hostId === user.uid;

    if (hasRSVPed || isHost) {
      // User can access chat - open directly
      setSelectedEvent(event);
      setViewState(ViewState.CHAT);
    } else {
      // Show modal to prompt RSVP
      setConversationModalEvent(event);
      setShowConversationModal(true);
    }
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

  const handleProtectedNav = (view: ViewState) => {
    // Save current scroll position and view state before navigating to auth
    const listPages = [ViewState.LANDING, ViewState.FEED];
    if (listPages.includes(viewState)) {
      const scrollKey = `scroll_${viewState}`;
      sessionStorage.setItem(scrollKey, window.scrollY.toString());
      sessionStorage.setItem('prevViewState', viewState);
    }
    useUserStore.getState().setRedirectAfterLogin(view);
    setViewState(ViewState.AUTH);
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const userStore = useUserStore.getState();
      await userStore.login(email, password);
      // Auth listener will update state automatically
      // Redirect to intended destination or default to FEED
      const redirect = userStore.getRedirectAfterLogin() || ViewState.FEED;
      setViewState(redirect);
      userStore.setRedirectAfterLogin(null);
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
      useUserStore.getState().setRedirectAfterLogin(ViewState.DETAIL);
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
  
  // Use debounced favorite hook
  const { toggleFavorite: debouncedToggleFavorite } = useDebouncedFavorite();
  
  const handleToggleFavorite = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    if (!user) {
      useUserStore.getState().setRedirectAfterLogin(ViewState.FEED);
      setViewState(ViewState.AUTH);
      return;
    }
    debouncedToggleFavorite(e, eventId);
  };

  const handleProfileClick = () => {
    setViewState(ViewState.PROFILE);
    window.scrollTo(0, 0);
  };

  const handleNotificationsClick = () => {
    setShowNotificationsModal(true);
  };

  const handleNotificationNavigate = (view: ViewState, eventId?: string) => {
    if (eventId) {
      const event = allEvents.find(e => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
        setViewState(ViewState.DETAIL);
      }
    } else {
      setViewState(view);
    }
  };


  // Scroll restore for list pages
  useEffect(() => {
    const listPages = [ViewState.LANDING, ViewState.FEED];
    if (listPages.includes(viewState)) {
      const scrollKey = `scroll_${viewState}`;
      const savedScroll = sessionStorage.getItem(scrollKey);
      if (savedScroll) {
        window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'auto' });
      }
    }
  }, [viewState]);

  // Save scroll position before navigating away from list pages
  useEffect(() => {
    const listPages = [ViewState.LANDING, ViewState.FEED];
    const handleScroll = () => {
      if (listPages.includes(viewState)) {
        const scrollKey = `scroll_${viewState}`;
        sessionStorage.setItem(scrollKey, window.scrollY.toString());
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [viewState]);

  const handleNav = (view: ViewState) => {
    // Save current scroll if on list page
    const listPages = [ViewState.LANDING, ViewState.FEED];
    if (listPages.includes(viewState)) {
      const scrollKey = `scroll_${viewState}`;
      sessionStorage.setItem(scrollKey, window.scrollY.toString());
    }
    setViewState(view);
    // Only scroll to top if not a list page
    if (!listPages.includes(view)) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  if (viewState === ViewState.CHAT && selectedEvent) {
    // Ensure user is logged in before showing chat
    if (!user) {
      useUserStore.getState().setRedirectAfterLogin(ViewState.CHAT);
      setViewState(ViewState.AUTH);
      return null;
    }
    
    return (
      <React.Suspense fallback={<PageSkeleton />}>
        <GroupChat 
          event={selectedEvent} 
          onClose={handleCloseChat} 
          onViewDetails={handleViewDetailsFromChat}
          onReserve={() => {
            if (!user) {
              useUserStore.getState().setRedirectAfterLogin(ViewState.CHAT);
              setViewState(ViewState.AUTH);
            } else {
              handleRSVP(selectedEvent.id);
            }
          }}
          isLoggedIn={isLoggedIn}
        />
      </React.Suspense>
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
      <div className="flex md:grid md:grid-cols-12 overflow-x-auto md:overflow-x-visible gap-6 xl:gap-8 pb-6 sm:pb-8 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none scroll-smooth hide-scrollbar relative z-0 w-full touch-pan-x overscroll-x-contain scroll-pl-4">
         {events.map(event => (
           <div key={event.id} className="w-[85vw] sm:min-w-[60vw] md:col-span-6 lg:col-span-4 snap-center h-full md:h-auto flex-shrink-0 md:flex-shrink lg:flex-shrink mr-4 md:mr-0">
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

  // Render shell immediately; auth/profile loading happens in background
  // Never block initial render - show content immediately

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
        <>
            {viewState === ViewState.LANDING && (
              <React.Suspense fallback={<PageSkeleton />}>
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
              </React.Suspense>
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
        {viewState === ViewState.SAFETY && <SafetyPage setViewState={setViewState} />}
        {viewState === ViewState.PRESS && <PressPage setViewState={setViewState} />}

            {viewState === ViewState.HOST_PROFILE && selectedHost && (
              <React.Suspense fallback={<PageSkeleton />}>
                <HostProfile 
                  hostName={selectedHost}
                  onBack={() => setViewState(ViewState.FEED)}
                  onEventClick={handleEventClick}
                  allEvents={allEvents}
                  isLoggedIn={isLoggedIn}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                />
              </React.Suspense>
            )}

            {viewState === ViewState.FEED && (
          <main className="min-h-screen pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-12 sm:pb-16 md:pb-20 lg:pb-24 md:container md:mx-auto md:px-6 lg:px-8">
            
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
                        
                        {/* City Input with Autocomplete */}
                        <CityInput />

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
            {searchQuery === '' && activeCategory === 'All' && !location ? (
              <div className="space-y-4 animate-fade-in">
                 {/* Show events grouped by city if available */}
                 {Object.keys(eventsByCity).length > 0 ? (
                   Object.entries(eventsByCity).map(([city, cityEvents]) => (
                     <div key={city} className="mb-8 sm:mb-10 md:mb-12">
                       <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-[#15383c] mb-4 sm:mb-6">
                         {city}
                       </h2>
                       {/* Mobile: Horizontal scroll, Desktop: Grid layout - matches Landing */}
                       <div className="flex md:grid md:grid-cols-12 overflow-x-auto md:overflow-x-visible gap-6 xl:gap-8 pb-6 sm:pb-8 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none scroll-smooth hide-scrollbar relative z-0 w-full touch-pan-x overscroll-x-contain scroll-pl-4">
                         {cityEvents.map(event => (
                           <div key={event.id} className="w-[85vw] sm:min-w-[60vw] md:col-span-6 lg:col-span-4 snap-center h-full md:h-auto flex-shrink-0 md:flex-shrink lg:flex-shrink mr-4 md:mr-0">
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
                   {location && location !== 'montreal' && ` in ${location.charAt(0).toUpperCase() + location.slice(1)}`}
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
                              {/* Mobile: Horizontal scroll, Desktop: Grid layout - matches Landing */}
                              <div className="flex md:grid md:grid-cols-12 overflow-x-auto md:overflow-x-visible gap-6 xl:gap-8 pb-6 sm:pb-8 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none scroll-smooth hide-scrollbar relative z-0 w-full touch-pan-x overscroll-x-contain scroll-pl-4">
                                {categoryEvents.map(event => (
                                  <div key={event.id} className="w-[85vw] sm:min-w-[60vw] md:col-span-6 lg:col-span-4 snap-center h-full md:h-auto flex-shrink-0 md:flex-shrink lg:flex-shrink mr-4 md:mr-0">
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
                           setCity('montreal'); 
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
              <React.Suspense fallback={<PageSkeleton />}>
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
              </React.Suspense>
            )}
        </>
      </div>

      {reviewEvent && (
        <React.Suspense fallback={null}>
          <ReviewsModal event={reviewEvent} onClose={() => setReviewEvent(null)} />
        </React.Suspense>
      )}

      {/* Conversation Button Modal */}
      {showConversationModal && conversationModalEvent && (
        <ConversationButtonModal
          isOpen={showConversationModal}
          onClose={() => {
            setShowConversationModal(false);
            setConversationModalEvent(null);
          }}
          onRSVP={() => {
            if (conversationModalEvent) {
              handleRSVP(conversationModalEvent.id);
            }
          }}
          eventTitle={conversationModalEvent.title}
        />
      )}

      {/* Notifications Modal */}
      {isLoggedIn && (
        <NotificationsModal
          isOpen={showNotificationsModal}
          onClose={() => setShowNotificationsModal(false)}
          onNavigate={handleNotificationNavigate}
        />
      )}

      {viewState !== ViewState.AUTH && <Footer setViewState={setViewState} isLoggedIn={isLoggedIn} onProtectedNav={handleProtectedNav} />}
      
      {viewState === ViewState.DETAIL && <div className="h-24 lg:hidden bg-[#15383c]" />}
    </div>
  );
};

const App: React.FC = () => {
  // TODO: remove after boot fixed
  const DEBUG_BOOT = false;
  
  if (DEBUG_BOOT) {
    return <div data-boot="ok">Popera UI (boot check)</div>;
  }
  
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
