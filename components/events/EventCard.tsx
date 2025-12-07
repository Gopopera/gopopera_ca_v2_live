import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, MessageCircle, Star, Heart, Edit, Award, Users } from 'lucide-react';
import { Event } from '@/types';
import { formatDate } from '@/utils/dateFormatter';
import { formatRating } from '@/utils/formatRating';
import { useUserStore } from '@/stores/userStore';
import { listHostReviews, subscribeToReservationCount } from '../../firebase/db';
// REFACTORED: No longer using getUserProfile - using real-time subscriptions instead
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  getCircleContinuityText, 
  getSessionFrequencyText, 
  getSessionModeText,
  getAvailableSpots 
} from '../../utils/eventHelpers';
import { getMainCategoryLabelFromEvent } from '../../utils/categoryMapper';

// REFACTORED: Real-time attendees count component
const EventAttendeesCount: React.FC<{ eventId: string; capacity?: number }> = ({ eventId, capacity }) => {
  const [attendeesCount, setAttendeesCount] = React.useState<number>(0);
  
  React.useEffect(() => {
    if (!eventId) return;
    
    console.log('[EVENT_CARD] 📡 Subscribing to reservation count:', { eventId });
    
    const unsubscribe = subscribeToReservationCount(eventId, (count) => {
      setAttendeesCount(count);
      console.log('[EVENT_CARD] ✅ Reservation count updated:', { eventId, count });
    });
    
    return () => {
      console.log('[EVENT_CARD] 🧹 Unsubscribing from reservation count:', { eventId });
      unsubscribe();
    };
  }, [eventId]);
  
  const capacityNum = typeof capacity === 'number' ? capacity : null;
  const availableSpots = capacityNum ? capacityNum - attendeesCount : null;
  
  return (
    <div className="flex items-center text-gray-600 text-sm">
      <Users size={16} className="sm:w-4 sm:h-4 mr-2 text-popera-orange shrink-0" />
      <span className="truncate leading-relaxed">
        {!capacityNum
          ? `${attendeesCount} joined`
          : `${attendeesCount}/${capacityNum} joined — ${availableSpots ?? 0} spot${availableSpots !== 1 ? 's' : ''} left`}
      </span>
    </div>
  );
};

interface EventCardProps {
  event: Event;
  onClick: (event: Event) => void;
  onChatClick: (e: React.MouseEvent, event: Event) => void;
  onReviewsClick: (e: React.MouseEvent, event: Event) => void;
  isLoggedIn?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent, eventId: string) => void;
  onEditClick?: (e: React.MouseEvent, event: Event) => void; // Edit button handler
  showEditButton?: boolean; // Whether to show edit button (only for host's own events)
}

export const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  onClick, 
  onChatClick, 
  onReviewsClick,
  isLoggedIn,
  isFavorite,
  onToggleFavorite,
  onEditClick,
  showEditButton = false
}) => {
  const { t } = useLanguage();
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  
  // Get host profile picture - sync with user's profile if it's their event, or fetch from Firestore
  const [hostProfilePicture, setHostProfilePicture] = React.useState<string | null>(null);
  
  // State for host name (may need to be fetched if missing)
  const [displayHostName, setDisplayHostName] = React.useState<string>('');
  
  // State for host's overall rating (from all their events)
  const [hostOverallRating, setHostOverallRating] = React.useState<number | null>(null);
  const [hostOverallReviewCount, setHostOverallReviewCount] = React.useState<number>(0);
  
  // REFACTORED: Real-time subscription to /users/{hostId} - single source of truth
  // No polling, no fallbacks to stale event data - always fresh from Firestore
  React.useEffect(() => {
    if (!event.hostId) {
      setHostProfilePicture(null);
      setDisplayHostName('Unknown Host');
      return;
    }
    
    if (import.meta.env.DEV) {
      console.log('[EVENT_CARD] 📡 Subscribing to host profile:', { hostId: event.hostId });
    }
    
    let unsubscribe: (() => void) | null = null;
    
    // Real-time subscription to host user document
    import('../../firebase/userSubscriptions').then(({ subscribeToUserProfile }) => {
      unsubscribe = subscribeToUserProfile(event.hostId, (hostData) => {
        if (hostData) {
          setHostProfilePicture(hostData.photoURL || null);
          setDisplayHostName(hostData.displayName || 'Unknown Host');
          
          if (import.meta.env.DEV) {
            console.log('[EVENT_CARD] ✅ Host profile updated:', {
              hostId: event.hostId,
              displayName: hostData.displayName,
              hasPhoto: !!hostData.photoURL,
            });
          }
        } else {
          setHostProfilePicture(null);
          setDisplayHostName('Unknown Host');
        }
      });
    }).catch((error) => {
      console.error('[EVENT_CARD] ❌ Error loading user subscriptions:', error);
      setHostProfilePicture(null);
      setDisplayHostName('Unknown Host');
    });
    
    return () => {
      if (unsubscribe) {
        if (import.meta.env.DEV) {
          console.log('[EVENT_CARD] 🧹 Unsubscribing from host profile:', { hostId: event.hostId });
        }
        unsubscribe();
      }
    };
  }, [event.hostId]);
  
  // Fetch host's overall rating from all their events
  React.useEffect(() => {
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
        console.warn('[EVENT_CARD] Failed to fetch host overall rating:', error);
        // Fallback to event rating if host rating fetch fails
        setHostOverallRating(null);
        setHostOverallReviewCount(0);
      }
    };
    
    fetchHostOverallRating();
  }, [event.hostId]);
  
  const handleFavoriteClick = (e: React.MouseEvent | React.TouchEvent) => {
    // CRITICAL: Prevent any navigation or card click
    e.stopPropagation();
    e.preventDefault();
    if ('nativeEvent' in e) {
      e.nativeEvent.stopImmediatePropagation();
    }
    
    if (onToggleFavorite) {
      // Convert TouchEvent to MouseEvent for compatibility
      const mouseEvent = e as React.MouseEvent;
      // Always call handler - it will handle login redirect if needed
      onToggleFavorite(mouseEvent, event.id);
    }
  };
  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const isScrollingRef = React.useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    isScrollingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // If user is scrolling (either direction), mark as scrolling
    if (deltaX > 5 || deltaY > 5) {
      isScrollingRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const deltaTime = Date.now() - touchStartRef.current.time;
    
    // Only trigger click if it was a tap (not a scroll) and within 300ms
    if (!isScrollingRef.current && deltaX < 10 && deltaY < 10 && deltaTime < 300) {
      // Small delay to ensure scroll events have processed
      setTimeout(() => {
        if (!isScrollingRef.current) {
          onClick(event);
        }
      }, 50);
    }
    
    touchStartRef.current = null;
    // Reset after a short delay
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  };

  return (
    <div 
      onClick={() => onClick(event)}
      role="button"
      tabIndex={0}
      aria-label={`View event: ${event.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(event);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'manipulation' }}
      className={`group relative bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col w-full max-w-[420px] min-h-[400px] sm:min-h-[450px] md:min-h-[480px] focus:outline-none focus:ring-2 focus:ring-[#15383c] focus:ring-offset-2 border border-gray-100 hover:border-[#e35e25]/30`}
    >
      {/* Image Container - Fixed aspect ratio with enhanced design */}
      <div className={`relative w-full aspect-[4/3] overflow-hidden rounded-t-xl md:rounded-t-2xl bg-gradient-to-br from-[#15383c] to-[#1f4d52]`}>
        <img 
          src={event.imageUrls && event.imageUrls.length > 0 ? event.imageUrls[0] : (event.imageUrl || `https://picsum.photos/seed/${event.id || 'event'}/800/600`)} 
          alt={event.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          style={{ userSelect: 'none', WebkitUserSelect: 'none', pointerEvents: 'auto' }}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          draggable={false}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('picsum.photos')) {
              target.src = `https://picsum.photos/seed/${event.id || 'event'}/800/600`;
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent opacity-70 group-hover:opacity-80 transition-opacity" />
        
        {/* Main Category Badge - Enhanced design */}
        <div className="absolute top-4 left-4 inline-flex items-center justify-center py-2 sm:py-2.5 px-4 sm:px-5 rounded-full bg-white/95 backdrop-blur-md text-[#e35e25] text-[10px] sm:text-xs font-bold tracking-wider uppercase z-10 shadow-xl border border-white/50">
          {getMainCategoryLabelFromEvent(event)}
        </div>

        {/* Price Badge - Enhanced design */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold text-[#15383c] shadow-xl border border-white/50 z-10">
          {event.price}
        </div>

        {/* Edit Button - Bottom Right (only for host's own events) */}
        {showEditButton && onEditClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditClick(e, event);
            }}
            className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-[#15383c] hover:bg-white transition-colors flex items-center gap-1.5 shadow-sm z-30"
            aria-label="Edit Event"
          >
            <Edit size={14} />
            {t('event.editEvent')}
          </button>
        )}

        {/* ACTION BUTTONS - Enhanced with better visual design */}
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex items-center gap-2 sm:gap-2.5 z-30 pointer-events-auto">
           {/* FEATURE: Favorite Heart - Enhanced with brand colors */}
           {onToggleFavorite && (
             <button
               onClick={handleFavoriteClick}
               onTouchEnd={handleFavoriteClick}
               onMouseDown={(e) => e.stopPropagation()}
               onTouchStart={(e) => {
                 e.stopPropagation();
                 e.preventDefault();
               }}
               className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 touch-manipulation border-2 shrink-0 pointer-events-auto z-30 backdrop-blur-md ${
                 isFavorite 
                   ? 'bg-[#e35e25] border-[#e35e25] shadow-orange-900/20' 
                   : 'bg-[#15383c]/80 border-[#15383c]/40 hover:bg-[#15383c] hover:border-[#15383c]'
               }`}
               aria-label="Toggle Favorite"
               type="button"
               style={{ pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent' }}
             >
               <Heart 
                 size={22} 
                 className={`sm:w-6 sm:h-6 transition-all ${
                   isFavorite 
                     ? 'fill-white text-white scale-110' 
                     : 'fill-[#15383c] text-white hover:fill-white'
                 }`}
                 strokeWidth={2.5}
               />
             </button>
           )}

           {/* FEATURE: Conversation Icon - Enhanced with brand colors */}
           <button
             onClick={(e) => {
               e.stopPropagation();
               e.preventDefault();
               onChatClick(e, event);
             }}
             onTouchEnd={(e) => {
               e.stopPropagation();
               e.preventDefault();
               onChatClick(e as any, event);
             }}
             onTouchStart={(e) => {
               e.stopPropagation();
             }}
             className="w-11 h-11 sm:w-12 sm:h-12 bg-[#15383c]/80 border-2 border-[#15383c]/40 rounded-full flex items-center justify-center text-white hover:bg-[#e35e25] hover:border-[#e35e25] transition-all shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 touch-manipulation shrink-0 pointer-events-auto z-30 backdrop-blur-md"
             aria-label="Join Event Chat"
             type="button"
             style={{ pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent' }}
           >
             <MessageCircle size={22} className="sm:w-6 sm:h-6" strokeWidth={2.5} />
           </button>
        </div>
      </div>

      {/* Content - Enhanced spacing and design */}
      <div className="p-5 lg:p-6 flex flex-col flex-grow min-h-0">
        {/* Session Metadata Block - Enhanced design */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {event.sessionFrequency && getSessionFrequencyText(event.sessionFrequency) && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#e35e25]/10 text-[#e35e25] border border-[#e35e25]/20 text-xs font-bold">
                {getSessionFrequencyText(event.sessionFrequency)}
              </span>
            )}
            {event.sessionMode && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#e35e25]/10 text-[#e35e25] border border-[#e35e25]/20 text-xs font-bold">
                {getSessionModeText(event.sessionMode)}
              </span>
            )}
          </div>
        </div>

        {/* Title & Host Section - Enhanced */}
        <div className="mb-4">
          <h3 className="text-lg lg:text-xl font-heading font-bold text-[#15383c] mb-3 group-hover:text-[#e35e25] transition-colors line-clamp-2 leading-tight">
            {event.title}
          </h3>
          
          {/* Host Info with Badge - Enhanced */}
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2.5 overflow-hidden min-w-0 flex-1">
              <span className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-[#e35e25] to-[#15383c] overflow-hidden ring-2 ring-white shadow-md aspect-square flex-shrink-0">
                {hostProfilePicture ? (
                  <img 
                    src={hostProfilePicture} 
                    alt={displayHostName} 
                    className="w-full h-full object-cover aspect-square"
                    style={{ objectFit: 'cover', aspectRatio: '1 / 1' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://picsum.photos/seed/${displayHostName}/50/50`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#15383c] text-white font-bold text-sm aspect-square">
                    {displayHostName?.[0]?.toUpperCase() || 'H'}
                  </div>
                )}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-sm font-semibold text-[#15383c] truncate">
                  {displayHostName || 'Unknown Host'}
                </p>
                {/* Grounded Host Badge - Enhanced */}
                {hostOverallRating !== null && hostOverallRating >= 4.0 && hostOverallReviewCount >= 3 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e35e25]/10 text-[#e35e25] border border-[#e35e25]/30 text-[10px] font-bold shrink-0">
                    <Award size={11} />
                    Grounded
                  </span>
                )}
              </div>
            </div>

            {/* Ratings Button - Enhanced */}
            <button 
              onClick={(e) => { e.stopPropagation(); onReviewsClick(e, event); }}
              className="flex items-center space-x-1.5 bg-[#e35e25]/10 hover:bg-[#e35e25]/20 px-3 py-2 rounded-lg transition-all border border-[#e35e25]/20 hover:border-[#e35e25]/40 group/rating shrink-0 touch-manipulation active:scale-95 min-h-[36px]"
            >
              <Star size={16} className="text-[#e35e25] fill-[#e35e25] group-hover/rating:scale-110 transition-transform" />
              <span className="text-sm font-bold text-[#15383c]">
                {hostOverallRating !== null ? formatRating(hostOverallRating) : formatRating(event.rating || 0)}
              </span>
              <span className="text-[11px] text-gray-600 group-hover/rating:text-[#e35e25]">
                ({hostOverallReviewCount > 0 ? hostOverallReviewCount : (event.reviewCount || 0)})
              </span>
            </button>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Circle Continuity Indicator - Starting Soon or Ongoing */}
        {(() => {
          const continuity = getCircleContinuityText(event);
          if (!continuity) return null;
          
          if (continuity.type === 'startingSoon') {
            return (
              <div className="mb-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-sm text-[#e35e25] text-xs font-medium uppercase shadow-lg">
                  {continuity.text}
                </span>
              </div>
            );
          } else if (continuity.type === 'ongoing') {
            return (
              <div className="mb-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-100/15 text-[#15383c] border border-green-200/30 text-xs font-medium">
                  {continuity.text}
                </span>
              </div>
            );
          }
          return null;
        })()}

        {/* Engagement Indicators - Improved hierarchy: Capacity → Date + Time → Location */}
        <div className="mt-auto space-y-2">
          {/* Member Count & Spots Available - Human-friendly format */}
          <EventAttendeesCount eventId={event.id} capacity={event.capacity} />
          
          {/* Date & Time */}
          <div className="flex items-center text-gray-600 text-sm">
            <Calendar size={16} className="sm:w-4 sm:h-4 mr-2 text-popera-orange shrink-0" />
            <span className="truncate leading-relaxed">{formatDate(event.date)} • {event.time}</span>
          </div>
          
          {/* Location - City, Country/Province format */}
          <div className="flex items-center text-gray-600 text-sm min-w-0">
            <MapPin size={16} className="sm:w-4 sm:h-4 mr-2 text-popera-orange shrink-0" />
            <div className="flex items-center min-w-0 flex-1 gap-1.5">
              <span className="font-bold text-popera-teal shrink-0 whitespace-nowrap">{event.city}</span>
              {event.country && (
                <>
                  <span className="text-gray-600 shrink-0">,</span>
                  <span className="text-gray-600 shrink-0">{event.country}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};