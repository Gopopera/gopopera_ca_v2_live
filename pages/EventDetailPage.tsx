import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Event, ViewState } from '../types';
import { Calendar, MapPin, User, Share2, MessageCircle, ChevronLeft, Heart, Info, Star, Sparkles, X, UserPlus, UserCheck, ChevronRight, CheckCircle2, Edit } from 'lucide-react';
import { followHost, unfollowHost, isFollowing } from '../firebase/follow';
import { useUserStore } from '../stores/userStore';
import { useLanguage } from '../contexts/LanguageContext';
import { EventCard } from '../components/events/EventCard';
import { MockMap } from '../components/map/MockMap';
import { FakeEventReservationModal } from '../components/events/FakeEventReservationModal';
import { ImageViewerModal } from '../components/events/ImageViewerModal';
import { HostReviewsModal } from '../components/events/HostReviewsModal';
import { ShareModal } from '../components/share/ShareModal';
import { formatDate } from '../utils/dateFormatter';
import { formatRating } from '../utils/formatRating';
import { getUserProfile, getReservationCountForEvent, listHostReviews } from '../firebase/db';

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
  
  // Store hooks - always called
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  const { t } = useLanguage();
  
  // Memoized values - always called (safe even if event is undefined)
  const isFakeEvent = useMemo(() => event?.isFakeEvent === true, [event?.isFakeEvent]);
  const isDemo = useMemo(() => event?.isDemo === true || isFakeEvent, [event?.isDemo, isFakeEvent]);
  const isPoperaOwned = useMemo(() => event?.isPoperaOwned === true, [event?.isPoperaOwned]);
  const isOfficialLaunch = useMemo(() => event?.isOfficialLaunch === true, [event?.isOfficialLaunch]);
  
  // Derived values - safe to compute after all hooks
  const recommendedEvents = useMemo(() => 
    allEvents.filter(e => e.id !== event?.id).slice(0, 5), 
    [allEvents, event?.id]
  );
  const hasRSVPed = useMemo(() => rsvps.includes(event?.id || ''), [rsvps, event?.id]);
  
  // State for host name (may need to be fetched if missing)
  const [displayHostName, setDisplayHostName] = useState<string>(event.hostName || '');
  
  // Native event listener as backup (capture phase)
  useEffect(() => {
    const handleNativeClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-profile-button]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        console.log('[PROFILE_BUTTON_NATIVE] Native click detected!', displayHostName);
        if (onHostClick && displayHostName) {
          onHostClick(displayHostName);
        }
      }
    };
    
    document.addEventListener('click', handleNativeClick, true); // Capture phase
    return () => document.removeEventListener('click', handleNativeClick, true);
  }, [onHostClick, displayHostName]);
  
  // State for host's overall rating (from all their events)
  const [hostOverallRating, setHostOverallRating] = useState<number | null>(null);
  const [hostOverallReviewCount, setHostOverallReviewCount] = useState<number>(0);
  
  // State for rating - use host's overall rating if available, otherwise fallback to event rating
  const [currentRating, setCurrentRating] = useState<{ rating: number; reviewCount: number }>({
    rating: event.rating || 0,
    reviewCount: event.reviewCount || 0
  });
  
  // Fetch host's overall rating from all their events
  useEffect(() => {
    const fetchHostOverallRating = async () => {
      if (!event.hostId) {
        setHostOverallRating(null);
        setHostOverallReviewCount(0);
        return;
      }
      
      try {
        // Only get accepted reviews (includePending=false) to ensure count matches displayed reviews
        const acceptedReviews = await listHostReviews(event.hostId, false);
        
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
  }, [event.hostId]);
  
  // Update rating when host overall rating or event changes
  useEffect(() => {
    if (hostOverallRating !== null) {
      setCurrentRating({
        rating: hostOverallRating,
        reviewCount: hostOverallReviewCount
      });
    } else {
      // Fallback to event rating if host rating not available
      setCurrentRating({
        rating: event.rating || 0,
        reviewCount: event.reviewCount || 0
      });
    }
  }, [hostOverallRating, hostOverallReviewCount, event.rating, event.reviewCount]);
  
  // Fetch host profile picture and name - always fetch from Firestore for accuracy (works when not logged in)
  // Also refresh periodically if current user is the host to catch profile picture updates
  useEffect(() => {
    const fetchHostProfile = async () => {
      if (!event.hostId) {
        setHostProfilePicture(null);
        setDisplayHostName('Unknown Host');
        return;
      }
      
      // ALWAYS fetch from Firestore to ensure we have the latest host information
      // This prevents stale/cached data from showing wrong names or pictures
      // Even if event.hostName exists, we fetch to ensure it's up-to-date
      try {
        const hostProfile = await getUserProfile(event.hostId);
        if (hostProfile) {
          // Priority: photoURL > imageUrl (both from Firestore - always latest)
          const profilePic = hostProfile.photoURL || hostProfile.imageUrl || null;
          setHostProfilePicture(profilePic);
          
          // Always use Firestore name as source of truth (most up-to-date)
          const firestoreName = hostProfile.name || hostProfile.displayName;
          if (firestoreName && firestoreName.trim() !== '' && firestoreName !== 'You') {
            setDisplayHostName(firestoreName);
          } else {
            // Fallback to event.hostName only if Firestore doesn't have a valid name
            const fallbackName = event.hostName && event.hostName !== 'You' && event.hostName !== 'Unknown Host' 
              ? event.hostName 
              : 'Unknown Host';
            setDisplayHostName(fallbackName);
          }
        } else {
          // If profile doesn't exist in Firestore, use event data as fallback
          // But clean up "You" and empty strings
          const fallbackName = event.hostName && event.hostName !== 'You' && event.hostName.trim() !== ''
            ? event.hostName 
            : 'Unknown Host';
          setHostProfilePicture(event.hostPhotoURL || null);
          setDisplayHostName(fallbackName);
        }
      } catch (error: any) {
        // Handle permission errors gracefully - don't spam console
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          console.warn('[EVENT_DETAIL] Permission denied for host profile, using fallback');
        } else {
          console.error('Error fetching host profile:', error);
        }
        setHostProfilePicture(null);
        setDisplayHostName(event.hostName || 'Unknown Host');
      }
    };
    
    fetchHostProfile();
    
    // If current user is the host, refresh profile picture every 5 seconds to catch updates
    // This ensures profile picture updates are reflected immediately
    let refreshInterval: NodeJS.Timeout | null = null;
    if (user?.uid === event.hostId) {
      refreshInterval = setInterval(() => {
        fetchHostProfile();
      }, 5000); // Refresh every 5 seconds
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [event.hostId, event.hostName, user?.uid, user?.photoURL, user?.profileImageUrl, userProfile?.photoURL, userProfile?.imageUrl]);
  
  // Fetch real reservation count from Firestore
  useEffect(() => {
    // CRITICAL: Always initialize variables at the top to maintain consistent hook structure
    let hasPermissionError = false;
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;
    
    // Always set initial count first
    if (!event.id || isDemo) {
      setReservationCount(event.attendeesCount || 0);
      // CRITICAL: Always return a cleanup function (even if no-op) to maintain hook order
      return () => {
        isMounted = false;
        // No-op cleanup - but structure must be consistent
      };
    }
    
    const safeFetchReservationCount = async () => {
      if (hasPermissionError || !isMounted) return;
      
      try {
        const count = await getReservationCountForEvent(event.id);
        if (isMounted) {
          setReservationCount(count);
        }
      } catch (error: any) {
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          hasPermissionError = true;
          // Stop polling on permission errors to prevent infinite loops
          console.warn('[EVENT_DETAIL] Permission denied for reservation count - stopping polling');
          if (isMounted) {
            setReservationCount(event.attendeesCount || 0);
          }
          // Clear interval if it exists
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
          return;
        }
        // Fallback to event.attendeesCount if available
        if (isMounted) {
          setReservationCount(event.attendeesCount || 0);
        }
      }
    };
    
    // Initial fetch
    safeFetchReservationCount();
    
    // Refresh count every 30 seconds (reduced frequency) - only if no permission errors
    interval = setInterval(() => {
      if (!hasPermissionError && isMounted) {
        safeFetchReservationCount();
      }
    }, 30000);
    
    // Always return cleanup function (React hook rule)
    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [event.id, event.attendeesCount, isDemo]);

  // Check if user is following the host
  useEffect(() => {
    // CRITICAL: Always call the effect, but conditionally execute logic inside
    // This ensures consistent hook order across renders
    if (user?.uid && event.hostId) {
      const checkFollowStatus = async () => {
        const following = await isFollowing(user.uid, event.hostId);
        setIsFollowingHost(following);
      };
      checkFollowStatus();
    } else {
      // Reset follow status if user or hostId is missing
      setIsFollowingHost(false);
    }
  }, [user?.uid, event.hostId]);

  const handleFollowToggle = async () => {
    if (!user?.uid || !event.hostId) {
      setShowAuthModal(true);
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowingHost) {
        await unfollowHost(user.uid, event.hostId);
        setIsFollowingHost(false);
      } else {
        await followHost(user.uid, event.hostId);
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
          // For paid events, navigate to Confirm & Pay page first
          setViewState(ViewState.CONFIRM_RESERVATION);
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

  return (
    <div className="min-h-screen bg-white pt-0">
      <FakeEventReservationModal
        isOpen={showFakeEventModal}
        onClose={() => setShowFakeEventModal(false)}
        onBrowseEvents={handleBrowseEvents}
      />
      <div className="fixed top-0 left-0 right-0 z-40 p-4 sm:p-4 flex items-center justify-between lg:hidden pointer-events-none safe-area-inset-top">
         <button onClick={() => setViewState(ViewState.FEED)} className="w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center text-popera-teal shadow-lg pointer-events-auto hover:scale-105 active:scale-[0.92] transition-transform touch-manipulation border border-white/50"><ChevronLeft size={22} className="sm:w-6 sm:h-6" /></button>
         <div className="flex gap-2.5 sm:gap-3 pointer-events-auto">
             <button onClick={handleShare} className="w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center text-popera-teal shadow-lg hover:scale-105 active:scale-[0.92] transition-transform touch-manipulation border border-white/50" aria-label="Share Event"><Share2 size={20} className="sm:w-5 sm:h-5" /></button>
             {onToggleFavorite && (
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   e.preventDefault();
                   if (!isLoggedIn) {
                     // If not logged in, show auth modal or redirect to login
                     setShowAuthModal(true);
                     return;
                   }
                   onToggleFavorite(e, event.id);
                 }} 
                 className={`w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-[0.92] transition-all touch-manipulation border border-white/50 ${
                   favorites.includes(event.id) ? 'text-popera-orange' : 'text-popera-teal'
                 }`}
                 aria-label={favorites.includes(event.id) ? "Remove from favorites" : "Add to favorites"}
               >
                 <Heart 
                   size={20} 
                   className={`sm:w-5 sm:h-5 transition-all ${
                     favorites.includes(event.id) ? 'fill-popera-orange text-popera-orange' : 'fill-none'
                   }`}
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
        <button onClick={() => setViewState(ViewState.FEED)} className="flex items-center text-gray-500 hover:text-popera-teal transition-colors font-medium"><ChevronLeft size={20} className="mr-1" /> Back to Events</button>
      </div>


      {/* Image Gallery - Scrollable if multiple images */}
      <div className="relative h-[40vh] sm:h-[45vh] md:h-[50vh] lg:h-[55vh] xl:h-[60vh] w-full overflow-hidden group">
        <div className="lg:max-w-7xl lg:mx-auto lg:px-6 lg:px-8 h-full relative">
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
          // Single image - prefer imageUrls[0] over imageUrl for backward compatibility
          <div
            className="w-full h-full cursor-pointer"
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
              className="w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-105" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('picsum.photos')) {
                  target.src = `https://picsum.photos/seed/${event.id}/800/600`;
                }
              }}
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#15383c] via-[#15383c]/40 to-transparent opacity-90 pointer-events-none" />
        
        {/* Image counter for multiple images - bottom right, reduced size by 3x */}
        {event.imageUrls && event.imageUrls.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 rounded backdrop-blur-sm z-10 pointer-events-none">
            {currentImageIndex + 1} / {event.imageUrls.length}
          </div>
        )}
         <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 lg:p-12 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
            <div className="text-white animate-fade-in-up">
               <span className="inline-block px-3 sm:px-3.5 py-1 sm:py-1.5 bg-popera-orange rounded-full text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider mb-2 sm:mb-3 md:mb-4 shadow-lg">{event.category}</span>
               <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-heading font-bold leading-tight mb-3 sm:mb-4 text-balance shadow-black drop-shadow-lg">{event.title}</h1>
               <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 md:gap-3 lg:gap-4 text-gray-200 text-xs sm:text-sm md:text-base font-medium">
                  <span className="flex items-center bg-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg backdrop-blur-md border border-white/10"><Calendar size={14} className="sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-popera-orange shrink-0" /> <span className="truncate">{formatDate(event.date)} • {event.time}</span></span>
                  <span className="flex items-center bg-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg backdrop-blur-md border border-white/10"><MapPin size={14} className="sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-popera-orange shrink-0" /> <span className="truncate">{event.location}</span></span>
                  {event.attendees !== undefined && (<span className="flex items-center bg-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg backdrop-blur-md border border-white/10"><User size={14} className="sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-popera-orange shrink-0" /> <span>{event.attendees} attending</span></span>)}
               </div>
            </div>
         </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 lg:py-12">
        {/* Mobile Layout: Clean and modern */}
        <div className="flex lg:hidden gap-2 mb-6 items-start">
          {/* Left: Host Info with Metrics */}
          <div className="flex-1 min-w-0">
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
              {/* Host Info with Follow Button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden ring-2 ring-white shadow-sm cursor-pointer shrink-0" onClick={() => onHostClick?.(displayHostName)}>
                    {hostProfilePicture ? (
                      <img src={hostProfilePicture} alt={displayHostName} className="w-full h-full object-cover" onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://picsum.photos/seed/${displayHostName}/100/100`;
                      }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#15383c] text-white font-bold text-base">
                        {displayHostName?.[0]?.toUpperCase() || 'H'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">{t('event.hostedBy')}</p>
                    <h3 className="text-sm font-bold text-popera-teal cursor-pointer hover:text-popera-orange transition-colors truncate" onClick={() => onHostClick?.(displayHostName)}>{displayHostName}</h3>
                  </div>
                </div>
                {/* Follow Button - Right side */}
                {isLoggedIn && (
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    aria-label={isFollowingHost ? `Unfollow ${displayHostName}` : `Follow ${displayHostName}`}
                    className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all shadow-md whitespace-nowrap touch-manipulation active:scale-95 flex items-center justify-center gap-1 shrink-0 ${
                      isFollowingHost
                        ? 'bg-[#15383c] text-white hover:bg-[#1f4d52] border border-[#15383c]'
                        : 'bg-white border border-gray-300 text-[#15383c] hover:border-[#e35e25] hover:text-[#e35e25] hover:bg-orange-50'
                    } disabled:opacity-50`}
                  >
                    {isFollowingHost ? (
                      <>
                        <UserCheck size={12} /> {t('event.following')}
                      </>
                    ) : (
                      <>
                        <UserPlus size={12} /> {t('event.follow')}
                      </>
                    )}
                  </button>
                )}
              </div>
              {/* Attending & Capacity Metrics */}
              <div className="flex gap-2 mt-2">
                <div className="flex-1 bg-white p-2 rounded-xl border border-gray-200 text-center">
                  <h4 className="text-base font-heading font-bold text-popera-teal">
                    {reservationCount !== null ? reservationCount : (event.attendeesCount || 0)}
                  </h4>
                  <p className="text-[8px] uppercase tracking-wide text-gray-500 font-bold mt-0.5">Attending</p>
                </div>
                <div className="flex-1 bg-white p-2 rounded-xl border border-gray-200 text-center">
                  <h4 className="text-base font-heading font-bold text-popera-teal">
                    {event.capacity || '∞'}
                  </h4>
                  <p className="text-[8px] uppercase tracking-wide text-gray-500 font-bold mt-0.5">{t('event.capacity')}</p>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Desktop Layout: Clean and modern */}
        <div className="hidden lg:block">
          <div className="p-5 sm:p-6 md:p-7 lg:p-8 bg-gray-50 rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-gray-200 transition-colors">
            {/* Host Info with Follow Button */}
            <div className="flex items-center justify-between gap-3 sm:gap-4 mb-3">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gray-200 overflow-hidden ring-2 sm:ring-4 ring-white shadow-sm cursor-pointer shrink-0" onClick={() => onHostClick?.(displayHostName)}>
                  {hostProfilePicture ? (
                    <img src={hostProfilePicture} alt={displayHostName} className="w-full h-full object-cover" onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://picsum.photos/seed/${displayHostName}/100/100`;
                    }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#15383c] text-white font-bold text-lg sm:text-xl md:text-2xl">
                      {displayHostName?.[0]?.toUpperCase() || 'H'}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">{t('event.hostedBy')}</p>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-popera-teal cursor-pointer hover:text-popera-orange transition-colors truncate" onClick={() => onHostClick?.(displayHostName)}>{displayHostName}</h3>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (event.hostId) {
                        setShowHostReviewsModal(true);
                      }
                    }} 
                    className="flex items-center space-x-1 mt-1.5 bg-white hover:bg-orange-50 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-colors border border-gray-200 hover:border-orange-100 group/rating shrink-0 w-fit touch-manipulation active:scale-95"
                  >
                    <Star size={11} className="sm:w-3 sm:h-3 text-gray-300 group-hover/rating:text-popera-orange group-hover/rating:fill-popera-orange transition-colors" fill="currentColor" />
                    <span className="text-[10px] sm:text-xs font-bold text-popera-teal">{formatRating(currentRating.rating)}</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-400 group-hover/rating:text-orange-400">({currentRating.reviewCount})</span>
                  </button>
                </div>
              </div>
              {/* Follow Button - Right side */}
              {isLoggedIn && (
                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  aria-label={isFollowingHost ? `Unfollow ${displayHostName}` : `Follow ${displayHostName}`}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all shadow-md whitespace-nowrap touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 shrink-0 ${
                    isFollowingHost
                      ? 'bg-[#15383c] text-white hover:bg-[#1f4d52] border-2 border-[#15383c]'
                      : 'bg-white border-2 border-gray-300 text-[#15383c] hover:border-[#e35e25] hover:text-[#e35e25] hover:bg-orange-50'
                  } disabled:opacity-50`}
                >
                  {isFollowingHost ? (
                    <>
                      <UserCheck size={14} className="sm:w-4 sm:h-4" /> {t('event.following')}
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} className="sm:w-4 sm:h-4" /> {t('event.follow')}
                    </>
                  )}
                </button>
              )}
            </div>
            {/* Attending & Capacity Metrics */}
            <div className="flex gap-2 sm:gap-3">
              <div className="flex-1 bg-white p-2 sm:p-3 rounded-xl border border-gray-200 text-center">
                <h4 className="text-base sm:text-lg font-heading font-bold text-popera-teal">
                  {reservationCount !== null ? reservationCount : (event.attendeesCount || 0)}
                </h4>
                <p className="text-[8px] sm:text-[10px] uppercase tracking-wide text-gray-500 font-bold mt-0.5">Attending</p>
              </div>
              <div className="flex-1 bg-white p-2 sm:p-3 rounded-xl border border-gray-200 text-center">
                <h4 className="text-base sm:text-lg font-heading font-bold text-popera-teal">
                  {event.capacity || '∞'}
                </h4>
                <p className="text-[8px] sm:text-[10px] uppercase tracking-wide text-gray-500 font-bold mt-0.5">{t('event.capacity')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 md:pb-10 lg:pb-12">
        <div className="space-y-6 sm:space-y-8 md:space-y-10">
          {/* Reservation Success Message */}
          {reservationSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
              <CheckCircle2 size={20} className="text-green-600 shrink-0" />
              <p className="text-green-800 font-medium text-sm">{t('event.reservationSuccess')}</p>
            </div>
          )}

          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-heading font-bold text-popera-teal mb-3 sm:mb-4 md:mb-6 flex items-center gap-2 sm:gap-3">{t('event.aboutEvent')}</h2>
            <div className="prose prose-lg text-gray-600 leading-relaxed font-light text-sm sm:text-base md:text-base"><p>{event.description || "Join us for an incredible experience..."}</p></div>
          </div>

          {event.whatToExpect && (
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-heading font-bold text-popera-teal mb-3 sm:mb-4 md:mb-6 flex items-center gap-2 sm:gap-3">
                <Sparkles size={18} className="sm:w-5 sm:h-5 text-popera-orange" /> {t('event.whatToExpect')}
              </h2>
              <div className="bg-popera-softTeal p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-popera-teal/5 text-gray-600 font-light leading-relaxed text-sm sm:text-base">
                <p className="mb-3 sm:mb-4 whitespace-pre-line">{event.whatToExpect}</p>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-6 sm:pt-8 md:pt-10">
            <h2 className="text-lg sm:text-xl md:text-2xl font-heading font-bold text-popera-teal mb-4 sm:mb-6">{t('event.location')}</h2>
            <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] overflow-hidden h-40 sm:h-48 md:h-64 relative group cursor-pointer shadow-inner border border-gray-200">
              <MockMap 
                lat={event.lat}
                lng={event.lng}
                address={event.address}
                city={event.city}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="mt-3 sm:mt-4 md:mt-6 text-popera-teal font-medium text-sm sm:text-base md:text-lg flex items-center">
              <MapPin size={16} className="sm:w-[18px] sm:h-[18px] mr-1.5 sm:mr-2 md:mr-3 text-popera-orange shrink-0" /> 
              <span className="truncate">{event.location}</span>
            </p>

            {/* Cancellation / Expulsion Policy Section - Moved here after location */}
            <div className="mt-6 sm:mt-8 md:mt-10 pt-6 sm:pt-8 md:pt-10 border-t border-gray-100">
              <h3 className="text-lg sm:text-xl md:text-2xl font-heading font-bold text-[#15383c] mb-4 sm:mb-6">
                Cancellation / Expulsion Policy
              </h3>
              <div className="space-y-4 text-gray-700 text-sm sm:text-base leading-relaxed">
                <p>
                  <strong className="text-[#15383c]">Cancellation Policy:</strong> Attendees may cancel their reservation up to 48 hours before the event for a full refund. Cancellations made 24-48 hours before the event are eligible for a partial refund (typically 50%). No refunds are provided for cancellations made less than 24 hours before the event or for no-shows.
                </p>
                <p>
                  <strong className="text-[#15383c]">Expulsion Policy:</strong> Hosts reserve the right to expel attendees who violate event rules, engage in abusive behavior, spam, impersonate others, ignore moderator warnings, or break event chat rules. Expelled attendees will not receive refunds and may be banned from future events.
                </p>
                <p className="text-gray-500 text-xs sm:text-sm italic">
                  For complete policy details, please review our <button onClick={() => setViewState(ViewState.CANCELLATION)} className="text-[#e35e25] hover:underline font-medium">Cancellation Policy</button> page.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative hidden lg:block">
           <div className="sticky top-32 bg-white rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.04)] border border-gray-100 p-6 lg:p-8">
              <div className="flex justify-between items-center mb-6 lg:mb-8"><div><span className="text-3xl lg:text-4xl font-heading font-bold text-popera-teal">{event.price}</span><p className="text-xs lg:text-sm text-gray-500 font-medium mt-1">per person</p></div></div>
              <div className="space-y-3">
                {/* Edit Event Button - Only for host */}
                {isLoggedIn && user?.uid === event.hostId && (
                  <button
                    onClick={() => setViewState(ViewState.EDIT_EVENT)}
                    className="w-full py-3.5 lg:py-4 bg-gray-100 text-[#15383c] rounded-full text-base lg:text-lg font-bold hover:bg-gray-200 transition-colors shadow-md whitespace-nowrap touch-manipulation active:scale-95 flex items-center justify-center gap-2 border border-gray-200"
                  >
                    <Edit size={18} /> Edit Event
                  </button>
                )}
                <button 
                  onClick={handleRSVP}
                  disabled={isDemo || reserving}
                  aria-label={hasRSVPed ? "Cancel reservation" : "Reserve spot"}
                  className={`w-full py-3.5 lg:py-4 font-bold text-base lg:text-lg rounded-full shadow-xl transition-all hover:-translate-y-0.5 touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDemo 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : hasRSVPed
                      ? 'bg-[#15383c] text-white hover:bg-[#1f4d52]'
                      : 'bg-[#e35e25] text-white hover:bg-[#cf4d1d] shadow-orange-900/20 hover:shadow-orange-900/30'
                  }`}
                >
                  {reserving ? 'Reserving...' : isDemo ? 'Demo Event (Locked)' : hasRSVPed ? 'Reserved ✓' : 'Reserve Spot'}
                </button>
                <button
                  onClick={handleShare}
                  aria-label="Share event"
                  className="w-full py-3.5 lg:py-4 bg-[#15383c] text-white rounded-full text-base lg:text-lg font-bold hover:bg-[#1f4d52] transition-colors shadow-md whitespace-nowrap touch-manipulation active:scale-95 flex items-center justify-center gap-2 !opacity-100 !visible"
                  style={{ backgroundColor: '#15383c', opacity: '1 !important', visibility: 'visible !important' }}
                >
                  <Share2 size={18} /> Share Event
                </button>
                <button 
                  onClick={handleConversationClick}
                  disabled={isDemo}
                  className={`w-full py-3.5 lg:py-4 font-bold text-base lg:text-lg rounded-full border flex items-center justify-center gap-2 touch-manipulation active:scale-95 transition-colors ${
                    isDemo
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-popera-teal/5 text-popera-teal border-popera-teal/10 hover:bg-popera-teal/10'
                  }`}
                >
                  <MessageCircle size={20} className="lg:w-[22px] lg:h-[22px]" /> 
                  {isDemo ? 'Chat Locked' : 'Join Group Chat'}
                </button>
              </div>
              <div className="mt-6 lg:mt-8 pt-4 lg:pt-6 border-t border-gray-100 text-center"><p className="text-[10px] lg:text-xs text-gray-400 leading-relaxed">Secure payment powered by Stripe.</p></div>
           </div>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12 border-t border-gray-100">
         <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-popera-teal mb-6 sm:mb-8">Other events you might be interested in</h2>
         {/* Desktop: Horizontal scroll with better spacing */}
         <div className="hidden md:block">
           <div className="relative group">
             {/* Left Arrow */}
             <button
               onClick={() => {
                 const container = document.getElementById('other-events-scroll');
                 if (container) {
                   container.scrollBy({ left: -400, behavior: 'smooth' });
                 }
               }}
               className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 items-center justify-center text-[#15383c] hover:bg-[#eef4f5] hover:border-[#15383c] transition-all opacity-0 group-hover:opacity-100 flex"
               aria-label="Scroll left"
             >
               <ChevronLeft size={20} />
             </button>
             
             {/* Scrollable Container */}
             <div 
               id="other-events-scroll"
               className="flex overflow-x-auto gap-6 lg:gap-8 pb-2 snap-x snap-mandatory scroll-smooth hide-scrollbar scroll-smooth w-full touch-pan-x overscroll-x-contain"
             >
               {recommendedEvents.map((recEvent, index) => (
                 <div key={recEvent.id} className="snap-start shrink-0 w-[calc(25%-1.5rem)] lg:w-[calc(25%-2rem)] flex-shrink-0">
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
               className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 items-center justify-center text-[#15383c] hover:bg-[#eef4f5] hover:border-[#15383c] transition-all opacity-0 group-hover:opacity-100 flex"
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
               <div key={recEvent.id} className="snap-start shrink-0 w-[85vw] max-w-[360px]">
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
                 />
               </div>
             ))}
           </div>
         </div>
      </section>

      {/* Tags Section - Only show if host created tags */}
      {event.tags && event.tags.length > 0 && (
        <section className="py-8 sm:py-10 md:py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h3 className="text-lg sm:text-xl md:text-2xl font-heading font-bold text-[#15383c] mb-4 sm:mb-6">Tags</h3>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {event.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-[#eef4f5] text-[#15383c] rounded-full text-sm sm:text-base font-medium border border-[#15383c]/10"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}


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

      <div className="fixed bottom-0 left-0 right-0 bg-white/98 backdrop-blur-lg border-t border-gray-200 px-4 sm:px-6 py-4 sm:py-4 lg:hidden z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-inset-bottom">
        <div className="flex items-center justify-between gap-3 sm:gap-4 max-w-xl mx-auto">
           {/* Show price only if not reserved */}
           {!hasRSVPed && (
             <div className="flex flex-col shrink-0 min-w-0">
               <span className="text-xl sm:text-xl md:text-2xl font-heading font-bold text-[#15383c] truncate">{event.price}</span>
               <span className="text-xs sm:text-xs text-gray-600 sm:text-gray-500 font-bold uppercase tracking-wide">per person</span>
             </div>
           )}
           {/* After reservation: Show Conversation + Reserved */}
           {hasRSVPed && (
             <div className="flex items-center gap-3 sm:gap-3 flex-1 min-w-0">
               <button 
                 onClick={handleConversationClick}
                 disabled={isDemo}
                 className={`w-12 h-12 sm:w-12 sm:h-12 shrink-0 rounded-full border-2 flex items-center justify-center active:scale-[0.92] transition-transform touch-manipulation shadow-sm ${
                   isDemo
                     ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                     : 'bg-[#15383c] text-white border-[#15383c] hover:bg-[#1f4d52]'
                 }`}
                 aria-label="Conversation"
               >
                 <MessageCircle size={20} className="sm:w-5 sm:h-5" />
               </button>
               <button 
                 disabled
                 className="flex-1 min-w-0 h-12 sm:h-12 font-bold text-base sm:text-base rounded-full bg-[#15383c] text-white shadow-lg flex items-center justify-center touch-manipulation px-5 gap-2"
               >
                 <CheckCircle2 size={18} className="sm:w-5 sm:h-5" />
                 Reserved
               </button>
             </div>
           )}
           {/* Before reservation: Show Share + Conversation + Reserve */}
           {!hasRSVPed && (
             <div className="flex items-center gap-3 sm:gap-3 flex-1 justify-end min-w-0">
               <button 
                 onClick={handleShare}
                 className="w-12 h-12 sm:w-12 sm:h-12 shrink-0 rounded-full border-2 border-[#15383c] bg-[#15383c] text-white flex items-center justify-center active:scale-[0.92] transition-transform touch-manipulation shadow-sm hover:bg-[#1f4d52] hover:border-[#1f4d52] !opacity-100 !visible"
                 aria-label="Share"
               >
                 <Share2 size={20} className="sm:w-5 sm:h-5" />
               </button>
               <button 
                 onClick={handleConversationClick}
                 disabled={isDemo}
                 className={`w-12 h-12 sm:w-12 sm:h-12 shrink-0 rounded-full border-2 flex items-center justify-center active:scale-[0.92] transition-transform touch-manipulation shadow-sm ${
                   isDemo
                     ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                     : 'bg-[#15383c]/5 text-[#15383c] border-[#15383c]/20 hover:bg-[#15383c]/10'
                 }`}
                 aria-label="Chat"
               >
                 <MessageCircle size={20} className="sm:w-5 sm:h-5" />
               </button>
               <button 
                 onClick={handleRSVP}
                 disabled={isDemo}
                 className={`flex-1 min-w-0 max-w-[200px] sm:max-w-[200px] h-12 sm:h-12 font-bold text-base sm:text-base rounded-full shadow-lg active:scale-[0.97] transition-transform whitespace-nowrap flex items-center justify-center touch-manipulation px-5 ${
                   isDemo
                     ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                     : 'bg-[#e35e25] text-white shadow-orange-900/20 hover:bg-[#cf4d1d]'
                 }`}
               >
                 {isDemo ? 'Locked' : 'Reserve'}
               </button>
             </div>
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
          hostName={displayHostName || event.hostName || 'Unknown Host'}
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