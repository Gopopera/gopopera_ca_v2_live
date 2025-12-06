import React, { useState, useEffect } from 'react';
import { ViewState, Event } from '../types';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useUserStore } from '../stores/userStore';
import { useEventStore } from '../stores/eventStore';
import { getReservationCountForEvent, listHostReviews, getUserProfile } from '../firebase/db';
import { getFollowingHosts, getHostFollowers } from '../firebase/follow';

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
  
  // State for profile picture (synced from Firestore - always latest)
  const [profilePicture, setProfilePicture] = useState<string | null>(
    userProfile?.photoURL || userProfile?.imageUrl || user?.photoURL || user?.profileImageUrl || null
  );
  
  // Fetch profile picture from Firestore (source of truth) and refresh periodically
  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (!user?.uid) {
        setProfilePicture(null);
        return;
      }
      
      try {
        // ALWAYS fetch from Firestore to ensure we have the latest profile picture
        const freshProfile = await getUserProfile(user.uid);
        if (freshProfile) {
          // Priority: photoURL > imageUrl (both from Firestore - always latest)
          const latestPic = freshProfile.photoURL || freshProfile.imageUrl || null;
          setProfilePicture(latestPic);
        } else {
          // Fallback to user store if Firestore fetch fails
          const fallbackPic = userProfile?.photoURL || userProfile?.imageUrl || user?.photoURL || user?.profileImageUrl || null;
          setProfilePicture(fallbackPic);
        }
      } catch (error) {
        console.warn('[PROFILE_PAGE] Failed to fetch profile picture:', error);
        // Fallback to user store on error
        const fallbackPic = userProfile?.photoURL || userProfile?.imageUrl || user?.photoURL || user?.profileImageUrl || null;
        setProfilePicture(fallbackPic);
      }
    };
    
    // Fetch immediately
    fetchProfilePicture();
    
    // Refresh profile picture every 5 seconds to catch updates
    // This ensures profile picture updates are reflected immediately
    const refreshInterval = setInterval(() => {
      fetchProfilePicture();
    }, 5000); // Refresh every 5 seconds
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [user?.uid, userProfile?.photoURL, userProfile?.imageUrl, user?.photoURL, user?.profileImageUrl]);
  
  const displayName = user?.displayName || user?.name || userName;
  const initials = displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'P';
  
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
  const settingsLinks = [
    { label: 'My Pop-ups', action: () => setViewState(ViewState.MY_POPS) },
    { label: 'Basic Details', action: () => setViewState(ViewState.PROFILE_BASIC) },
    { label: 'Notification Preferences', action: () => setViewState(ViewState.PROFILE_NOTIFICATIONS) },
    { label: 'Privacy Settings', action: () => setViewState(ViewState.PROFILE_PRIVACY) },
    { label: 'Get Help', action: () => setViewState(ViewState.HELP) },
    { label: 'Stripe Payout Settings', action: () => setViewState(ViewState.PROFILE_STRIPE) },
    { label: 'Reviews', action: () => setViewState(ViewState.PROFILE_REVIEWS) },
    { label: 'Logout', action: onLogout, isLogout: true },
  ];
  return (
    <div className="min-h-screen bg-[#f8fafb] pt-20 sm:pt-24 md:pt-28 pb-12 sm:pb-16 md:pb-20 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4 sm:mb-6"><button onClick={() => setViewState(ViewState.FEED)} className="flex items-center text-gray-400 hover:text-[#15383c] transition-colors font-medium text-sm sm:text-base touch-manipulation active:scale-95"><ChevronLeft size={18} className="sm:w-5 sm:h-5 mr-1" /> Back</button></div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-[#15383c] mb-6 sm:mb-8">Profile</h1>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8">
           <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-[#e35e25] rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-lg shadow-orange-900/20 shrink-0 overflow-hidden">
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
                     const fallback = document.createElement('span');
                     fallback.className = 'font-heading font-bold text-white text-3xl sm:text-4xl md:text-5xl';
                     fallback.textContent = initials;
                     parent.appendChild(fallback);
                   }
                 }}
               />
             ) : (
               <span className="font-heading font-bold text-white text-3xl sm:text-4xl md:text-5xl">{initials}</span>
             )}
           </div>
           <div className="flex-1 min-w-0"><p className="text-[#15383c] font-medium text-base sm:text-lg md:text-xl truncate">@{userName.toLowerCase().replace(/\s/g, '') || 'user'}</p><p className="text-gray-500 text-xs sm:text-sm md:text-base mb-3">Member since Nov '23</p><button onClick={() => setViewState(ViewState.PROFILE_BASIC)} className="px-5 sm:px-6 md:px-7 py-1.5 sm:py-2 rounded-full border border-gray-200 text-xs sm:text-sm md:text-base font-medium text-gray-600 hover:bg-white hover:border-[#15383c] hover:text-[#15383c] transition-all bg-white shadow-sm touch-manipulation active:scale-95">Edit</button></div>
        </div>
        {/* Total Revenue Card */}
        <div className="bg-white p-5 sm:p-6 md:p-7 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center mb-6 sm:mb-8 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setViewState(ViewState.PROFILE_STRIPE)}>
          <span className="text-gray-500 font-medium text-sm sm:text-base md:text-lg">Total Revenue</span>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-[#15383c]">${stats.revenue}</span>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </div>
        
        {/* Metrics Grid */}
        <div className="mb-8 sm:mb-10">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
            {/* Events Hosted */}
            <div className="bg-white p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <span className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c] mb-1">{loading ? '...' : stats.hosted}</span>
              <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 uppercase tracking-wide">Events Hosted</span>
            </div>
            
            {/* Attendees (accumulated) */}
            <div className="bg-white p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <span className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c] mb-1">{loading ? '...' : stats.attendees}</span>
              <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 uppercase tracking-wide">Attendees</span>
            </div>
            
            {/* Following - Clickable */}
            <div 
              className="bg-white p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setViewState(ViewState.PROFILE_FOLLOWING)}
            >
              <span className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c] mb-1">{loading ? '...' : stats.following}</span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 uppercase tracking-wide">Following</span>
                <ChevronRight size={12} className="text-gray-400" />
              </div>
            </div>
            
            {/* Events Attended */}
            <div className="bg-white p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <span className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c] mb-1">{loading ? '...' : stats.attended}</span>
              <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 uppercase tracking-wide">Events Attended</span>
            </div>
            
            {/* Reviews - Clickable */}
            <div 
              className="bg-white p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setViewState(ViewState.PROFILE_REVIEWS)}
            >
              <span className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c] mb-1">{loading ? '...' : stats.reviews}</span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 uppercase tracking-wide">Reviews</span>
                <ChevronRight size={12} className="text-gray-400" />
              </div>
            </div>
            
            {/* Followers - Clickable */}
            <div 
              className="bg-white p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setViewState(ViewState.PROFILE_FOLLOWERS)}
            >
              <span className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c] mb-1">{loading ? '...' : stats.followers}</span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 uppercase tracking-wide">Followers</span>
                <ChevronRight size={12} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">{settingsLinks.map((item, idx) => (<button key={idx} onClick={item.action} className={`w-full flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors text-left touch-manipulation active:scale-95 ${item.isLogout ? 'text-gray-500 hover:text-red-500' : 'text-[#15383c]'}`}><span className={`text-sm sm:text-base md:text-lg ${item.isLogout ? '' : 'font-light'}`}>{item.label}</span><div className="flex items-center gap-3 shrink-0"><ChevronRight size={16} className="sm:w-[18px] sm:h-[18px] md:w-5 md:h-5 text-gray-400" /></div></button>))}</div>
      </div>
    </div>
  );
};