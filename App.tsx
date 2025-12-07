import React, { useState, useEffect, useMemo } from 'react';

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    
    // Handle Firebase permission errors gracefully - prevent all error displays
    if (reason?.code === 'permission-denied' || 
        reason?.message?.includes('permission') || 
        reason?.message?.includes('Missing or insufficient permissions') ||
        (reason?.name === 'FirebaseError' && reason?.code === 'permission-denied')) {
      // Silently handle - these are expected and already logged elsewhere
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    
    // Log other unhandled rejections for debugging (but still prevent default display)
    console.error('[UNHANDLED_REJECTION]', reason);
    event.preventDefault();
    event.stopPropagation();
    
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
import { FilterDrawer } from './components/filters/FilterDrawer';
import { CategoryIconButton } from './components/filters/CategoryIconButton';
import { VibeIconButton } from './components/filters/VibeIconButton';
import { ALL_VIBES } from './utils/vibes';
// Route-level code splitting for performance
const LandingPage = React.lazy(() => import('./src/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const EventDetailPage = React.lazy(() => import('./src/pages/EventDetailPage').then(m => ({ default: m.EventDetailPage })));
const EventFeed = React.lazy(() => import('./components/events/EventFeed').then(m => ({ default: m.EventFeed })));
const GroupChat = React.lazy(() => import('./components/chat/GroupChat').then(m => ({ default: m.GroupChat })));
const ReviewsModal = React.lazy(() => import('./components/events/ReviewsModal').then(m => ({ default: m.ReviewsModal })));
const HostProfile = React.lazy(() => import('./components/profile/HostProfile').then(m => ({ default: m.HostProfile })));
const AboutPage = React.lazy(() => import('./src/pages/AboutPage').then(m => ({ default: m.AboutPage })));
const CareersPage = React.lazy(() => import('./src/pages/CareersPage').then(m => ({ default: m.CareersPage })));
const ContactPage = React.lazy(() => import('./src/pages/ContactPage').then(m => ({ default: m.ContactPage })));
const TermsPage = React.lazy(() => import('./src/pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = React.lazy(() => import('./src/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const CancellationPage = React.lazy(() => import('./src/pages/CancellationPage').then(m => ({ default: m.CancellationPage })));
const GuidelinesPage = React.lazy(() => import('./src/pages/GuidelinesPage').then(m => ({ default: m.GuidelinesPage })));
const ReportPage = React.lazy(() => import('./src/pages/ReportPage').then(m => ({ default: m.ReportPage })));
const HelpPage = React.lazy(() => import('./src/pages/HelpPage').then(m => ({ default: m.HelpPage })));
const SafetyPage = React.lazy(() => import('./src/pages/SafetyPage').then(m => ({ default: m.SafetyPage })));
const PressPage = React.lazy(() => import('./src/pages/PressPage').then(m => ({ default: m.PressPage })));
const AuthPage = React.lazy(() => import('./src/pages/AuthPage').then(m => ({ default: m.AuthPage })));
const ProfilePage = React.lazy(() => import('./src/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const NotificationsPage = React.lazy(() => import('./src/pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const MyPopsPage = React.lazy(() => import('./src/pages/MyPopsPage').then(m => ({ default: m.MyPopsPage })));
const FavoritesPage = React.lazy(() => import('./src/pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const MyCalendarPage = React.lazy(() => import('./src/pages/MyCalendarPage').then(m => ({ default: m.MyCalendarPage })));
const DeleteAccountPage = React.lazy(() => import('./src/pages/DeleteAccountPage').then(m => ({ default: m.DeleteAccountPage })));
const CreateEventPage = React.lazy(() => import('./src/pages/CreateEventPage').then(m => ({ default: m.CreateEventPage })));
const EditEventPage = React.lazy(() => import('./src/pages/EditEventPage').then(m => ({ default: m.EditEventPage })));
const DebugEnvPage = React.lazy(() => import('./src/pages/DebugEnvPage').then(m => ({ default: m.DebugEnvPage })));
const DebugSeedDemoEventsPage = React.lazy(() => import('./src/pages/DebugSeedDemoEventsPage').then(m => ({ default: m.DebugSeedDemoEventsPage })));
const CleanupReviewsPage = React.lazy(() => import('./src/pages/CleanupReviewsPage').then(m => ({ default: m.CleanupReviewsPage })));
const VerifyFirebasePage = React.lazy(() => import('./src/pages/VerifyFirebasePage').then(m => ({ default: m.VerifyFirebasePage })));

// Consolidated Imports - lazy loaded
const BasicDetailsPage = React.lazy(() => import('./src/pages/ProfileSubPages').then(m => ({ default: m.BasicDetailsPage })));
const NotificationSettingsPage = React.lazy(() => import('./src/pages/ProfileSubPages').then(m => ({ default: m.NotificationSettingsPage })));
const PrivacySettingsPage = React.lazy(() => import('./src/pages/ProfileSubPages').then(m => ({ default: m.PrivacySettingsPage })));
const StripeSettingsPage = React.lazy(() => import('./src/pages/ProfileSubPages').then(m => ({ default: m.StripeSettingsPage })));
const MyReviewsPage = React.lazy(() => import('./src/pages/ProfileSubPages').then(m => ({ default: m.MyReviewsPage })));
const FollowingPage = React.lazy(() => import('./src/pages/ProfileSubPages').then(m => ({ default: m.FollowingPage })));
const FollowersPage = React.lazy(() => import('./src/pages/ProfileSubPages').then(m => ({ default: m.FollowersPage })));
const ReservationConfirmationPage = React.lazy(() => import('./src/pages/ReservationConfirmationPage').then(m => ({ default: m.ReservationConfirmationPage })));
const ConfirmReservationPage = React.lazy(() => import('./src/pages/ConfirmReservationPage').then(m => ({ default: m.ConfirmReservationPage })));

import { Event, ViewState } from './types';
import { Search, ArrowRight, MapPin, PlusCircle, ChevronRight, ChevronLeft, Filter, Sparkles } from 'lucide-react';
import { EventCard } from './components/events/EventCard';
import { useEventStore } from './stores/eventStore';
import { useUserStore } from './stores/userStore';
import { categoryMatches } from './utils/categoryMapper';
import { useDebouncedFavorite } from './hooks/useDebouncedFavorite';
import { ConversationButtonModal } from './components/chat/ConversationButtonModal';
import { useSelectedCity, useSetCity, type City } from './src/stores/cityStore';
import { useFilterStore } from './stores/filterStore';
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
const PageSkeleton: React.FC<{ message?: string }> = ({ message }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-pulse space-y-4 w-full max-w-md px-4">
      {message && (
        <div className="text-center text-gray-600 mb-4">{message}</div>
      )}
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
  // Parse initial route from URL to handle direct navigation and page refreshes
  const getInitialViewState = (): ViewState => {
    if (typeof window === 'undefined') return ViewState.LANDING;
    const pathname = window.location.pathname;
    
    // Match routes from URL (without needing events loaded yet)
    if (pathname === '/' || pathname === '') {
      return ViewState.LANDING;
    } else if (pathname === '/explore') {
      return ViewState.FEED;
    } else if (pathname.startsWith('/event/')) {
      // Check if it's a chat route
      if (pathname.includes('/chat')) {
        return ViewState.CHAT;
      }
      return ViewState.DETAIL;
    } else if (pathname === '/profile') {
      return ViewState.PROFILE;
    } else if (pathname === '/my-pops') {
      return ViewState.MY_POPS;
    } else if (pathname === '/favorites') {
      return ViewState.FAVORITES;
    } else if (pathname === '/create-event') {
      return ViewState.CREATE_EVENT;
    } else if (pathname === '/about') {
      return ViewState.ABOUT;
    } else if (pathname === '/contact') {
      return ViewState.CONTACT;
    } else if (pathname === '/guidelines') {
      return ViewState.GUIDELINES;
    } else if (pathname === '/terms') {
      return ViewState.TERMS;
    } else if (pathname === '/privacy') {
      return ViewState.PRIVACY;
    } else if (pathname === '/cancellation') {
      return ViewState.CANCELLATION;
    } else if (pathname === '/careers') {
      return ViewState.CAREERS;
    } else if (pathname === '/report') {
      return ViewState.REPORT_EVENT;
    } else if (pathname === '/help') {
      return ViewState.HELP;
    } else if (pathname === '/safety') {
      return ViewState.SAFETY;
    } else if (pathname === '/press') {
      return ViewState.PRESS;
    }
    
    // Default to landing page for unknown routes
    return ViewState.LANDING;
  };
  
  const [viewState, setViewState] = useState<ViewState>(getInitialViewState());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [reviewEvent, setReviewEvent] = useState<Event | null>(null); 
  const [selectedHost, setSelectedHost] = useState<string | null>(null); 
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const setCity = useSetCity();
  const location = city;
  const { filters, isFilterDrawerOpen, setFilterDrawerOpen, getActiveFilterCount, setFilter } = useFilterStore();
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
  const cleanupEndedFavorites = useUserStore((state) => state.cleanupEndedFavorites);
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
  
  // Debug: Log events state
  useEffect(() => {
    console.log('[APP_DEBUG] Events state:', {
      totalEvents: allEvents.length,
      isLoading: isLoadingEvents,
      error: eventsError,
      eventIds: allEvents.map(e => e.id),
      eventTitles: allEvents.map(e => e.title),
    });
  }, [allEvents.length, isLoadingEvents, eventsError]);
  
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
    
    // Geocode all existing events that don't have coordinates (background process)
    // This runs once when the app loads, geocoding events in the background
    setTimeout(async () => {
      try {
        const { geocodeAllEvents } = await import('./utils/geocodeAllEvents');
        // Run in background, don't block UI
        geocodeAllEvents().then((summary) => {
          console.log('[APP] ✅ Geocoding complete:', summary);
        }).catch((error: any) => {
          // Handle permission errors gracefully
          if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
            console.warn('[APP] Permission denied when geocoding events (expected if not logged in)');
          } else {
            console.error('[APP] Error geocoding events:', error);
          }
        });
      } catch (error) {
        console.error('[APP] Failed to load geocoding utility:', error);
      }
    }, 5000); // 5 second delay to not interfere with initial load

    // CRITICAL: Auto-restore incorrectly hidden user events (background process)
    // This safely restores events that were incorrectly marked as private/draft
    // It ONLY affects events from non-Popera accounts and only removes problematic flags
    // It NEVER deletes or modifies user data - only removes isPublic: false or isDraft: true
    setTimeout(async () => {
      try {
        const { restoreAllHiddenEvents, getEventsByHost } = await import('./utils/restoreUserEvents');
        // First, check if there are any hidden events
        getEventsByHost().then(async (summaries) => {
          const totalHidden = summaries.reduce((sum, s) => sum + s.hiddenEvents, 0);
          if (totalHidden > 0) {
            console.warn(`[APP] ⚠️ Found ${totalHidden} hidden events - attempting automatic restoration...`);
            // Automatically restore all hidden events (safe - only removes flags)
            const result = await restoreAllHiddenEvents();
            if (result.restored > 0) {
              console.log(`[APP] ✅ Successfully restored ${result.restored} hidden events`);
              console.log(`[APP] Restored events for ${Object.keys(result.byHost).length} hosts`);
            } else if (result.errors > 0) {
              console.warn(`[APP] ⚠️ Some events could not be restored (${result.errors} errors)`);
              console.log('[APP] Run restoreUserEvents.generateEventReport() in console for details');
            } else {
              console.log('[APP] ℹ️ No events needed restoration (they may be intentionally hidden)');
            }
          } else {
            console.log('[APP] ✅ All user events are visible (no restoration needed)');
          }
        }).catch((error: any) => {
          // Handle permission errors gracefully
          if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
            console.warn('[APP] Permission denied when scanning/restoring events (expected if not logged in)');
          } else {
            console.error('[APP] Error scanning/restoring events:', error);
          }
        });
      } catch (error) {
        console.error('[APP] Failed to load event restoration utility:', error);
      }
    }, 7000); // 7 second delay to not interfere with initial load

    // Diagnostic: Check event loading status
    setTimeout(async () => {
      try {
        const { diagnoseEvents } = await import('./utils/diagnoseEvents');
        diagnoseEvents().catch((error) => {
          console.error('[APP] Error running event diagnostic:', error);
        });
      } catch (error) {
        console.error('[APP] Failed to load event diagnostic utility:', error);
      }
    }, 10000); // 10 second delay to check after everything loads
    

    // Verify and seed community events for eatezca@gmail.com (runs immediately when Firestore is ready)
    // Creates 2 events per city in different categories - all public, free, unlimited capacity
    // This function verifies existing events and creates missing ones
    // Run immediately - Firestore should be ready by now
    (async () => {
      try {
        const { verifyAndSeedCommunityEvents } = await import('./firebase/verifyAndSeedCommunityEvents');
        // Run in background, don't block UI
        verifyAndSeedCommunityEvents().then(() => {
          console.log('[APP] ✅ Community events verification and seeding complete for eatezca@gmail.com');
        }).catch((error) => {
          console.error('[APP] Error verifying/seeding community events:', error);
        });
      } catch (error) {
        console.error('[APP] Failed to load community events verification utility:', error);
      }
    })();
    
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
  // BUT: Respect the root path - if URL is '/', keep showing landing page
  // No complex logic, no flags, no polling - just check and navigate
  useEffect(() => {
    if (!authInitialized) return;
    
    const currentPath = window.location.pathname;
    
    // Simple rule: User logged in + on landing page = go to feed
    // BUT: Don't redirect if we're on the root path - respect the URL
    if (user && viewState === ViewState.LANDING && currentPath !== '/') {
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

  // Verify and seed community events immediately when user is eatezca@gmail.com
  useEffect(() => {
    if (!authInitialized) return;
    
    // Only run for eatezca@gmail.com account
    if (user?.email?.toLowerCase() === 'eatezca@gmail.com') {
      (async () => {
        try {
          const { verifyAndSeedCommunityEvents } = await import('./firebase/verifyAndSeedCommunityEvents');
          verifyAndSeedCommunityEvents().then(() => {
            console.log('[APP] ✅ Community events verification and seeding complete for eatezca@gmail.com');
          }).catch((error) => {
            console.error('[APP] Error verifying/seeding community events:', error);
          });
        } catch (error) {
          console.error('[APP] Failed to load community events verification utility:', error);
        }
      })();
    }
  }, [user?.email, authInitialized]);

  // Events are now loaded via real-time subscription in eventStore.init()
  // No need for manual loading or mock data initialization - events come from Firestore in real-time
  
  // Update attendee counts when RSVPs change
  // Sync event attendee counts from Firestore reservations for all events
  // CRITICAL: Only sync if user is authenticated to avoid permission errors
  useEffect(() => {
    // Don't sync if user is not authenticated - will cause permission errors
    if (!user || allEvents.length === 0) return;
    
    let isMounted = true;
    let hasPermissionError = false;
    
    const syncEventCounts = async () => {
      // Stop syncing if we've encountered permission errors
      if (hasPermissionError || !isMounted) return;
      
      try {
        const { getReservationCountForEvent } = await import('./firebase/db');
        const countPromises = allEvents
          .filter(event => event.id && !event.isDemo)
          .map(async (event) => {
            if (!isMounted || hasPermissionError) return;
            
            try {
              const count = await getReservationCountForEvent(event.id);
              // Only update if count is different and we still have permission
              if (isMounted && !hasPermissionError && event.attendeesCount !== count) {
                await updateEvent(event.id, { attendeesCount: count });
              }
            } catch (error: any) {
              // If permission error, stop all future syncs
              if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
                hasPermissionError = true;
                console.warn('[SYNC_COUNTS] Permission denied - stopping sync to prevent infinite loop');
                return;
              }
              // Silently ignore other errors for individual events
            }
          });
        
        await Promise.all(countPromises);
      } catch (error: any) {
        // If permission error, stop all future syncs
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          hasPermissionError = true;
          console.warn('[SYNC_COUNTS] Permission denied - stopping sync to prevent infinite loop');
        }
      }
    };
    
    // Sync immediately, then every 30 seconds (reduced frequency)
    syncEventCounts();
    const interval = setInterval(() => {
      if (!hasPermissionError && isMounted) {
        syncEventCounts();
      }
    }, 30000); // Increased to 30 seconds to reduce load
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [allEvents.length, user?.uid, updateEvent]); // Only depend on length and user, not the full array

  // Real-time subscription for user RSVPs - keeps RSVPs in sync across devices
  useEffect(() => {
    if (!user?.uid) return;
    
    const userId = user.uid; // Capture userId to avoid closure issues
    let unsubscribe: (() => void) | null = null;
    
    const setupRSVPSubscription = async () => {
      try {
        const { subscribeToUserRSVPs } = await import('./firebase/db');
        
        unsubscribe = subscribeToUserRSVPs(userId, (rsvpEventIds) => {
          console.log('[RSVP_SYNC] RSVPs updated:', {
            userId,
            rsvpCount: rsvpEventIds.length,
            rsvpEventIds,
          });
          
          // Update userStore with latest RSVPs
          const currentUser = useUserStore.getState().user;
          if (currentUser && currentUser.uid === userId) {
            // Only update if RSVPs have changed
            const currentRSVPs = currentUser.rsvps || [];
            const rsvpsChanged = 
              currentRSVPs.length !== rsvpEventIds.length ||
              !currentRSVPs.every(id => rsvpEventIds.includes(id));
            
            if (rsvpsChanged) {
              console.log('[RSVP_SYNC] Updating user RSVPs in store:', {
                old: currentRSVPs,
                new: rsvpEventIds,
              });
              useUserStore.setState({
                user: { ...currentUser, rsvps: rsvpEventIds },
                currentUser: { ...currentUser, rsvps: rsvpEventIds },
              });
            }
          }
        });
      } catch (error) {
        console.error('[RSVP_SYNC] Error setting up RSVP subscription:', error);
      }
    };
    
    setupRSVPSubscription();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  // Clean up favorites for ended events - runs periodically
  // IMPORTANT: Favorites persist until event ends or user unfavorites
  useEffect(() => {
    if (!user?.uid || allEvents.length === 0) return;
    
    let isMounted = true;
    
    const cleanupFavorites = async () => {
      if (!isMounted || !user?.uid) return;
      
      try {
        await cleanupEndedFavorites(user.uid, allEvents);
      } catch (error) {
        console.error('[FAVORITES_CLEANUP] Error cleaning up favorites:', error);
      }
    };
    
    // Run cleanup immediately, then every 5 minutes
    cleanupFavorites();
    const interval = setInterval(() => {
      if (isMounted && user?.uid) {
        cleanupFavorites();
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.uid, allEvents.length, cleanupEndedFavorites]);

  // Check for follow host suggestions after events end - runs periodically
  // Suggests following hosts 24-48 hours after event ends
  useEffect(() => {
    if (!user?.uid || allEvents.length === 0 || !user.rsvps || user.rsvps.length === 0) return;
    
    let isMounted = true;
    
    const checkFollowSuggestions = async () => {
      if (!isMounted || !user?.uid) return;
      
      try {
        const { isEventEnded } = await import('./utils/eventDateHelpers');
        const { suggestFollowingHost } = await import('./utils/notificationHelpers');
        const { isFollowing } = await import('./firebase/follow');
        const { getDbSafe } = await import('./src/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        
        const db = getDbSafe();
        if (!db) return;
        
        // Check each event the user RSVP'd to
        for (const eventId of user.rsvps) {
          const event = allEvents.find(e => e.id === eventId);
          if (!event || !event.hostId) continue;
          
          // Check if event ended 24-48 hours ago
          if (isEventEnded(event)) {
            try {
              // Parse event date and time
              const eventDate = new Date(event.date);
              if (event.time) {
                const timeParts = event.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                if (timeParts) {
                  let hours = parseInt(timeParts[1], 10);
                  const minutes = parseInt(timeParts[2], 10);
                  const period = timeParts[3]?.toUpperCase();
                  
                  if (period === 'PM' && hours !== 12) hours += 12;
                  else if (period === 'AM' && hours === 12) hours = 0;
                  
                  eventDate.setHours(hours, minutes, 0, 0);
                }
              }
              
              const hoursSinceEnd = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60);
              
              // Suggest following if event ended 24-48 hours ago
              if (hoursSinceEnd >= 24 && hoursSinceEnd <= 48) {
                // Check if already following
                const alreadyFollowing = await isFollowing(user.uid, event.hostId);
                if (alreadyFollowing) continue;
                
                // Check if we already sent this suggestion (using event doc metadata)
                const eventRef = doc(db, 'events', eventId);
                const eventDoc = await getDoc(eventRef);
                const followSuggestionsSent = eventDoc.data()?.followSuggestionsSent || [];
                
                if (!followSuggestionsSent.includes(user.uid)) {
                  // Send suggestion (non-blocking)
                  suggestFollowingHost(user.uid, event.hostId, eventId, event.title)
                    .then(async () => {
                      // Mark as sent (non-blocking)
                      try {
                        const { updateDoc, arrayUnion } = await import('firebase/firestore');
                        await updateDoc(eventRef, {
                          followSuggestionsSent: arrayUnion(user.uid)
                        });
                      } catch (error) {
                        // Ignore errors - this is just metadata
                      }
                    })
                    .catch(() => {
                      // Ignore errors - suggestion is optional
                    });
                }
              }
            } catch (error) {
              // Ignore errors for individual events
              if (import.meta.env.DEV) {
                console.warn('[FOLLOW_SUGGESTION] Error checking event:', eventId, error);
              }
            }
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[FOLLOW_SUGGESTION] Error checking follow suggestions:', error);
        }
      }
    };
    
    // Run check immediately, then every hour
    checkFollowSuggestions();
    const interval = setInterval(() => {
      if (isMounted && user?.uid) {
        checkFollowSuggestions();
      }
    }, 60 * 60 * 1000); // Every hour
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.uid, user?.rsvps, allEvents.length]);

  // Filter events based on search, location, category, and tags
  // Apply all filters in sequence for proper combined filtering
  // Filters work together: Category + City + Search all apply simultaneously
  let filteredEvents = allEvents;
  
  // Apply category filter first (e.g., "Sports", "Community")
  // Uses category mapper to handle plural/singular variations (e.g., "Markets" -> "Market")
  if (activeCategory !== 'All') {
    filteredEvents = filteredEvents.filter(event => 
      categoryMatches(event.category, activeCategory)
    );
  }
  
  // Apply city filter - match by city slug or city name
  // "Canada" shows all events (no filter)
  if (location && location.trim() && location.toLowerCase() !== 'canada') {
    const citySlug = location.toLowerCase();
    filteredEvents = filteredEvents.filter(event => {
      const eventCityLower = event.city.toLowerCase();
      // Normalize city name (remove ", CA" for comparison)
      const normalizedEventCity = eventCityLower.replace(/,\s*ca$/, '').trim();
      const normalizedLocation = citySlug.replace(/,\s*ca$/, '').trim();
      // Match by slug (e.g., "montreal" matches "Montreal, CA")
      return normalizedEventCity.includes(normalizedLocation) || 
             normalizedLocation.includes(normalizedEventCity) ||
             eventCityLower.includes(citySlug) || 
             eventCityLower.includes(citySlug.replace('-', ' '));
    });
  }
  
  // Apply search filter last (text search in titles, descriptions, tags, hostName, aboutEvent, whatToExpect)
  // This ensures search works with category and city filters
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filteredEvents = filteredEvents.filter(event => 
      event.title.toLowerCase().includes(query) ||
      event.description.toLowerCase().includes(query) ||
      event.hostName.toLowerCase().includes(query) ||
      (event.tags && event.tags.some(tag => tag.toLowerCase().includes(query))) ||
      (event.aboutEvent && event.aboutEvent.toLowerCase().includes(query)) ||
      (event.whatToExpect && event.whatToExpect.toLowerCase().includes(query))
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
    // Use pushState to create history entry for back button navigation
    window.history.pushState({ viewState: ViewState.DETAIL, eventId: event.id }, '', `/event/${event.id}`);
    setViewState(ViewState.DETAIL);
    window.scrollTo(0, 0);
  };

  // Listen for custom event to select event from ProfilePage
  useEffect(() => {
    const handleSelectEvent = (e: CustomEvent<{ eventId: string }>) => {
      const event = allEvents.find(ev => ev.id === e.detail.eventId);
      if (event) {
        handleEventClick(event);
      }
    };
    window.addEventListener('selectEvent', handleSelectEvent as EventListener);
    return () => window.removeEventListener('selectEvent', handleSelectEvent as EventListener);
  }, [allEvents]);

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
      const chatUrl = `/event/${event.id}/chat`;
      window.history.pushState({ viewState: ViewState.CHAT, eventId: event.id }, '', chatUrl);
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
    // Use pushState to create history entry for back button navigation
    const hostProfileUrl = `/host/${encodeURIComponent(hostName)}`;
    window.history.pushState({ viewState: ViewState.HOST_PROFILE, hostName }, '', hostProfileUrl);
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


  // Browser history management - enable back button functionality
  // Use replaceState to avoid creating problematic history entries that cause 404s
  useEffect(() => {
    // Update history safely for all view states - use replaceState to prevent 404s
    const currentUrl = window.location.pathname;
    
    if (viewState === ViewState.FEED) {
      if (currentUrl !== '/explore') {
        window.history.replaceState({ viewState: ViewState.FEED }, '', '/explore');
      }
    } else if (viewState === ViewState.LANDING) {
      if (currentUrl !== '/') {
        window.history.replaceState({ viewState: ViewState.LANDING }, '', '/');
      }
    } else if (viewState === ViewState.DETAIL && selectedEvent) {
      // DETAIL view should have event ID in URL
      const expectedUrl = `/event/${selectedEvent.id}`;
      if (currentUrl !== expectedUrl) {
        window.history.replaceState({ viewState: ViewState.DETAIL, eventId: selectedEvent.id }, '', expectedUrl);
      }
    } else if (viewState === ViewState.PROFILE) {
      if (currentUrl !== '/profile') {
        window.history.replaceState({ viewState: ViewState.PROFILE }, '', '/profile');
      }
    } else if (viewState === ViewState.MY_POPS) {
      if (currentUrl !== '/my-pops') {
        window.history.replaceState({ viewState: ViewState.MY_POPS }, '', '/my-pops');
      }
    } else if (viewState === ViewState.FAVORITES) {
      if (currentUrl !== '/favorites') {
        window.history.replaceState({ viewState: ViewState.FAVORITES }, '', '/favorites');
      }
    } else if (viewState === ViewState.CREATE_EVENT) {
      if (currentUrl !== '/create-event') {
        window.history.replaceState({ viewState: ViewState.CREATE_EVENT }, '', '/create-event');
      }
    } else if (viewState === ViewState.CHAT && selectedEvent) {
      const expectedUrl = `/event/${selectedEvent.id}/chat`;
      if (currentUrl !== expectedUrl) {
        window.history.replaceState({ viewState: ViewState.CHAT, eventId: selectedEvent.id }, '', expectedUrl);
      }
    } else if (viewState === ViewState.ABOUT) {
      if (currentUrl !== '/about') {
        window.history.replaceState({ viewState: ViewState.ABOUT }, '', '/about');
      }
    } else if (viewState === ViewState.CAREERS) {
      if (currentUrl !== '/careers') {
        window.history.replaceState({ viewState: ViewState.CAREERS }, '', '/careers');
      }
    } else if (viewState === ViewState.CONTACT) {
      if (currentUrl !== '/contact') {
        window.history.replaceState({ viewState: ViewState.CONTACT }, '', '/contact');
      }
    } else if (viewState === ViewState.TERMS) {
      if (currentUrl !== '/terms') {
        window.history.replaceState({ viewState: ViewState.TERMS }, '', '/terms');
      }
    } else if (viewState === ViewState.PRIVACY) {
      if (currentUrl !== '/privacy') {
        window.history.replaceState({ viewState: ViewState.PRIVACY }, '', '/privacy');
      }
    } else if (viewState === ViewState.CANCELLATION) {
      if (currentUrl !== '/cancellation') {
        window.history.replaceState({ viewState: ViewState.CANCELLATION }, '', '/cancellation');
      }
    } else if (viewState === ViewState.GUIDELINES) {
      if (currentUrl !== '/guidelines') {
        window.history.replaceState({ viewState: ViewState.GUIDELINES }, '', '/guidelines');
      }
    } else if (viewState === ViewState.REPORT_EVENT) {
      if (currentUrl !== '/report') {
        window.history.replaceState({ viewState: ViewState.REPORT_EVENT }, '', '/report');
      }
    } else if (viewState === ViewState.HELP) {
      if (currentUrl !== '/help') {
        window.history.replaceState({ viewState: ViewState.HELP }, '', '/help');
      }
    } else if (viewState === ViewState.SAFETY) {
      if (currentUrl !== '/safety') {
        window.history.replaceState({ viewState: ViewState.SAFETY }, '', '/safety');
      }
    } else if (viewState === ViewState.PRESS) {
      if (currentUrl !== '/press') {
        window.history.replaceState({ viewState: ViewState.PRESS }, '', '/press');
      }
    } else if (viewState === ViewState.HOST_PROFILE && selectedHost) {
      // HOST_PROFILE doesn't need URL sync - it's a modal-like overlay
      // Keep current URL to allow back button to work
    } else if (viewState === ViewState.AUTH) {
      if (currentUrl !== '/auth') {
        window.history.replaceState({ viewState: ViewState.AUTH }, '', '/auth');
      }
    }
  }, [viewState, selectedEvent, selectedHost]);

  // Router: Handle direct navigation and popstate events
  // This ensures routes are detected on initial page load and browser navigation
  useEffect(() => {
    console.log('[ROUTER] Router mounted');

    const handlePopState = () => {
      const pathname = window.location.pathname;
      console.log('[ROUTER] popstate triggered with pathname:', pathname);

      // CHAT route
      const chatMatch = pathname.match(/^\/event\/([^/]+)\/chat/);
      if (chatMatch) {
        const eventId = chatMatch[1];
        console.log('[ROUTER] Chat route detected:', eventId);
        // Find event in allEvents or wait for it to load
        const event = allEvents.find(e => e.id === eventId);
        if (event) {
          console.log('[ROUTER] Event found, setting selectedEvent and viewState to CHAT');
          setSelectedEvent(event);
          setViewState(ViewState.CHAT);
          window.history.replaceState({ viewState: ViewState.CHAT, eventId }, '', pathname);
        } else {
          console.log('[ROUTER] Event not found yet, setting viewState to CHAT:', eventId);
          setViewState(ViewState.CHAT);
          window.history.replaceState({ viewState: ViewState.CHAT, eventId }, '', pathname);
        }
        return;
      }

      // LANDING route (root path)
      if (pathname === '/' || pathname === '') {
        console.log('[ROUTER] Landing route detected');
        setViewState(ViewState.LANDING);
        return;
      }

      // FEED route
      if (pathname === '/explore') {
        console.log('[ROUTER] Feed route detected');
        setViewState(ViewState.FEED);
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    handlePopState(); // run on first load

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [allEvents, setSelectedEvent, setViewState]); // Include deps so it re-runs when events load

  // Handle browser back/forward buttons (existing complex handler)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.viewState) {
        const targetView = event.state.viewState;
        
        // If navigating to DETAIL, ensure we have the event
        if (targetView === ViewState.DETAIL && event.state.eventId) {
          const event = allEvents.find(e => e.id === event.state.eventId);
          if (event) {
            setSelectedEvent(event);
            setViewState(ViewState.DETAIL);
          } else {
            // Event not found, fallback to FEED
            console.warn('[APP] Event not found for DETAIL view, falling back to FEED');
            setViewState(ViewState.FEED);
            window.history.replaceState({ viewState: ViewState.FEED }, '', '/explore');
          }
        } else if (targetView === ViewState.CHAT && event.state.eventId) {
          const event = allEvents.find(e => e.id === event.state.eventId);
          if (event) {
            setSelectedEvent(event);
            setViewState(ViewState.CHAT);
          } else {
            // Event not found, fallback to FEED
            console.warn('[APP] Event not found for CHAT view, falling back to FEED');
            setViewState(ViewState.FEED);
            window.history.replaceState({ viewState: ViewState.FEED }, '', '/explore');
          }
        } else {
          // Safe navigation to other views - validate viewState first
          const validViewStates = [
            ViewState.LANDING, ViewState.FEED, ViewState.DETAIL, ViewState.CHAT,
            ViewState.HOST_PROFILE, ViewState.ABOUT, ViewState.CAREERS, ViewState.CONTACT,
            ViewState.TERMS, ViewState.PRIVACY, ViewState.CANCELLATION, ViewState.GUIDELINES,
            ViewState.REPORT_EVENT, ViewState.HELP, ViewState.SAFETY, ViewState.PRESS,
            ViewState.AUTH, ViewState.CREATE_EVENT, ViewState.EDIT_EVENT,
            ViewState.PROFILE, ViewState.NOTIFICATIONS, ViewState.MY_POPS,
            ViewState.FAVORITES, ViewState.MY_CALENDAR,
            ViewState.PROFILE_BASIC, ViewState.PROFILE_NOTIFICATIONS,
            ViewState.PROFILE_PRIVACY, ViewState.PROFILE_STRIPE,
            ViewState.PROFILE_REVIEWS, ViewState.PROFILE_FOLLOWING,
            ViewState.PROFILE_FOLLOWERS, ViewState.DELETE_ACCOUNT,
            ViewState.CONFIRM_RESERVATION, ViewState.RESERVATION_CONFIRMED
          ];
          
          if (validViewStates.includes(targetView)) {
            setViewState(targetView);
          } else {
            // Invalid viewState, use URL to determine correct state
            console.warn('[APP] Invalid viewState in history, using URL to determine state:', targetView);
            const urlBasedState = getInitialViewState();
            setViewState(urlBasedState);
            window.history.replaceState({ viewState: urlBasedState }, '', window.location.pathname);
          }
        }
      } else {
        // No state in history - use URL to determine viewState (handles refresh and direct links)
        const urlBasedState = getInitialViewState();
        const pathname = window.location.pathname;
        
        // If navigating to an event detail page, try to load the event
        if (urlBasedState === ViewState.DETAIL && pathname.startsWith('/event/') && !pathname.includes('/chat')) {
          const eventIdMatch = pathname.match(/^\/event\/([^/]+)/);
          if (eventIdMatch) {
            const eventId = eventIdMatch[1];
            const event = allEvents.find(e => e.id === eventId);
            if (event) {
              setSelectedEvent(event);
              setViewState(ViewState.DETAIL);
              window.history.replaceState({ viewState: ViewState.DETAIL, eventId }, '', pathname);
              return; // Early return to prevent fallback
            } else {
              // Event not found - might still be loading, wait for events to load
              console.log('[APP] Event not found yet, waiting for events to load:', eventId);
              // Set viewState to DETAIL anyway - the useEffect above will handle loading the event
              setViewState(ViewState.DETAIL);
              window.history.replaceState({ viewState: ViewState.DETAIL, eventId }, '', pathname);
              return;
            }
          }
        }
        
        // CRITICAL FIX: Handle CHAT view on page reload (mobile issue)
        if (urlBasedState === ViewState.CHAT && pathname.startsWith('/event/') && pathname.includes('/chat')) {
          const eventIdMatch = pathname.match(/^\/event\/([^/]+)\/chat/);
          if (eventIdMatch) {
            const eventId = eventIdMatch[1];
            const event = allEvents.find(e => e.id === eventId);
            if (event) {
              console.log('[APP] ✅ Loading event for CHAT view on reload (popstate):', eventId);
              setSelectedEvent(event);
              setViewState(ViewState.CHAT);
              window.history.replaceState({ viewState: ViewState.CHAT, eventId }, '', pathname);
              return; // Early return to prevent fallback
            } else {
              // Event not found - might still be loading, wait for events to load
              console.log('[APP] Event not found yet for CHAT, waiting for events to load:', eventId);
              // Set viewState to CHAT anyway - the useEffect above will handle loading the event
              setViewState(ViewState.CHAT);
              window.history.replaceState({ viewState: ViewState.CHAT, eventId }, '', pathname);
              return;
            }
          }
        }
        
        // For other viewStates, set normally
        setViewState(urlBasedState);
        // Ensure URL matches the viewState
        window.history.replaceState({ viewState: urlBasedState }, '', window.location.pathname);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [viewState, setViewState, selectedEvent, allEvents]);

  // Handle direct navigation to event URLs (e.g., shared links, page reload)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const pathname = window.location.pathname;
    
    // Check if URL is an event detail page (without /chat)
    if (pathname.startsWith('/event/') && !pathname.includes('/chat')) {
      const eventIdMatch = pathname.match(/^\/event\/([^/]+)/);
      if (eventIdMatch) {
        const eventId = eventIdMatch[1];
        
        // If we already have this event selected and we're on DETAIL view, no need to do anything
        if (selectedEvent?.id === eventId && viewState === ViewState.DETAIL) {
          return;
        }
        
        // Don't reset viewState if we're on HOST_PROFILE or AUTH (user clicked Profile button or Sign In)
        if (viewState === ViewState.HOST_PROFILE || viewState === ViewState.AUTH) {
          return;
        }
        
        // Wait for events to load, then find the event
        if (allEvents.length > 0) {
          const event = allEvents.find(e => e.id === eventId);
          if (event) {
            // Found the event - set it and navigate to detail page
            setSelectedEvent(event);
            if (viewState !== ViewState.DETAIL) {
              setViewState(ViewState.DETAIL);
              window.history.replaceState({ viewState: ViewState.DETAIL, eventId }, '', pathname);
            }
          } else {
            // Event not found in loaded events
            console.warn('[APP] Event not found in loaded events:', eventId);
            // If events have finished loading and event not found, fallback to FEED
            if (!isLoadingEvents) {
              console.warn('[APP] Events finished loading but event not found, falling back to FEED');
              if (viewState === ViewState.DETAIL) {
                setViewState(ViewState.FEED);
                window.history.replaceState({ viewState: ViewState.FEED }, '', '/explore');
              }
            }
            // If events are still loading, wait for them to finish
          }
        } else if (!isLoadingEvents) {
          // Events have finished loading but none found - event doesn't exist
          console.warn('[APP] Events loaded but event not found:', eventId);
          if (viewState === ViewState.DETAIL) {
            setViewState(ViewState.FEED);
            window.history.replaceState({ viewState: ViewState.FEED }, '', '/explore');
          }
        }
        // If events are still loading, this effect will run again when they finish
      }
    }
    
    // CRITICAL FIX: Handle CHAT view on page reload (mobile issue)
    // When page reloads with /event/{eventId}/chat, we need to load the event
    if (pathname.startsWith('/event/') && pathname.includes('/chat')) {
      const eventIdMatch = pathname.match(/^\/event\/([^/]+)\/chat/);
      if (eventIdMatch) {
        const eventId = eventIdMatch[1];
        
        // If we already have this event selected and we're on CHAT view, no need to do anything
        if (selectedEvent?.id === eventId && viewState === ViewState.CHAT) {
          return;
        }
        
        // Wait for events to load, then find the event
        if (allEvents.length > 0) {
          const event = allEvents.find(e => e.id === eventId);
          if (event) {
            // Found the event - set it and navigate to chat page
            console.log('[APP] ✅ Loading event for CHAT view on reload:', eventId);
            setSelectedEvent(event);
            if (viewState !== ViewState.CHAT) {
              setViewState(ViewState.CHAT);
              window.history.replaceState({ viewState: ViewState.CHAT, eventId }, '', pathname);
            }
          } else {
            // Event not found in loaded events - try to fetch from Firestore
            console.warn('[APP] Event not found in loaded events for CHAT, trying Firestore:', eventId);
            if (!isLoadingEvents) {
              // Try to fetch event directly from Firestore
              import('./firebase/db').then(({ getEventById }) => {
                getEventById(eventId).then((event) => {
                  if (event) {
                    console.log('[APP] ✅ Found event in Firestore for CHAT view:', eventId);
                    setSelectedEvent(event);
                    setViewState(ViewState.CHAT);
                    window.history.replaceState({ viewState: ViewState.CHAT, eventId }, '', pathname);
                  } else {
                    console.warn('[APP] Event not found in Firestore, falling back to FEED');
                    setViewState(ViewState.FEED);
                    window.history.replaceState({ viewState: ViewState.FEED }, '', '/explore');
                  }
                }).catch((error) => {
                  console.error('[APP] Error fetching event from Firestore:', error);
                  setViewState(ViewState.FEED);
                  window.history.replaceState({ viewState: ViewState.FEED }, '', '/explore');
                });
              });
            }
          }
        } else if (!isLoadingEvents) {
          // Events have finished loading but none found - try Firestore
          console.warn('[APP] Events loaded but event not found for CHAT, trying Firestore:', eventId);
          import('./firebase/db').then(({ getEventById }) => {
            getEventById(eventId).then((event) => {
              if (event) {
                console.log('[APP] ✅ Found event in Firestore for CHAT view:', eventId);
                setSelectedEvent(event);
                setViewState(ViewState.CHAT);
                window.history.replaceState({ viewState: ViewState.CHAT, eventId }, '', pathname);
              } else {
                console.warn('[APP] Event not found in Firestore, falling back to FEED');
                setViewState(ViewState.FEED);
                window.history.replaceState({ viewState: ViewState.FEED }, '', '/explore');
              }
            }).catch((error) => {
              console.error('[APP] Error fetching event from Firestore:', error);
              setViewState(ViewState.FEED);
              window.history.replaceState({ viewState: ViewState.FEED }, '', '/explore');
            });
          });
        }
        // If events are still loading, this effect will run again when they finish
      }
    }
  }, [allEvents, isLoadingEvents, selectedEvent, viewState, setViewState]);

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

  if (viewState === ViewState.CHAT) {
    console.log('[CHAT_RENDER_GATE]', {
      viewState,
      selectedEvent: selectedEvent?.id,
      authInitialized,
      user: user?.uid,
    });

    // If event is still loading, show a loader instead of returning null
    if (!selectedEvent) {
      return (
        <PageSkeleton message="Loading event…" />
      );
    }

    if (!authInitialized) {
      console.warn('[CHAT_RENDER_GATE] BLOCKED: auth not initialized');
      return <PageSkeleton message="Initializing…" />;
    }

    if (!user) {
      console.warn('[CHAT_RENDER_GATE] BLOCKED: user not logged in');
      useUserStore.getState().setRedirectAfterLogin(ViewState.CHAT);
      setViewState(ViewState.AUTH);
      return null;
    }

    console.log('[CHAT_RENDER_GATE] OK — rendering GroupChat:', {
      eventId: selectedEvent.id,
    });

    return (
      <React.Suspense fallback={<PageSkeleton />}>
        <GroupChat 
          event={selectedEvent} 
          onClose={handleCloseChat} 
          onViewDetails={handleViewDetailsFromChat}
          onHostClick={handleHostClick}
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
      <div className="flex md:grid overflow-x-auto md:overflow-x-visible gap-4 md:gap-5 lg:gap-6 pb-2 md:pb-6 snap-x snap-mandatory md:snap-none scroll-smooth md:place-items-center">
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
                
                // Create reservation with options (this will also send notifications)
                const reservationId = await addRSVP(user.uid, selectedEvent.id, {
                  attendeeCount,
                  supportContribution: supportContribution > 0 ? supportContribution : undefined,
                  paymentMethod: !selectedEvent.price || selectedEvent.price.toLowerCase() === 'free' ? undefined : paymentMethod,
                  totalAmount: totalAmount > 0 ? totalAmount : undefined,
                });

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
            onEditEvent={(event) => {
              setSelectedEvent(event);
              setViewState(ViewState.EDIT_EVENT);
            }}
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
        {viewState === ViewState.VERIFY_FIREBASE && (
          <React.Suspense fallback={<PageSkeleton />}>
            <VerifyFirebasePage />
          </React.Suspense>
        )}
        {viewState === ViewState.DEBUG_SEED_DEMO && (
          <React.Suspense fallback={<PageSkeleton />}>
            <DebugSeedDemoEventsPage setViewState={setViewState} />
          </React.Suspense>
        )}
        {viewState === ViewState.DEBUG_CLEANUP_REVIEWS && (
          <React.Suspense fallback={<PageSkeleton />}>
            <CleanupReviewsPage setViewState={setViewState} />
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
          <main className="min-h-screen pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-12 sm:pb-16 md:pb-20 lg:pb-24 bg-[#FAFAFA]">
            {/* Container wrapper for consistent alignment */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header Section - Matching Landing Page Structure */}
            <div className="mb-6 sm:mb-8 md:mb-10 lg:mb-12">
               {/* Page Tag, Title, Subtitle */}
               <div className="flex flex-col gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8 md:mb-10">
                  <div className="max-w-3xl">
                     <div className="mb-3 sm:mb-4">
                        <span className="inline-flex items-center gap-2 py-1 sm:py-1.5 md:py-2 px-3.5 sm:px-4 md:px-5 rounded-full bg-[#15383c]/5 border border-[#15383c]/10 text-[#e35e25] text-[9px] sm:text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">
                          <Sparkles size={10} className="sm:w-3 sm:h-3 -mt-0.5" />
                          {t('feed.discover')}
                        </span>
                     </div>
                     <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-heading font-bold text-[#15383c] mb-2 sm:mb-3 md:mb-4 px-4 sm:px-0">{t('feed.explorePopups')}</h1>
                     <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 font-light leading-relaxed px-4 sm:px-0">{t('feed.description')}</p>
                  </div>

                  {/* Search Inputs Row - Below Title (matching landing page) */}
                  <div className="mt-4 space-y-6 px-4 sm:px-0">
                     <div className="flex flex-col md:flex-row gap-3 w-full md:max-w-3xl relative z-30">
                        
                        {/* City Input with Autocomplete */}
                        <div className="w-full md:w-1/3">
                          <CityInput />
                        </div>

                        {/* Keyword Search Bar */}
                        <div className="relative w-full md:w-2/3 group z-10">
                             <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Search size={20} className="text-gray-400 group-focus-within:text-[#e35e25] transition-colors" />
                             </div>
                             <input
                               type="text"
                               placeholder={t('feed.searchPlaceholder')}
                               className="w-full pl-12 pr-4 py-3.5 md:py-4 min-h-[48px] sm:min-h-0 bg-white border border-gray-200 rounded-full text-base sm:text-sm focus:outline-none focus:border-[#15383c] focus:ring-2 focus:ring-[#15383c]/10 shadow-sm hover:shadow-md transition-all"
                               value={searchQuery}
                               onChange={(e) => setSearchQuery(e.target.value)}
                             />
                        </div>
                     </div>

                     {/* Horizontal Categories with Icons and Filter Button - Matching Landing Page */}
                     <div className="flex items-center gap-3">
                       <div className="relative z-10 flex-1">
                         <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 hide-scrollbar scroll-smooth w-full touch-pan-x overscroll-x-contain scroll-pl-4 scroll-pr-32 md:scroll-pr-4">
                            {categories.map(cat => (
                              <CategoryIconButton
                                key={cat}
                                category={cat}
                                isActive={activeCategory === cat}
                                onClick={() => setActiveCategory(cat)}
                              />
                            ))}
                         </div>
                         <div className="absolute right-0 top-0 bottom-2 w-6 sm:w-8 bg-gradient-to-l from-[#FAFAFA] to-transparent pointer-events-none md:hidden"></div>
                       </div>
                       
                       {/* Filter Button - Matching Landing Page */}
                       <button
                         onClick={() => setFilterDrawerOpen(true)}
                         className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-[#15383c] text-[#15383c] font-medium hover:bg-[#15383c] hover:text-white transition-colors flex-shrink-0 touch-manipulation active:scale-[0.95] min-h-[40px] sm:min-h-0"
                       >
                         <Filter size={18} />
                         <span className="hidden sm:inline">Filters</span>
                         {getActiveFilterCount() > 0 && (
                           <span className="px-2 py-0.5 rounded-full bg-[#e35e25] text-white text-xs font-bold">
                             {getActiveFilterCount()}
                           </span>
                         )}
                       </button>
                     </div>
                     
                     {/* Vibes Section - Scrollable Icons */}
                     <div className="mt-4">
                       <h3 className="text-sm font-semibold text-gray-600 mb-3">Filter by Vibes</h3>
                       <div className="relative z-10">
                         <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 hide-scrollbar scroll-smooth w-full touch-pan-x overscroll-x-contain scroll-pl-4 scroll-pr-32 md:scroll-pr-4">
                           {ALL_VIBES.map(vibe => (
                             <VibeIconButton
                               key={vibe}
                               vibe={vibe}
                               isActive={filters.vibes.includes(vibe)}
                               onClick={() => {
                                 const currentVibes = filters.vibes;
                                 if (currentVibes.includes(vibe)) {
                                   setFilter('vibes', currentVibes.filter(v => v !== vibe));
                                 } else {
                                   setFilter('vibes', [...currentVibes, vibe]);
                                 }
                               }}
                             />
                           ))}
                         </div>
                         <div className="absolute right-0 top-0 bottom-2 w-6 sm:w-8 bg-gradient-to-l from-[#FAFAFA] to-transparent pointer-events-none md:hidden"></div>
                       </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Use EventFeed component with filters */}
            <React.Suspense fallback={<div className="text-center py-20">Loading events...</div>}>
              <EventFeed
                events={filteredEvents}
                onEventClick={handleEventClick}
                onChatClick={handleChatClick}
                onReviewsClick={handleReviewsClick}
                isLoggedIn={isLoggedIn}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
              />
            </React.Suspense>

            {/* Filter Drawer for Explore Page */}
            <FilterDrawer
              isOpen={isFilterDrawerOpen}
              onClose={() => setFilterDrawerOpen(false)}
              events={allEvents}
            />
            
            {/* Legacy grouped view - disabled, using EventFeed instead */}
            {false && (
              <div className="space-y-4">
                {(() => {
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
                              className="flex overflow-x-auto gap-4 md:gap-5 lg:gap-6 pb-2 md:pb-6 snap-x snap-mandatory scroll-smooth hide-scrollbar w-full touch-pan-x overscroll-x-contain scroll-pl-4 md:scroll-pl-0 cursor-grab active:cursor-grabbing"
                              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}
                              onWheel={(e) => {
                                // Allow horizontal scrolling with mouse wheel when hovering over the container
                                const container = e.currentTarget;
                                if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
                                  // Use requestAnimationFrame to avoid passive listener warning
                                  requestAnimationFrame(() => {
                                    container.scrollLeft += e.deltaY;
                                  });
                                }
                              }}
                              onMouseDown={(e) => {
                                // Enable drag scrolling - only on non-touch devices
                                if ('ontouchstart' in window) return;
                                
                                const container = e.currentTarget;
                                const startX = e.pageX - container.offsetLeft;
                                const scrollLeft = container.scrollLeft;
                                let isDown = true;

                                const handleMouseMove = (e: MouseEvent) => {
                                  if (!isDown) return;
                                  const x = e.pageX - container.offsetLeft;
                                  const walk = (x - startX) * 2;
                                  container.scrollLeft = scrollLeft - walk;
                                };

                                const handleMouseUp = () => {
                                  isDown = false;
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };

                                document.addEventListener('mousemove', handleMouseMove, { passive: true });
                                document.addEventListener('mouseup', handleMouseUp, { passive: true });
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
            )}
            
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
                  key={selectedEvent.id}
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
