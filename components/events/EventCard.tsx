import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, MessageCircle, Star, Heart, Edit, Award, Users } from 'lucide-react';
import { Event } from '@/types';
import { formatDate } from '@/utils/dateFormatter';
import { formatRating } from '@/utils/formatRating';
import { useUserStore } from '@/stores/userStore';
import { getUserProfile, listHostReviews } from '../../firebase/db';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  getCircleContinuityText, 
  getSessionFrequencyText, 
  getSessionModeText,
  getAvailableSpots 
} from '../../utils/eventHelpers';
import { getMainCategoryLabel } from '../../utils/categoryMapper';

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
  const [displayHostName, setDisplayHostName] = React.useState<string>(event.hostName || '');
  
  // State for host's overall rating (from all their events)
  const [hostOverallRating, setHostOverallRating] = React.useState<number | null>(null);
  const [hostOverallReviewCount, setHostOverallReviewCount] = React.useState<number>(0);
  
  React.useEffect(() => {
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
      } catch (error) {
        // On error, use event data as fallback (but clean up invalid values)
        console.warn('[EVENT_CARD] Failed to fetch host profile:', error);
        const fallbackName = event.hostName && event.hostName !== 'You' && event.hostName.trim() !== ''
          ? event.hostName 
          : 'Unknown Host';
        setHostProfilePicture(event.hostPhotoURL || null);
        setDisplayHostName(fallbackName);
      }
    };
    
    fetchHostProfile();
    
    // If current user is the host, refresh profile picture every 5 seconds to catch updates
    // This ensures profile picture updates are reflected immediately on event cards
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
  }, [event.hostId, event.hostName, event.hostPhotoURL, user?.uid, user?.photoURL, user?.profileImageUrl, userProfile?.photoURL, userProfile?.imageUrl]);
  
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
      className={`group relative bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer h-full flex flex-col w-full max-w-[420px] min-h-[400px] sm:min-h-[450px] md:min-h-[480px] focus:outline-none focus:ring-2 focus:ring-[#15383c] focus:ring-offset-2`}
    >
      {/* Image Container - Fixed aspect ratio */}
      <div className={`relative w-full aspect-[4/3] overflow-hidden rounded-t-xl md:rounded-t-2xl bg-gradient-to-br from-popera-teal to-[#1f4d52]`}>
        <img 
          src={event.imageUrls && event.imageUrls.length > 0 ? event.imageUrls[0] : (event.imageUrl || `https://picsum.photos/seed/${event.id || 'event'}/800/600`)} 
          alt={event.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ userSelect: 'none', WebkitUserSelect: 'none', pointerEvents: 'auto' }}
          loading="lazy"
          decoding="async"
          fetchpriority="low"
          draggable={false}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('picsum.photos')) {
              target.src = `https://picsum.photos/seed/${event.id || 'event'}/800/600`;
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
        
        {/* Main Category Badge - Top Left matching Hero badge style (orange pill) */}
        {/* Use mainCategory if available, otherwise fallback to category for backward compatibility */}
        <div className="absolute top-4 left-4 inline-block py-1 sm:py-1.5 px-3.5 sm:px-4 rounded-full bg-[#e35e25]/90 border-2 border-[#e35e25] text-white text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase backdrop-blur-sm z-10 shadow-lg">
          {(event as any).mainCategory ? getMainCategoryLabel((event as any).mainCategory) : (event.category || 'Circle')}
        </div>

        {/* Vibes Tags - Bottom-left overlay on hero image, above title area (off-white background, dark-green text) */}
        {event.vibes && event.vibes.length > 0 && (
          <div className="absolute bottom-20 left-4 right-4 z-20 flex flex-wrap gap-1.5">
            {event.vibes.slice(0, 3).map((vibe, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#f2f2f2]/90 backdrop-blur-sm text-[#15383c] text-[11px] font-medium"
              >
                {vibe}
              </span>
            ))}
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-popera-teal shadow-sm z-10">
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

        {/* ACTION BUTTONS - Only Favorite and Chat in feed (no share) */}
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex items-center gap-2 sm:gap-2 z-30 pointer-events-auto">
           {/* FEATURE: Favorite Heart (Always visible, triggers login if not logged in) */}
           {onToggleFavorite && (
             <button
               onClick={handleFavoriteClick}
               onTouchEnd={handleFavoriteClick}
               onMouseDown={(e) => e.stopPropagation()}
               onTouchStart={(e) => {
                 e.stopPropagation();
                 e.preventDefault();
               }}
               className="w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center transition-colors shadow-lg hover:bg-white active:scale-[0.92] touch-manipulation border border-white/50 shrink-0 pointer-events-auto z-30"
               aria-label="Toggle Favorite"
               type="button"
               style={{ pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent' }}
             >
               <Heart 
                 size={20} 
                 className={`sm:w-5 sm:h-5 transition-colors ${isFavorite ? 'fill-popera-orange text-popera-orange' : 'text-popera-teal hover:text-popera-orange'}`}
                 strokeWidth={2}
               />
             </button>
           )}

           {/* FEATURE: Conversation Icon - Goes directly to chat */}
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
             className="w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center text-popera-teal hover:bg-popera-orange hover:text-white transition-colors shadow-lg active:scale-[0.92] touch-manipulation border border-white/50 shrink-0 pointer-events-auto z-30"
             aria-label="Join Event Chat"
             type="button"
             style={{ pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent' }}
           >
             <MessageCircle size={20} className="sm:w-5 sm:h-5" strokeWidth={2} />
           </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 lg:p-6 flex flex-col flex-grow min-h-0">
        {/* Session Metadata Block - Session Frequency & Mode Tags */}
        <div className="mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {event.sessionFrequency && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#15383c]/5 text-[#15383c] border border-[#15383c]/10 text-xs font-medium">
                {getSessionFrequencyText(event.sessionFrequency)}
              </span>
            )}
            {event.sessionMode && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#15383c]/5 text-[#15383c] border border-[#15383c]/10 text-xs font-medium">
                {getSessionModeText(event.sessionMode)}
              </span>
            )}
          </div>
        </div>

        {/* Title & Host Section */}
        <div className="mb-3">
          <h3 className="text-lg lg:text-xl font-heading font-semibold text-popera-teal mb-2 group-hover:text-popera-orange transition-colors line-clamp-2 leading-snug">
            {event.title}
          </h3>
          
          {/* Host Info with Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2 overflow-hidden min-w-0 flex-1">
              <span className="w-7 h-7 shrink-0 rounded-full bg-gray-200 overflow-hidden ring-1 ring-gray-200 aspect-square flex-shrink-0">
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
                  <div className="w-full h-full flex items-center justify-center bg-[#15383c] text-white font-bold text-xs aspect-square">
                    {displayHostName?.[0]?.toUpperCase() || 'H'}
                  </div>
                )}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-xs font-medium text-gray-600 sm:text-gray-500 truncate">
                  {displayHostName || 'Unknown Host'}
                </p>
                {/* Grounded Host Badge - Show if host has good rating */}
                {hostOverallRating !== null && hostOverallRating >= 4.0 && hostOverallReviewCount >= 3 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e35e25]/10 text-[#e35e25] border border-[#e35e25]/20 text-[10px] font-medium shrink-0">
                    <Award size={10} />
                    Grounded Host
                  </span>
                )}
              </div>
            </div>

            {/* Ratings Button */}
            <button 
              onClick={(e) => { e.stopPropagation(); onReviewsClick(e, event); }}
              className="flex items-center space-x-1.5 bg-gray-50 hover:bg-orange-50 px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-lg transition-colors border border-gray-100 hover:border-orange-100 group/rating shrink-0 touch-manipulation active:scale-[0.95] min-h-[32px] sm:min-h-0"
            >
              <Star size={14} className="sm:w-3 sm:h-3 text-gray-300 group-hover/rating:text-popera-orange group-hover/rating:fill-popera-orange transition-colors" fill="currentColor" />
              <span className="text-xs font-bold text-popera-teal">
                {hostOverallRating !== null ? formatRating(hostOverallRating) : formatRating(event.rating || 0)}
              </span>
              <span className="text-[10px] text-gray-500 sm:text-gray-400 group-hover/rating:text-orange-400">
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
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#e35e25]/20 text-[#e35e25] border border-[#e35e25]/30 text-xs font-medium">
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
          <div className="flex items-center text-gray-600 text-sm">
            <Users size={16} className="sm:w-4 sm:h-4 mr-2 text-popera-orange shrink-0" />
            <span className="truncate leading-relaxed">
              {(() => {
                const joinedCount = event.attendeesCount ?? 0;
                const capacity = event.capacity ?? 'Unlimited';
                const availableSpots = getAvailableSpots(event);
                
                if (capacity === 'Unlimited') {
                  return `${joinedCount} joined`;
                }
                
                const spotsLeft = availableSpots !== null ? availableSpots : 0;
                return `${joinedCount}/${capacity} joined — ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`;
              })()}
            </span>
          </div>
          
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