import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Event, ViewState } from '../../types';
import { Calendar, MapPin, User, Share2, MessageCircle, ChevronLeft, Heart, Info, Star, Sparkles, X, UserPlus, UserCheck, ChevronRight, CheckCircle2, Edit, Users } from 'lucide-react';
import { followHost, unfollowHost, isFollowing } from '../../firebase/follow';
import { useUserStore } from '../../stores/userStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { EventCard } from '../../components/events/EventCard';
import { MockMap } from '../../components/map/MockMap';
import { FakeEventReservationModal } from '../../components/events/FakeEventReservationModal';
import { ImageViewerModal } from '../../components/events/ImageViewerModal';
import { HostReviewsModal } from '../../components/events/HostReviewsModal';
import { ShareModal } from '../../components/share/ShareModal';
import { SeoHelmet } from '../../components/seo/SeoHelmet';
import { formatDate } from '../../utils/dateFormatter';
import { formatRating } from '../../utils/formatRating';
import { getReservationCountForEvent, listHostReviews, subscribeToReservationCount } from '../../firebase/db';
// REFACTORED: No longer using getUserProfile - using real-time subscriptions instead
import { getMainCategoryLabelFromEvent } from '../../utils/categoryMapper';
import { getSessionFrequencyText, getSessionModeText } from '../../utils/eventHelpers';
import { getInitials, getAvatarBgColor } from '../../utils/avatarUtils';
import { subscribeToFollowersCount } from '../../firebase/follow';
import { PaymentModal } from '../../components/payments/PaymentModal';
import { hasEventFee, isRecurringEvent } from '../../utils/stripeHelpers';

/**
 * Build Event JSON-LD structured data for search engines
 * Schema.org/Event - helps Google show rich results for events
 */
function buildEventJsonLd(event: Event, reservationCount: number | null): object | null {
  if (!event?.id || !event?.title) return null;
  
  // Parse and format start date as ISO timestamp
  const parseEventDateTime = (): string => {
    try {
      const dateStr = event.date || '';
      const timeStr = event.time || '';
      
      // Try to parse the date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Fallback: use current date if parsing fails
        return new Date().toISOString();
      }
      
      // Try to parse time (e.g., "7:00 PM", "19:00")
      if (timeStr) {
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const period = timeMatch[3]?.toUpperCase();
          
          if (period === 'PM' && hours !== 12) hours += 12;
          else if (period === 'AM' && hours === 12) hours = 0;
          
          date.setHours(hours, minutes, 0, 0);
        }
      }
      
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  const startDate = parseEventDateTime();
  
  // Truncate description safely
  const truncateDesc = (text: string, maxLen: number): string => {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 3).trim() + '...';
  };

  // Build location object
  const location: object = {
    '@type': 'Place',
    name: event.address || `Private Location in ${event.city || 'Canada'}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: event.city || '',
      addressRegion: 'ON', // Default to Ontario, could be derived from city
      addressCountry: 'CA',
    },
  };

  // Build organizer
  const organizer: object = {
    '@type': 'Person',
    name: event.hostName || event.host || 'Local Host',
  };

  // Build the base JSON-LD object
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: truncateDesc(event.description || event.aboutEvent || '', 300),
    startDate,
    endDate: startDate, // Same as start for single-block events
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location,
    organizer,
    image: event.imageUrls?.[0] || event.imageUrl || 'https://gopopera.ca/og-image.png',
    url: `https://gopopera.ca/event/${event.id}`,
  };

  // Add capacity if available
  if (event.capacity) {
    jsonLd.maximumAttendeeCapacity = event.capacity;
  }

  // Add offers only if the event is paid
  if (event.hasFee && event.feeAmount) {
    const isFull = reservationCount !== null && event.capacity 
      ? reservationCount >= event.capacity 
      : false;
    
    jsonLd.offers = {
      '@type': 'Offer',
      price: (event.feeAmount / 100).toFixed(2), // Convert cents to dollars
      priceCurrency: event.currency?.toUpperCase() || 'CAD',
      availability: isFull 
        ? 'https://schema.org/SoldOut' 
        : 'https://schema.org/InStock',
      url: `https://gopopera.ca/event/${event.id}`,
    };
  }

  return jsonLd;
}

interface EventDetailPageProps {
  event: Event;
  setViewState: (view: ViewState) => void;
  onReviewsClick: (e: React.MouseEvent, event: Event) => void;
  onHostClick: (hostName: string) => void;
  allEvents: Event[];
  onEventClick: (event: Event) => void;
  isLoggedIn?: boolean;
  favorites?: string[];
  onToggleFavorite?: (e: React.MouseEvent, eventId: string) => void;
  onRSVP?: (eventId: string, reservationId?: string) => void;
  rsvps?: string[];
}

// Reusable constant to avoid creating new array references in selectors
const EMPTY_ARRAY: string[] = [];

export const EventDetailPage: React.FC<EventDetailPageProps> = ({ 
  event, 
  setViewState, 
  onReviewsClick, 
  onHostClick, 
  allEvents, 
  onEventClick,
  isLoggedIn,
  favorites = [],
  onToggleFavorite,
  onRSVP,
  rsvps = []
}) => {
  // CRITICAL: All hooks must be called unconditionally and in the same order every render
  // Call ALL hooks first, before any conditional logic or early returns
  
  // State hooks - always called
  const [showFakeEventModal, setShowFakeEventModal] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isFollowingHost, setIsFollowingHost] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [reservationCount, setReservationCount] = useState<number | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showHostReviewsModal, setShowHostReviewsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [reservationSuccess, setReservationSuccess] = useState(false);
  const [hostProfilePicture, setHostProfilePicture] = useState<string | null>(null);
  const [hostBio, setHostBio] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Store hooks - always called
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  const { t } = useLanguage();
  
  // CRITICAL: Extract primitive values from event object to stabilize dependencies
  // Use event.id as the primary key - only extract values when event.id changes
  // This prevents infinite loops when event object reference changes but values stay same
  const eventId = event?.id || '';
  
  // Use refs to track the last event ID and values to prevent unnecessary recalculations
  const lastEventIdRef = useRef<string>('');
  const stableValuesRef = useRef<{
    hostId: string;
    hostName: string;
    rating: number;
    reviewCount: number;
    attendeesCount: number;
    isFakeEvent: boolean;
    isDemo: boolean;
    isPoperaOwned: boolean;
    isOfficialLaunch: boolean;
  }>({
    hostId: '',
    hostName: '',
    rating: 0,
    reviewCount: 0,
    attendeesCount: 0,
    isFakeEvent: false,
    isDemo: false,
    isPoperaOwned: false,
    isOfficialLaunch: false,
  });
  
  // Only update stable values when event ID actually changes
  if (eventId !== lastEventIdRef.current) {
    lastEventIdRef.current = eventId;
    stableValuesRef.current = {
      hostId: event?.hostId || '',
      hostName: event?.hostName || '',
      rating: event?.rating || 0,
      reviewCount: event?.reviewCount || 0,
      attendeesCount: event?.attendeesCount || 0,
      isFakeEvent: event?.isFakeEvent === true,
      isDemo: event?.isDemo === true,
      isPoperaOwned: event?.isPoperaOwned === true,
      isOfficialLaunch: event?.isOfficialLaunch === true,
    };
  }
  
  // Use stable values from ref
  const eventHostId = stableValuesRef.current.hostId;
  const eventHostName = stableValuesRef.current.hostName;
  const eventRating = stableValuesRef.current.rating;
  const eventReviewCount = stableValuesRef.current.reviewCount;
  const eventAttendeesCount = stableValuesRef.current.attendeesCount;
  const eventIsFakeEvent = stableValuesRef.current.isFakeEvent;
  const eventIsDemo = stableValuesRef.current.isDemo;
  const eventIsPoperaOwned = stableValuesRef.current.isPoperaOwned;
  const eventIsOfficialLaunch = stableValuesRef.current.isOfficialLaunch;
  
  // REFACTORED: No longer using eventHostPhotoURL - fetch from /users/{hostId} in real-time
  
  // Get favorites directly from user store for reactive updates
  // This ensures the UI updates immediately when favorites change
  // Use stable fallback to avoid useSyncExternalStore warning/infinite loop
  const storeFavorites = useUserStore((state) => state.user?.favorites ?? EMPTY_ARRAY);
  
  // Check if this event is favorited - directly reactive to store changes
  // Use store favorites first (most up-to-date), fallback to prop favorites
  const isFavorite = (storeFavorites.length > 0 ? storeFavorites : favorites).includes(eventId);
  
  // Memoized values - always called (safe even if event is undefined)
  const isFakeEvent = eventIsFakeEvent;
  const isDemo = eventIsDemo || isFakeEvent;
  const isPoperaOwned = eventIsPoperaOwned;
  const isOfficialLaunch = eventIsOfficialLaunch;
  
  // Derived values - safe to compute after all hooks
  const recommendedEvents = useMemo(() => 
    allEvents.filter(e => e.id !== eventId).slice(0, 5), 
    [allEvents, eventId]
  );
  // Stabilize rsvps array reference to prevent unnecessary re-renders
  // Use a ref to track the actual array contents, not the reference
  const rsvpsRef = useRef<string[]>(rsvps);
  const rsvpsStringRef = useRef<string>(rsvps.join(','));
  
  // Only update ref if the actual contents changed (not just the reference)
  // Do this in a useEffect to avoid side effects during render
  useEffect(() => {
    const currentRsvpsString = rsvps.join(',');
    if (currentRsvpsString !== rsvpsStringRef.current) {
      rsvpsRef.current = rsvps;
      rsvpsStringRef.current = currentRsvpsString;
    }
  }, [rsvps]);
  
  const hasRSVPed = useMemo(() => {
    return rsvpsRef.current.includes(eventId);
  }, [eventId]); // Only depend on eventId - ref is updated separately
  
  // REFACTORED: Initialize empty - will be populated by real-time subscription
  const [displayHostName, setDisplayHostName] = useState<string>('');
  
  // Native event listener as backup (capture phase)
  // Use refs to avoid recreating the listener on every render
  const onHostClickRef = useRef(onHostClick);
  const displayHostNameRef = useRef(displayHostName);
  
  // Update refs directly in render (refs don't cause re-renders, so this is safe)
  // This avoids useEffect dependencies that could cause infinite loops
  onHostClickRef.current = onHostClick;
  displayHostNameRef.current = displayHostName;
  
  useEffect(() => {
    const handleNativeClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-profile-button]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        console.log('[PROFILE_BUTTON_NATIVE] Native click detected!', displayHostNameRef.current);
        if (onHostClickRef.current && displayHostNameRef.current) {
          onHostClickRef.current(displayHostNameRef.current);
        }
      }
    };
    
    document.addEventListener('click', handleNativeClick, true); // Capture phase
    return () => document.removeEventListener('click', handleNativeClick, true);
  }, []); // Empty deps - refs are used instead
  
  // State for host's overall rating (from all their events)
  const [hostOverallRating, setHostOverallRating] = useState<number | null>(null);
  const [hostOverallReviewCount, setHostOverallReviewCount] = useState<number>(0);
  
  // State for rating - use host's overall rating if available, otherwise fallback to event rating
  const [currentRating, setCurrentRating] = useState<{ rating: number; reviewCount: number }>({
    rating: eventRating,
    reviewCount: eventReviewCount
  });
  
  // Fetch host's overall rating from all their events
  useEffect(() => {
    const fetchHostOverallRating = async () => {
      if (!eventHostId) {
        setHostOverallRating(null);
        setHostOverallReviewCount(0);
        return;
      }
      
      try {
        // Only get accepted reviews (includePending=false) to ensure count matches displayed reviews
        const acceptedReviews = await listHostReviews(eventHostId, false);
        
        if (acceptedReviews.length === 0) {
          setHostOverallRating(null);
          setHostOverallReviewCount(0);
          return;
        }
        
        // Calculate average rating
        const totalRating = acceptedReviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / acceptedReviews.length;
        
        setHostOverallRating(averageRating);
        setHostOverallReviewCount(acceptedReviews.length);
      } catch (error) {
        console.warn('[EVENT_DETAIL] Failed to fetch host overall rating:', error);
        setHostOverallRating(null);
        setHostOverallReviewCount(0);
      }
    };
    
    fetchHostOverallRating();
  }, [eventHostId]); // Use stable primitive value
  
  // Update rating when host overall rating or event changes
  // Use refs to track previous values and only update if they actually changed
  const prevRatingRef = useRef<{ rating: number; reviewCount: number } | null>(null);
  
  useEffect(() => {
    let newRating: { rating: number; reviewCount: number };
    
    if (hostOverallRating !== null) {
      newRating = {
        rating: hostOverallRating,
        reviewCount: hostOverallReviewCount
      };
    } else {
      // Fallback to event rating if host rating not available
      newRating = {
        rating: eventRating,
        reviewCount: eventReviewCount
      };
    }
    
    // Only update if values actually changed
    if (!prevRatingRef.current || 
        prevRatingRef.current.rating !== newRating.rating || 
        prevRatingRef.current.reviewCount !== newRating.reviewCount) {
      setCurrentRating(newRating);
      prevRatingRef.current = newRating;
    }
  }, [hostOverallRating, hostOverallReviewCount, eventRating, eventReviewCount]); // Use stable primitive values
  
  // REFACTORED: Real-time subscription to /users/{hostId} - single source of truth
  // No polling, no fallbacks to stale event data - always fresh from Firestore
  useEffect(() => {
    if (!eventHostId) {
      setHostProfilePicture(null);
      setDisplayHostName('Unknown Host');
      return;
    }
    
    if (import.meta.env.DEV) {
      console.log('[EVENT_DETAIL] 📡 Subscribing to host profile:', { hostId: eventHostId });
    }
    
    let unsubscribe: (() => void) | null = null;
    
    // Real-time subscription to host user document
    import('../../firebase/userSubscriptions').then(({ subscribeToUserProfile }) => {
      unsubscribe = subscribeToUserProfile(eventHostId, (hostData) => {
        if (hostData) {
          setHostProfilePicture(hostData.photoURL || null);
          setDisplayHostName(hostData.displayName || 'Unknown Host');
          setHostBio(hostData.bio || null);
          
          if (import.meta.env.DEV) {
            console.log('[EVENT_DETAIL] ✅ Host profile updated:', {
              hostId: eventHostId,
              displayName: hostData.displayName,
              hasPhoto: !!hostData.photoURL,
              hasBio: !!hostData.bio,
            });
          }
        } else {
          setHostProfilePicture(null);
          setDisplayHostName('Unknown Host');
          setHostBio(null);
        }
      });
    }).catch((error) => {
      console.error('[EVENT_DETAIL] ❌ Error loading user subscriptions:', error);
      setHostProfilePicture(null);
      setDisplayHostName('Unknown Host');
      setHostBio(null);
    });
    
    return () => {
      if (unsubscribe) {
        if (import.meta.env.DEV) {
          console.log('[EVENT_DETAIL] 🧹 Unsubscribing from host profile:', { hostId: eventHostId });
        }
        unsubscribe();
      }
    };
  }, [eventHostId]);
  
  // Subscribe to followers count in real-time
  useEffect(() => {
    if (!eventHostId) {
      setFollowersCount(0);
      return;
    }
    
    let unsubscribe: (() => void) | null = null;
    
    try {
      unsubscribe = subscribeToFollowersCount(eventHostId, (count: number) => {
        setFollowersCount(count);
      });
    } catch (error) {
      console.error('[EVENT_DETAIL] ❌ Error loading followers count:', error);
      setFollowersCount(0);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [eventHostId]);
  
  // REFACTORED: Real-time subscription to reservation count - computed from reservations
  useEffect(() => {
    if (!eventId || isDemo) {
      setReservationCount(0);
      return () => {}; // No-op cleanup
    }
    
    if (import.meta.env.DEV) {
      console.log('[EVENT_DETAIL] 📡 Subscribing to reservation count:', { eventId });
    }
    
    // Use real-time subscription for instant updates
    let unsubscribe: (() => void) | null = null;
    
    import('../../firebase/db').then(({ subscribeToReservationCount }) => {
      unsubscribe = subscribeToReservationCount(eventId, (count: number) => {
        setReservationCount(count);
        if (import.meta.env.DEV) {
          console.log('[EVENT_DETAIL] ✅ Real-time reservation count updated:', {
            eventId,
            count,
          });
        }
      });
    }).catch((error) => {
      console.error('[EVENT_DETAIL] ❌ Error loading reservation count subscription:', error);
      setReservationCount(0);
    });
    
    // Always return cleanup function
    return () => {
      if (unsubscribe) {
        if (import.meta.env.DEV) {
          console.log('[EVENT_DETAIL] 🧹 Unsubscribing from reservation count:', { eventId });
        }
        unsubscribe();
      }
    };
  }, [eventId, isDemo]);

  // Check if user is following the host
  useEffect(() => {
    // CRITICAL: Always call the effect, but conditionally execute logic inside
    // This ensures consistent hook order across renders
    if (user?.uid && eventHostId) {
      const checkFollowStatus = async () => {
        const following = await isFollowing(user.uid, eventHostId);
        setIsFollowingHost(following);
      };
      checkFollowStatus();
    } else {
      // Reset follow status if user or hostId is missing
      setIsFollowingHost(false);
    }
  }, [user?.uid, eventHostId]); // Use stable primitive value

  const handleFollowToggle = async () => {
    if (!user?.uid || !eventHostId) {
      setShowAuthModal(true);
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowingHost) {
        await unfollowHost(user.uid, eventHostId);
        setIsFollowingHost(false);
      } else {
        await followHost(user.uid, eventHostId);
        setIsFollowingHost(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };
  
  const handleRSVP = async () => {
    if (isDemo) {
      // Show modal for demo events instead of reserving
      setShowFakeEventModal(true);
      return;
    }
    
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    
    if (!user?.uid) {
      setShowAuthModal(true);
      return;
    }
    
    setReserving(true);
    try {
      const { addRSVP, removeRSVP } = useUserStore.getState();
      
      if (hasRSVPed) {
        // Cancel reservation
        await removeRSVP(user.uid, event.id);
        setReservationSuccess(false);
        // Update local count
        if (reservationCount !== null && reservationCount > 0) {
          setReservationCount(reservationCount - 1);
        }
      } else {
        // Check if event is free
        const isFree = !event.price || event.price.toLowerCase() === 'free' || event.price === '$0' || event.price === '0';
        
        if (isFree) {
          // For free events, go directly to reservation
          const reservationId = await addRSVP(user.uid, event.id);
          setReservationSuccess(true);
          // Update local count
          setReservationCount((prev) => (prev !== null ? prev + 1 : 1));
          
          // Refresh user profile to ensure rsvps are synced (so events show in My Pops)
          await useUserStore.getState().refreshUserProfile();
          
          // Navigate to confirmation page after a brief delay
          setTimeout(() => {
            if (onRSVP) {
              onRSVP(event.id, reservationId);
            }
          }, 500);
        } else {
          // Check if event has Stripe fee (new payment system)
          if (hasEventFee(event)) {
            // Show payment modal for Stripe payments
            setShowPaymentModal(true);
          } else {
            // For legacy paid events, navigate to Confirm & Pay page
            setViewState(ViewState.CONFIRM_RESERVATION);
          }
        }
      }
    } catch (error) {
      console.error('Error handling RSVP:', error);
      alert('Failed to reserve spot. Please try again.');
    } finally {
      setReserving(false);
    }
  };
  
  const handleBrowseEvents = () => {
    setShowFakeEventModal(false);
    setViewState(ViewState.FEED);
  };

  const handleShare = () => {
    // Open share modal instead of direct sharing
    setShowShareModal(true);
  };

  const handleConversationClick = () => {
    if (!isLoggedIn) {
      // Show auth modal for logged-out users
      setShowAuthModal(true);
      return;
    }
    
    // If logged in, check access and navigate to chat
    // GroupChat component will handle blocked state
    setViewState(ViewState.CHAT);
  };

  const handlePaymentSuccess = async (paymentIntentId: string, subscriptionId?: string) => {
    try {
      // Create reservation with payment info
      const { addRSVP } = useUserStore.getState();
      const reservationId = await addRSVP(user.uid, event.id, {
        paymentMethod: 'stripe',
        totalAmount: event.feeAmount,
        paymentIntentId,
        subscriptionId,
      });
      
      setReservationSuccess(true);
      setReservationCount((prev) => (prev !== null ? prev + 1 : 1));
      
      // Refresh user profile
      await useUserStore.getState().refreshUserProfile();
      
      // Navigate to confirmation
      setTimeout(() => {
        if (onRSVP) {
          onRSVP(event.id, reservationId);
        }
      }, 500);
    } catch (error) {
      console.error('Error creating reservation after payment:', error);
      alert('Payment succeeded but failed to create reservation. Please contact support.');
    }
  };

  // Build Event JSON-LD for structured data (only when event is loaded)
  const eventJsonLd = useMemo(() => buildEventJsonLd(event, reservationCount), [event, reservationCount]);

  return (
    <div className="min-h-screen bg-white pt-0">
      {/* SEO: Dynamic meta tags for event detail page with Open Graph for social sharing */}
      <SeoHelmet viewState={ViewState.DETAIL} event={event} />
      
      {/* Event JSON-LD Structured Data for rich search results */}
      {eventJsonLd && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(eventJsonLd)}
          </script>
        </Helmet>
      )}
      
      <FakeEventReservationModal
        isOpen={showFakeEventModal}
        onClose={() => setShowFakeEventModal(false)}
        onBrowseEvents={handleBrowseEvents}
      />
      {hasEventFee(event) && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          eventTitle={event.title}
          feeAmount={event.feeAmount || 0}
          currency={event.currency || 'cad'}
          attendeeCount={1}
          isRecurring={isRecurringEvent(event)}
          eventId={event.id}
          hostId={event.hostId}
          userId={user?.uid}
          userEmail={user?.email}
          subscriptionInterval={event.sessionFrequency === 'weekly' ? 'week' : event.sessionFrequency === 'monthly' ? 'month' : undefined}
        />
      )}
      <div className="fixed top-0 left-0 right-0 z-40 p-4 sm:p-4 flex items-center justify-between lg:hidden pointer-events-none safe-area-inset-top">
         <button onClick={() => window.history.back()} className="w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center text-popera-teal shadow-lg pointer-events-auto hover:scale-105 active:scale-[0.92] transition-transform touch-manipulation border border-white/50"><ChevronLeft size={22} className="sm:w-6 sm:h-6" /></button>
         <div className="flex gap-2.5 sm:gap-3 pointer-events-auto">
             <button onClick={handleShare} className="w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center text-popera-teal shadow-lg hover:scale-105 active:scale-[0.92] transition-transform touch-manipulation border border-white/50" aria-label="Share Event"><Share2 size={20} className="sm:w-5 sm:h-5" /></button>
             {onToggleFavorite && (
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   e.preventDefault();
                   if ('nativeEvent' in e) {
                     e.nativeEvent.stopImmediatePropagation();
                   }
                   if (!isLoggedIn) {
                     setShowAuthModal(true);
                     return;
                   }
                   onToggleFavorite(e, event.id);
                 }}
                 onMouseDown={(e) => {
                   e.stopPropagation();
                   e.preventDefault();
                 }}
                 onTouchStart={(e) => {
                   e.stopPropagation();
                   e.preventDefault();
                 }}
                 type="button"
                 className={`w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-[0.92] transition-all touch-manipulation border border-white/50 z-50 pointer-events-auto ${
                   isFavorite ? 'text-[#e35e25]' : 'text-popera-teal'
                 }`}
                 style={{ pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent' }}
                 aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
               >
                 <Heart 
                   size={20} 
                   className={`sm:w-5 sm:h-5 transition-all ${
                     isFavorite ? 'fill-[#e35e25] text-[#e35e25]' : 'fill-none text-popera-teal'
                   }`}
                   style={isFavorite ? { fill: '#e35e25', color: '#e35e25' } : { fill: 'none' }}
                   strokeWidth={2}
                 />
               </button>
             )}
         </div>
         {showShareToast && (
           <div className="fixed bottom-4 right-4 bg-[#15383c] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 animate-fade-in pointer-events-none">
             Link copied!
           </div>
         )}
      </div>

      {/* Auth Modal for Chat Access */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#eef4f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={32} className="text-[#e35e25]" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-2">
                Sign In to Join Conversations
              </h2>
              <p className="text-gray-600 text-sm">
                Conversations are only available after signing up or logging in.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setViewState(ViewState.AUTH);
                  // Update URL to prevent viewState from being reset
                  window.history.replaceState({ viewState: ViewState.AUTH }, '', '/auth');
                  window.scrollTo(0, 0);
                }}
                className="w-full px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors"
              >
                Sign In / Sign Up
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden lg:block max-w-7xl mx-auto px-6 py-6 mt-20">
        <button onClick={() => window.history.back()} className="flex items-center text-gray-500 hover:text-popera-teal transition-colors font-medium"><ChevronLeft size={20} className="mr-1" /> Back to Events</button>
      </div>


      {/* Hero Section - Premium cinematic design */}
      {/* Desktop: contained width for less full-width feel; Mobile/Tablet: full width */}
      <div className="lg:max-w-7xl lg:mx-auto lg:px-8 lg:pt-4">
      <div className="relative h-[50vh] sm:h-[55vh] md:h-[60vh] lg:h-[55vh] xl:h-[60vh] w-full overflow-hidden lg:rounded-2xl">
        {event.imageUrls && event.imageUrls.length > 1 ? (
          // Multiple images - horizontal scrollable gallery
          <div 
            className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth h-full hide-scrollbar cursor-pointer"
            onScroll={(e) => {
              const container = e.currentTarget;
              const scrollLeft = container.scrollLeft;
              const imageWidth = container.scrollWidth / event.imageUrls.length;
              const newIndex = Math.round(scrollLeft / imageWidth);
              setCurrentImageIndex(Math.min(newIndex, event.imageUrls.length - 1));
            }}
            onClick={() => {
              const images = event.imageUrls || [];
              if (images.length > 0) {
                setImageViewerIndex(currentImageIndex);
                setShowImageViewer(true);
              }
            }}
          >
            {event.imageUrls.map((url, index) => (
              <div key={index} className="relative min-w-full h-full snap-center flex-shrink-0">
                <img 
                  src={url} 
                  alt={`${event.title} - Image ${index + 1}`} 
                  className="w-full h-full object-cover object-center"
                />
              </div>
            ))}
          </div>
        ) : (
          // Single image - fully visible
          <div
            className="w-full h-full cursor-pointer relative"
            onClick={() => {
              const images = event.imageUrls && event.imageUrls.length > 0 
                ? event.imageUrls 
                : (event.imageUrl ? [event.imageUrl] : []);
              if (images.length > 0) {
                setImageViewerIndex(0);
                setShowImageViewer(true);
              }
            }}
          >
            <img 
              src={(event.imageUrls && event.imageUrls.length > 0) ? event.imageUrls[0] : (event.imageUrl || `https://picsum.photos/seed/${event.id}/800/600`)} 
              alt={event.title} 
              className="w-full h-full object-cover object-center" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('picsum.photos')) {
                  target.src = `https://picsum.photos/seed/${event.id}/800/600`;
                }
              }}
            />
          </div>
        )}
        
        {/* Soft gradient only at bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
        
        {/* Favorite Button - Glass design top-right */}
        {/* Desktop: positioned at top-right of hero (stacked under header area); Mobile: same position */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if ('nativeEvent' in e) {
                e.nativeEvent.stopImmediatePropagation();
              }
              if (!isLoggedIn) {
                setShowAuthModal(true);
                return;
              }
              onToggleFavorite(e, event.id);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            type="button"
            className="absolute top-16 sm:top-4 lg:top-4 right-4 lg:right-4 w-11 h-11 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 hover:bg-white/30 transition-all hover:scale-110 active:scale-95 touch-manipulation z-50 pointer-events-auto"
            style={{ pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent' }}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart 
              size={22} 
              className={`sm:w-6 sm:h-6 transition-all ${
                isFavorite ? 'fill-[#e35e25] text-[#e35e25]' : 'fill-white/80 text-white'
              }`}
              strokeWidth={2.5}
            />
          </button>
        )}
        
        {/* Image counter for multiple images */}
        {event.imageUrls && event.imageUrls.length > 1 && (
          <div className="absolute bottom-24 right-4 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30 z-10 pointer-events-none">
            {currentImageIndex + 1} / {event.imageUrls.length}
          </div>
        )}
        
        {/* Content Overlay - Category badge on the top left */}
        {/* Mobile: pushed down to avoid header overlap; Desktop: standard top positioning */}
        <div className="absolute top-16 sm:top-4 lg:top-4 left-4 lg:left-4 z-10">
          {/* Category Badge */}
          <span className="inline-block px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[#e35e25] text-xs font-bold uppercase tracking-wider border border-white/30">
            {getMainCategoryLabelFromEvent(event)}
          </span>
        </div>
      </div>
      </div>{/* Close desktop container wrapper */}

      {/* Content Sections - Premium clean design */}
      <div className="bg-white relative">
        {/* Host Avatar - Overlapping hero/content boundary - Mobile/Tablet only */}
        {/* Desktop: hidden (avatar is now in the Hosted-by card in the right column) */}
        <div className="absolute -top-8 sm:-top-10 left-4 sm:left-6 z-10 lg:hidden">
          <div 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#e35e25] to-[#15383c] overflow-hidden ring-4 ring-white shadow-xl cursor-pointer hover:ring-[#e35e25]/30 transition-all"
            onClick={() => onHostClick?.(displayHostName)}
          >
            {hostProfilePicture ? (
              <img 
                src={hostProfilePicture} 
                alt={displayHostName} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://picsum.photos/seed/${displayHostName}/100/100`;
                }} 
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${getAvatarBgColor(displayHostName, event.hostId)} text-white font-bold text-xl sm:text-2xl`}>
                {getInitials(displayHostName)}
              </div>
            )}
          </div>
        </div>

        {/* Desktop: tighter padding to reduce gap under hero; Mobile: unchanged */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-14 lg:pt-8 pb-12 sm:pb-16 md:pb-20 lg:pb-24">
          {/* Reservation Success Message */}
          {reservationSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 sm:p-5 flex items-center gap-3 animate-fade-in">
              <CheckCircle2 size={20} className="text-green-600 shrink-0" />
              <p className="text-green-800 font-medium text-sm">{t('event.reservationSuccess')}</p>
            </div>
          )}

          {/* Desktop: Two-column layout with sidebar on right; Mobile: stacked */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* LEFT COLUMN: Event Info + Description */}
            <div className="lg:col-span-7">
              {/* Event Info + Host Section */}
              <div className="mb-8 lg:mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 items-start">
                  {/* Event Info (Title, Date, Location, Attending) */}
                  <div>
                    {/* Title */}
                    <h1 className="text-2xl sm:text-3xl lg:text-3xl font-heading font-bold text-[#15383c] leading-tight mb-4">
                      {event.title}
                    </h1>
                    
                    {/* Metadata - Compact, clean */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 text-gray-600">
                        <Calendar size={16} className="text-[#e35e25] shrink-0" />
                        <span className="text-sm sm:text-base">{formatDate(event.date)} • {event.time}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-gray-600">
                        <MapPin size={16} className="text-[#e35e25] shrink-0" />
                        <span className="text-sm sm:text-base truncate">{event.location}</span>
                      </div>
                      {reservationCount !== null && (
                        <div className="flex items-center gap-2.5 text-gray-600">
                          <User size={16} className="text-[#e35e25] shrink-0" />
                          <span className="text-sm sm:text-base">
                            {event.capacity 
                              ? `${reservationCount}/${event.capacity} attending`
                              : `${reservationCount} attending`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Host Info - Mobile/Tablet only (hidden on desktop, shown in right column) */}
                  <div className="flex flex-col items-start mt-4 lg:hidden">
                    <p className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">{t('event.hostedBy')}</p>
                    <h3 
                      className="text-lg sm:text-xl font-heading font-bold text-[#15383c] cursor-pointer hover:text-[#e35e25] transition-colors mb-2"
                      onClick={() => onHostClick?.(displayHostName)}
                    >
                      {displayHostName}
                    </h3>
                    
                    {/* Rating + Followers - Inline */}
                    <div className="flex items-center gap-3 mb-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (event.hostId) {
                            setShowHostReviewsModal(true);
                          }
                        }} 
                        className="flex items-center gap-1.5 bg-[#e35e25]/10 hover:bg-[#e35e25]/20 px-3 py-1.5 rounded-full transition-colors border border-[#e35e25]/20 hover:border-[#e35e25]/40 touch-manipulation active:scale-95"
                      >
                        <Star size={14} className="text-[#e35e25] fill-[#e35e25]" />
                        <span className="text-xs font-bold text-[#15383c]">{formatRating(currentRating.rating)}</span>
                        <span className="text-[10px] text-gray-600">({currentRating.reviewCount})</span>
                      </button>
                      
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Users size={14} />
                        <span className="text-xs">{followersCount} {followersCount === 1 ? 'follower' : 'followers'}</span>
                      </div>
                    </div>
                    
                    {/* Follow Button - Liquid Glass Style */}
                    {isLoggedIn && user?.uid !== event.hostId && (
                      <button
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        aria-label={isFollowingHost ? `Unfollow ${displayHostName}` : `Follow ${displayHostName}`}
                        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 ${
                          isFollowingHost
                            ? 'bg-white/80 backdrop-blur-sm text-[#15383c] border border-gray-200/60 hover:bg-white hover:border-gray-300'
                            : 'bg-[#e35e25] text-white shadow-lg shadow-[#e35e25]/25 hover:shadow-xl hover:shadow-[#e35e25]/30'
                        } disabled:opacity-50`}
                      >
                        {isFollowingHost ? (
                          <>
                            <UserCheck size={14} /> {t('event.following')}
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} /> {t('event.follow')}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Description Section - Reduced spacing on desktop */}
              <div className="mb-12 sm:mb-16 lg:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c] mb-6 sm:mb-8">
              {t('event.aboutEvent')}
            </h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed font-light">
                {event.description || "Join us for an incredible experience..."}
              </p>
            </div>
            
            {/* Vibes - Subtle display after description */}
            {event.vibes && event.vibes.length > 0 && (
              <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {event.vibes.map((vibe, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 text-xs sm:text-sm font-medium hover:border-[#e35e25]/30 hover:text-[#e35e25] transition-colors"
                    >
                      {vibe}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
            </div>{/* End LEFT COLUMN */}

            {/* RIGHT COLUMN: Hosted-by Card + Reservation Sidebar - Desktop only */}
            <div className="hidden lg:block lg:col-span-5">
              <div className="sticky top-28 space-y-4">
                {/* Hosted-by Card - Desktop only */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-white/60 p-4 hover:shadow-[0_6px_24px_rgb(0,0,0,0.08)] transition-shadow">
                  {/* Host Avatar */}
                  <div className="flex justify-center mb-3">
                    <div 
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-[#e35e25] to-[#15383c] overflow-hidden ring-2 ring-white shadow-lg cursor-pointer hover:ring-[#e35e25]/30 transition-all"
                      onClick={() => onHostClick?.(displayHostName)}
                    >
                      {hostProfilePicture ? (
                        <img 
                          src={hostProfilePicture} 
                          alt={displayHostName} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://picsum.photos/seed/${displayHostName}/100/100`;
                          }} 
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${getAvatarBgColor(displayHostName, event.hostId)} text-white font-bold text-lg`}>
                          {getInitials(displayHostName)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Hosted by label + name */}
                  <div className="text-center mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">{t('event.hostedBy')}</p>
                    <h3 
                      className="text-lg font-heading font-bold text-[#15383c] cursor-pointer hover:text-[#e35e25] transition-colors"
                      onClick={() => onHostClick?.(displayHostName)}
                    >
                      {displayHostName}
                    </h3>
                  </div>
                  
                  {/* Rating + Followers */}
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (event.hostId) {
                          setShowHostReviewsModal(true);
                        }
                      }} 
                      className="flex items-center gap-1.5 bg-[#e35e25]/10 hover:bg-[#e35e25]/20 px-3 py-1.5 rounded-full transition-colors border border-[#e35e25]/20 hover:border-[#e35e25]/40 touch-manipulation active:scale-95"
                    >
                      <Star size={14} className="text-[#e35e25] fill-[#e35e25]" />
                      <span className="text-xs font-bold text-[#15383c]">{formatRating(currentRating.rating)}</span>
                      <span className="text-[10px] text-gray-600">({currentRating.reviewCount})</span>
                    </button>
                    
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Users size={14} />
                      <span className="text-xs">{followersCount} {followersCount === 1 ? 'follower' : 'followers'}</span>
                    </div>
                  </div>
                  
                  {/* Follow Button */}
                  {isLoggedIn && user?.uid !== event.hostId && (
                    <div className="flex justify-center">
                      <button
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        aria-label={isFollowingHost ? `Unfollow ${displayHostName}` : `Follow ${displayHostName}`}
                        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 ${
                          isFollowingHost
                            ? 'bg-white/80 backdrop-blur-sm text-[#15383c] border border-gray-200/60 hover:bg-white hover:border-gray-300'
                            : 'bg-[#e35e25] text-white shadow-lg shadow-[#e35e25]/25 hover:shadow-xl hover:shadow-[#e35e25]/30'
                        } disabled:opacity-50`}
                      >
                        {isFollowingHost ? (
                          <>
                            <UserCheck size={14} /> {t('event.following')}
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} /> {t('event.follow')}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Card - Reserve/Share/Join */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-white/60 p-4 hover:shadow-[0_6px_24px_rgb(0,0,0,0.08)] transition-shadow">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100/80">
                  <div>
                    <span className="text-2xl font-heading font-bold text-[#15383c]">{event.price}</span>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">per person</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {/* Edit Event Button - Only for host - Glass Style */}
                  {isLoggedIn && user?.uid === event.hostId && (
                    <button
                      onClick={() => setViewState(ViewState.EDIT_EVENT)}
                      className="w-full py-2 bg-white/80 backdrop-blur-sm border border-[#15383c]/30 text-[#15383c] rounded-full text-sm font-semibold hover:bg-white hover:border-[#15383c] transition-all whitespace-nowrap touch-manipulation active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Edit size={14} /> Edit Event
                    </button>
                  )}
                  {/* Reserve Button - Only for non-hosts (users cannot reserve their own events) */}
                  {user?.uid !== event.hostId && (
                    <button 
                      onClick={handleRSVP}
                      disabled={isDemo || reserving}
                      aria-label={hasRSVPed ? "Cancel reservation" : "Reserve spot"}
                      className={`w-full py-2.5 font-semibold text-sm rounded-full transition-all touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDemo 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : hasRSVPed
                          ? 'bg-[#15383c] text-white hover:bg-[#1f4d52]'
                          : 'bg-[#e35e25] text-white hover:bg-[#cf4d1d]'
                      }`}
                    >
                      {reserving ? 'Reserving...' : isDemo ? 'Demo Event (Locked)' : hasRSVPed ? 'Reserved ✓' : 'Reserve Spot'}
                    </button>
                  )}
                  <button
                    onClick={handleShare}
                    aria-label="Share event"
                    className="w-full py-2 bg-white border border-[#15383c] text-[#15383c] rounded-full text-sm font-semibold hover:bg-[#15383c] hover:text-white transition-all whitespace-nowrap touch-manipulation active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Share2 size={14} /> Share Event
                  </button>
                  <button 
                    onClick={handleConversationClick}
                    disabled={isDemo}
                    className={`w-full py-2 font-semibold text-sm rounded-full border flex items-center justify-center gap-2 touch-manipulation active:scale-95 transition-colors ${
                      isDemo
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white border-[#15383c] text-[#15383c] hover:bg-[#15383c] hover:text-white'
                    }`}
                  >
                    <MessageCircle size={14} /> 
                    {isDemo ? 'Chat Locked' : 'Join Group Chat'}
                  </button>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400 leading-relaxed">Secure payment powered by Stripe.</p>
                </div>
                </div>{/* End Action Card */}
              </div>{/* End sticky wrapper */}
            </div>{/* End RIGHT COLUMN */}
          </div>{/* End grid */}

          {/* What to Expect Section */}
          {event.whatToExpect && (
            <div className="mb-12 sm:mb-16 lg:mb-12">
              <h2 className="text-xl sm:text-2xl lg:text-2xl font-heading font-bold text-[#15383c] mb-4 sm:mb-6 flex items-center gap-3">
                <Sparkles size={20} className="text-[#e35e25]" /> 
                {t('event.whatToExpect')}
              </h2>
              <div className="bg-[#f8fafb] p-6 sm:p-8 lg:p-8 rounded-2xl lg:rounded-3xl border border-gray-100 text-gray-700 leading-relaxed text-sm sm:text-base font-light">
                <p className="whitespace-pre-line">{event.whatToExpect}</p>
              </div>
            </div>
          )}

          {/* Location Section - Premium design */}
          <div className="mb-12 sm:mb-16 lg:mb-12">
            <h2 className="text-xl sm:text-2xl lg:text-2xl font-heading font-bold text-[#15383c] mb-4 sm:mb-6">
              {t('event.location')}
            </h2>
            <div className="rounded-2xl lg:rounded-3xl overflow-hidden h-56 sm:h-72 lg:h-64 relative group cursor-pointer shadow-lg border border-gray-200 mb-4">
              <MockMap 
                lat={event.lat}
                lng={event.lng}
                address={event.address}
                city={event.city}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-base sm:text-lg lg:text-lg text-[#15383c] font-medium flex items-center gap-2">
              <MapPin size={20} className="text-[#e35e25] shrink-0" /> 
              <span>{event.location}</span>
            </p>
          </div>

          {/* Cancellation Policy Section - Compact */}
          <div className="mb-10 sm:mb-12 md:mb-16 pt-6 sm:pt-8 border-t border-gray-100">
            <h2 className="text-lg sm:text-xl font-heading font-bold text-[#15383c] mb-3 sm:mb-4">
              Cancellation / Expulsion Policy
            </h2>
            <div className="space-y-2 text-gray-600 text-xs sm:text-sm leading-relaxed">
              <p>
                <strong className="text-[#15383c]">Cancellation:</strong> Full refund 48+ hours before, 50% refund 24-48 hours before, no refund within 24 hours or no-shows.
              </p>
              <p>
                <strong className="text-[#15383c]">Expulsion:</strong> Hosts may expel rule-violating attendees without refunds; repeat offenders may be banned.
              </p>
              <p className="text-gray-400 text-xs italic">
                For complete details, review our <button onClick={() => setViewState(ViewState.CANCELLATION)} className="text-[#e35e25] hover:underline font-medium">Cancellation Policy</button>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12 border-t border-gray-100">
         <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c] mb-6 sm:mb-8 text-center">Other circles you might be interested in</h2>
         {/* Desktop: Horizontal scroll with better spacing */}
         <div className="hidden md:block">
           <div className="relative group px-12">
             {/* Left Arrow */}
             <button
               onClick={() => {
                 const container = document.getElementById('other-events-scroll');
                 if (container) {
                   container.scrollBy({ left: -400, behavior: 'smooth' });
                 }
               }}
               className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 items-center justify-center text-[#15383c] hover:bg-[#eef4f5] hover:border-[#15383c] transition-all opacity-0 group-hover:opacity-100 flex"
               aria-label="Scroll left"
             >
               <ChevronLeft size={20} />
             </button>
             
             {/* Scrollable Container - Centered */}
             <div 
               id="other-events-scroll"
               className="flex overflow-x-auto gap-6 lg:gap-8 pb-2 snap-x snap-mandatory scroll-smooth hide-scrollbar scroll-smooth touch-pan-x overscroll-x-contain justify-center"
             >
               {recommendedEvents.map((recEvent, index) => (
                 <div key={recEvent.id} className="snap-start shrink-0 w-[280px] lg:w-[300px] flex-shrink-0 flex">
                   <EventCard 
                     event={recEvent} 
                     onClick={onEventClick} 
                     onChatClick={(e) => { 
                       e.stopPropagation(); 
                       if (!isLoggedIn) { 
                         setShowAuthModal(true); 
                       } else { 
                         setViewState(ViewState.CHAT); 
                       } 
                     }} 
                     onReviewsClick={onReviewsClick} 
                     isLoggedIn={isLoggedIn} 
                     isFavorite={favorites.includes(recEvent.id)} 
                     onToggleFavorite={onToggleFavorite}
                     compact={true}
                   />
                 </div>
               ))}
             </div>
             
             {/* Right Arrow */}
             <button
               onClick={() => {
                 const container = document.getElementById('other-events-scroll');
                 if (container) {
                   container.scrollBy({ left: 400, behavior: 'smooth' });
                 }
               }}
               className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 items-center justify-center text-[#15383c] hover:bg-[#eef4f5] hover:border-[#15383c] transition-all opacity-0 group-hover:opacity-100 flex"
               aria-label="Scroll right"
             >
               <ChevronRight size={20} />
             </button>
           </div>
         </div>
         {/* Mobile Scroller */}
         <div className="md:hidden">
           <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-4 pb-2 -mx-4 px-4 hide-scrollbar scroll-smooth w-full touch-pan-x overscroll-x-contain scroll-pl-4">
             {recommendedEvents.map((recEvent, index) => (
               <div key={recEvent.id} className="snap-start shrink-0 w-[85vw] max-w-[360px] flex">
                 <EventCard 
                   event={recEvent} 
                   onClick={onEventClick} 
                   onChatClick={(e, event) => { 
                     e.stopPropagation(); 
                     if (!isLoggedIn) { 
                       setShowAuthModal(true); 
                     } else { 
                       setViewState(ViewState.CHAT); 
                     } 
                   }} 
                   onReviewsClick={onReviewsClick} 
                   isLoggedIn={isLoggedIn} 
                   isFavorite={favorites.includes(recEvent.id)} 
                   onToggleFavorite={onToggleFavorite}
                   compact={true}
                 />
               </div>
             ))}
           </div>
         </div>
      </section>



      <section className="bg-[#15383c] py-6 sm:py-8 md:py-12 lg:py-16 relative overflow-hidden">
         <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
               <div className="text-center sm:text-left flex-1">
                  <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-heading font-bold text-white mb-2 sm:mb-3 leading-tight">Inspired? Host your own event.</h2>
                  <p className="text-sm sm:text-base text-white/80 font-light hidden sm:block">Create memorable experiences and connect with your community</p>
               </div>
               <button 
                  className="px-6 sm:px-8 md:px-10 py-2.5 sm:py-3 md:py-3.5 bg-[#e35e25] text-white rounded-full font-bold text-sm sm:text-base md:text-lg hover:bg-[#cf4d1d] transition-all shadow-xl shadow-orange-900/30 hover:-translate-y-0.5 touch-manipulation active:scale-95 whitespace-nowrap shrink-0" 
                  onClick={() => setViewState(ViewState.CREATE_EVENT)}
               >
                  Start Hosting
               </button>
            </div>
         </div>
      </section>

      {/* Mobile Footer - Liquid Glass Style */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-2xl border-t border-white/60 px-4 py-3 lg:hidden z-40 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] safe-area-inset-bottom">
        <div className="flex items-center gap-2.5 max-w-xl mx-auto">
           {/* After reservation: Conversation + Attending pill (only for non-hosts) */}
           {hasRSVPed && user?.uid !== event.hostId && (
             <>
               <button 
                 onClick={handleConversationClick}
                 disabled={isDemo}
                 className={`w-10 h-10 shrink-0 rounded-full backdrop-blur-sm border flex items-center justify-center active:scale-[0.92] transition-all touch-manipulation ${
                   isDemo
                     ? 'bg-gray-100/80 text-gray-400 border-gray-200/60 cursor-not-allowed'
                     : 'bg-white/80 text-[#15383c] border-gray-200/60 hover:bg-white hover:border-gray-300'
                 }`}
                 aria-label="Conversation"
               >
                 <MessageCircle size={18} />
               </button>
               <button 
                 disabled
                 className="flex-1 h-11 font-semibold text-[15px] rounded-full bg-[#15383c] text-white shadow-lg shadow-[#15383c]/20 flex items-center justify-center touch-manipulation px-5 gap-2"
               >
                 <CheckCircle2 size={16} />
                 Attending
               </button>
             </>
           )}

           {/* Host view: Share + Conversation only */}
           {user?.uid === event.hostId && (
             <>
               <button 
                 onClick={handleShare}
                 className="w-10 h-10 shrink-0 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/60 text-[#15383c] flex items-center justify-center active:scale-[0.92] transition-all touch-manipulation hover:bg-white hover:border-gray-300"
                 aria-label="Share"
               >
                 <Share2 size={18} />
               </button>
               <button 
                 onClick={handleConversationClick}
                 disabled={isDemo}
                 className={`flex-1 h-11 font-semibold text-[15px] rounded-full shadow-lg flex items-center justify-center touch-manipulation px-5 gap-2 ${
                   isDemo
                     ? 'bg-gray-200/80 text-gray-500 cursor-not-allowed'
                     : 'bg-[#15383c] text-white shadow-[#15383c]/20 hover:bg-[#1f4d52]'
                 }`}
                 aria-label="Open Chat"
               >
                 <MessageCircle size={16} />
                 Manage Event
               </button>
             </>
           )}

           {/* Before reservation: Price pill + Share + Chat + Attend button (only for non-hosts) */}
           {!hasRSVPed && user?.uid !== event.hostId && (
             <>
               {/* Price pill - Liquid glass style */}
               <div className="shrink-0 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-sm">
                 <span className="text-sm font-bold text-[#15383c] uppercase tracking-wide">
                   {event.price === 'Free' || event.price === '$0' || event.price === '0' ? 'Free' : event.price}
                 </span>
               </div>
               
               {/* Share button */}
               <button 
                 onClick={handleShare}
                 className="w-10 h-10 shrink-0 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/60 text-[#15383c] flex items-center justify-center active:scale-[0.92] transition-all touch-manipulation hover:bg-white hover:border-gray-300"
                 aria-label="Share"
               >
                 <Share2 size={18} />
               </button>
               
               {/* Chat button */}
               <button 
                 onClick={handleConversationClick}
                 disabled={isDemo}
                 className={`w-10 h-10 shrink-0 rounded-full backdrop-blur-sm border flex items-center justify-center active:scale-[0.92] transition-all touch-manipulation ${
                   isDemo
                     ? 'bg-gray-100/80 text-gray-400 border-gray-200/60 cursor-not-allowed'
                     : 'bg-white/80 text-[#15383c] border-gray-200/60 hover:bg-white hover:border-gray-300'
                 }`}
                 aria-label="Chat"
               >
                 <MessageCircle size={18} />
               </button>
               
               {/* Main Attend button - Large, takes remaining space */}
               <button 
                 onClick={handleRSVP}
                 disabled={isDemo}
                 className={`flex-1 h-11 font-semibold text-[15px] rounded-full shadow-lg active:scale-[0.97] transition-all whitespace-nowrap flex items-center justify-center touch-manipulation px-5 ${
                   isDemo
                     ? 'bg-gray-300/90 text-gray-500 cursor-not-allowed shadow-none'
                     : 'bg-[#15383c] text-white shadow-[#15383c]/25 hover:bg-[#1f4d52]'
                 }`}
               >
                 {isDemo ? 'Locked' : 'Attend'}
               </button>
             </>
           )}
        </div>
      </div>

      {/* Auth Modal for Chat Access */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#eef4f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={32} className="text-[#e35e25]" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-2">
                Sign In to Join Conversations
              </h2>
              <p className="text-gray-600 text-sm">
                Conversations are only available after signing up or logging in.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setViewState(ViewState.AUTH);
                  // Update URL to prevent viewState from being reset
                  window.history.replaceState({ viewState: ViewState.AUTH }, '', '/auth');
                  window.scrollTo(0, 0);
                }}
                className="w-full px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors"
              >
                Sign In / Sign Up
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      <ImageViewerModal
        images={event.imageUrls && event.imageUrls.length > 0 
          ? event.imageUrls 
          : (event.imageUrl ? [event.imageUrl] : [])}
        initialIndex={imageViewerIndex}
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        eventTitle={event.title}
      />

      {/* Host Reviews Modal */}
      {event.hostId && (
        <HostReviewsModal
          hostId={event.hostId}
          hostName={displayHostName || 'Unknown Host'}
          hostRating={hostOverallRating}
          hostReviewCount={hostOverallReviewCount}
          isOpen={showHostReviewsModal}
          onClose={() => setShowHostReviewsModal(false)}
          onReviewerClick={(userId, userName) => {
            setShowHostReviewsModal(false);
            onHostClick(userName);
          }}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        event={event}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
};
