import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, MessageCircle, Star, Heart, Edit } from 'lucide-react';
import { Event } from '@/types';
import { formatDate } from '@/utils/dateFormatter';
import { formatRating } from '@/utils/formatRating';
import { useUserStore } from '@/stores/userStore';

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
  
  React.useEffect(() => {
    const fetchHostProfile = async () => {
      if (!event.hostId) {
        setHostProfilePicture(null);
        return;
      }
      
      // If this is the current user's event, use their profile picture
      if (event.hostId === user?.uid) {
        const profilePic = user?.photoURL || user?.profileImageUrl || userProfile?.photoURL || userProfile?.imageUrl;
        setHostProfilePicture(profilePic || null);
        return;
      }
      
      // For other hosts, fetch from Firestore (only if host has 1-15 events to avoid too many lookups)
      try {
        const { getUserProfile } = await import('../firebase/db');
        const hostProfile = await getUserProfile(event.hostId);
        if (hostProfile) {
          setHostProfilePicture(hostProfile.photoURL || hostProfile.imageUrl || null);
        } else {
          setHostProfilePicture(null);
        }
      } catch (error) {
        // Silently fail - will use placeholder
        setHostProfilePicture(null);
      }
    };
    
    fetchHostProfile();
  }, [event.hostId, user?.uid, user?.photoURL, user?.profileImageUrl, userProfile?.photoURL, userProfile?.imageUrl]);
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn && onToggleFavorite) {
      // Trigger login - the parent should handle this
      onToggleFavorite(e, event.id);
    } else if (onToggleFavorite) {
      onToggleFavorite(e, event.id);
    }
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
      className={`group relative bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer h-full flex flex-col w-full max-w-[420px] min-h-[400px] sm:min-h-[450px] md:min-h-[480px] focus:outline-none focus:ring-2 focus:ring-[#15383c] focus:ring-offset-2`}
    >
      {/* Image Container - Fixed aspect ratio */}
      <div className={`relative w-full aspect-[4/3] overflow-hidden rounded-t-xl md:rounded-t-2xl bg-gradient-to-br from-popera-teal to-[#1f4d52]`}>
        <img 
          src={event.imageUrls && event.imageUrls.length > 0 ? event.imageUrls[0] : (event.imageUrl || `https://picsum.photos/seed/${event.id || 'event'}/800/600`)} 
          alt={event.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
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
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex items-center gap-2 sm:gap-2 z-20">
           {/* FEATURE: Favorite Heart (Always visible, triggers login if not logged in) */}
           {onToggleFavorite && (
             <button
               onClick={handleFavoriteClick}
               className="w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center transition-colors shadow-lg hover:bg-white active:scale-[0.92] touch-manipulation border border-white/50 shrink-0"
               aria-label="Toggle Favorite"
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
             className="w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center text-popera-teal hover:bg-popera-orange hover:text-white transition-colors shadow-lg active:scale-[0.92] touch-manipulation border border-white/50 shrink-0"
             aria-label="Join Event Chat"
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
             <span className="w-6 h-6 shrink-0 rounded-full bg-gray-200 overflow-hidden ring-1 ring-gray-200">
               {hostProfilePicture ? (
                 <img 
                   src={hostProfilePicture} 
                   alt={event.hostName} 
                   className="w-full h-full object-cover"
                   onError={(e) => {
                     const target = e.target as HTMLImageElement;
                     target.src = `https://picsum.photos/seed/${event.hostName}/50/50`;
                   }}
                 />
               ) : (
                 <div className="w-full h-full flex items-center justify-center bg-[#15383c] text-white font-bold text-xs">
                   {event.hostName?.[0]?.toUpperCase() || 'H'}
                 </div>
               )}
             </span>
             <p className="text-xs font-medium text-gray-600 sm:text-gray-500 uppercase tracking-wide truncate">
               Hosted by {event.hostName.split(' ')[0]}
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