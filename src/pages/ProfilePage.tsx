import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, Event } from '../../types';
import { ChevronRight, ChevronLeft, Calendar, Users, Star, Heart, Settings, Bell, Shield, HelpCircle, CreditCard, LogOut, User } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { useEventStore } from '../../stores/eventStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  subscribeToHostedEventsCount,
  subscribeToAttendedEventsCount,
  subscribeToTotalAttendeesCount,
  subscribeToReviewsCount,
  subscribeToHostRevenue,
  subscribeToUserEventCounts,
  type UserEventCounts
} from '../../firebase/db';
// REFACTORED: Using real-time subscriptions for all metrics
import { 
  subscribeToFollowersCount, 
  subscribeToFollowingCount 
} from '../../firebase/follow';
import { subscribeToUserProfile } from '../../firebase/userSubscriptions';
import { EventCard } from '../../components/events/EventCard';
import { getInitials, getAvatarBgColor } from '../../utils/avatarUtils';
import { RevenueBreakdownModal } from '../../components/profile/RevenueBreakdownModal';

interface ProfilePageProps {
  setViewState: (view: ViewState) => void;
  userName: string;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ setViewState, userName, onLogout }) => {
  const { t } = useLanguage();
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  const refreshUserProfile = useUserStore((state) => state.refreshUserProfile);
  const allEvents = useEventStore((state) => state.events);
  const [stats, setStats] = useState({ 
    revenue: 0, 
    hosted: 0, 
    attendees: 0, 
    following: 0, 
    attended: 0, 
    reviews: 0, 
    followers: 0,
    eventCounts: { hosting: 0, past: 0, drafts: 0, total: 0 } as UserEventCounts
  });
  const [loading, setLoading] = useState(true);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  
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
      setStats({ 
        revenue: 0, 
        hosted: 0, 
        attendees: 0, 
        following: 0, 
        attended: 0, 
        reviews: 0, 
        followers: 0,
        eventCounts: { hosting: 0, past: 0, drafts: 0, total: 0 }
      });
      return;
    }
    
    setLoading(true);
    
    // Track how many subscriptions have fired at least once
    let subscriptionsFired = 0;
    const totalSubscriptions = 8; // followers, following, hosted, attended, attendees, reviews, revenue, eventCounts
    
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
    // Note: This now excludes demo and Popera-owned events
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
    
    // Subscribe to host revenue (real-time) - STATIC IMPORT
    // Calculates total revenue from successful payments on hosted events
    const unsubscribeRevenue = subscribeToHostRevenue(user.uid, (revenue: number) => {
      setStats(prev => ({ ...prev, revenue: revenue }));
      checkLoadingComplete();
    });
    unsubscribes.push(unsubscribeRevenue);
    
    // Subscribe to comprehensive event counts (hosting, past, drafts) - STATIC IMPORT
    const unsubscribeEventCounts = subscribeToUserEventCounts(user.uid, (counts: UserEventCounts) => {
      setStats(prev => ({ ...prev, eventCounts: counts }));
      checkLoadingComplete();
    });
    unsubscribes.push(unsubscribeEventCounts);
    
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
  // Filter criteria matches subscribeToHostedEventsCount: exclude drafts, demos, and Popera-owned events
  const hostedEvents = useMemo(() => {
    if (!user?.uid) return [];
    return allEvents
      .filter(e => 
        e.hostId === user.uid && 
        e.isDraft !== true && 
        e.isDemo !== true && 
        e.isPoperaOwned !== true
      )
      .slice(0, 6); // Show up to 6 events
  }, [allEvents, user?.uid]);

  // Get user's bio from profile
  const userBio = userProfile?.bio || '';

  const settingsLinks = [
    { label: t('profile.myCircles'), action: () => setViewState(ViewState.MY_POPS), icon: Calendar },
    { label: t('profile.basicDetails'), action: () => setViewState(ViewState.PROFILE_BASIC), icon: User },
    { label: t('profile.notificationPreferences'), action: () => setViewState(ViewState.PROFILE_NOTIFICATIONS), icon: Bell },
    { label: t('profile.privacySettings'), action: () => setViewState(ViewState.PROFILE_PRIVACY), icon: Shield },
    { label: t('profile.getHelp'), action: () => setViewState(ViewState.HELP), icon: HelpCircle },
    { label: t('profile.stripePayoutSettings'), action: () => setViewState(ViewState.PROFILE_STRIPE), icon: CreditCard },
    { label: t('profile.reviews'), action: () => setViewState(ViewState.PROFILE_REVIEWS), icon: Star },
    { label: 'Logout', action: onLogout, isLogout: true, icon: LogOut },
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
            <ChevronLeft size={18} className="sm:w-5 sm:h-5 mr-1" /> {t('common.back')}
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
            <span className="text-gray-500 text-sm sm:text-base">{t('profile.memberSince')}</span>
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
            {t('profile.editProfile')}
          </button>
        </div>

        {/* Stats Cards - Liquid Glass Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10">
          {/* Community Card */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[24px] sm:rounded-[28px] shadow-lg border border-gray-100/80 p-5 sm:p-6 hover:shadow-xl transition-all">
            <h3 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{t('profile.community')}</h3>
            <div className="space-y-4">
              {/* Followers */}
              <button
                onClick={() => setViewState(ViewState.PROFILE_FOLLOWERS)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50/80 transition-all group touch-manipulation active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
                    <Users size={18} className="text-[#e35e25]" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-600 font-medium">{t('profile.followers')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">{loading ? '...' : stats.followers}</span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-[#e35e25] transition-colors" />
                </div>
              </button>
              
              {/* Following */}
              <button
                onClick={() => setViewState(ViewState.PROFILE_FOLLOWING)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50/80 transition-all group touch-manipulation active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
                    <Heart size={18} className="text-[#e35e25]" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-600 font-medium">{t('profile.following')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">{loading ? '...' : stats.following}</span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-[#e35e25] transition-colors" />
                </div>
              </button>
              
              {/* Reviews */}
              <button
                onClick={() => setViewState(ViewState.PROFILE_REVIEWS)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50/80 transition-all group touch-manipulation active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
                    <Star size={18} className="text-[#e35e25] fill-[#e35e25]" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-600 font-medium">{t('profile.reviews')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">{loading ? '...' : stats.reviews}</span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-[#e35e25] transition-colors" />
                </div>
              </button>
            </div>
          </div>
          
          {/* Performance Card */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[24px] sm:rounded-[28px] shadow-lg border border-gray-100/80 p-5 sm:p-6 hover:shadow-xl transition-all">
            <h3 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{t('profile.performance')}</h3>
            <div className="space-y-4">
              {/* My Events - Combined count (hosting + attending + drafts + past) */}
              <button
                onClick={() => setViewState(ViewState.MY_POPS)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50/80 transition-all group touch-manipulation active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
                    <Calendar size={18} className="text-[#e35e25]" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-600 font-medium">{t('profile.myEvents')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">{loading ? '...' : (stats.eventCounts.total + stats.attended)}</span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-[#e35e25] transition-colors" />
                </div>
              </button>
              
              {/* Total Attendees */}
              <div className="flex items-center justify-between p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
                    <Users size={18} className="text-[#e35e25]" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-600 font-medium">{t('profile.totalAttendees')}</span>
                </div>
                <span className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">{loading ? '...' : stats.attendees}</span>
              </div>
              
              {/* Hosting - Upcoming events only */}
              <button
                onClick={() => setViewState(ViewState.MY_POPS)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50/80 transition-all group touch-manipulation active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
                    <Calendar size={18} className="text-[#e35e25]" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-600 font-medium">{t('profile.hosting')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">{loading ? '...' : stats.eventCounts.hosting}</span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-[#e35e25] transition-colors" />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Total Revenue Card - Liquid Glass Dark */}
        <button 
          className="w-full bg-gradient-to-r from-[#15383c] to-[#1a4549] backdrop-blur-xl p-6 sm:p-7 rounded-[24px] sm:rounded-[28px] shadow-xl border border-[#15383c]/50 flex justify-between items-center mb-8 sm:mb-10 cursor-pointer hover:shadow-2xl hover:scale-[1.01] transition-all touch-manipulation active:scale-[0.98] group" 
          onClick={() => setIsRevenueModalOpen(true)}
          aria-label="View revenue breakdown"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/25 transition-all border border-white/20">
              <span className="text-white font-bold text-lg sm:text-xl">$</span>
            </div>
            <div className="text-left">
              <span className="text-white/70 font-medium text-xs sm:text-sm block mb-0.5">{t('profile.totalRevenue')}</span>
              <span className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white">${stats.revenue}</span>
            </div>
          </div>
          <ChevronRight size={22} className="text-white/50 group-hover:text-white transition-colors" />
        </button>

        {/* Events Section - Premium grid */}
        {hostedEvents.length > 0 && (
          <div className="mb-8 sm:mb-10">
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <h2 className="font-heading font-bold text-xl sm:text-2xl md:text-3xl text-[#15383c]">
                {t('profile.myEvents')}
              </h2>
              <button
                onClick={() => setViewState(ViewState.MY_POPS)}
                className="text-sm sm:text-base text-gray-600 hover:text-[#15383c] font-medium transition-colors flex items-center gap-2"
              >
                {t('profile.seeAll')}
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

        {/* Settings Menu - Enhanced Liquid Glass Style */}
        <div className="relative overflow-hidden rounded-[24px] sm:rounded-[28px]">
          {/* Glass background layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/90 to-white/85" />
          <div className="absolute inset-0 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#15383c]/3 via-transparent to-[#e35e25]/3" />
          <div className="absolute inset-0 border border-white/60 rounded-[24px] sm:rounded-[28px]" />
          <div className="absolute inset-0 shadow-lg" />
          
          <div className="relative">
            <h3 className="text-xs sm:text-sm font-bold text-[#15383c]/50 uppercase tracking-wider px-5 sm:px-6 pt-5 sm:pt-6 pb-3">{t('profile.settings')}</h3>
            {settingsLinks.map((item, idx) => {
              const Icon = item.icon || Settings;
              const isLast = idx === settingsLinks.length - 1;
              return (
                <button
                  key={idx}
                  onClick={item.action}
                  className={`w-full flex items-center justify-between px-5 sm:px-6 py-4 sm:py-4.5 transition-all text-left touch-manipulation active:scale-[0.98] group ${
                    !isLast ? 'border-b border-gray-100/40' : ''
                  } ${
                    item.isLogout 
                      ? 'hover:bg-red-50/50' 
                      : 'hover:bg-[#15383c]/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      item.isLogout 
                        ? 'bg-gray-100/80 group-hover:bg-red-100' 
                        : 'bg-[#15383c]/8 group-hover:bg-[#15383c]/12'
                    }`}>
                      <Icon size={18} className={`transition-colors ${
                        item.isLogout 
                          ? 'text-gray-400 group-hover:text-red-500' 
                          : 'text-[#15383c]/70 group-hover:text-[#15383c]'
                      }`} />
                    </div>
                    <span className={`text-sm sm:text-base font-medium transition-colors ${
                      item.isLogout 
                        ? 'text-gray-500 group-hover:text-red-500' 
                        : 'text-[#15383c] group-hover:text-[#15383c]'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight size={16} className={`transition-all ${
                    item.isLogout 
                      ? 'text-gray-300 group-hover:text-red-400' 
                      : 'text-gray-300 group-hover:text-[#15383c]/50 group-hover:translate-x-0.5'
                  }`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Revenue Breakdown Modal */}
      {user?.uid && (
        <RevenueBreakdownModal
          isOpen={isRevenueModalOpen}
          onClose={() => setIsRevenueModalOpen(false)}
          hostId={user.uid}
          totalRevenue={stats.revenue}
        />
      )}
    </div>
  );
};