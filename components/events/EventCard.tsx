import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, MessageCircle, Star, Heart, Edit, Award, Users, DollarSign } from 'lucide-react';
import { Event } from '@/types';
import { formatDate } from '@/utils/dateFormatter';
import { formatRating } from '@/utils/formatRating';
import { useUserStore } from '@/stores/userStore';
import { subscribeToReservationCount } from '../../firebase/db';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  getCircleContinuityText, 
  getSessionFrequencyText, 
  getSessionModeText,
  getAvailableSpots 
} from '../../utils/eventHelpers';
import { getMainCategoryLabelFromEvent } from '../../utils/categoryMapper';
import { getInitials, getAvatarColor } from '../../utils/avatarUtils';
import { EventImage } from './EventImage';
// PERFORMANCE: Use cached host profile hook to share subscriptions across cards
import { useHostProfile } from '../../hooks/useHostProfileCache';
import { useHostReviews } from '../../hooks/useHostReviewsCache';

// PERFORMANCE: Real-time attendees count component (logging removed for performance)
const EventAttendeesCount: React.FC<{ eventId: string; capacity?: number; inline?: boolean }> = ({ eventId, capacity, inline = false }) => {
  const [attendeesCount, setAttendeesCount] = React.useState<number | null>(null);
  
  React.useEffect(() => {
    if (!eventId) {
      setAttendeesCount(null);
      return;
    }
    
    const unsubscribe = subscribeToReservationCount(eventId, (count) => {
      setAttendeesCount(count);
    });
    
    return () => {
      unsubscribe();
    };
  }, [eventId]);
  
  const capacityNum = typeof capacity === 'number' ? capacity : null;
  
  if (inline) {
    if (attendeesCount === null) {
      return <span className="text-xs sm:text-sm w-12 h-4 bg-gray-200 animate-pulse rounded inline-block" />;
    }
    return (
      <span className="text-xs sm:text-sm">
        {capacityNum
          ? `${attendeesCount}/${capacityNum}`
          : `${attendeesCount}`}
      </span>
    );
  }
  
  // Note: translations will be passed via props if needed
  if (attendeesCount === null) {
    return (
      <div className="flex items-center text-gray-600 text-sm">
        <Users size={16} className="sm:w-4 sm:h-4 mr-2 text-popera-orange shrink-0" />
        <span className="w-12 h-4 bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }
  
  return (
    <div className="flex items-center text-gray-600 text-sm">
      <Users size={16} className="sm:w-4 sm:h-4 mr-2 text-popera-orange shrink-0" />
      <span className="truncate leading-relaxed">
        {capacityNum
          ? `${attendeesCount}/${capacityNum}`
          : `${attendeesCount}`}
      </span>
    </div>
  );
};

// Helper to format event price display - ALWAYS ensures $ prefix for paid events
const formatEventPrice = (event: Event): string => {
  // Check new payment fields first
  if (event.hasFee && event.feeAmount && event.feeAmount > 0) {
    const amount = event.feeAmount / 100; // Convert from cents
    const currency = event.currency?.toUpperCase() || 'CAD';
    return `$${amount.toFixed(0)} ${currency}`;
  }
  // Fallback to legacy price field - ALWAYS ensure $ prefix
  if (event.price && event.price !== 'Free' && event.price !== '' && event.price !== '$0' && event.price !== '0') {
    const priceStr = event.price.toString();
    if (priceStr.startsWith('$')) {
      return priceStr;
    }
    return `$${priceStr}`;
  }
  return 'Free';
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
  compact?: boolean; // Compact variant for recommended events section
  profileVariant?: boolean; // Profile variant - no buttons/icons, all text overlaid on image
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
  showEditButton = false,
  compact = false,
  profileVariant = false
}) => {
  const { t, language } = useLanguage();
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  
  // PERFORMANCE: Use cached host profile hook - shares subscription across all cards with same host
  const hostProfile = useHostProfile(event.hostId);
  const hostProfilePicture = hostProfile?.photoURL || null;
  const displayHostName = hostProfile?.displayName || 'Unknown Host';
  
  // Use reviews cache hook for host's overall rating
  const { averageRating: hostOverallRating, reviewCount: hostOverallReviewCount } = useHostReviews(event.hostId);
  
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
    <a 
      href={`/event/${event.id}`}
      onClick={() => { try { onClick(event); } catch {} }}
      aria-label={`View event: ${event.title}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'manipulation', textDecoration: 'none', color: 'inherit', display: 'flex' }}
      className={`group relative bg-white/95 backdrop-blur-sm rounded-[28px] md:rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.1)] border border-white/60 transition-all duration-500 cursor-pointer flex flex-col w-full h-full focus:outline-none focus:ring-2 focus:ring-[#15383c] focus:ring-offset-2`}
    >
      {/* Image Container - Premium cinematic design */}
      <div className={`relative w-full ${profileVariant ? 'aspect-square' : 'aspect-[4/3]'} overflow-hidden bg-gradient-to-br from-[#15383c] to-[#1f4d52] flex-shrink-0`} style={{ position: 'relative' }}>
        <EventImage
          src={event.imageUrls && event.imageUrls.length > 0 ? event.imageUrls[0] : (event.imageUrl || `https://picsum.photos/seed/${event.id || 'event'}/800/600`)}
          alt={event.title}
          variant="card"
          eventId={event.id}
          hoverScale={true}
        />
        {/* Soft gradient only at bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-10" />
        
        {/* Main Category Badge - Liquid Glass Style (hidden in compact/profile mode) */}
        {!compact && !profileVariant && (
          <div className="absolute top-3 left-3 inline-flex items-center justify-center py-1.5 px-3 rounded-full bg-white/20 backdrop-blur-md text-[#e35e25] text-[10px] sm:text-xs font-bold tracking-wider uppercase z-20 border border-white/30">
            {getMainCategoryLabelFromEvent(event, language)}
          </div>
        )}

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

        {/* ACTION BUTTONS - Liquid Glass cluster top-right (hidden in compact/profile mode) */}
        {!compact && !profileVariant && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-30 pointer-events-auto">
             {/* FEATURE: Favorite Heart - Same glass style as conversation, orange when favorited */}
             {onToggleFavorite && (
               <button
                 onClick={handleFavoriteClick}
                 onTouchEnd={handleFavoriteClick}
                 onMouseDown={(e) => e.stopPropagation()}
                 onTouchStart={(e) => {
                   e.stopPropagation();
                   e.preventDefault();
                 }}
                 className="w-9 h-9 sm:w-10 sm:h-10 bg-white/70 border border-white/50 rounded-full flex items-center justify-center hover:bg-white/90 transition-all hover:scale-110 active:scale-95 touch-manipulation shrink-0 pointer-events-auto z-30 backdrop-blur-xl shadow-sm"
                 aria-label="Toggle Favorite"
                 type="button"
                 style={{ pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent' }}
               >
                 <Heart 
                   size={16} 
                   className={`sm:w-[18px] sm:h-[18px] transition-all ${
                     isFavorite 
                       ? 'fill-[#e35e25] text-[#e35e25]' 
                       : 'fill-none text-[#15383c]'
                   }`}
                   strokeWidth={2}
                 />
               </button>
             )}

             {/* FEATURE: Conversation Icon - Liquid Glass */}
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
               className="w-9 h-9 sm:w-10 sm:h-10 bg-white/70 border border-white/50 rounded-full flex items-center justify-center text-[#15383c] hover:bg-white/90 transition-all hover:scale-110 active:scale-95 touch-manipulation shrink-0 pointer-events-auto z-30 backdrop-blur-xl shadow-sm"
               aria-label="Join Event Chat"
               type="button"
               style={{ pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent' }}
             >
               <MessageCircle size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2} />
             </button>
          </div>
        )}

        {/* Content Overlay - White text over bottom gradient */}
        {profileVariant ? (
          /* Profile variant - All text overlaid on image, no buttons */
          <div 
            className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 md:p-6 z-30 pointer-events-none" 
            style={{ 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 30
            }}
          >
            {/* Title */}
            <h3 className="text-base sm:text-lg md:text-xl font-heading font-bold text-white mb-2 leading-tight line-clamp-2 drop-shadow-lg pointer-events-auto">
              {event.title}
            </h3>
            
            {/* Host Name + Rating */}
            <div className="flex items-center gap-2 mb-3 pointer-events-auto">
              <span className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full bg-white/20 backdrop-blur-sm overflow-hidden ring-1 ring-white/30">
                {hostProfilePicture ? (
                  <img 
                    src={hostProfilePicture} 
                    alt={displayHostName} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://picsum.photos/seed/${displayHostName}/50/50`;
                    }}
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: `${getAvatarColor(displayHostName, event.hostId)}CC` }}
                  >
                    {getInitials(displayHostName)}
                  </div>
                )}
              </span>
              <p className="text-xs sm:text-sm font-medium text-white/90 drop-shadow-md truncate">
                {displayHostName || 'Unknown Host'}
              </p>
              {/* Host Rating */}
              {hostOverallRating !== null && hostOverallRating > 0 && (
                <span className="flex items-center gap-0.5 text-xs sm:text-sm text-white/80 drop-shadow-md">
                  <Star size={12} className="sm:w-3 sm:h-3 fill-amber-400 text-amber-400 shrink-0" />
                  <span>{hostOverallRating.toFixed(1)}</span>
                </span>
              )}
            </div>

            {/* Metadata - Stacked vertically */}
            <div className="flex flex-col gap-1 text-white/90 pointer-events-auto">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Calendar size={12} className="sm:w-3 sm:h-3 shrink-0 text-white/70" />
                <span>{formatDate(event.date)} • {event.time}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                <MapPin size={12} className="sm:w-3 sm:h-3 shrink-0 text-white/70" />
                <span className="truncate">{event.city}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                <DollarSign size={12} className="sm:w-3 sm:h-3 shrink-0 text-white/70" />
                <span>{formatEventPrice(event)}</span>
                <span className="text-white/50 mx-1">•</span>
                <Users size={12} className="sm:w-3 sm:h-3 shrink-0 text-white/70" />
                <EventAttendeesCount eventId={event.id} capacity={event.capacity} inline={true} />
              </div>
            </div>
          </div>
        ) : compact ? (
          /* Compact variant - Title, host, date, location, attendees */
          <div 
            className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-30 pointer-events-none" 
            style={{ 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 30
            }}
          >
            {/* Title - Smaller in compact mode */}
            <h3 className="text-sm sm:text-base font-heading font-bold text-white mb-1.5 leading-tight line-clamp-1 drop-shadow-lg pointer-events-auto">
              {event.title}
            </h3>
            
            {/* Host Name + Rating + Starting Soon badge */}
            <div className="flex items-center justify-between gap-2 mb-2 pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-full bg-white/20 backdrop-blur-sm overflow-hidden ring-1 ring-white/30">
                  {hostProfilePicture ? (
                    <img 
                      src={hostProfilePicture} 
                      alt={displayHostName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://picsum.photos/seed/${displayHostName}/50/50`;
                      }}
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-white font-bold text-[10px]"
                      style={{ backgroundColor: `${getAvatarColor(displayHostName, event.hostId)}CC` }}
                    >
                      {getInitials(displayHostName)}
                    </div>
                  )}
                </span>
                <p className="text-[10px] sm:text-xs font-medium text-white/90 drop-shadow-md truncate">
                  {displayHostName || 'Unknown Host'}
                </p>
                {/* Host Rating */}
                {hostOverallRating !== null && hostOverallRating > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] sm:text-xs text-white/80 drop-shadow-md">
                    <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
                    <span>{hostOverallRating.toFixed(1)}</span>
                  </span>
                )}
              </div>
              
              {/* Starting Soon Badge */}
              {(() => {
                const continuity = getCircleContinuityText(event);
                if (continuity?.type === 'startingSoon') {
                  return (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#e35e25] text-white text-[8px] sm:text-[10px] font-bold uppercase tracking-wider shadow-lg shrink-0">
                      {continuity.text}
                    </span>
                  );
                }
                return null;
              })()}
            </div>
            
            {/* Metadata - Stacked vertically: Date+Time, Location, Price+Capacity */}
            <div className="flex flex-col gap-0.5 text-white/90 pointer-events-auto">
              <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                <Calendar size={10} className="shrink-0 text-white/70" />
                <span>{formatDate(event.date)} • {event.time}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                <MapPin size={10} className="shrink-0 text-white/70" />
                <span className="truncate max-w-[120px]">{event.city}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                <DollarSign size={10} className="shrink-0 text-white/70" />
                <span>{formatEventPrice(event)}</span>
                <span className="text-white/50 mx-0.5">•</span>
                <Users size={10} className="shrink-0 text-white/70" />
                <EventAttendeesCount eventId={event.id} capacity={event.capacity} inline={true} />
              </div>
            </div>
          </div>
        ) : (
          /* Full variant - All content overlaid */
          <div 
            className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 md:p-6 z-30 pointer-events-none" 
            style={{ 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 30
            }}
          >
            {/* Title - Large, clean typography */}
            <h3 className="text-lg sm:text-xl md:text-2xl font-heading font-bold text-white mb-2 leading-tight line-clamp-2 drop-shadow-lg pointer-events-auto">
              {event.title}
            </h3>
            
            {/* Host Name + Rating + Starting Soon Badge */}
            <div className="flex items-center justify-between gap-2 mb-2 pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full bg-white/20 backdrop-blur-sm overflow-hidden ring-1 ring-white/30">
                  {hostProfilePicture ? (
                    <img 
                      src={hostProfilePicture} 
                      alt={displayHostName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://picsum.photos/seed/${displayHostName}/50/50`;
                      }}
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: `${getAvatarColor(displayHostName, event.hostId)}CC` }}
                    >
                      {getInitials(displayHostName)}
                    </div>
                  )}
                </span>
                <p className="text-xs sm:text-sm font-medium text-white/90 drop-shadow-md">
                  {displayHostName || 'Unknown Host'}
                </p>
                {/* Host Rating */}
                {hostOverallRating !== null && hostOverallRating > 0 && (
                  <span className="flex items-center gap-0.5 text-xs sm:text-sm text-white/80 drop-shadow-md">
                    <Star size={12} className="sm:w-3 sm:h-3 fill-amber-400 text-amber-400 shrink-0" />
                    <span>{hostOverallRating.toFixed(1)}</span>
                  </span>
                )}
              </div>
              
              {/* Starting Soon Badge - Right side of host */}
              {(() => {
                const continuity = getCircleContinuityText(event);
                if (continuity?.type === 'startingSoon') {
                  return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#e35e25] text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-lg shrink-0">
                      {continuity.text}
                    </span>
                  );
                }
                return null;
              })()}
            </div>

            {/* Metadata - Stacked vertically: Date+Time, Location, Price+Capacity */}
            <div className="flex flex-col gap-1 text-white/90 mb-3 pointer-events-auto">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Calendar size={12} className="sm:w-3 sm:h-3 shrink-0 text-white/70" />
                <span>{formatDate(event.date)} • {event.time}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                <MapPin size={12} className="sm:w-3 sm:h-3 shrink-0 text-white/70" />
                <span className="truncate">{event.city}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                <DollarSign size={12} className="sm:w-3 sm:h-3 shrink-0 text-white/70" />
                <span>{formatEventPrice(event)}</span>
                <span className="text-white/50 mx-1">•</span>
                <Users size={12} className="sm:w-3 sm:h-3 shrink-0 text-white/70" />
                <EventAttendeesCount eventId={event.id} capacity={event.capacity} inline={true} />
              </div>
            </div>
          </div>
        )}
      </div>

    </a>
  );
};