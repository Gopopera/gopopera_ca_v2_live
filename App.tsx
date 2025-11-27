import React, { useState, useEffect, useMemo } from 'react';

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    
    // Handle Firebase permission errors gracefully
    if (reason?.code === 'permission-denied' || reason?.message?.includes('permission')) {
      console.warn('[FIREBASE_PERMISSION] Permission denied:', reason.message || reason);
      // Prevent the error from showing to users - it's a backend configuration issue
      event.preventDefault();
      return;
    }
    
    // Log other unhandled rejections for debugging
    console.error('[UNHANDLED_REJECTION]', reason);
    // Prevent the default browser error display
    event.preventDefault();
    
    // Log to console for debugging
    if (reason) {
      console.error('[UNHANDLED_REJECTION] Reason:', reason);
      if (reason.message) {
        console.error('[UNHANDLED_REJECTION] Message:', reason.message);
      }
      if (reason.stack) {
        console.error('[UNHANDLED_REJECTION] Stack:', reason.stack);
      }
    }
  });
}

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
const EditEventPage = React.lazy(() => import('./pages/EditEventPage').then(m => ({ default: m.EditEventPage })));
const DebugEnvPage = React.lazy(() => import('./pages/DebugEnvPage').then(m => ({ default: m.DebugEnvPage })));
const DebugSeedDemoEventsPage = React.lazy(() => import('./pages/DebugSeedDemoEventsPage').then(m => ({ default: m.DebugSeedDemoEventsPage })));

// Consolidated Imports - lazy loaded
const BasicDetailsPage = React.lazy(() => import('./pages/ProfileSubPages').then(m => ({ default: m.BasicDetailsPage })));
const NotificationSettingsPage = React.lazy(() => import('./pages/ProfileSubPages').then(m => ({ default: m.NotificationSettingsPage })));
const PrivacySettingsPage = React.lazy(() => import('./pages/ProfileSubPages').then(m => ({ default: m.PrivacySettingsPage })));
const StripeSettingsPage = React.lazy(() => import('./pages/ProfileSubPages').then(m => ({ default: m.StripeSettingsPage })));
const MyReviewsPage = React.lazy(() => import('./pages/ProfileSubPages').then(m => ({ default: m.MyReviewsPage })));
const FollowingPage = React.lazy(() => import('./pages/ProfileSubPages').then(m => ({ default: m.FollowingPage })));
const FollowersPage = React.lazy(() => import('./pages/ProfileSubPages').then(m => ({ default: m.FollowersPage })));
const ReservationConfirmationPage = React.lazy(() => import('./pages/ReservationConfirmationPage').then(m => ({ default: m.ReservationConfirmationPage })));
const ConfirmReservationPage = React.lazy(() => import('./pages/ConfirmReservationPage').then(m => ({ default: m.ConfirmReservationPage })));

import { Event, ViewState } from './types';
import { Search, ArrowRight, MapPin, PlusCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { EventCard } from './components/events/EventCard';
import { useEventStore } from './stores/eventStore';
import { useUserStore } from './stores/userStore';
import { categoryMatches } from './utils/categoryMapper';
import { useDebouncedFavorite } from './hooks/useDebouncedFavorite';
import { ConversationButtonModal } from './components/chat/ConversationButtonModal';
import { useSelectedCity, useSetCity, type City } from './src/stores/cityStore';
import { NotificationsModal } from './components/notifications/NotificationsModal';
import { isPrivateMode, getPrivateModeMessage } from './utils/browserDetection';

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
    category: 'Markets',
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
    tags: ['markets', 'shopping', 'local', 'artisan'],
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
  const { t } = useLanguage();
  
  // Check for iOS/Safari private mode
  const [privateModeWarning, setPrivateModeWarning] = useState<string | null>(null);
  
  useEffect(() => {
    if (isPrivateMode()) {
      setPrivateModeWarning(getPrivateModeMessage());
    }
  }, []);
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
  const [authBootChecked, setAuthBootChecked] = useState(false);
  const [hasHandledRedirectLogin, setHasHandledRedirectLogin] = useState(false);
  // Use Zustand stores
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  const isAuthReady = useUserStore((state) => state.isAuthReady);
  const authInitialized = useUserStore((state) => state.authInitialized);
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
  
  // Use shared events store with real-time Firestore subscription
  const events = useEventStore((state) => state.events);
  const isLoadingEvents = useEventStore((state) => state.isLoading);
  const eventsError = useEventStore((state) => state.error);
  const searchEvents = useEventStore((state) => state.searchEvents);
  const filterByCity = useEventStore((state) => state.filterByCity);
  const filterByTags = useEventStore((state) => state.filterByTags);
  const getEventsByCity = useEventStore((state) => state.getEventsByCity);
  
  // allEvents is now just events from the shared store (real-time updates)
  const allEvents = events;
  
  // Initialize auth listener and events store on mount
  // City store auto-initializes via Zustand persist middleware
  useEffect(() => {
    // Initialize auth monitoring (tracks failures and redirect issues)
    import('./src/lib/firebaseMonitoring').then(({ initAuthMonitoring }) => {
      initAuthMonitoring();
    }).catch((err) => {
      console.warn('[APP] Failed to load auth monitoring:', err);
    });
    
    // Initialize visual debugger (shows logs on screen - enable with ?debug=true)
    import('./src/lib/visualDebugger').then(({ initVisualDebugger }) => {
      initVisualDebugger();
    }).catch((err) => {
      console.warn('[APP] Failed to load visual debugger:', err);
    });
    
    // Initialize stores with error handling
    try {
      useUserStore.getState().init();
    } catch (error) {
      console.error('[APP] Error initializing user store:', error);
    }
    
    try {
      // Initialize events store with real-time Firestore subscription
      useEventStore.getState().init();
    } catch (error) {
      console.error('[APP] Error initializing event store:', error);
    }
    
    setAuthBootChecked(true);
  }, []);

  if (viewState === ViewState.AUTH && !authInitialized) {
    return (
      <div className="min-h-screen bg-[#f8fafb] flex items-center justify-center text-[#15383c]">
        Loading...
      </div>
    );
  }


  // Handle redirect after successful login (including Google login)
  // Use persisted store flag instead of local state for reliability
  const redirectAfterLogin = useUserStore((state) => state.redirectAfterLogin);
  const setRedirectAfterLogin = useUserStore((state) => state.setRedirectAfterLogin);
  const justLoggedInFromRedirect = useUserStore((state) => state._justLoggedInFromRedirect);
  const clearJustLoggedInFlag = useUserStore((state) => state.clearJustLoggedInFlag);
  
  // SIMPLE APPROACH: If user exists and we're on landing page, go to feed
  // No complex logic, no flags, no polling - just check and navigate
  useEffect(() => {
    if (!authInitialized) return;
    
    // Simple rule: User logged in + on landing page = go to feed
    if (user && viewState === ViewState.LANDING) {
      const redirect = redirectAfterLogin || ViewState.FEED;
      console.log('[APP] User logged in, navigating to:', redirect);
      setViewState(redirect);
      setRedirectAfterLogin(null);
      return;
    }
    
    // Handle login from AUTH page
    if (user && viewState === ViewState.AUTH) {
      const redirect = redirectAfterLogin || ViewState.FEED;
      console.log('[APP] Redirecting after login from AUTH page:', redirect);
      setViewState(redirect);
      setRedirectAfterLogin(null);
      return;
    }
  }, [user, viewState, redirectAfterLogin, setRedirectAfterLogin, authInitialized]);
  
  // Events are now loaded via real-time subscription in eventStore.init()
  // No need for manual loading or mock data initialization - events come from Firestore in real-time
  
  // Update attendee counts when RSVPs change
  // Sync event attendee counts from Firestore reservations for all events
  useEffect(() => {
    const syncEventCounts = async () => {
      if (allEvents.length === 0) return;
      
      try {
        const { getReservationCountForEvent } = await import('./firebase/db');
        const countPromises = allEvents
          .filter(event => event.id && !event.isDemo)
          .map(async (event) => {
            try {
              const count = await getReservationCountForEvent(event.id);
              // Only update if count is different to avoid unnecessary updates
              if (event.attendeesCount !== count) {
                updateEvent(event.id, { attendeesCount: count });
              }
            } catch (error) {
              console.error(`Error syncing count for event ${event.id}:`, error);
            }
          });
        
        await Promise.all(countPromises);
      } catch (error) {
        console.error('Error syncing event counts:', error);
      }
    };
    
    // Sync immediately and then every 10 seconds
    syncEventCounts();
    const interval = setInterval(syncEventCounts, 10000);
    return () => clearInterval(interval);
  }, [allEvents, updateEvent]);

  // Filter events based on search, location, category, and tags
  // Apply all filters in sequence for proper combined filtering
  // Filters work together: Category + City + Tags all apply simultaneously
  let filteredEvents = allEvents;
  
  // Apply search filter first (text search)
  if (searchQuery.trim()) {
    filteredEvents = searchEvents(searchQuery);
  }
  
  // Apply city filter - match by city slug or city name
  // "Canada" shows all events (no filter)
  if (location && location.trim() && location.toLowerCase() !== 'canada') {
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

  const handleReviewerClick = (userId: string, userName: string) => {
    // Navigate to reviewer's profile
    setSelectedHost(userName);
    setViewState(ViewState.HOST_PROFILE);
    window.scrollTo(0, 0);
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
  
  const [confirmedReservation, setConfirmedReservation] = useState<{ event: Event; reservationId: string } | null>(null);

  const handleRSVP = async (eventId: string, reservationId?: string) => {
    if (!authInitialized) return null;
    if (!user) {
      // Redirect to auth if not logged in
      useUserStore.getState().setRedirectAfterLogin(ViewState.DETAIL);
      setViewState(ViewState.AUTH);
      return;
    }
    
    // Block RSVP for demo events
    const event = allEvents.find(e => e.id === eventId);
    if (event?.isDemo === true) {
      // Demo events are handled by EventDetailPage's handleRSVP which shows modal
      // This is a safety check in case handleRSVP is called from elsewhere
      console.warn('[RSVP] Attempted to RSVP to demo event:', eventId);
      return;
    }
    
    try {
      if (rsvps.includes(eventId)) {
        await removeRSVP(user.uid || user.id || '', eventId);
        // Update attendee count from actual Firestore reservations for all events
        const { getReservationCountForEvent } = await import('./firebase/db');
        const newCount = await getReservationCountForEvent(eventId);
        updateEvent(eventId, { attendeesCount: newCount });
      } else {
        const resId = reservationId || await addRSVP(user.uid || user.id || '', eventId);
        // Update attendee count from actual Firestore reservations for all events
        const { getReservationCountForEvent } = await import('./firebase/db');
        const newCount = await getReservationCountForEvent(eventId);
        updateEvent(eventId, { attendeesCount: newCount });
        
        // If we have a reservation ID and event, navigate to confirmation page
        if (resId && event) {
          setConfirmedReservation({ event, reservationId: resId });
          setViewState(ViewState.RESERVATION_CONFIRMED);
        }
      }
    } catch (error) {
      console.error('Error handling RSVP:', error);
      // Don't show alert here - let EventDetailPage handle it
    }
  };
  
  // Use debounced favorite hook
  const { toggleFavorite: debouncedToggleFavorite } = useDebouncedFavorite();
  
  const handleToggleFavorite = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    if (!authInitialized) return null;
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
    if (!authInitialized) return null;
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
    <section className="mb-8 sm:mb-10 md:mb-12 lg:mb-16 max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-heading font-bold text-[#15383c]">{title}</h2>
        <button className="text-xs sm:text-sm font-bold text-[#e35e25] hover:text-[#15383c] transition-colors flex items-center gap-1 touch-manipulation active:scale-95 shrink-0">
          View All <ArrowRight size={14} className="sm:w-4 sm:h-4" />
        </button>
      </div>
      {/* Mobile: Horizontal scroll, Desktop: Grid layout */}
      <div className="flex md:grid overflow-x-auto md:overflow-x-visible gap-4 md:gap-6 lg:gap-8 pb-2 md:pb-6 snap-x snap-mandatory md:snap-none scroll-smooth md:place-items-center">
         {events.map(event => (
           <div key={event.id} className="snap-start shrink-0 md:col-span-1">
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
        <div id="recaptcha-container" style={{ display: 'none' }} />
        {privateModeWarning && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-sm text-yellow-800 text-center">
            {privateModeWarning}
          </div>
        )}
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
        {viewState === ViewState.PROFILE_REVIEWS && (
          <React.Suspense fallback={<PageSkeleton />}>
            <MyReviewsPage setViewState={setViewState} onHostClick={handleHostClick} />
          </React.Suspense>
        )}
        {viewState === ViewState.PROFILE_FOLLOWING && (
          <React.Suspense fallback={<PageSkeleton />}>
            <FollowingPage setViewState={setViewState} onHostClick={handleHostClick} />
          </React.Suspense>
        )}
        {viewState === ViewState.PROFILE_FOLLOWERS && (
          <React.Suspense fallback={<PageSkeleton />}>
            <FollowersPage setViewState={setViewState} onHostClick={handleHostClick} />
          </React.Suspense>
        )}
        {viewState === ViewState.DELETE_ACCOUNT && <DeleteAccountPage setViewState={setViewState} onConfirmDelete={handleLogout} />}
        
        {/* CONFIRM RESERVATION (Confirm & Pay) */}
        {viewState === ViewState.CONFIRM_RESERVATION && selectedEvent && (
          <React.Suspense fallback={<PageSkeleton />}>
            <ConfirmReservationPage
              event={selectedEvent}
              setViewState={setViewState}
              onHostClick={handleHostClick}
              onConfirm={async (attendeeCount, supportContribution, paymentMethod) => {
                if (!user?.uid) {
                  setViewState(ViewState.AUTH);
                  throw new Error('User not logged in');
                }

                // Create a single reservation with attendee count
                // In the future, this will integrate with Stripe/Google Pay for payment processing
                const { createReservation } = await import('./firebase/db');
                
                // Calculate total amount
                const priceStr = selectedEvent.price?.replace(/[^0-9.]/g, '') || '0';
                const pricePerAttendee = parseFloat(priceStr) || 0;
                const subtotal = pricePerAttendee * attendeeCount;
                const totalAmount = subtotal + supportContribution;
                
                const reservationId = await createReservation(selectedEvent.id, user.uid, {
                  attendeeCount,
                  supportContribution: supportContribution > 0 ? supportContribution : undefined,
                  paymentMethod: !selectedEvent.price || selectedEvent.price.toLowerCase() === 'free' ? undefined : paymentMethod,
                  totalAmount: totalAmount > 0 ? totalAmount : undefined,
                });
                
                // Update user's RSVPs array
                await addRSVP(user.uid, selectedEvent.id);

                // Update attendee count
                const { getReservationCountForEvent } = await import('./firebase/db');
                const newCount = await getReservationCountForEvent(selectedEvent.id);
                const { updateEvent: updateEventInStore } = useEventStore.getState();
                updateEventInStore(selectedEvent.id, { attendeesCount: newCount });

                // Refresh user profile
                await useUserStore.getState().refreshUserProfile();

                // Navigate to confirmation page
                setConfirmedReservation({ event: selectedEvent, reservationId });
                setViewState(ViewState.RESERVATION_CONFIRMED);

                return reservationId;
              }}
            />
          </React.Suspense>
        )}

        {/* RESERVATION CONFIRMATION */}
        {viewState === ViewState.RESERVATION_CONFIRMED && confirmedReservation && (
          <React.Suspense fallback={<PageSkeleton />}>
            <ReservationConfirmationPage 
              event={confirmedReservation.event} 
              reservationId={confirmedReservation.reservationId}
              setViewState={setViewState}
            />
          </React.Suspense>
        )}

        {viewState === ViewState.CREATE_EVENT && <CreateEventPage setViewState={setViewState} />}
        {viewState === ViewState.EDIT_EVENT && selectedEvent && (
          <React.Suspense fallback={<PageSkeleton />}>
            <EditEventPage setViewState={setViewState} event={selectedEvent} eventId={selectedEvent.id} />
          </React.Suspense>
        )}

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
        {viewState === ViewState.DEBUG_ENV && <DebugEnvPage setViewState={setViewState} />}
        {viewState === ViewState.DEBUG_SEED_DEMO && (
          <React.Suspense fallback={<PageSkeleton />}>
            <DebugSeedDemoEventsPage setViewState={setViewState} />
          </React.Suspense>
        )}
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
          <main className="min-h-screen pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-12 sm:pb-16 md:pb-20 lg:pb-24">
            {/* Container wrapper for consistent alignment */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            
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

            {/* Always show events grouped by city, with selected city first */}
            <div className="space-y-4 animate-fade-in">
              {/* Show results count if filters are applied */}
              {(searchQuery.trim() || activeCategory !== 'All' || (location && location.trim() && location !== 'montreal')) && (
                <div className="mb-6 text-gray-500 text-sm font-medium">
                  Showing {filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''}
                  {location && location !== 'montreal' && ` in ${location.charAt(0).toUpperCase() + location.slice(1)}`}
                </div>
              )}

              {/* Group filtered events by city, with selected city first */}
              {(() => {
                // Group filtered events by city
                const filteredEventsByCity: Record<string, Event[]> = {};
                filteredEvents.forEach((event) => {
                  if (event?.city) {
                    if (!filteredEventsByCity[event.city]) {
                      filteredEventsByCity[event.city] = [];
                    }
                    filteredEventsByCity[event.city].push(event);
                  }
                });

                // Sort cities: selected city first, then alphabetically
                const cityEntries = Object.entries(filteredEventsByCity);
                const selectedCityName = location && location !== 'montreal' 
                  ? cityEntries.find(([city]) => 
                      city.toLowerCase().includes(location.toLowerCase()) || 
                      location.toLowerCase().includes(city.split(',')[0].toLowerCase())
                    )?.[0]
                  : null;

                // Sort: selected city first, then alphabetically
                cityEntries.sort(([cityA], [cityB]) => {
                  if (selectedCityName) {
                    if (cityA === selectedCityName) return -1;
                    if (cityB === selectedCityName) return 1;
                  }
                  return cityA.localeCompare(cityB);
                });

                if (cityEntries.length === 0) {
                  return (
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
                  );
                }

                return (
                  <div className="space-y-8 sm:space-y-10 md:space-y-12">
                    {cityEntries.map(([cityName, cityEvents]) => {
                      const scrollContainerId = `city-scroll-${cityName.replace(/\s+/g, '-')}`;
                      
                      const scrollLeft = () => {
                        const container = document.getElementById(scrollContainerId);
                        if (container) {
                          container.scrollBy({ left: -400, behavior: 'smooth' });
                        }
                      };
                      
                      const scrollRight = () => {
                        const container = document.getElementById(scrollContainerId);
                        if (container) {
                          container.scrollBy({ left: 400, behavior: 'smooth' });
                        }
                      };
                      
                      return (
                        <div key={cityName} className="mb-8 sm:mb-10 md:mb-12">
                          <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-[#15383c] mb-4 sm:mb-6">
                            {cityName}
                          </h2>
                          {/* Mobile: Horizontal scroll, Desktop: Horizontal scroll with 4 per row */}
                          <div className="relative group">
                            {/* Left Arrow - Desktop only */}
                            <button
                              onClick={scrollLeft}
                              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 items-center justify-center text-[#15383c] hover:bg-[#eef4f5] hover:border-[#15383c] transition-all opacity-0 group-hover:opacity-100"
                              aria-label="Scroll left"
                            >
                              <ChevronLeft size={20} />
                            </button>
                            
                            {/* Scrollable Container - Scrollable anywhere on screen */}
                            <div 
                              id={scrollContainerId}
                              className="flex overflow-x-auto gap-4 md:gap-6 lg:gap-8 pb-2 md:pb-6 snap-x snap-mandatory scroll-smooth hide-scrollbar w-full touch-pan-x overscroll-x-contain scroll-pl-4 md:scroll-pl-0 cursor-grab active:cursor-grabbing"
                              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}
                              onWheel={(e) => {
                                // Allow horizontal scrolling with mouse wheel when hovering over the container
                                const container = e.currentTarget;
                                if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
                                  e.preventDefault();
                                  container.scrollLeft += e.deltaY;
                                }
                              }}
                              onMouseDown={(e) => {
                                // Enable drag scrolling
                                const container = e.currentTarget;
                                const startX = e.pageX - container.offsetLeft;
                                const scrollLeft = container.scrollLeft;
                                let isDown = true;

                                const handleMouseMove = (e: MouseEvent) => {
                                  if (!isDown) return;
                                  e.preventDefault();
                                  const x = e.pageX - container.offsetLeft;
                                  const walk = (x - startX) * 2;
                                  container.scrollLeft = scrollLeft - walk;
                                };

                                const handleMouseUp = () => {
                                  isDown = false;
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };

                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                            >
                              {cityEvents.map(event => (
                                <div key={event.id} className="snap-start shrink-0 w-[85vw] sm:w-[70vw] md:w-[calc(25%-1.5rem)] lg:w-[calc(25%-2rem)] flex-shrink-0" style={{ touchAction: 'pan-x pan-y' }}>
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
                            
                            {/* Right Arrow - Desktop only */}
                            <button
                              onClick={scrollRight}
                              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 items-center justify-center text-[#15383c] hover:bg-[#eef4f5] hover:border-[#15383c] transition-all opacity-0 group-hover:opacity-100"
                              aria-label="Scroll right"
                            >
                              <ChevronRight size={20} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            
            {/* Mobile CTA FAB - Only show when logged in */}
            {isLoggedIn && (
              <button 
                onClick={() => handleNav(ViewState.CREATE_EVENT)}
                className="md:hidden fixed bottom-6 right-4 sm:right-6 w-14 h-14 bg-[#e35e25] rounded-full flex items-center justify-center text-white shadow-2xl shadow-orange-900/40 z-40 hover:scale-105 active:scale-95 transition-transform border-4 border-white touch-manipulation safe-area-inset-bottom"
                aria-label="Create Pop-up"
              >
                 <PlusCircle size={28} />
              </button>
            )}
            </div>
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
          <ReviewsModal 
            event={reviewEvent} 
            onClose={() => setReviewEvent(null)}
            onReviewerClick={handleReviewerClick}
          />
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
