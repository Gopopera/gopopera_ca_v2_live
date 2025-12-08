import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, Event } from '../../types';
import { ChevronRight, ChevronLeft, Calendar, Users, Star, Heart, Settings } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { useEventStore } from '../../stores/eventStore';
import { getReservationCountForEvent, listHostReviews } from '../../firebase/db';
// REFACTORED: No longer using getUserProfile - using real-time subscriptions instead
import { getFollowingHosts, getHostFollowers } from '../../firebase/follow';
import { subscribeToUserProfile } from '../../firebase/userSubscriptions';
import { EventCard } from '../../components/events/EventCard';
import { getInitials, getAvatarBgColor } from '../../utils/avatarUtils';

interface ProfilePageProps {
  setViewState: (view: ViewState) => void;
  userName: string;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ setViewState, userName, onLogout }) => {
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  const allEvents = useEventStore((state) => state.events);
  const [stats, setStats] = useState({ revenue: 30, hosted: 0, attendees: 0, following: 0, attended: 0, reviews: 0, followers: 0 });
  const [loading, setLoading] = useState(true);
  
  // REFACTORED: Real-time subscription to /users/{userId} - single source of truth
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>(userName);
  
  useEffect(() => {
    // Initialize with userProfile from store if available (faster initial load)
    if (userProfile?.photoURL) {
      setProfilePicture(userProfile.photoURL);
    } else if (user?.photoURL) {
      setProfilePicture(user.photoURL);
    } else {
      setProfilePicture(null);
    }
    
    if (userProfile?.displayName) {
      setDisplayName(userProfile.displayName);
    } else if (user?.displayName) {
      setDisplayName(user.displayName);
    } else {
      setDisplayName(userName);
    }
    
    if (!user?.uid) {
      return;
    }
    
    if (import.meta.env.DEV) {
      console.log('[PROFILE_PAGE] 📡 Subscribing to user profile:', { userId: user.uid });
    }
    
    let unsubscribe: (() => void) | null = null;
    
    // Real-time subscription to user document (overrides initial values)
    try {
      unsubscribe = subscribeToUserProfile(user.uid, (userData) => {
        if (userData) {
          setProfilePicture(userData.photoURL || null);
          setDisplayName(userData.displayName || userName);
          
          if (import.meta.env.DEV) {
            console.log('[PROFILE_PAGE] ✅ User profile updated:', {
              userId: user.uid,
              displayName: userData.displayName,
              hasPhoto: !!userData.photoURL,
            });
          }
        } else {
          // Fallback to user object if subscription returns null
          setProfilePicture(user?.photoURL || null);
          setDisplayName(user?.displayName || userName);
        }
      });
    } catch (error) {
      console.error('[PROFILE_PAGE] ❌ Error loading user subscriptions:', error);
      // Fallback to user object on error
      setProfilePicture(user?.photoURL || null);
      setDisplayName(user?.displayName || userName);
    }
    
    return () => {
      if (unsubscribe) {
        if (import.meta.env.DEV) {
          console.log('[PROFILE_PAGE] 🧹 Unsubscribing from user profile:', { userId: user.uid });
        }
        unsubscribe();
      }
    };
  }, [user?.uid, userName, user?.photoURL, user?.displayName, userProfile?.photoURL, userProfile?.displayName]);
  const initials = getInitials(displayName);
  
  // Calculate metrics - optimized with parallel queries and proper dependency tracking
  useEffect(() => {
    const calculateMetrics = async () => {
      if (!user?.uid) {
        setLoading(false);
        setStats({ revenue: 0, hosted: 0, attendees: 0, following: 0, attended: 0, reviews: 0, followers: 0 });
        return;
      }
      
      try {
        setLoading(true);
        
        // Get hosted events (filter non-draft events for accurate count)
        const hostedEvents = allEvents.filter(e => e.hostId === user.uid && e.isDraft !== true);
        const hostedCount = hostedEvents.length;
        
        // Calculate total attendees across all hosted events (accumulated) - parallel queries for performance
        let totalAttendees = 0;
        if (hostedEvents.length > 0) {
          const attendeeCounts = await Promise.allSettled(
            hostedEvents.map(event => getReservationCountForEvent(event.id))
          );
          
          totalAttendees = attendeeCounts.reduce((sum, result) => {
            if (result.status === 'fulfilled') {
              return sum + result.value;
            } else {
              // If query fails, fallback to 0 (not event.attendeesCount to ensure accuracy)
              console.warn('[PROFILE_METRICS] Failed to get reservation count for event:', result.reason);
              return sum;
            }
          }, 0);
        }
        
        // Get events attended (from RSVPs) - ensure accurate count
        const attendedCount = Array.isArray(user.rsvps) ? user.rsvps.length : 0;
        
        // Parallel queries for following, followers, and reviews for better performance
        // IMPORTANT: Only count accepted reviews (includePending=false) to match what's displayed
        const [followingIds, followersIds, reviews] = await Promise.allSettled([
          getFollowingHosts(user.uid),
          getHostFollowers(user.uid),
          listHostReviews(user.uid, false), // Only accepted reviews for accurate count
        ]);
        
        const followingCount = followingIds.status === 'fulfilled' ? followingIds.value.length : 0;
        const followersCount = followersIds.status === 'fulfilled' ? followersIds.value.length : 0;
        const reviewsCount = reviews.status === 'fulfilled' ? reviews.value.length : 0;
        
        setStats({
          revenue: 0, // Will be calculated from Stripe transactions later
          hosted: hostedCount,
          attendees: totalAttendees, // Always accurate - 0 if no reservations
          following: followingCount,
          attended: attendedCount,
          reviews: reviewsCount,
          followers: followersCount,
        });
      } catch (error) {
        console.error('[PROFILE_METRICS] Error calculating metrics:', error);
        // Set safe defaults on error
        setStats({ revenue: 0, hosted: 0, attendees: 0, following: 0, attended: 0, reviews: 0, followers: 0 });
      } finally {
        setLoading(false);
      }
    };
    
    calculateMetrics();
  }, [user?.uid, allEvents.length, user?.rsvps?.length]); // Use length to avoid unnecessary recalculations
  
  // Subscribe to real-time metrics updates
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribes: (() => void)[] = [];
    
    // Subscribe to followers count (real-time)
    import('../../firebase/follow').then(({ subscribeToFollowersCount, subscribeToFollowingCount }) => {
      const unsubscribeFollowers = subscribeToFollowersCount(user.uid, (count: number) => {
        setStats(prev => ({ ...prev, followers: count }));
      });
      unsubscribes.push(unsubscribeFollowers);
      
      // Subscribe to following count (real-time)
      const unsubscribeFollowing = subscribeToFollowingCount(user.uid, (count: number) => {
        setStats(prev => ({ ...prev, following: count }));
      });
      unsubscribes.push(unsubscribeFollowing);
    }).catch((error) => {
      console.error('[PROFILE_PAGE] Error loading follow module:', error);
    });
    
    // Subscribe to hosted events count (real-time)
    import('../../firebase/db').then(({ 
      subscribeToHostedEventsCount, 
      subscribeToAttendedEventsCount,
      subscribeToTotalAttendeesCount,
      subscribeToReviewsCount
    }) => {
      // Subscribe to hosted events count
      const unsubscribeHosted = subscribeToHostedEventsCount(user.uid, (count: number) => {
        setStats(prev => ({ ...prev, hosted: count }));
      });
      unsubscribes.push(unsubscribeHosted);
      
      // Subscribe to attended events count (real-time)
      const unsubscribeAttended = subscribeToAttendedEventsCount(user.uid, (count: number) => {
        setStats(prev => ({ ...prev, attended: count }));
      });
      unsubscribes.push(unsubscribeAttended);
      
      // Subscribe to total attendees count across all hosted events (real-time)
      const unsubscribeAttendees = subscribeToTotalAttendeesCount(user.uid, (count: number) => {
        setStats(prev => ({ ...prev, attendees: count }));
      });
      unsubscribes.push(unsubscribeAttendees);
      
      // Subscribe to reviews count (real-time)
      const unsubscribeReviews = subscribeToReviewsCount(user.uid, (count: number) => {
        setStats(prev => ({ ...prev, reviews: count }));
      });
      unsubscribes.push(unsubscribeReviews);
    }).catch((error) => {
      console.error('[PROFILE_PAGE] Error loading db module:', error);
    });
    
    // Cleanup all subscriptions
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [user?.uid]);
  
  // Get user's hosted events for preview
  const hostedEvents = useMemo(() => {
    if (!user?.uid) return [];
    return allEvents
      .filter(e => e.hostId === user.uid && e.isDraft !== true)
      .slice(0, 6); // Show up to 6 events
  }, [allEvents, user?.uid]);

  // Get user's bio from profile
  const userBio = userProfile?.bio || '';

  const settingsLinks = [
    { label: 'My Pop-ups', action: () => setViewState(ViewState.MY_POPS), icon: Calendar },
    { label: 'Basic Details', action: () => setViewState(ViewState.PROFILE_BASIC), icon: Users },
    { label: 'Notification Preferences', action: () => setViewState(ViewState.PROFILE_NOTIFICATIONS), icon: Settings },
    { label: 'Privacy Settings', action: () => setViewState(ViewState.PROFILE_PRIVACY), icon: Settings },
    { label: 'Get Help', action: () => setViewState(ViewState.HELP), icon: Settings },
    { label: 'Stripe Payout Settings', action: () => setViewState(ViewState.PROFILE_STRIPE), icon: Settings },
    { label: 'Reviews', action: () => setViewState(ViewState.PROFILE_REVIEWS), icon: Star },
    { label: 'Logout', action: onLogout, isLogout: true, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-white pt-20 sm:pt-24 md:pt-28 pb-12 sm:pb-16 md:pb-20 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6 sm:mb-8">
          <button 
            onClick={() => setViewState(ViewState.FEED)} 
            className="flex items-center text-gray-400 hover:text-[#15383c] transition-colors font-medium text-sm sm:text-base touch-manipulation active:scale-95"
          >
            <ChevronLeft size={18} className="sm:w-5 sm:h-5 mr-1" /> Back
          </button>
        </div>

        {/* Hero Section - Cinematic design */}
        <div className="relative mb-12 sm:mb-16 md:mb-20">
          {/* Large Hero Background */}
          <div className="h-48 sm:h-56 md:h-64 lg:h-72 bg-gradient-to-br from-[#15383c] via-[#1f4d52] to-[#15383c] rounded-[32px] md:rounded-[40px] overflow-hidden relative">
            <div className="absolute inset-0 bg-black/20"></div>
          </div>
          
          {/* Profile Picture - Front and center */}
          <div className="absolute -bottom-16 sm:-bottom-20 left-1/2 transform -translate-x-1/2">
            <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white overflow-hidden">
              {profilePicture ? (
                <img 
                  src={profilePicture} 
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = `w-full h-full flex items-center justify-center ${getAvatarBgColor(displayName)} text-white font-heading font-bold text-3xl sm:text-4xl md:text-5xl`;
                      fallback.textContent = initials;
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${getAvatarBgColor(displayName, user?.uid)} text-white font-heading font-bold text-3xl sm:text-4xl md:text-5xl`}>
                  {initials}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Info Section - Premium spacing */}
        <div className="mt-20 sm:mt-24 md:mt-28 mb-12 sm:mb-16 text-center">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl text-[#15383c] mb-4">
            {displayName}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Star size={18} className="text-[#e35e25] fill-[#e35e25]" />
            <span className="text-gray-500 text-sm sm:text-base">Member since Nov '23</span>
          </div>
          
          {/* Bio Section - Clean layout */}
          {userBio && (
            <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              {userBio}
            </p>
          )}
          
          {/* Edit Profile Button - Modern rounded pill */}
          <button 
            onClick={() => setViewState(ViewState.PROFILE_BASIC)} 
            className="px-8 py-3 rounded-full border-2 border-[#15383c] text-[#15383c] text-sm sm:text-base font-bold hover:bg-[#15383c] hover:text-white transition-all bg-white shadow-lg hover:shadow-xl touch-manipulation active:scale-95"
          >
            Edit Profile
          </button>
        </div>

        {/* Stats Section - Minimal icon-count items */}
        <div className="mb-12 sm:mb-16 md:mb-20">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-16">
            {/* Following */}
            <button
              onClick={() => setViewState(ViewState.PROFILE_FOLLOWING)}
              className="flex flex-col items-center gap-2 cursor-pointer touch-manipulation active:scale-95 group"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#e35e25]/10 rounded-full flex items-center justify-center group-hover:bg-[#e35e25]/20 transition-colors">
                <Users size={24} className="text-[#e35e25]" />
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c]">{loading ? '...' : stats.following}</div>
                <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide mt-1">Following</div>
              </div>
            </button>
            
            {/* Events Hosted */}
            <button
              onClick={() => setViewState(ViewState.MY_POPS)}
              className="flex flex-col items-center gap-2 cursor-pointer touch-manipulation active:scale-95 group"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#e35e25]/10 rounded-full flex items-center justify-center group-hover:bg-[#e35e25]/20 transition-colors">
                <Calendar size={24} className="text-[#e35e25]" />
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c]">{loading ? '...' : stats.hosted}</div>
                <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide mt-1">Events</div>
              </div>
            </button>
            
            {/* Attendees */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
                <Users size={24} className="text-[#e35e25]" />
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c]">{loading ? '...' : stats.attendees}</div>
                <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide mt-1">Attendees</div>
              </div>
            </div>
            
            {/* Reviews */}
            <button
              onClick={() => setViewState(ViewState.PROFILE_REVIEWS)}
              className="flex flex-col items-center gap-2 cursor-pointer touch-manipulation active:scale-95 group"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#e35e25]/10 rounded-full flex items-center justify-center group-hover:bg-[#e35e25]/20 transition-colors">
                <Star size={24} className="text-[#e35e25] fill-[#e35e25]" />
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c]">{loading ? '...' : stats.reviews}</div>
                <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide mt-1">Reviews</div>
              </div>
            </button>
            
            {/* Followers */}
            <button
              onClick={() => setViewState(ViewState.PROFILE_FOLLOWERS)}
              className="flex flex-col items-center gap-2 cursor-pointer touch-manipulation active:scale-95 group"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#e35e25]/10 rounded-full flex items-center justify-center group-hover:bg-[#e35e25]/20 transition-colors">
                <Users size={24} className="text-[#e35e25]" />
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c]">{loading ? '...' : stats.followers}</div>
                <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide mt-1">Followers</div>
              </div>
            </button>
          </div>
        </div>

        {/* Total Revenue Card - Premium design */}
        <div 
          className="bg-[#15383c] p-8 sm:p-10 rounded-[32px] md:rounded-[40px] shadow-xl flex justify-between items-center mb-12 sm:mb-16 cursor-pointer hover:shadow-2xl transition-all touch-manipulation active:scale-95 group" 
          onClick={() => setViewState(ViewState.PROFILE_STRIPE)}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <span className="text-white font-bold text-2xl">$</span>
            </div>
            <div>
              <span className="text-white/80 font-medium text-sm sm:text-base block mb-1">Total Revenue</span>
              <span className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-white">${stats.revenue}</span>
            </div>
          </div>
          <ChevronRight size={24} className="text-white/60 group-hover:text-white transition-colors" />
        </div>

        {/* Events Section - Premium grid */}
        {hostedEvents.length > 0 && (
          <div className="mb-12 sm:mb-16 md:mb-20">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-[#15383c]">
                {stats.hosted} Events
              </h2>
              <button
                onClick={() => setViewState(ViewState.MY_POPS)}
                className="text-sm sm:text-base text-gray-600 hover:text-[#15383c] font-medium transition-colors flex items-center gap-2"
              >
                See All
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              {hostedEvents.slice(0, 6).map(event => {
                const eventImage = event.imageUrls?.[0] || event.imageUrl || `https://picsum.photos/seed/${event.id}/400/300`;
                return (
                  <div
                    key={event.id}
                    onClick={() => setViewState(ViewState.MY_POPS)}
                    className="aspect-square rounded-[28px] md:rounded-[32px] overflow-hidden bg-gray-100 cursor-pointer group hover:scale-105 transition-transform duration-300 touch-manipulation active:scale-95 shadow-lg hover:shadow-xl"
                  >
                    <img
                      src={eventImage}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://picsum.photos/seed/${event.id}/400/300`;
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Settings Menu - Premium design */}
        <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-lg border border-gray-100 overflow-hidden">
          {settingsLinks.map((item, idx) => {
            const Icon = item.icon || Settings;
            return (
              <button
                key={idx}
                onClick={item.action}
                className={`w-full flex items-center justify-between p-5 sm:p-6 md:p-7 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors text-left touch-manipulation active:scale-95 ${
                  item.isLogout ? 'text-gray-500 hover:text-red-500' : 'text-[#15383c]'
                }`}
              >
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${
                    item.isLogout ? 'bg-gray-100' : 'bg-[#e35e25]/10'
                  }`}>
                    <Icon size={20} className={`sm:w-6 sm:h-6 ${
                      item.isLogout ? 'text-gray-500' : 'text-[#e35e25]'
                    }`} />
                  </div>
                  <span className={`text-base sm:text-lg md:text-xl ${item.isLogout ? '' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </div>
                <ChevronRight size={20} className="sm:w-6 sm:h-6 text-gray-400" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};