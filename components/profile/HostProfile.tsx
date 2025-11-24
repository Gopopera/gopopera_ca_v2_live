import React, { useState, useMemo } from 'react';
import { ArrowLeft, MapPin, Star, Users, Instagram, Twitter, Globe, MessageCircle, Check } from 'lucide-react';
import { Event } from '@/types';
import { EventCard } from '../events/EventCard';
import { useProfileStore } from '@/stores/profileStore';
import { useUserStore, POPERA_HOST_ID, POPERA_HOST_NAME } from '@/stores/userStore';
import { PoperaProfilePicture } from './PoperaProfilePicture';
import { formatDate } from '@/utils/dateFormatter';
import { formatRating } from '@/utils/formatRating';

interface HostProfileProps {
  hostName: string;
  onBack: () => void;
  onEventClick: (event: Event) => void;
  allEvents: Event[];
  isLoggedIn?: boolean;
  favorites?: string[];
  onToggleFavorite?: (e: React.MouseEvent, eventId: string) => void;
}

export const HostProfile: React.FC<HostProfileProps> = ({ hostName, onBack, onEventClick, allEvents, isLoggedIn, favorites = [], onToggleFavorite }) => {
  const [activeTab, setActiveTab] = useState<'events' | 'reviews'>('events');
  const [error, setError] = useState<string | null>(null);
  const currentUser = useUserStore((state) => state.getCurrentUser());
  const isPoperaProfile = hostName === POPERA_HOST_NAME;
  
  // Get host ID from events (first event with this hostName)
  const hostEvent = allEvents.find(e => e.hostName === hostName);
  const hostId = hostEvent?.hostId || (isPoperaProfile ? POPERA_HOST_ID : null);
  
  // Safe fallback if hostName is missing
  const displayName = hostName || 'Unknown Host';
  
  // Get real data from profile store
  const isFollowing = hostId ? useProfileStore((state) => state.isFollowing(currentUser?.id || '', hostId)) : false;
  const followersCount = hostId ? useProfileStore((state) => state.getFollowersCount(hostId)) : 0;
  const reviews = hostId ? useProfileStore((state) => state.getReviews(hostId)) : [];
  const averageRating = hostId ? useProfileStore((state) => state.getAverageRating(hostId)) : 0;
  const reviewCount = hostId ? useProfileStore((state) => state.getReviewCount(hostId)) : 0;
  
  const followHost = useProfileStore((state) => state.followHost);
  const unfollowHost = useProfileStore((state) => state.unfollowHost);
  
  // Filter events: For Popera profile, only show official launch events (not demo events)
  // For other hosts, show all their events
  const hostEvents = useMemo(() => {
    const filtered = allEvents.filter(e => e.hostName === hostName);
    if (isPoperaProfile) {
      // Popera profile: only show official launch events, exclude demo events
      return filtered.filter(e => e.isOfficialLaunch === true && !e.isDemo);
    }
    return filtered;
  }, [allEvents, hostName, isPoperaProfile]);
  
  // Get primary city from events
  const primaryCity = useMemo(() => {
    const cities = hostEvents.map(e => e.city);
    const cityCounts = cities.reduce((acc, city) => {
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostCommonCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];
    return mostCommonCity ? `${mostCommonCity[0]}, CA` : 'Montreal, CA';
  }, [hostEvents]);
  
  // Bio text
  const bio = isPoperaProfile 
    ? "Popera is where pop-up culture comes alive. We help creators, organizers, and communities host micro-moments that bring people together. From spontaneous markets to meaningful gatherings, Popera makes it easy to activate your local crowd and create real-world connections. Join our early-user community and help shape the future of spontaneous, authentic experiences."
    : "Community organizer and event enthusiast.";
  
  const handleFollowToggle = () => {
    if (!currentUser || !hostId) return;
    if (isFollowing) {
      unfollowHost(currentUser.id, hostId);
    } else {
      followHost(currentUser.id, hostId);
    }
  };

  // Show error state if critical data is missing
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-12">
        <div className="max-w-5xl mx-auto px-6">
          <button onClick={onBack} className="flex items-center text-gray-500 hover:text-popera-teal transition-colors font-medium mb-6">
            <ArrowLeft size={20} className="mr-2" /> Back
          </button>
          <div className="bg-white rounded-2xl p-8 text-center">
            <p className="text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
           <div className="px-6 py-6"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-popera-teal transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Back</button></div>
           <div className="px-6 pb-10 flex flex-col md:flex-row items-start md:items-center gap-8">
             <div className="relative">
                {isPoperaProfile ? (
                  <PoperaProfilePicture size="md" className="md:w-32 md:h-32" />
                ) : (
                  <>
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-200 p-1 ring-4 ring-white shadow-lg">
                      <img 
                        src={`https://picsum.photos/seed/${displayName}/200/200`} 
                        alt={displayName} 
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDAiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5IPC90ZXh0Pjwvc3ZnPg==';
                        }}
                      />
                    </div>
                    <div className="absolute bottom-1 right-1 w-8 h-8 bg-popera-orange text-white rounded-full flex items-center justify-center ring-4 ring-white">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  </>
                )}
             </div>
             <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                   <div>
                     <h1 className="text-3xl md:text-4xl font-heading font-bold text-popera-teal mb-1">{displayName}</h1>
                     <p className="text-gray-500 flex items-center text-sm">
                       <MapPin size={14} className="mr-1 text-popera-orange" /> {primaryCity}
                     </p>
                   </div>
                   {isLoggedIn && (
                     <div className="flex items-center gap-3">
                       <button 
                         onClick={handleFollowToggle} 
                         className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${isFollowing ? 'bg-gray-100 text-popera-teal border border-gray-200' : 'bg-popera-orange text-white hover:bg-[#cf4d1d] shadow-orange-900/20'}`}
                       >
                         {isFollowing ? 'Following' : 'Follow'}
                       </button>
                       <button className="p-2.5 rounded-full border border-gray-200 text-gray-400 hover:text-popera-teal hover:border-popera-teal transition-all">
                         <MessageCircle size={20} />
                       </button>
                     </div>
                   )}
                </div>
                <p className="text-gray-600 max-w-2xl leading-relaxed text-sm md:text-base mb-6">{bio}</p>
                <div className="flex flex-wrap gap-6 md:gap-10 border-t border-gray-100 pt-6">
                   <div className="flex items-center gap-2">
                     <Users size={18} className="text-gray-400" />
                     <span className="font-bold text-popera-teal text-lg">{followersCount.toLocaleString()}</span>
                     <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Followers</span>
                   </div>
                   {reviewCount > 0 && (
                     <div className="flex items-center gap-2">
                       <Star size={18} className="text-popera-orange" fill="currentColor" />
                       <span className="font-bold text-popera-teal text-lg">{formatRating(averageRating)}</span>
                       <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">({reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'})</span>
                     </div>
                   )}
                </div>
             </div>
           </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex gap-8 border-b border-gray-200 mb-10">
           <button onClick={() => setActiveTab('events')} className={`pb-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'events' ? 'border-[#e35e25] text-[#e35e25]' : 'border-transparent text-gray-400 hover:text-[#15383c]'}`}>
             Events ({hostEvents.length})
           </button>
           <button onClick={() => setActiveTab('reviews')} className={`pb-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'reviews' ? 'border-[#e35e25] text-[#e35e25]' : 'border-transparent text-gray-400 hover:text-[#15383c]'}`}>
             Reviews ({reviewCount})
           </button>
        </div>
        {activeTab === 'events' ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 justify-items-center max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
             {hostEvents.map(event => (
               <div key={event.id} className="w-full h-auto">
                 <EventCard 
                   event={event} 
                   onClick={onEventClick} 
                   onChatClick={() => {}} 
                   onReviewsClick={() => {}} 
                   isLoggedIn={isLoggedIn} 
                   isFavorite={favorites.includes(event.id)} 
                   onToggleFavorite={onToggleFavorite} 
                 />
               </div>
             ))}
             {hostEvents.length === 0 && (
               <div className="col-span-full py-20 text-center text-gray-400">
                 <p>No upcoming events listed.</p>
               </div>
             )}
           </div>
        ) : (
           <div className="max-w-2xl space-y-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden">
                            <img src={`https://picsum.photos/seed/${review.userName}/50/50`} alt={review.userName} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#15383c]">{review.userName}</h4>
                            <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex text-[#e35e25]">
                          {[...Array(5)].map((_, starI) => (
                            <Star 
                              key={starI} 
                              size={14} 
                              fill={starI < review.rating ? "currentColor" : "none"} 
                              className={starI < review.rating ? "" : "text-gray-300"}
                            />
                          ))}
                        </div>
                     </div>
                     <p className="text-gray-600 text-sm leading-relaxed">"{review.comment}"</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-gray-400">
                  <p>No reviews yet.</p>
                </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
};