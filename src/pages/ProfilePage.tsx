import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, Event } from '../../types';
import { ChevronRight, ChevronLeft, Calendar, Users, Star, Heart, Settings } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { useEventStore } from '../../stores/eventStore';
import { 
  subscribeToHostedEventsCount,
  subscribeToAttendedEventsCount,
  subscribeToTotalAttendeesCount,
  subscribeToReviewsCount
} from '../../firebase/db';
// REFACTORED: Using real-time subscriptions for all metrics
import { 
  subscribeToFollowersCount, 
  subscribeToFollowingCount 
} from '../../firebase/follow';
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
  const refreshUserProfile = useUserStore((state) => state.refreshUserProfile);
  const allEvents = useEventStore((state) => state.events);
  const [stats, setStats] = useState({ revenue: 30, hosted: 0, attendees: 0, following: 0, attended: 0, reviews: 0, followers: 0 });
  const [loading, setLoading] = useState(true);
  
  // Auto-navigate to Stripe settings if returning from Stripe onboarding
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_return') === 'true') {
      setViewState(ViewState.PROFILE_STRIPE);
      // Clean up URL
      window.history.replaceState({}, '', '/profile');
    }
  }, [setViewState]);
  
  // REFACTORED: Real-time subscription to /users/{userId} - single source of truth
  // Initialize with null - subscription will provide the real data
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>(userName);
  
  // Generate a consistent random color for default cover based on user ID
  const getDefaultCoverGradient = React.useMemo(() => {
    if (!user?.uid) return 'linear-gradient(135deg, #15383c 0%, #1a4549 50%, #15383c 100%)';
    // Use user ID to generate a consistent color
    const hash = user.uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `linear-gradient(135deg, hsl(${hue}, 30%, 25%) 0%, hsl(${(hue + 20) % 360}, 35%, 30%) 50%, hsl(${hue}, 30%, 25%) 100%)`;
  }, [user?.uid]);
  
  // Track if subscription has provided data yet
  const hasSubscriptionDataRef = React.useRef(false);
  
  useEffect(() => {
    if (!user?.uid) {
      setProfilePicture(null);
      setCoverPhoto(null);
      setDisplayName(userName);
      return;
    }
    
    // Reset ref when user changes
    hasSubscriptionDataRef.current = false;
    
    if (import.meta.env.DEV) {
      console.log('[PROFILE_PAGE] 📡 Subscribing to user profile:', { userId: user.uid });
    }
    
    let unsubscribe: (() => void) | null = null;
    
    // Real-time subscription to user document - SINGLE SOURCE OF TRUTH
    try {
      unsubscribe = subscribeToUserProfile(user.uid, (userData) => {
        hasSubscriptionDataRef.current = true;
        if (userData) {
          setProfilePicture(userData.photoURL || null);
          setCoverPhoto(userData.coverPhotoURL || null);
          setDisplayName(userData.displayName || userName);
          
          if (import.meta.env.DEV) {
            console.log('[PROFILE_PAGE] ✅ User profile updated from Firestore:', {
              userId: user.uid,
              displayName: userData.displayName,
              hasPhoto: !!userData.photoURL,
              hasCoverPhoto: !!userData.coverPhotoURL,
            });
          }
        } else {
          // User document doesn't exist - use fallback
          setProfilePicture(null);
          setCoverPhoto(null);
          setDisplayName(userName);
        }
      });
    } catch (error) {
      console.error('[PROFILE_PAGE] ❌ Error loading user subscriptions:', error);
      setProfilePicture(null);
      setCoverPhoto(null);
      setDisplayName(userName);
    }
    
    return () => {
      if (unsubscribe) {
        if (import.meta.env.DEV) {
          console.log('[PROFILE_PAGE] 🧹 Unsubscribing from user profile:', { userId: user.uid });
        }
        unsubscribe();
      }
    };
  }, [user?.uid, userName]); // Only depend on uid and userName - NOT store photoURL values
  const initials = getInitials(displayName);
  
  // Subscribe to ALL real-time metrics updates (no initial async calculation to avoid race conditions)
  // FIXED: Use static imports and synchronous subscription setup to ensure metrics update in real-time
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      setStats({ revenue: 0, hosted: 0, attendees: 0, following: 0, attended: 0, reviews: 0, followers: 0 });
      return;
    }
    
    setLoading(true);
    
    // Track how many subscriptions have fired at least once
    let subscriptionsFired = 0;
    const totalSubscriptions = 6; // followers, following, hosted, attended, attendees, reviews
    
    const checkLoadingComplete = () => {
      subscriptionsFired++;
      if (subscriptionsFired >= totalSubscriptions) {
        setLoading(false);
      }
    };
    
    // All subscriptions are set up synchronously using static imports
    const unsubscribes: (() => void)[] = [];
    
    // Subscribe to followers count (real-time) - STATIC IMPORT
    const unsubscribeFollowers = subscribeToFollowersCount(user.uid, (count: number) => {
      setStats(prev => ({ ...prev, followers: count }));
      checkLoadingComplete();
    });
    unsubscribes.push(unsubscribeFollowers);
    
    // Subscribe to following count (real-time) - STATIC IMPORT
    const unsubscribeFollowing = subscribeToFollowingCount(user.uid, (count: number) => {
      setStats(prev => ({ ...prev, following: count }));
      checkLoadingComplete();
    });
    unsubscribes.push(unsubscribeFollowing);
    
    // Subscribe to hosted events count (real-time) - STATIC IMPORT
    const unsubscribeHosted = subscribeToHostedEventsCount(user.uid, (count: number) => {
      setStats(prev => ({ ...prev, hosted: count }));
      checkLoadingComplete();
    });
    unsubscribes.push(unsubscribeHosted);
    
    // Subscribe to attended events count (real-time) - STATIC IMPORT
    const unsubscribeAttended = subscribeToAttendedEventsCount(user.uid, (count: number) => {
      setStats(prev => ({ ...prev, attended: count }));
      checkLoadingComplete();
    });
    unsubscribes.push(unsubscribeAttended);
    
    // Subscribe to total attendees count across all hosted events (real-time) - STATIC IMPORT
    const unsubscribeAttendees = subscribeToTotalAttendeesCount(user.uid, (count: number) => {
      setStats(prev => ({ ...prev, attendees: count }));
      checkLoadingComplete();
    });
    unsubscribes.push(unsubscribeAttendees);
    
    // Subscribe to reviews count (real-time) - STATIC IMPORT
    const unsubscribeReviews = subscribeToReviewsCount(user.uid, (count: number) => {
      setStats(prev => ({ ...prev, reviews: count }));
      checkLoadingComplete();
    });
    unsubscribes.push(unsubscribeReviews);
    
    // Fallback: if subscriptions don't fire within 3 seconds, stop loading
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 3000);
    
    // Cleanup all subscriptions
    return () => {
      clearTimeout(loadingTimeout);
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [user?.uid]);

  // Cleanup pending reviews for eatezca@gmail.com (run once on mount)
  useEffect(() => {
    if (user?.email === 'eatezca@gmail.com' && user?.uid) {
      // Run cleanup once - check if we've already run it this session
      const cleanupKey = `cleanup_reviews_${user.uid}`;
      const hasRunCleanup = sessionStorage.getItem(cleanupKey);
      
      if (!hasRunCleanup) {
        console.log('[PROFILE] Running cleanup for pending reviews...');
        import('../../utils/cleanupPendingReviews').then(({ deletePendingReviewsForHost }) => {
          deletePendingReviewsForHost(user.uid).then(result => {
            console.log('[PROFILE] Cleanup result:', result);
            sessionStorage.setItem(cleanupKey, 'true');
            // Refresh profile to update review count
            refreshUserProfile();
          }).catch(error => {
            console.error('[PROFILE] Cleanup error:', error);
          });
        }).catch(error => {
          console.error('[PROFILE] Failed to load cleanup module:', error);
        });
      }
    }
  }, [user?.email, user?.uid, refreshUserProfile]);
  
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
    { label: 'My Circles', action: () => setViewState(ViewState.MY_POPS), icon: Calendar },
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
          {/* Large Hero Background - Custom cover photo or random gradient */}
          <div 
            className="h-48 sm:h-56 md:h-64 lg:h-72 rounded-[32px] md:rounded-[40px] overflow-hidden relative"
            style={{
              background: coverPhoto 
                ? `url(${coverPhoto}) center/cover no-repeat` 
                : getDefaultCoverGradient
            }}
          >
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
          
          {/* Edit Profile Button - Liquid Glass Style */}
          <button 
            onClick={() => setViewState(ViewState.PROFILE_BASIC)} 
            className="px-7 py-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-[#15383c]/30 text-[#15383c] text-sm sm:text-base font-semibold hover:bg-white hover:border-[#15383c] transition-all shadow-sm touch-manipulation active:scale-95"
          >
            Edit Profile
          </button>
        </div>

        {/* Stats Section - Liquid Glass Style */}
        <div className="mb-12 sm:mb-16 md:mb-20">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 md:gap-14">
            {/* Following */}
            <button
              onClick={() => setViewState(ViewState.PROFILE_FOLLOWING)}
              className="flex flex-col items-center gap-2 cursor-pointer touch-manipulation active:scale-95 group"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-full flex items-center justify-center group-hover:bg-white group-hover:border-[#e35e25]/30 transition-all shadow-sm">
                <Users size={20} className="text-[#e35e25]" />
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
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-full flex items-center justify-center group-hover:bg-white group-hover:border-[#e35e25]/30 transition-all shadow-sm">
                <Calendar size={20} className="text-[#e35e25]" />
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c]">{loading ? '...' : stats.hosted}</div>
                <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide mt-1">Events</div>
              </div>
            </button>
            
            {/* Attendees */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-full flex items-center justify-center shadow-sm">
                <Users size={20} className="text-[#e35e25]" />
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
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-full flex items-center justify-center group-hover:bg-white group-hover:border-[#e35e25]/30 transition-all shadow-sm">
                <Star size={20} className="text-[#e35e25] fill-[#e35e25]" />
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
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-full flex items-center justify-center group-hover:bg-white group-hover:border-[#e35e25]/30 transition-all shadow-sm">
                <Users size={20} className="text-[#e35e25]" />
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c]">{loading ? '...' : stats.followers}</div>
                <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide mt-1">Followers</div>
              </div>
            </button>
          </div>
        </div>

        {/* Total Revenue Card - Liquid Glass Dark */}
        <div 
          className="bg-[#15383c]/90 backdrop-blur-xl p-7 sm:p-9 rounded-[28px] md:rounded-[36px] shadow-xl border border-[#15383c]/50 flex justify-between items-center mb-12 sm:mb-16 cursor-pointer hover:shadow-2xl transition-all touch-manipulation active:scale-95 group" 
          onClick={() => setViewState(ViewState.PROFILE_STRIPE)}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/25 transition-all border border-white/20">
              <span className="text-white font-bold text-xl">$</span>
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

        {/* Settings Menu - Liquid Glass Style */}
        <div className="bg-white/90 backdrop-blur-sm rounded-[28px] md:rounded-[36px] shadow-lg border border-white/60 overflow-hidden">
          {settingsLinks.map((item, idx) => {
            const Icon = item.icon || Settings;
            return (
              <button
                key={idx}
                onClick={item.action}
                className={`w-full flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-100/80 last:border-0 hover:bg-white/80 transition-all text-left touch-manipulation active:scale-95 ${
                  item.isLogout ? 'text-gray-500 hover:text-red-500' : 'text-[#15383c]'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center backdrop-blur-sm ${
                    item.isLogout ? 'bg-gray-100/80 border border-gray-200/60' : 'bg-white/80 border border-gray-200/60'
                  }`}>
                    <Icon size={18} className={`sm:w-5 sm:h-5 ${
                      item.isLogout ? 'text-gray-500' : 'text-[#e35e25]'
                    }`} />
                  </div>
                  <span className={`text-base sm:text-lg ${item.isLogout ? '' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </div>
                <ChevronRight size={18} className="sm:w-5 sm:h-5 text-gray-400" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};