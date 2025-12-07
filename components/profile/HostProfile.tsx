import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, MapPin, Star, Users, Instagram, Twitter, Globe, Check, Calendar } from 'lucide-react';
import { Event } from '@/types';
import { EventCard } from '../events/EventCard';
import { useProfileStore } from '@/stores/profileStore';
import { useUserStore, POPERA_HOST_ID, POPERA_HOST_NAME } from '@/stores/userStore';
import { PoperaProfilePicture } from './PoperaProfilePicture';
import { formatDate } from '@/utils/dateFormatter';
import { formatRating } from '@/utils/formatRating';
import { listHostReviews, getUserProfile } from '@/firebase/db';
import { FirestoreReview } from '@/firebase/types';
import { subscribeToUserProfile } from '@/firebase/userSubscriptions';
import { subscribeToFollowersCount } from '@/firebase/follow';

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
  const userProfile = useUserStore((state) => state.userProfile);
  const isPoperaProfile = hostName === POPERA_HOST_NAME;
  
  // REFACTORED: Get host ID from events (first event with this hostName or hostId)
  // Note: hostName prop is still used for backward compatibility, but we prefer hostId
  const hostEvent = allEvents.find(e => e.hostId && (e.hostName === hostName || e.host === hostName));
  const hostId = hostEvent?.hostId || (isPoperaProfile ? POPERA_HOST_ID : null);
  
  // Safe fallback if hostName is missing
  const displayName = hostName || 'Unknown Host';
  
  // FIX: Always call hooks unconditionally (React rules)
  const followHost = useProfileStore((state) => state.followHost);
  const unfollowHost = useProfileStore((state) => state.unfollowHost);
  const profileStore = useProfileStore();
  
  // State for reviews fetched from Firestore (source of truth)
  const [firestoreReviews, setFirestoreReviews] = useState<FirestoreReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  
  // State for host profile picture (synced from Firestore)
  const [hostProfilePicture, setHostProfilePicture] = useState<string | null>(null);
  
  // Get real data from profile store - call hooks unconditionally, then use conditionally
  const isFollowing = hostId ? profileStore.isFollowing(currentUser?.id || '', hostId) : false;
  
  // Real-time follower count from Firestore (source of truth)
  const [followersCount, setFollowersCount] = useState<number>(0);
  
  // CRITICAL: Always fetch host profile picture from Firestore (source of truth)
  // This ensures profile pictures are synchronized across all views for ALL users
  // REFACTORED: Real-time subscription to /users/{hostId} - single source of truth
  useEffect(() => {
    if (!hostId || isPoperaProfile) {
      setHostProfilePicture(null);
      return;
    }
    
    if (import.meta.env.DEV) {
      console.log('[HOST_PROFILE] 📡 Subscribing to host profile:', { hostId });
    }
    
    let unsubscribe: (() => void) | null = null;
    
    // Real-time subscription to host user document
    try {
      unsubscribe = subscribeToUserProfile(hostId, (hostData) => {
        if (hostData) {
          setHostProfilePicture(hostData.photoURL || null);
          
          if (import.meta.env.DEV) {
            console.log('[HOST_PROFILE] ✅ Host profile updated:', {
              hostId,
              displayName: hostData.displayName,
              hasPhoto: !!hostData.photoURL,
            });
          }
        } else {
          setHostProfilePicture(null);
        }
      });
    } catch (error) {
      console.error('[HOST_PROFILE] ❌ Error loading user subscriptions:', error);
      setHostProfilePicture(null);
    }
    
    return () => {
      if (unsubscribe) {
        if (import.meta.env.DEV) {
          console.log('[HOST_PROFILE] 🧹 Unsubscribing from host profile:', { hostId });
        }
        unsubscribe();
      }
    };
  }, [hostId, isPoperaProfile]);
  
  // Subscribe to real-time followers count
  useEffect(() => {
    if (!hostId) {
      setFollowersCount(0);
      return;
    }
    
    let unsubscribe: (() => void) | null = null;
    
    try {
      unsubscribe = subscribeToFollowersCount(hostId, (count: number) => {
        setFollowersCount(count);
      });
    } catch (error) {
      console.error('[HOST_PROFILE] Error loading follow subscriptions:', error);
      setFollowersCount(0);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [hostId]);
  
  // Fetch reviews from Firestore (only accepted reviews for accurate count)
  useEffect(() => {
    const loadReviews = async () => {
      if (!hostId) {
        setFirestoreReviews([]);
        return;
      }
      
      try {
        setReviewsLoading(true);
        // Only get accepted reviews (includePending=false) to ensure count matches displayed reviews
        const acceptedReviews = await listHostReviews(hostId, false);
        setFirestoreReviews(acceptedReviews);
      } catch (error) {
        console.error('[HOST_PROFILE] Error loading reviews:', error);
        setFirestoreReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };
    
    loadReviews();
  }, [hostId]);
  
  // Calculate rating and count from Firestore reviews (source of truth)
  const reviews = firestoreReviews;
  const reviewCount = reviews.length;
  const averageRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
    : 0;
  
  // Filter events: For Popera profile, show launch events (city-launch demoType) and official launch events
  // For other hosts, show all their events
  const hostEvents = useMemo(() => {
    const filtered = allEvents.filter(e => e.hostName === hostName);
    if (isPoperaProfile) {
      // Popera profile: show city-launch events (demoType: "city-launch") and official launch events
      // Check if event has demoType field (from Firestore) - these are the launch events we want to show
      return filtered.filter(e => {
      // Show if it's an official launch event OR if it's a city-launch event
      return e.isOfficialLaunch === true || e.demoType === "city-launch";
      });
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
  
  const [isFollowingState, setIsFollowingState] = useState(false);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);

  // Sync follow state from Firestore on mount
  React.useEffect(() => {
    if (!currentUser?.id || !hostId) return;
    
    const checkFollowStatus = async () => {
      try {
        const { isFollowing: checkIsFollowing } = await import('../../firebase/follow');
        const following = await checkIsFollowing(currentUser.id, hostId);
        setIsFollowingState(following);
      } catch (error) {
        console.error('Error checking follow status:', error);
        // Fallback to local state
        setIsFollowingState(isFollowing);
      }
    };
    
    checkFollowStatus();
  }, [currentUser?.id, hostId, isFollowing]);

  const handleFollowToggle = async () => {
    if (!currentUser || !hostId || isUpdatingFollow) return;
    
    setIsUpdatingFollow(true);
    try {
      const { followHost: firestoreFollowHost, unfollowHost: firestoreUnfollowHost } = await import('../../firebase/follow');
      
      if (isFollowingState) {
        // Unfollow
        await firestoreUnfollowHost(currentUser.id, hostId);
        unfollowHost(currentUser.id, hostId); // Update local store
        setIsFollowingState(false);
      } else {
        // Follow
        await firestoreFollowHost(currentUser.id, hostId);
        followHost(currentUser.id, hostId); // Update local store
        setIsFollowingState(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Still update local state for immediate feedback
      if (isFollowingState) {
        unfollowHost(currentUser.id, hostId);
        setIsFollowingState(false);
      } else {
        followHost(currentUser.id, hostId);
        setIsFollowingState(true);
      }
    } finally {
      setIsUpdatingFollow(false);
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

  // Loading state
  if (!hostName) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-12">
        <div className="max-w-5xl mx-auto px-6">
          <button onClick={onBack} className="flex items-center text-gray-500 hover:text-popera-teal transition-colors font-medium mb-6">
            <ArrowLeft size={20} className="mr-2" /> Back
          </button>
          <div className="bg-white rounded-2xl p-8 text-center">
            <p className="text-gray-500">Loading host profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-20 pb-12 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <div className="mb-4 sm:mb-6">
          <button 
            onClick={onBack} 
            className="flex items-center text-gray-400 hover:text-[#15383c] transition-colors font-medium text-sm sm:text-base touch-manipulation active:scale-95"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5 mr-1" /> Back
          </button>
        </div>

        {/* Profile Banner with Profile Picture */}
        <div className="relative mb-6 sm:mb-8">
          {/* Banner Image */}
          <div className="h-32 sm:h-40 md:h-48 bg-gradient-to-br from-[#e35e25] to-[#15383c] rounded-2xl sm:rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-black/10"></div>
          </div>
          
          {/* Profile Picture - Centered on Banner */}
          <div className="absolute -bottom-12 sm:-bottom-16 left-1/2 transform -translate-x-1/2">
            {isPoperaProfile ? (
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32">
                <PoperaProfilePicture size="md" className="w-full h-full rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-900/30 border-4 border-white" />
              </div>
            ) : (
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-[#e35e25] rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-xl shadow-orange-900/30 border-4 border-white overflow-hidden">
                  {hostProfilePicture ? (
                    <img 
                      src={hostProfilePicture} 
                      alt={displayName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement('span');
                          fallback.className = 'font-heading font-bold text-white text-2xl sm:text-3xl md:text-4xl';
                          fallback.textContent = displayName?.[0] || 'H';
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <span className="font-heading font-bold text-white text-2xl sm:text-3xl md:text-4xl">
                      {displayName?.[0] || 'H'}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-10 sm:h-10 bg-[#e35e25] text-white rounded-full flex items-center justify-center ring-4 ring-white shadow-lg">
                  <Check size={16} className="sm:w-5 sm:h-5" strokeWidth={3} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="mt-16 sm:mt-20 md:mt-24 mb-6 sm:mb-8 text-center">
          <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-[#15383c] mb-2">
            {displayName.toUpperCase()}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <MapPin size={16} className="text-[#e35e25]" />
            <span className="text-gray-500 text-sm sm:text-base">{primaryCity}</span>
          </div>
          
          {/* Bio Section */}
          {bio && (
            <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto mb-4 leading-relaxed">
              {bio}
            </p>
          )}

          {/* Follow Button */}
          {isLoggedIn && currentUser?.id !== hostId && (
            <button 
              onClick={handleFollowToggle}
              disabled={isUpdatingFollow}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold text-sm sm:text-base transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95 ${
                isFollowingState 
                  ? 'bg-white text-[#15383c] border-2 border-gray-200 hover:bg-gray-50' 
                  : 'bg-[#e35e25] text-white hover:bg-[#cf4d1d] shadow-orange-900/20'
              }`}
            >
              {isUpdatingFollow ? '...' : (isFollowingState ? 'Following' : 'Follow')}
            </button>
          )}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4 sm:gap-5 mb-6 sm:mb-8">
          <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
              <Users size={18} className="sm:w-5 sm:h-5 text-[#e35e25]" />
            </div>
            <div className="text-left flex-1">
              <div className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">{followersCount.toLocaleString()}</div>
              <div className="text-xs sm:text-sm text-gray-500">Followers</div>
            </div>
          </div>
          
          {reviewCount > 0 && (
            <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
                <Star size={18} className="sm:w-5 sm:h-5 text-[#e35e25] fill-[#e35e25]" />
              </div>
              <div className="text-left flex-1">
                <div className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">{formatRating(averageRating)}</div>
                <div className="text-xs sm:text-sm text-gray-500">{reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs - Enhanced */}
        <div className="mb-6 sm:mb-8">
          <div className="flex gap-2 sm:gap-3 border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('events')} 
              className={`pb-3 sm:pb-4 px-4 sm:px-5 text-sm sm:text-base font-bold uppercase tracking-wider border-b-2 transition-colors touch-manipulation active:scale-95 ${
                activeTab === 'events' 
                  ? 'border-[#e35e25] text-[#e35e25]' 
                  : 'border-transparent text-gray-400 hover:text-[#15383c]'
              }`}
            >
              Events ({hostEvents.length})
            </button>
            <button 
              onClick={() => setActiveTab('reviews')} 
              className={`pb-3 sm:pb-4 px-4 sm:px-5 text-sm sm:text-base font-bold uppercase tracking-wider border-b-2 transition-colors touch-manipulation active:scale-95 ${
                activeTab === 'reviews' 
                  ? 'border-[#e35e25] text-[#e35e25]' 
                  : 'border-transparent text-gray-400 hover:text-[#15383c]'
              }`}
            >
              Reviews ({reviewCount})
            </button>
          </div>
        </div>
        {activeTab === 'events' ? (
          <div>
            {hostEvents.length === 0 ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 bg-[#e35e25]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar size={40} className="text-[#e35e25]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#15383c] mb-2">No upcoming events</h3>
                <p className="text-gray-500 text-sm sm:text-base">This host hasn't listed any upcoming events yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {reviewsLoading ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-4 sm:space-y-6">
                {reviews.map((review) => {
                  const createdAt = typeof review.createdAt === 'number' 
                    ? review.createdAt 
                    : (review.createdAt as any)?.toMillis?.() || Date.now();
                  // Convert timestamp to ISO string for formatDate
                  const dateString = new Date(createdAt).toISOString();
                  return (
                    <div key={review.id} className="bg-white p-5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#e35e25] to-[#15383c] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {review.userName?.[0] || 'U'}
                          </div>
                          <div>
                            <h4 className="text-sm sm:text-base font-bold text-[#15383c]">{review.userName}</h4>
                            <span className="text-xs text-gray-400">{formatDate(dateString)}</span>
                          </div>
                        </div>
                        <div className="flex text-[#e35e25]">
                          {[...Array(5)].map((_, starI) => (
                            <Star 
                              key={starI} 
                              size={16} 
                              fill={starI < review.rating ? "currentColor" : "none"} 
                              className={starI < review.rating ? "" : "text-gray-300"}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-600 text-sm sm:text-base leading-relaxed">"{review.comment}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 bg-[#e35e25]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star size={40} className="text-[#e35e25]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#15383c] mb-2">No reviews yet</h3>
                <p className="text-gray-500 text-sm sm:text-base">This host hasn't received any reviews yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};