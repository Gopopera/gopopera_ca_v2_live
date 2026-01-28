import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Event, ViewState } from '../../types';
import { Calendar, MapPin, User, Share2, MessageCircle, ChevronLeft, Heart, Info, Star, Sparkles, X, UserPlus, UserCheck, ChevronRight, CheckCircle2, Edit, Users, DollarSign } from 'lucide-react';
import { followHost, unfollowHost, isFollowing } from '../../firebase/follow';
import { useUserStore } from '../../stores/userStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { EventCard } from '../../components/events/EventCard';
import { EventImage } from '../../components/events/EventImage';
import { MockMap } from '../../components/map/MockMap';
import { FakeEventReservationModal } from '../../components/events/FakeEventReservationModal';
import { ImageViewerModal } from '../../components/events/ImageViewerModal';
import { HostReviewsModal } from '../../components/events/HostReviewsModal';
import { ShareModal } from '../../components/share/ShareModal';
import { SeoHelmet } from '../../components/seo/SeoHelmet';
import { formatDate } from '../../utils/dateFormatter';
import { formatRating } from '../../utils/formatRating';
import { getReservationCountForEvent, subscribeToReservationCount, getUserProfile, listReservationsForUser, type ListReservationsForUserResult } from '../../firebase/db';
// REFACTORED: No longer using getUserProfile for host display - using real-time subscriptions instead
// But we use getUserProfile to check host Stripe status for payments
import { getMainCategoryLabelFromEvent } from '../../utils/categoryMapper';
import { getVibeLabel, normalizeLegacyVibes } from '../../utils/vibes';
import { getSessionFrequencyText, getSessionModeText } from '../../utils/eventHelpers';
import { getInitials, getAvatarBgColor } from '../../utils/avatarUtils';
import { useHostData } from '../../hooks/useHostProfileCache';
import { useHostReviews } from '../../hooks/useHostReviewsCache';
import { MetricSkeleton } from '../../components/ui/MetricSkeleton';
import { PaymentModal } from '../../components/payments/PaymentModal';
import { GuestReserveModal } from '../components/events/GuestReserveModal';
import { hasEventFee, isRecurringEvent, getEventFeeAmount, getEventPricingType, isPayAtDoor, isEventFree as isEventFreeHelper, formatPaymentAmount, getEventCurrency, requiresOnlinePayment } from '../../utils/stripeHelpers';

/**
 * VALIDATION CHECKLIST (Manual Testing):
 * 
 * After reserving a free event:
 * 1) EventDetail "Reserved" state:
 *    - Click "Reserve Spot" → button shows "Confirming..." → then "Reserved ✓"
 *    - If confirmation fails after 5 attempts, shows inline message "We couldn't confirm..."
 *    - Verify no false "Reserved" from cached rsvps fallback
 * 
 * 2) My Circles → Attending:
 *    - Navigate to My Circles → Attending tab
 *    - Event should appear immediately (even if /reservations query fails, falls back to user.rsvps)
 *    - Verify deduplication works (no duplicate events)
 * 
 * 3) Occupancy count:
 *    - Check "X/10 attending" on EventDetail page
 *    - Count should increment after reservation (uses subscribeToReservationCount)
 *    - Verify count updates in real-time when other users reserve
 * 
 * Test scenarios:
 * - Normal flow: reservation write succeeds, reads succeed → all 3 goals pass
 * - Permission error: reservation write succeeds, reads fail → EventDetail shows confirmation error, My Circles uses fallback, occupancy may be delayed
 * - Network delay: reservation write succeeds, reads delayed → EventDetail polls and confirms, My Circles shows after delay
 */

/**
 * Helper to format event price display
 * Now supports pricingType: 'free', 'online', 'door'
 */
const formatEventPrice = (event: Event, showCurrency: boolean = true, showPricingMode: boolean = false): string => {
  const pricingType = getEventPricingType(event);
  const feeAmount = getEventFeeAmount(event);
  const currency = getEventCurrency(event);

  if (pricingType === 'free') {
    return 'Free';
  }

  const formatted = formatPaymentAmount(feeAmount, currency);

  if (showPricingMode && pricingType === 'door') {
    return `Pay at door: ${formatted}`;
  }

  return formatted;
};

/**
 * Helper to check if an event is free
 * Uses the centralized isEventFree helper
 */
const isEventFree = (event: Event): boolean => {
  return isEventFreeHelper(event);
};

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
    image: event.coverImageUrl || event.imageUrls?.[0] || event.imageUrl || 'https://gopopera.ca/2.jpg',
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
  onHostClick: (hostName: string, hostId?: string) => void;
  allEvents: Event[];
  onEventClick: (event: Event) => void;
  isLoggedIn?: boolean;
  favorites?: string[];
  onToggleFavorite?: (e: React.MouseEvent, eventId: string) => void;
  onRSVP?: (eventId: string, reservationId?: string) => void;
  rsvps?: string[];
  onEditEvent?: (event: Event) => void;
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
  rsvps = [],
  onEditEvent
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showGuestReserveModal, setShowGuestReserveModal] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'pre', hypothesisId: 'C2', location: 'EventDetailPage.useEffect:252', message: 'event detail mount', data: { eventId: event?.id || null, hasEvent: !!event, hasTitle: !!event?.title, pricingType: event?.pricingType || null, hasFee: !!event?.hasFee }, timestamp: Date.now() }) }).catch(() => { });
    // #endregion agent log
  }, [event?.id]);
  const [guestSuccess, setGuestSuccess] = useState<{ email: string; ticketUrl: string; claimLink: string | null; isNewGuestUser: boolean } | null>(null);
  const [guestDraft, setGuestDraft] = useState<{ attendeeName: string; attendeeEmail: string; attendeePhoneE164: string; smsOptIn: boolean } | null>(null);
  const [hostStripeStatus, setHostStripeStatus] = useState<{ enabled: boolean; checked: boolean }>({ enabled: false, checked: false });
  const [showHostPaymentSetupError, setShowHostPaymentSetupError] = useState(false);

  // Store hooks - always called
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  const { t, language } = useLanguage();

  // CRITICAL: Extract primitive values from event object to stabilize dependencies
  // Use event.id as the primary key - only extract values when event.id changes
  // This prevents infinite loops when event object reference changes but values stay same
  const eventId = event?.id || '';

  // Filter out empty/invalid image URLs to ensure only real uploaded images are shown
  const validImageUrls = useMemo(() => {
    if (!event?.imageUrls || !Array.isArray(event.imageUrls)) {
      return event?.coverImageUrl ? [event.coverImageUrl] : [];
    }
    const filtered = event.imageUrls.filter((url): url is string =>
      typeof url === 'string' && url.trim().length > 0 && url !== 'undefined' && url !== 'null'
    );
    return filtered.length > 0 ? filtered : (event?.coverImageUrl ? [event.coverImageUrl] : []);
  }, [event?.imageUrls, event?.coverImageUrl]);

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

  // Use stable values from ref - MUST be declared before hooks that use them
  const eventHostId = stableValuesRef.current.hostId;
  const eventHostName = stableValuesRef.current.hostName;

  // Use unified host data hook (includes profile picture, display name, bio, followers count)
  const hostData = useHostData(eventHostId);

  // Use reviews cache hook
  const { averageRating, reviewCount, isLoading: reviewsLoading } = useHostReviews(eventHostId);

  // Extract values from hostData hook
  const hostProfilePicture = hostData?.photoURL || null;
  const displayHostName = hostData?.displayName || eventHostName || 'Unknown Host';
  const followersCount = hostData?.followersCount ?? 0;
  const hostDataLoading = hostData?.isLoading === true;

  // Extract remaining stable values from ref
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

  // Track rsvps string for dependency - this changes when rsvps array contents change
  const currentRsvpsString = rsvps.join(',');

  // Only update ref if the actual contents changed (not just the reference)
  // Do this in a useEffect to avoid side effects during render
  useEffect(() => {
    if (currentRsvpsString !== rsvpsStringRef.current) {
      rsvpsRef.current = rsvps;
      rsvpsStringRef.current = currentRsvpsString;
    }
  }, [rsvps, currentRsvpsString]);

  // Real-time Firestore check for active reservation (not cancelled)
  // This ensures we don't trust stale cached rsvps from localStorage
  const [hasActiveReservation, setHasActiveReservation] = useState<boolean | null>(null);
  const [reservationCheckError, setReservationCheckError] = useState<string | null>(null);
  const [isConfirmingReservation, setIsConfirmingReservation] = useState(false);

  useEffect(() => {
    const checkActiveReservation = async () => {
      if (!user?.uid || !eventId) {
        setHasActiveReservation(false);
        setReservationCheckError(null);
        return;
      }

      try {
        // TASK A: DEV-only debug logging
        if (import.meta.env.DEV) {
          console.log('[EVENT_DETAIL] 🔍 Checking reservation state:', { eventId, userId: user.uid });
        }

        const result = await listReservationsForUser(user.uid);

        // TASK A: Log all reservations for this (userId, eventId)
        const allReservationsForEvent = result.reservations.filter(r => r.eventId === eventId);
        if (import.meta.env.DEV) {
          console.log('[EVENT_DETAIL] 📋 All reservations for (userId, eventId):', {
            eventId,
            userId: user.uid,
            count: allReservationsForEvent.length,
            reservations: allReservationsForEvent.map(r => ({
              id: r.id,
              status: r.status,
              reservedAt: r.reservedAt
            }))
          });
        }

        const activeReservation = result.reservations.find(
          r => r.eventId === eventId && r.status === 'reserved'
        );

        // TASK A: Check if user.rsvps includes the event
        const rsvpsIncludesEvent = rsvps.includes(eventId);
        if (import.meta.env.DEV) {
          console.log('[EVENT_DETAIL] 👤 user.rsvps check:', {
            rsvpsArray: rsvps,
            includesEvent: rsvpsIncludesEvent,
            hasActiveReservation: !!activeReservation,
            match: rsvpsIncludesEvent === !!activeReservation
          });
        }

        console.log('[EVENT_DETAIL] Active reservation check:', {
          eventId,
          found: !!activeReservation,
          reservationsCount: result.reservations.length,
          errorCode: result.errorCode
        });
        setHasActiveReservation(!!activeReservation);
        setReservationCheckError(result.errorCode || null);
      } catch (error) {
        console.error('[EVENT_DETAIL] Error checking active reservation:', error);
        // On error, assume no active reservation (safer than showing stale data)
        setHasActiveReservation(false);
        setReservationCheckError('unknown');
      }
    };

    checkActiveReservation();
  }, [user?.uid, eventId, currentRsvpsString, rsvps]); // Re-check when rsvps change

  // TASK B: 3-state UI - "Reserve", "Confirming...", "Reserved ✓"
  // Only show "Reserved" when Firestore confirms it exists
  const hasRSVPed = useMemo(() => {
    // If confirming, show confirming state
    if (isConfirmingReservation) {
      return null; // Special state for "Confirming..."
    }
    // If real-time check completed, trust it
    if (hasActiveReservation !== null) {
      return hasActiveReservation;
    }
    // While loading, show "Reserve" (not "Reserved")
    return false;
  }, [eventId, hasActiveReservation, isConfirmingReservation]);

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

  // Use rating from reviews cache hook
  const currentRating = { rating: averageRating, reviewCount };

  // Check if host has Stripe enabled (for paid events)
  // FIX: Use specific event fields in dependency, not the whole event object (prevents infinite re-renders)
  const eventHasFee = event?.hasFee;
  const eventFeeAmount = event?.feeAmount;
  const eventPrice = event?.price;

  useEffect(() => {
    // Check if event has a fee - check new fields first, then legacy price field
    const hasNewFee = eventHasFee && eventFeeAmount && eventFeeAmount > 0;
    const hasLegacyFee = eventPrice && eventPrice !== 'Free' && eventPrice !== '' && eventPrice !== '$0' && eventPrice !== '0';
    const isPaidEvent = hasNewFee || hasLegacyFee;

    if (!isPaidEvent || !eventHostId) {
      setHostStripeStatus({ enabled: true, checked: true }); // Default to enabled for free events
      return;
    }

    const checkHostStripeStatus = async () => {
      try {
        console.log('[EVENT_DETAIL] Checking host Stripe status for:', eventHostId);
        const hostProfile = await getUserProfile(eventHostId);

        if (hostProfile) {
          const isEnabled = hostProfile.stripeAccountEnabled === true;
          console.log('[EVENT_DETAIL] Host Stripe status:', {
            hostId: eventHostId,
            stripeAccountId: hostProfile.stripeAccountId ? 'set' : 'not set',
            stripeOnboardingStatus: hostProfile.stripeOnboardingStatus,
            stripeAccountEnabled: isEnabled,
          });
          setHostStripeStatus({ enabled: isEnabled, checked: true });
        } else {
          console.warn('[EVENT_DETAIL] Could not fetch host profile for Stripe check');
          setHostStripeStatus({ enabled: false, checked: true });
        }
      } catch (error) {
        console.error('[EVENT_DETAIL] Error checking host Stripe status:', error);
        setHostStripeStatus({ enabled: false, checked: true });
      }
    };

    checkHostStripeStatus();
  }, [eventHostId, eventHasFee, eventFeeAmount, eventPrice]);

  // REFACTORED: Real-time subscription to reservation count - computed from reservations
  useEffect(() => {
    if (!eventId || isDemo) {
      setReservationCount(0);
      return () => { }; // No-op cleanup
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

  const createGuestReservation = async (payload: {
    eventId: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeePhoneE164: string;
    smsOptIn: boolean;
    paymentIntentId?: string;
    paymentStatus?: string;
    totalAmount?: number;
  }) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'pre', hypothesisId: 'H4', location: 'EventDetailPage.createGuestReservation:628', message: 'guest reservation request', data: { eventId: payload.eventId, hasPhone: !!payload.attendeePhoneE164, smsOptIn: !!payload.smsOptIn, hasPaymentIntent: !!payload.paymentIntentId, paymentStatus: payload.paymentStatus || null, hasTotalAmount: typeof payload.totalAmount === 'number' }, timestamp: Date.now() }) }).catch(() => { });
    // #endregion agent log
    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl}/reservations/create-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'pre', hypothesisId: 'H4', location: 'EventDetailPage.createGuestReservation:636', message: 'guest reservation fetch failed', data: { message: error?.message || null, name: error?.name || null }, timestamp: Date.now() }) }).catch(() => { });
      // #endregion agent log
      throw error;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'pre', hypothesisId: 'H4', location: 'EventDetailPage.createGuestReservation:646', message: 'guest reservation response', data: { status: response.status, ok: response.ok }, timestamp: Date.now() }) }).catch(() => { });
    // #endregion agent log

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'pre', hypothesisId: 'H4', location: 'EventDetailPage.createGuestReservation:635', message: 'guest reservation response error', data: { status: response.status, hasError: !!err?.error, errorCode: err?.code || null }, timestamp: Date.now() }) }).catch(() => { });
      // #endregion agent log

      // Preserve error code for GUEST_LIMIT_REACHED handling in UI
      const error = new Error(err.message || err.error || 'Guest reservation failed') as Error & { code?: string; email?: string };
      if (err.code) {
        error.code = err.code;
      }
      if (err.email) {
        error.email = err.email;
      }
      throw error;
    }

    return response.json() as Promise<{ reservationId: string; ticketUrl: string; claimLink: string | null; isNewGuestUser: boolean }>;
  };

  const handleRSVP = async () => {
    console.log('[EVENT_DETAIL] 🎯 handleRSVP called', {
      isDemo,
      isLoggedIn,
      hasUser: !!user?.uid,
      hasRSVPed,
      eventHasFee: event?.hasFee,
      eventFeeAmount: event?.feeAmount,
      eventPrice: event?.price,
      hostStripeStatus,
    });

    if (isDemo) {
      // Show modal for demo events instead of reserving
      console.log('[EVENT_DETAIL] Demo event - showing fake modal');
      setShowFakeEventModal(true);
      return;
    }

    if (!isLoggedIn || !user?.uid) {
      console.log('[EVENT_DETAIL] Not logged in - showing guest reserve modal');
      setGuestError(null);
      setGuestSuccess(null);
      setShowGuestReserveModal(true);
      return;
    }

    setReserving(true);
    try {
      const { addRSVP, removeRSVP } = useUserStore.getState();

      if (hasRSVPed) {
        // TASK C: Cancel reservation - only if we have confirmed reservation from Firestore
        if (hasActiveReservation === true) {
          console.log('[EVENT_DETAIL] Cancelling existing reservation');
          try {
            await removeRSVP(user.uid, event.id);
            setReservationSuccess(false);
            setHasActiveReservation(false);
            // Update local count
            if (reservationCount !== null && reservationCount > 0) {
              setReservationCount(reservationCount - 1);
            }
            // Refresh reservation state
            const result = await listReservationsForUser(user.uid);
            const stillReserved = result.reservations.find(
              r => r.eventId === event.id && r.status === 'reserved'
            );
            if (!stillReserved) {
              setHasActiveReservation(false);
            }
          } catch (error: any) {
            console.error('[EVENT_DETAIL] Error cancelling reservation:', error);
            // Show error to user
            alert(`Failed to cancel reservation: ${error.message || 'Unknown error'}`);
          }
        } else {
          // TASK C: Stale state - refresh and don't attempt cancel
          console.warn('[EVENT_DETAIL] hasRSVPed is true but hasActiveReservation is not confirmed, refreshing state');
          const result = await listReservationsForUser(user.uid);
          const activeReservation = result.reservations.find(
            r => r.eventId === event.id && r.status === 'reserved'
          );
          setHasActiveReservation(!!activeReservation);
          if (!activeReservation) {
            // State was stale, now corrected
            console.log('[EVENT_DETAIL] State corrected - no active reservation found');
          }
        }
        setReserving(false);
        return;
      } else {
        // Check if event is free (using consistent helper that checks both new and legacy price fields)
        const isFree = isEventFree(event);
        const needsStripe = requiresOnlinePayment(event); // Only true for pricingType === 'online'
        const isDoorPayment = isPayAtDoor(event); // pricingType === 'door'

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'pre', hypothesisId: 'H3', location: 'EventDetailPage.handleReserve:715', message: 'pricing decision', data: { pricingType: event?.pricingType, hasFee: event?.hasFee, feeAmount: event?.feeAmount, currency: event?.currency, isFree, needsStripe, isDoorPayment }, timestamp: Date.now() }) }).catch(() => { });
        // #endregion agent log

        console.log('[EVENT_DETAIL] Event payment check:', {
          isFree,
          needsStripe,
          isDoorPayment,
          pricingType: event?.pricingType,
          hasFeeField: event?.hasFee,
          feeAmount: event?.feeAmount,
          price: event?.price,
        });

        if (isFree) {
          // For free events, go directly to reservation
          console.log('[EVENT_DETAIL] Free event - creating reservation');

          // TASK B: DEV-only diagnostic log when reserve is clicked
          if (import.meta.env.DEV) {
            console.log('[EVENT_DETAIL] 🔍 RSVP FLOW START:', { userId: user.uid, eventId: event.id });
          }

          setIsConfirmingReservation(true);
          setReservationCheckError(null);

          try {
            const reservationId = await addRSVP(user.uid, event.id);

            // TASK B: DEV-only diagnostic log when createReservation returns
            if (import.meta.env.DEV) {
              console.log('[EVENT_DETAIL] ✅ createReservation returned:', { reservationId, userId: user.uid, eventId: event.id });
            }

            setReservationSuccess(true);
            // Update local count optimistically
            setReservationCount((prev) => (prev !== null ? prev + 1 : 1));

            // TASK B: Poll for confirmation up to 5 times with 300ms delay
            let confirmed = false;
            for (let attempt = 0; attempt < 5; attempt++) {
              await new Promise(resolve => setTimeout(resolve, 300));
              const result = await listReservationsForUser(user.uid);
              const activeReservation = result.reservations.find(
                r => r.eventId === event.id && r.status === 'reserved'
              );
              if (activeReservation) {
                confirmed = true;
                setHasActiveReservation(true);
                setReservationCheckError(null);

                // TASK B: DEV-only diagnostic log when confirmation polling succeeds
                if (import.meta.env.DEV) {
                  console.log('[EVENT_DETAIL] ✅ Confirmation polling SUCCESS:', {
                    attempt: attempt + 1,
                    reservationId: activeReservation.id,
                    userId: user.uid,
                    eventId: event.id
                  });
                }
                break;
              }
              if (import.meta.env.DEV) {
                console.log(`[EVENT_DETAIL] Confirmation attempt ${attempt + 1}/5: reservation not found yet`);
              }
            }

            if (!confirmed) {
              // Reservation not confirmed after polling
              setReservationCheckError('confirmation-failed');
              setHasActiveReservation(false);

              // TASK B: DEV-only diagnostic log when confirmation polling fails
              if (import.meta.env.DEV) {
                console.warn('[EVENT_DETAIL] ❌ Confirmation polling FAILED:', {
                  reservationId,
                  userId: user.uid,
                  eventId: event.id,
                  attempts: 5
                });
              }
            }

            setIsConfirmingReservation(false);

            // Refresh user profile to ensure rsvps are synced (so events show in My Pops)
            await useUserStore.getState().refreshUserProfile();

            // Navigate to confirmation page after a brief delay
            setTimeout(() => {
              if (onRSVP) {
                onRSVP(event.id, reservationId);
              }
            }, 500);
          } catch (error) {
            setIsConfirmingReservation(false);
            setHasActiveReservation(false);
            throw error; // Re-throw to be caught by outer catch
          }
        } else if (needsStripe) {
          // STRIPE PAYMENT REQUIRED (pricingType === 'online')
          console.log('[EVENT_DETAIL] 🔥 STRIPE payment required - needsStripe=', needsStripe, 'hostStripeStatus=', hostStripeStatus);

          // Verify host has Stripe account enabled
          if (!hostStripeStatus.checked) {
            console.log('[EVENT_DETAIL] Host Stripe status not checked yet, waiting...');
            setReserving(false);
            return;
          }

          if (!hostStripeStatus.enabled) {
            console.log('[EVENT_DETAIL] ⚠️ Host does not have Stripe enabled - showing error modal');
            setShowHostPaymentSetupError(true);
            setReserving(false);
            return;
          }

          // Show payment modal for Stripe payments
          console.log('[EVENT_DETAIL] ✅ Opening payment modal - feeAmount:', getEventFeeAmount(event));
          setShowPaymentModal(true);
          setReserving(false); // Stop loading state since we're showing the modal
        } else if (isDoorPayment) {
          // PAY AT DOOR - NO STRIPE (pricingType === 'door')
          // Navigate to confirm page to capture reservation WITHOUT Stripe
          console.log('[EVENT_DETAIL] 💵 Pay at door event - navigating to confirm page (NO Stripe)');
          setViewState(ViewState.CONFIRM_RESERVATION);
        } else {
          // For legacy paid events without pricingType, navigate to Confirm & Pay page
          console.log('[EVENT_DETAIL] Legacy paid event - navigating to confirm page');
          setViewState(ViewState.CONFIRM_RESERVATION);
        }
      }
    } catch (error) {
      console.error('[EVENT_DETAIL] ❌ Error handling RSVP:', error);
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
      setIsConfirmingReservation(true);
      setReservationCheckError(null);

      const reservationId = await addRSVP(user.uid, event.id, {
        paymentMethod: 'stripe',
        totalAmount: event.feeAmount,
        paymentIntentId,
        subscriptionId,
      });

      setReservationSuccess(true);
      setReservationCount((prev) => (prev !== null ? prev + 1 : 1));

      // TASK B: Poll for confirmation up to 5 times with 300ms delay
      let confirmed = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const result = await listReservationsForUser(user.uid);
        const activeReservation = result.reservations.find(
          r => r.eventId === event.id && r.status === 'reserved'
        );
        if (activeReservation) {
          confirmed = true;
          setHasActiveReservation(true);
          setReservationCheckError(null);
          break;
        }
      }

      if (!confirmed) {
        setReservationCheckError('confirmation-failed');
        setHasActiveReservation(false);
      }

      setIsConfirmingReservation(false);

      // Refresh user profile
      await useUserStore.getState().refreshUserProfile();

      // Navigate to confirmation
      setTimeout(() => {
        if (onRSVP) {
          onRSVP(event.id, reservationId);
        }
      }, 500);
    } catch (error) {
      setIsConfirmingReservation(false);
      setHasActiveReservation(false);
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
      {requiresOnlinePayment(event) && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setGuestDraft(null);
          }}
          onSuccess={async (paymentIntentId: string, subscriptionId?: string) => {
            if (guestDraft) {
              try {
                setGuestLoading(true);
                const result = await createGuestReservation({
                  eventId: event.id,
                  attendeeName: guestDraft.attendeeName,
                  attendeeEmail: guestDraft.attendeeEmail,
                  attendeePhoneE164: guestDraft.attendeePhoneE164,
                  smsOptIn: guestDraft.smsOptIn,
                  paymentIntentId,
                  paymentStatus: 'succeeded',
                  totalAmount: event.feeAmount,
                });
                setGuestSuccess({ email: guestDraft.attendeeEmail, ticketUrl: result.ticketUrl, claimLink: result.claimLink, isNewGuestUser: result.isNewGuestUser });
                setShowGuestReserveModal(true);
              } catch (error: any) {
                setGuestError(error?.message || 'Failed to create reservation');
                setShowGuestReserveModal(true);
              } finally {
                setGuestLoading(false);
                setShowPaymentModal(false);
              }
              return;
            }
            await handlePaymentSuccess(paymentIntentId, subscriptionId);
          }}
          eventTitle={event.title}
          feeAmount={getEventFeeAmount(event)}
          currency={event.currency || 'cad'}
          attendeeCount={1}
          isRecurring={isRecurringEvent(event)}
          eventId={event.id}
          hostId={event.hostId}
          userId={user?.uid}
          userEmail={user?.email}
          subscriptionInterval={event.sessionFrequency === 'weekly' ? 'week' : event.sessionFrequency === 'monthly' ? 'month' : undefined}
          mode={guestDraft ? 'guest' : 'auth'}
          attendeeEmail={guestDraft?.attendeeEmail}
        />
      )}

      <GuestReserveModal
        isOpen={showGuestReserveModal}
        eventTitle={event.title}
        loading={guestLoading}
        error={guestError}
        success={guestSuccess}
        onClose={() => {
          setShowGuestReserveModal(false);
          if (!showPaymentModal) {
            setGuestDraft(null);
          }
        }}
        onSignIn={() => {
          setShowGuestReserveModal(false);
          setViewState(ViewState.AUTH);
          window.history.replaceState({ viewState: ViewState.AUTH }, '', '/auth?mode=signin');
        }}
        onSubmit={async (data) => {
          try {
            setGuestError(null);
            setGuestLoading(true);
            setGuestDraft(data);

            const needsStripe = requiresOnlinePayment(event);
            const isDoor = isPayAtDoor(event);
            const isFree = isEventFree(event);

            if (needsStripe) {
              setShowGuestReserveModal(false);
              setShowPaymentModal(true);
              return;
            }

            const result = await createGuestReservation({
              eventId: event.id,
              attendeeName: data.attendeeName,
              attendeeEmail: data.attendeeEmail,
              attendeePhoneE164: data.attendeePhoneE164,
              smsOptIn: data.smsOptIn,
              totalAmount: isDoor && !isFree ? getEventFeeAmount(event) : undefined,
            });

            setGuestSuccess({ email: data.attendeeEmail, ticketUrl: result.ticketUrl, claimLink: result.claimLink, isNewGuestUser: result.isNewGuestUser });
          } catch (error: any) {
            setGuestError(error?.message || 'Failed to reserve');
          } finally {
            setGuestLoading(false);
          }
        }}
      />

      {/* Host Payment Setup Error Modal */}
      {showHostPaymentSetupError && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowHostPaymentSetupError(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fade-in relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowHostPaymentSetupError(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign size={32} className="text-yellow-600" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-2">
                Payment Not Available
              </h2>
              <p className="text-gray-600 text-sm">
                The host hasn't completed their payment setup yet. You can contact them through the group chat or check back later.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowHostPaymentSetupError(false);
                  handleConversationClick();
                }}
                className="w-full px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors"
              >
                Contact Host
              </button>
              <button
                onClick={() => setShowHostPaymentSetupError(false)}
                className="w-full px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
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
              className={`w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-[0.92] transition-all touch-manipulation border border-white/50 z-50 pointer-events-auto ${isFavorite ? 'text-[#e35e25]' : 'text-popera-teal'
                }`}
              style={{ pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent' }}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart
                size={20}
                className={`sm:w-5 sm:h-5 transition-all ${isFavorite ? 'fill-[#e35e25] text-[#e35e25]' : 'fill-none text-popera-teal'
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
                {t('ui.signInToJoin')}
              </h2>
              <p className="text-gray-600 text-sm">
                {t('ui.conversationsAvailable')}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setViewState(ViewState.AUTH);
                  // Update URL to prevent viewState from being reset - use signin mode
                  window.history.replaceState({ viewState: ViewState.AUTH }, '', '/auth?mode=signin');
                  window.scrollTo(0, 0);
                }}
                className="w-full px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors"
              >
                {t('ui.signInSignUp')}
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden lg:block max-w-7xl mx-auto px-6 py-6 mt-20">
        <button onClick={() => window.history.back()} className="flex items-center text-gray-500 hover:text-popera-teal transition-colors font-medium"><ChevronLeft size={20} className="mr-1" /> {t('ui.backToEvents')}</button>
      </div>

      {/* DESKTOP: 2-row grid layout for hero + sidebar alignment */}
      <div className="lg:max-w-7xl lg:mx-auto lg:px-8 lg:pt-4">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-x-8 lg:items-start">

          {/* HERO IMAGE - Left column (desktop grid) */}
          <div className="pt-16 sm:pt-0 lg:pt-0">
            <div className="relative w-full overflow-hidden lg:rounded-2xl aspect-[4/5] sm:aspect-[3/2] lg:aspect-[16/9]">
              {validImageUrls.length > 1 ? (
                // Multiple images - horizontal snap gallery (image-driven height)
                <div
                  data-testid="event-image-carousel"
                  className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth hide-scrollbar cursor-pointer touch-auto overscroll-x-contain"
                  onScroll={(e) => {
                    const container = e.currentTarget;
                    const scrollLeft = container.scrollLeft;
                    const imageWidth = container.clientWidth || (container.scrollWidth / validImageUrls.length);
                    const newIndex = Math.round(scrollLeft / imageWidth);
                    setCurrentImageIndex(Math.min(newIndex, validImageUrls.length - 1));
                  }}
                  onClick={() => {
                    if (validImageUrls.length > 0) {
                      setImageViewerIndex(currentImageIndex);
                      setShowImageViewer(true);
                    }
                  }}
                >
                  {validImageUrls.map((url, index) => (
                    <div key={index} className="relative w-full h-full snap-start snap-always flex-shrink-0">
                      <EventImage
                        src={url}
                        alt={`${event.title} - Image ${index + 1}`}
                        variant="hero"
                        priority={index === 0}
                        eventId={event.id}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                // Single image - image-driven height (no dead space)
                <div
                  className="relative w-full h-full cursor-pointer"
                  onClick={() => {
                    const images = validImageUrls.length > 0
                      ? validImageUrls
                      : (event.coverImageUrl ? [event.coverImageUrl] : (event.imageUrl ? [event.imageUrl] : []));
                    if (images.length > 0) {
                      setImageViewerIndex(0);
                      setShowImageViewer(true);
                    }
                  }}
                >
                  <EventImage
                    src={validImageUrls.length > 0 ? validImageUrls[0] : (event.imageUrl || `https://picsum.photos/seed/${event.id}/800/600`)}
                    alt={event.title}
                    variant="hero"
                    priority={true}
                    eventId={event.id}
                  />
                </div>
              )}

              {/* Soft vignette gradient for text readability - subtle at top, stronger at bottom */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none z-[2]" />

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
                  className="absolute top-4 right-4 w-11 h-11 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 hover:bg-white/30 transition-all hover:scale-110 active:scale-95 touch-manipulation z-50 pointer-events-auto"
                  style={{ pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent' }}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart
                    size={22}
                    className={`sm:w-6 sm:h-6 transition-all ${isFavorite ? 'fill-[#e35e25] text-[#e35e25]' : 'fill-white/80 text-white'
                      }`}
                    strokeWidth={2.5}
                  />
                </button>
              )}

              {/* Image counter for multiple images - bottom right aligned with heart icon */}
              {validImageUrls.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30 z-10 pointer-events-none">
                  {currentImageIndex + 1} / {validImageUrls.length}
                </div>
              )}

              {/* Content Overlay - Category badge on the top left (NO grey background container) */}
              <div className="absolute top-4 left-4 z-20">
                {/* Category Badge - Glass pill styling only, no solid background */}
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[#e35e25] text-xs font-bold uppercase tracking-wider border border-white/20 bg-white/10 backdrop-blur-md shadow-lg">
                  {getMainCategoryLabelFromEvent(event, language)}
                </span>
              </div>
            </div>{/* End hero image container */}

            {/* TITLE + META - below hero image on desktop */}
            <div className="hidden lg:block mt-6 mb-12">
              <h1 className="text-3xl font-heading font-bold text-[#15383c] leading-tight mb-4">
                {event.title}
              </h1>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-gray-600">
                  <Calendar size={16} className="text-[#e35e25] shrink-0" />
                  <span className="text-base">{formatDate(event.date)} • {event.time}</span>
                </div>
                <div className="flex items-center gap-2.5 text-gray-600">
                  <MapPin size={16} className="text-[#e35e25] shrink-0" />
                  <span className="text-base truncate">{event.location}</span>
                </div>
                {reservationCount === null ? (
                  <div className="flex items-center gap-2.5 text-gray-600">
                    <User size={16} className="text-[#e35e25] shrink-0" />
                    <MetricSkeleton width="w-24" height="h-4" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-gray-600">
                    <User size={16} className="text-[#e35e25] shrink-0" />
                    <span className="text-base">
                      {event.capacity
                        ? `${reservationCount}/${event.capacity} attending`
                        : `${reservationCount} attending`
                      }
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-gray-600">
                  <DollarSign size={16} className="text-[#e35e25] shrink-0" />
                  <span className="text-base">
                    {isPayAtDoor(event) && <span className="text-amber-600 font-medium">Pay at door: </span>}
                    {formatEventPrice(event, true)}
                  </span>
                </div>
              </div>
            </div>
          </div>{/* End HERO IMAGE grid item */}

          {/* RIGHT COLUMN: Host + Action Cards + Title/Meta - all in one stack */}
          <div className="hidden lg:block">
            <div className="flex flex-col space-y-4">
              {/* Hosted-by Card */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-white/60 p-4 hover:shadow-[0_6px_24px_rgb(0,0,0,0.08)] transition-shadow">
                {/* Host Avatar */}
                <div className="flex justify-center mb-3">
                  <div
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-[#e35e25] to-[#15383c] overflow-hidden ring-2 ring-white shadow-lg cursor-pointer hover:ring-[#e35e25]/30 transition-all"
                    onClick={() => onHostClick?.(displayHostName, event.hostId)}
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
                    onClick={() => onHostClick?.(displayHostName, event.hostId)}
                  >
                    {displayHostName}
                  </h3>
                </div>

                {/* Rating + Followers */}
                <div className="flex items-center justify-center gap-3 mb-3">
                  {reviewsLoading ? (
                    <MetricSkeleton width="w-16" height="h-5" />
                  ) : currentRating.reviewCount > 0 ? (
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
                  ) : null}

                  {hostDataLoading ? (
                    <MetricSkeleton width="w-12" height="h-4" />
                  ) : (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Users size={14} />
                      <span className="text-xs">{followersCount} {followersCount === 1 ? t('ui.follower') : t('ui.followers')}</span>
                    </div>
                  )}
                </div>

                {/* Follow Button */}
                {isLoggedIn && user?.uid !== event.hostId && (
                  <div className="flex justify-center">
                    <button
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      aria-label={isFollowingHost ? `Unfollow ${displayHostName}` : `Follow ${displayHostName}`}
                      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 ${isFollowingHost
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
                    <span className="text-2xl font-heading font-bold text-[#15383c]">
                      {isEventFree(event) ? t('event.free') : formatEventPrice(event, false)}
                    </span>
                    {isPayAtDoor(event) && (
                      <span className="text-sm text-amber-600 font-medium ml-2">({language === 'fr' ? 'Paiement sur place' : 'Pay at the door'})</span>
                    )}
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{t('ui.perPerson')}</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {/* Edit Event Button */}
                  {isLoggedIn && user?.uid === event.hostId && onEditEvent && (
                    <button
                      onClick={() => onEditEvent(event)}
                      className="w-full py-2 bg-white/80 backdrop-blur-sm border border-[#15383c]/30 text-[#15383c] rounded-full text-sm font-semibold hover:bg-white hover:border-[#15383c] transition-all whitespace-nowrap touch-manipulation active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Edit size={14} /> {t('eventDetail.editEvent')}
                    </button>
                  )}
                  {/* Reserve Button */}
                  {user?.uid !== event.hostId && (
                    <>
                      <button
                        onClick={handleRSVP}
                        disabled={isDemo || reserving || isConfirmingReservation}
                        aria-label={hasRSVPed ? "Cancel reservation" : isConfirmingReservation ? "Confirming reservation" : "Reserve spot"}
                        className={`w-full py-2.5 font-semibold text-sm rounded-full transition-all touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isDemo
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : hasRSVPed
                            ? 'bg-[#15383c] text-white hover:bg-[#1f4d52]'
                            : 'bg-[#e35e25] text-white hover:bg-[#cf4d1d]'
                          }`}
                      >
                        {reserving || isConfirmingReservation
                          ? (isConfirmingReservation ? 'Confirming...' : t('ui.reserving'))
                          : isDemo
                            ? t('ui.demoEvent')
                            : hasRSVPed
                              ? t('event.reserved')
                              : t('ui.reserveSpot')}
                      </button>
                      {reservationCheckError === 'confirmation-failed' && (
                        <p className="mt-2 text-xs text-amber-600 text-center">
                          We couldn't confirm your reservation yet. Please refresh the page.
                        </p>
                      )}
                    </>
                  )}
                  <button
                    onClick={handleShare}
                    aria-label="Share event"
                    className="w-full py-2 bg-white border border-[#15383c] text-[#15383c] rounded-full text-sm font-semibold hover:bg-[#15383c] hover:text-white transition-all whitespace-nowrap touch-manipulation active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Share2 size={14} /> {t('ui.shareEvent')}
                  </button>
                  <button
                    onClick={handleConversationClick}
                    disabled={isDemo}
                    className={`w-full py-2 font-semibold text-sm rounded-full border flex items-center justify-center gap-2 touch-manipulation active:scale-95 transition-colors ${isDemo
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white border-[#15383c] text-[#15383c] hover:bg-[#15383c] hover:text-white'
                      }`}
                  >
                    <MessageCircle size={14} />
                    {isDemo ? t('ui.chatLocked') : t('ui.joinGroupChat')}
                  </button>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400 leading-relaxed">{t('ui.securePayment')}</p>
                </div>
              </div>
            </div>
          </div>{/* End RIGHT COLUMN (top grid) */}

        </div>{/* End desktop 2-column grid */}
      </div>{/* End desktop container wrapper */}

      {/* Content Sections - Premium clean design */}
      <div className="bg-white relative">
        {/* Host Avatar - Overlapping hero/content boundary - Mobile/Tablet only */}
        {/* Desktop: hidden (avatar is now in the Hosted-by card in the right column) */}
        <div className="absolute -top-8 sm:-top-10 left-4 sm:left-6 z-10 lg:hidden">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#e35e25] to-[#15383c] overflow-hidden ring-4 ring-white shadow-xl cursor-pointer hover:ring-[#e35e25]/30 transition-all"
            onClick={() => onHostClick?.(displayHostName, event.hostId)}
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

        {/* Desktop: content flows naturally after the metadata section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-14 lg:pt-0 pb-12 sm:pb-16 md:pb-20 lg:pb-24">
          {/* Reservation Success Message */}
          {reservationSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 sm:p-5 flex items-center gap-3 animate-fade-in">
              <CheckCircle2 size={20} className="text-green-600 shrink-0" />
              <p className="text-green-800 font-medium text-sm">{t('event.reservationSuccess')}</p>
            </div>
          )}

          {/* Content area - Mobile/Tablet: full layout; Desktop: just About section */}
          <div className="lg:max-w-3xl">
            {/* Event Info + Host Section - MOBILE/TABLET ONLY (desktop shows this in top grid) */}
            <div className="mb-8 lg:hidden">
              <div className="grid grid-cols-1 gap-6 items-start">
                {/* Event Info (Title, Date, Location, Attending) */}
                <div>
                  {/* Title */}
                  <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[#15383c] leading-tight mb-4">
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
                    {reservationCount === null ? (
                      <div className="flex items-center gap-2.5 text-gray-600">
                        <User size={16} className="text-[#e35e25] shrink-0" />
                        <MetricSkeleton width="w-24" height="h-4" />
                      </div>
                    ) : (
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
                    {/* Cost - Using consistent helper for both new and legacy price fields */}
                    <div className="flex items-center gap-2.5 text-gray-600">
                      <DollarSign size={16} className="text-[#e35e25] shrink-0" />
                      <span className="text-sm sm:text-base">
                        {isPayAtDoor(event) && <span className="text-amber-600 font-medium">Pay at door: </span>}
                        {formatEventPrice(event, true)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Host Info - Mobile/Tablet only (hidden on desktop, shown in right column) */}
                <div className="flex flex-col items-start mt-4 lg:hidden">
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">{t('event.hostedBy')}</p>
                  <h3
                    className="text-lg sm:text-xl font-heading font-bold text-[#15383c] cursor-pointer hover:text-[#e35e25] transition-colors mb-2"
                    onClick={() => onHostClick?.(displayHostName, event.hostId)}
                  >
                    {displayHostName}
                  </h3>

                  {/* Rating + Followers - Inline */}
                  <div className="flex items-center gap-3 mb-3">
                    {reviewsLoading ? (
                      <MetricSkeleton width="w-16" height="h-5" />
                    ) : currentRating.reviewCount > 0 ? (
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
                    ) : null}

                    {hostDataLoading ? (
                      <MetricSkeleton width="w-12" height="h-4" />
                    ) : (
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Users size={14} />
                        <span className="text-xs">{followersCount} {followersCount === 1 ? t('ui.follower') : t('ui.followers')}</span>
                      </div>
                    )}
                  </div>

                  {/* Follow Button - Liquid Glass Style */}
                  {isLoggedIn && user?.uid !== event.hostId && (
                    <button
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      aria-label={isFollowingHost ? `Unfollow ${displayHostName}` : `Follow ${displayHostName}`}
                      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 ${isFollowingHost
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

            {/* Description Section - Equal spacing above and below heading */}
            <div className="mb-12 sm:mb-16 lg:mt-8 lg:mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c] mb-8">
                {t('event.aboutEvent')}
              </h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed font-light whitespace-pre-wrap">
                  {event.description || "Join us for an incredible experience..."}
                </p>
              </div>

              {/* Vibes - Subtle display after description */}
              {event.vibes && event.vibes.length > 0 && (
                <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {normalizeLegacyVibes(event.vibes).map((vibe) => (
                      <span
                        key={vibe.key}
                        className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 text-xs sm:text-sm font-medium hover:border-[#e35e25]/30 hover:text-[#e35e25] transition-colors"
                      >
                        {getVibeLabel(vibe, language)}
                        {vibe.isCustom && <span className="ml-1 text-[10px] opacity-50">✨</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>{/* End content area */}

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
            <div className="rounded-2xl lg:rounded-3xl overflow-hidden h-56 sm:h-72 lg:h-80 relative group shadow-lg border border-gray-200 mb-4">
              <MockMap
                lat={event.lat}
                lng={event.lng}
                address={event.address}
                city={event.city}
                className="w-full h-full"
                nearbyEvents={allEvents.map(e => ({
                  id: e.id,
                  title: e.title,
                  lat: e.lat,
                  lng: e.lng,
                  date: e.date,
                  city: e.city
                }))}
                currentEventId={event.id}
                onEventClick={(e) => onEventClick(allEvents.find(ev => ev.id === e.id) as Event)}
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
              {t('eventDetail.cancellationPolicy')}
            </h2>
            <div className="space-y-2 text-gray-600 text-xs sm:text-sm leading-relaxed">
              <p>
                <strong className="text-[#15383c]">{t('event.cancel')}:</strong> {t('eventDetail.cancellationDesc')}
              </p>
              <p>
                <strong className="text-[#15383c]">Expulsion:</strong> {t('eventDetail.expulsionDesc')}
              </p>
              <p className="text-gray-400 text-xs italic">
                {t('eventDetail.forDetails')} <button onClick={() => setViewState(ViewState.CANCELLATION)} className="text-[#e35e25] hover:underline font-medium">{t('eventDetail.cancellationPolicyLink')}</button>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 md:py-16 border-t border-gray-100">
        <div className="text-center mb-8 sm:mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full bg-[#15383c]/5 border border-[#15383c]/10 text-[#e35e25] text-[10px] sm:text-xs font-bold tracking-widest uppercase">
            <Sparkles size={12} className="sm:w-3.5 sm:h-3.5" />
            {t('ui.discover')}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c]">{t('ui.otherCircles')}</h2>
          <p className="mt-2 text-sm sm:text-base text-gray-500 font-light">{t('ui.exploreNearby')}</p>
        </div>
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



      {/* Host CTA Section - Liquid Glass Style */}
      <section className="bg-gradient-to-br from-[#15383c] via-[#1a4347] to-[#15383c] py-8 sm:py-10 md:py-14 lg:py-16 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#e35e25]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Glass card container */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 md:p-10 lg:p-12">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-10">
              <div className="text-center lg:text-left flex-1">
                <span className="inline-block px-3 py-1 mb-3 sm:mb-4 text-[10px] sm:text-xs font-bold tracking-widest uppercase text-[#e35e25] bg-[#e35e25]/10 rounded-full border border-[#e35e25]/20">
                  {t('ui.becomeAHost')}
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white mb-3 sm:mb-4 leading-tight">
                  {t('ui.readyToHost')}
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-white/70 font-light max-w-xl mx-auto lg:mx-0">
                  {t('ui.createSessions')}
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <button
                  className="group px-8 sm:px-10 md:px-12 py-3.5 sm:py-4 bg-[#e35e25] text-white rounded-full font-bold text-base sm:text-lg md:text-xl hover:bg-[#cf4d1d] transition-all shadow-lg shadow-[#e35e25]/30 hover:shadow-xl hover:shadow-[#e35e25]/40 hover:-translate-y-1 touch-manipulation active:scale-95 whitespace-nowrap flex items-center gap-2"
                  onClick={() => setViewState(ViewState.CREATE_EVENT)}
                >
                  {t('ui.startHosting')}
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <span className="text-xs text-white/50 font-medium">{t('ui.noUpfrontCosts')}</span>
              </div>
            </div>
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
                className={`w-10 h-10 shrink-0 rounded-full backdrop-blur-sm border flex items-center justify-center active:scale-[0.92] transition-all touch-manipulation ${isDemo
                  ? 'bg-gray-100/80 text-gray-400 border-gray-200/60 cursor-not-allowed'
                  : 'bg-white/80 text-[#15383c] border-gray-200/60 hover:bg-white hover:border-gray-300'
                  }`}
                aria-label="Conversation"
              >
                <MessageCircle size={18} />
              </button>
              <button
                onClick={handleRSVP}
                disabled={reserving}
                className="flex-1 h-11 font-semibold text-[15px] rounded-full bg-[#15383c] text-white shadow-lg shadow-[#15383c]/20 flex items-center justify-center touch-manipulation px-5 gap-2 hover:bg-[#1f4d52] active:scale-95 transition-all disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {reserving ? t('ui.cancelling') || 'Cancelling...' : t('ui.attending')}
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
                className={`flex-1 h-11 font-semibold text-[15px] rounded-full shadow-lg flex items-center justify-center touch-manipulation px-5 gap-2 ${isDemo
                  ? 'bg-gray-200/80 text-gray-500 cursor-not-allowed'
                  : 'bg-[#15383c] text-white shadow-[#15383c]/20 hover:bg-[#1f4d52]'
                  }`}
                aria-label="Open Chat"
              >
                <MessageCircle size={16} />
                {t('ui.manageEvent')}
              </button>
            </>
          )}

          {/* Before reservation: Price pill + Share + Chat + Attend button (only for non-hosts) */}
          {!hasRSVPed && user?.uid !== event.hostId && (
            <>
              {/* Price pill - Liquid glass style - Using consistent helper for both new and legacy price fields */}
              <div className="shrink-0 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-sm">
                <span className="text-sm font-bold text-[#15383c] uppercase tracking-wide">
                  {isEventFree(event) ? 'FREE' : formatEventPrice(event, false).toUpperCase()}
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
                className={`w-10 h-10 shrink-0 rounded-full backdrop-blur-sm border flex items-center justify-center active:scale-[0.92] transition-all touch-manipulation ${isDemo
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
                disabled={isDemo || isConfirmingReservation}
                className={`flex-1 h-11 font-semibold text-[15px] rounded-full shadow-lg active:scale-[0.97] transition-all whitespace-nowrap flex items-center justify-center touch-manipulation px-5 ${isDemo
                  ? 'bg-gray-300/90 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-[#15383c] text-white shadow-[#15383c]/25 hover:bg-[#1f4d52]'
                  }`}
              >
                {isDemo ? t('ui.locked') : isConfirmingReservation ? 'Confirming...' : t('ui.attend')}
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
                {t('ui.signInToJoin')}
              </h2>
              <p className="text-gray-600 text-sm">
                {t('ui.conversationsAvailable')}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setViewState(ViewState.AUTH);
                  // Update URL to prevent viewState from being reset - use signin mode
                  window.history.replaceState({ viewState: ViewState.AUTH }, '', '/auth?mode=signin');
                  window.scrollTo(0, 0);
                }}
                className="w-full px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors"
              >
                {t('ui.signInSignUp')}
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      <ImageViewerModal
        images={event.imageUrls && event.imageUrls.length > 0
          ? event.imageUrls
          : (event.coverImageUrl ? [event.coverImageUrl] : (event.imageUrl ? [event.imageUrl] : []))}
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
          hostRating={averageRating}
          hostReviewCount={reviewCount}
          isOpen={showHostReviewsModal}
          onClose={() => setShowHostReviewsModal(false)}
          onReviewerClick={(userId, userName) => {
            setShowHostReviewsModal(false);
            onHostClick(userName, userId);
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
