import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, MessageCircle, Star, Heart, Edit } from 'lucide-react';
import { Event } from '@/types';
import { formatDate } from '@/utils/dateFormatter';
import { formatRating } from '@/utils/formatRating';
import { useUserStore } from '@/stores/userStore';
import { getUserProfile } from '../../firebase/db';

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
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  
  // Get host profile picture - sync with user's profile if it's their event, or fetch from Firestore
  const [hostProfilePicture, setHostProfilePicture] = React.useState<string | null>(null);
  
  // State for host name (may need to be fetched if missing)
  const [displayHostName, setDisplayHostName] = React.useState<string>(event.hostName || '');
  
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
  }, [event.hostId, event.hostName, event.hostPhotoURL, user?.uid, user?.photoURL, user?.profileImageUrl, userProfile?.photoURL, userProfile?.imageUrl]);
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    // CRITICAL: Prevent any navigation or card click
    e.stopPropagation();
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    
    if (onToggleFavorite) {
      // Always call handler - it will handle login redirect if needed
      onToggleFavorite(e, event.id);
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
        
        {/* Category Badge - Top Left matching Hero badge style */}
        <div className="absolute top-4 left-4 inline-block py-1 sm:py-1.5 px-3.5 sm:px-4 rounded-full bg-white/5 border border-white/10 text-[#e35e25] text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase backdrop-blur-sm z-10">
          {event.category}
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-popera-teal shadow-sm">
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
            Edit
          </button>
        )}

        {/* ACTION BUTTONS - Only Favorite and Chat in feed (no share) */}
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex items-center gap-2 sm:gap-2 z-30 pointer-events-auto">
           {/* FEATURE: Favorite Heart (Always visible, triggers login if not logged in) */}
           {onToggleFavorite && (
             <button
               onClick={handleFavoriteClick}
               onMouseDown={(e) => e.stopPropagation()}
               onTouchStart={(e) => e.stopPropagation()}
               className="w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center transition-colors shadow-lg hover:bg-white active:scale-[0.92] touch-manipulation border border-white/50 shrink-0 pointer-events-auto z-30"
               aria-label="Toggle Favorite"
               type="button"
               style={{ pointerEvents: 'auto' }}
             >
               <Heart 
                 size={20} 
                 className={`sm:w-5 sm:h-5 transition-colors ${isFavorite ? 'fill-popera-orange text-popera-orange' : 'text-popera-teal hover:text-popera-orange'}`}
                 strokeWidth={2}
               />
             </button>
           )}

           {/* FEATURE: Conversation Icon */}
           <button
             onClick={(e) => onChatClick(e, event)}
             className="w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center text-popera-teal hover:bg-popera-orange hover:text-white transition-colors shadow-lg active:scale-[0.92] touch-manipulation border border-white/50 shrink-0 pointer-events-auto z-30"
             aria-label="Join Event Chat"
             type="button"
           >
             <MessageCircle size={20} className="sm:w-5 sm:h-5" strokeWidth={2} />
           </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 lg:p-6 flex flex-col flex-grow min-h-0">
        {/* Host & Rating Row */}
        <div className="mb-3 flex items-center justify-between gap-2">
           {/* Host Info */}
           <div className="flex items-center space-x-2 overflow-hidden min-w-0 flex-1">
             <span className="w-6 h-6 shrink-0 rounded-full bg-gray-200 overflow-hidden ring-1 ring-gray-200 aspect-square flex-shrink-0">
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
             <p className="text-xs font-medium text-gray-600 sm:text-gray-500 uppercase tracking-wide truncate">
               Hosted by {displayHostName ? displayHostName.split(' ')[0] : 'Unknown'}
             </p>
           </div>

           {/* FEATURE: Clickable Ratings */}
           <button 
             onClick={(e) => { e.stopPropagation(); onReviewsClick(e, event); }}
             className="flex items-center space-x-1.5 bg-gray-50 hover:bg-orange-50 px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-lg transition-colors border border-gray-100 hover:border-orange-100 group/rating shrink-0 touch-manipulation active:scale-[0.95] min-h-[32px] sm:min-h-0"
           >
              <Star size={14} className="sm:w-3 sm:h-3 text-gray-300 group-hover/rating:text-popera-orange group-hover/rating:fill-popera-orange transition-colors" fill="currentColor" />
              <span className="text-xs font-bold text-popera-teal">{formatRating(event.rating)}</span>
              <span className="text-[10px] text-gray-500 sm:text-gray-400 group-hover/rating:text-orange-400">({event.reviewCount})</span>
           </button>
        </div>

        <h3 className="text-lg lg:text-xl font-heading font-semibold text-popera-teal mb-3 group-hover:text-popera-orange transition-colors line-clamp-2 leading-snug">
          {event.title}
        </h3>

        <div className="mt-auto space-y-2">
          <div className="flex items-center text-gray-600 text-sm lg:text-base">
            <Calendar size={16} className="sm:w-4 sm:h-4 mr-2 text-popera-orange shrink-0" />
            <span className="truncate leading-relaxed">{formatDate(event.date)} • {event.time}</span>
          </div>
          <div className="flex items-center text-gray-600 text-sm lg:text-base min-w-0">
            <MapPin size={16} className="sm:w-4 sm:h-4 mr-2 text-popera-orange shrink-0" />
            <div className="flex items-center min-w-0 flex-1 gap-1.5">
              {/* City - always visible, never truncates, in bold */}
              <span className="font-bold text-popera-teal shrink-0 whitespace-nowrap">{event.city}</span>
              {/* Address/Venue - extract from location if it contains more than just city */}
              {(() => {
                // If location is just the city, don't show address
                if (event.location.trim() === event.city || !event.location.includes(',')) {
                  return null;
                }
                // Extract address part (everything before the city)
                const locationParts = event.location.split(',');
                const cityIndex = locationParts.findIndex(part => part.trim() === event.city);
                if (cityIndex > 0) {
                  // Address is everything before the city
                  const address = locationParts.slice(0, cityIndex).join(',').trim();
                  return address ? (
                    <>
                      <span className="text-gray-600 shrink-0">—</span>
                      <span className="truncate text-gray-600 leading-relaxed">
                        {address}
                      </span>
                    </>
                  ) : null;
                }
                // Fallback: use address field if available
                return event.address ? (
                  <>
                    <span className="text-gray-600 shrink-0">—</span>
                    <span className="truncate text-gray-600 leading-relaxed">
                      {event.address}
                    </span>
                  </>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};