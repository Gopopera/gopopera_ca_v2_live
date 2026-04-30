import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, Star, Users, Instagram, Twitter, Globe, Check, Calendar, Link as LinkIcon } from 'lucide-react';
import { Event, ViewState } from '@/types';
import { EventCard } from '../events/EventCard';
import { useProfileStore } from '@/stores/profileStore';
import { useUserStore } from '@/stores/userStore';
import { POPERA_HOST_ID, POPERA_HOST_NAME } from '@/src/constants/popera';
import { PoperaProfilePicture } from './PoperaProfilePicture';
import { SeoHelmet } from '../seo/SeoHelmet';
import { formatDate } from '@/utils/dateFormatter';
import { formatRating } from '@/utils/formatRating';
import { getUserProfile, findUserIdByDisplayName } from '@/firebase/db';
import { FirestoreReview } from '@/firebase/types';
import { useHostData } from '@/hooks/useHostProfileCache';
import { useHostReviews } from '@/hooks/useHostReviewsCache';
import { getInitials, getAvatarBgColor } from '@/utils/avatarUtils';
import { MetricSkeleton } from '@/components/ui/MetricSkeleton';

interface HostProfileProps {
  hostName: string;
  hostId?: string; // Pass hostId directly for reliable profile picture sync
  onBack: () => void;
  onEventClick: (event: Event) => void;
  allEvents: Event[];
  isLoggedIn?: boolean;
  favorites?: string[];
  onToggleFavorite?: (e: React.MouseEvent, eventId: string) => void;
}

export const HostProfile: React.FC<HostProfileProps> = ({ hostName, hostId: propHostId, onBack, onEventClick, allEvents, isLoggedIn, favorites = [], onToggleFavorite }) => {
  const [activeTab, setActiveTab] = useState<'events' | 'reviews'>('events');
  const [error, setError] = useState<string | null>(null);
  const currentUser = useUserStore((state) => state.getCurrentUser());
  const userProfile = useUserStore((state) => state.userProfile);
  const isPoperaProfile = hostName === POPERA_HOST_NAME;
  
  // Synchronous resolution from props/events on each render. Feeds the sticky
  // capture below — we never read this directly for UI to avoid flicker when
  // allEvents updates and momentarily drops this host.
  // Case-insensitive match: URL slug case may differ from event hostName case.
  const derivedHostId = useMemo(() => {
    if (propHostId) return propHostId;
    if (!hostName) return null;
    const lower = hostName.toLowerCase();
    const hostEvent = allEvents.find(e =>
      e.hostId && (
        e.hostName?.toLowerCase() === lower ||
        e.host?.toLowerCase() === lower
      )
    );
    if (hostEvent?.hostId) return hostEvent.hostId;
    if (isPoperaProfile) return POPERA_HOST_ID;
    return null;
  }, [propHostId, allEvents, hostName, isPoperaProfile]);

  // Soft existence check: are there any events for this host name (regardless of
  // whether they carry a hostId)? Old events sometimes lack the hostId field, so
  // derivedHostId can stay null even when the host clearly exists. We use this to
  // gate the "Host not found" UI — if events match by name, the host exists and
  // we should render the page (without uid-dependent data) rather than block it.
  const hasHostEvents = useMemo(() => {
    if (!hostName) return false;
    const lower = hostName.toLowerCase();
    return allEvents.some(e =>
      e.hostName?.toLowerCase() === lower ||
      e.host?.toLowerCase() === lower
    );
  }, [allEvents, hostName]);

  // Sticky resolved hostId. Once set from any source it never reverts to null
  // for the same host — this prevents the brief "Host not found" flicker that
  // happened when allEvents updated and the host's events disappeared from the
  // snapshot mid-life.
  const [resolvedHostId, setResolvedHostId] = useState<string | null>(
    propHostId || (isPoperaProfile ? POPERA_HOST_ID : null)
  );
  const [hostLookupComplete, setHostLookupComplete] = useState<boolean>(
    !!propHostId || isPoperaProfile
  );

  // Reset sticky state when navigating to a different host (hostName changes).
  const lastHostNameRef = useRef(hostName);
  useEffect(() => {
    if (lastHostNameRef.current === hostName) return;
    lastHostNameRef.current = hostName;
    setResolvedHostId(propHostId || (isPoperaProfile ? POPERA_HOST_ID : null));
    setHostLookupComplete(!!propHostId || isPoperaProfile);
  }, [hostName, propHostId, isPoperaProfile]);

  // Sticky capture: as soon as derivedHostId resolves, save it and stop listening.
  useEffect(() => {
    if (derivedHostId && !resolvedHostId) {
      setResolvedHostId(derivedHostId);
      setHostLookupComplete(true);
    }
  }, [derivedHostId, resolvedHostId]);

  // Async Firestore fallback — only fires if the sync sources didn't produce a
  // hostId within a brief grace period. Gives allEvents a chance to load before
  // we resort to a name-based lookup that may fail on displayName mismatch.
  useEffect(() => {
    if (resolvedHostId || !hostName) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      findUserIdByDisplayName(hostName).then(uid => {
        if (cancelled) return;
        if (uid) setResolvedHostId(uid);
        setHostLookupComplete(true);
      });
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [resolvedHostId, hostName]);

  const hostId = resolvedHostId;
  // Only treat as "not found" if the async lookup completed AND we have no
  // hostId AND no events match by name. The events-by-name check covers the
  // case where derivedHostId failed because old events lack a hostId field.
  const hostNotFound = hostLookupComplete && !hostId && !isPoperaProfile && !hasHostEvents;
  const isOwnProfile = !!hostId && !!currentUser?.id && currentUser.id === hostId;

  // Copy public host-page URL — used by the share button when the viewer is the host themselves.
  const [linkCopied, setLinkCopied] = useState(false);
  const copyOwnHostLink = async () => {
    if (!hostName) return;
    const url = `${window.location.origin}/host/${encodeURIComponent(hostName)}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Older browsers / private mode: silently no-op
    }
  };
  
  // Safe fallback if hostName is missing
  const displayName = hostName || 'Unknown Host';
  
  // FIX: Always call hooks unconditionally (React rules)
  const followHost = useProfileStore((state) => state.followHost);
  const unfollowHost = useProfileStore((state) => state.unfollowHost);
  const profileStore = useProfileStore();
  
  // Use unified host data hook (includes profile picture, followers count)
  const hostData = useHostData(hostId);
  
  // Use reviews cache hook
  const { reviews: cachedReviews, averageRating, reviewCount, isLoading: reviewsLoading } = useHostReviews(hostId);
  
  // State for reviews with user photos (fetched separately for display)
  interface ReviewWithPhoto extends FirestoreReview {
    userPhoto?: string | null;
  }
  const [firestoreReviews, setFirestoreReviews] = useState<ReviewWithPhoto[]>([]);
  
  // Fetch reviewer profile pictures for display (only when reviews are loaded)
  useEffect(() => {
    if (!hostId || reviewsLoading || cachedReviews.length === 0) {
      setFirestoreReviews([]);
      return;
    }
    
    const loadReviewPhotos = async () => {
      try {
        const reviewsWithPhotos = await Promise.all(
          cachedReviews.map(async (review) => {
            // First check if review has stored photo URL (for seeded/migrated reviews)
            if ((review as any).userPhotoURL) {
              return { ...review, userPhoto: (review as any).userPhotoURL };
            }
            // Otherwise fetch from user profile
            try {
              const userProfile = await getUserProfile(review.userId);
              return {
                ...review,
                userPhoto: userProfile?.photoURL || userProfile?.imageUrl || null,
              };
            } catch {
              return { ...review, userPhoto: null };
            }
          })
        );
        
        setFirestoreReviews(reviewsWithPhotos);
      } catch (error) {
        console.error('[HOST_PROFILE] Error loading review photos:', error);
        setFirestoreReviews(cachedReviews.map(r => ({ ...r, userPhoto: null })));
      }
    };
    
    loadReviewPhotos();
  }, [hostId, cachedReviews, reviewsLoading]);
  
  // Use reviews with photos if available, otherwise use cached reviews
  const reviews = firestoreReviews.length > 0 ? firestoreReviews : cachedReviews.map(r => ({ ...r, userPhoto: null }));
  
  // Generate a consistent random color for default cover based on host ID
  const getDefaultCoverGradient = useMemo(() => {
    if (!hostId) return 'linear-gradient(135deg, #e35e25 0%, #15383c 100%)';
    // Use host ID to generate a consistent color
    const hash = hostId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `linear-gradient(135deg, hsl(${hue}, 40%, 35%) 0%, hsl(${(hue + 40) % 360}, 35%, 25%) 100%)`;
  }, [hostId]);
  
  // Get real data from profile store - call hooks unconditionally, then use conditionally
  const isFollowing = hostId ? profileStore.isFollowing(currentUser?.id || '', hostId) : false;
  
  // Extract values from hostData hook
  const hostProfilePicture = hostData?.photoURL || null;
  const hostCoverPhoto = hostData?.coverPhotoURL || null;
  const hostMemberSince = hostData?.createdAt || null;
  const followersCount = hostData?.followersCount ?? 0;
  const hostDataLoading = hostData?.isLoading === true;
  
  // Filter events by host - uses same logic as Explore page for consistency
  // FIXED: Removed Popera-specific filter that was causing mismatch with Explore
  // Bug: HostProfile showed 0 events while Explore showed 2 for same host
  // Root cause: Extra filter requiring isOfficialLaunch || demoType === "city-launch"
  const hostEvents = useMemo(() => {
    // Filter by hostId first (primary), fall back to hostName matching (backward compatibility)
    const filtered = allEvents.filter(e => {
      // Primary: Match by hostId if available
      if (hostId && e.hostId) {
        return e.hostId === hostId;
      }
      // Fallback: Match by hostName or host field (backward compatibility)
      return e.hostName === hostName || e.host === hostName;
    });
    
    if (import.meta.env.DEV) {
      console.log('[HOST_PROFILE] Events filter result:', {
        hostId,
        hostName,
        totalEvents: allEvents.length,
        filteredCount: filtered.length,
        filteredTitles: filtered.map(e => e.title),
      });
    }
    
    // FIX: Return all events from this host - same as Explore page
    // This ensures Host Profile and Explore are always consistent
    return filtered;
  }, [allEvents, hostId, hostName]);
  
  // Get primary city from events
  const primaryCity = useMemo(() => {
    const cities = hostEvents.map(e => e.city);
    const cityCounts = cities.reduce((acc, city) => {
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const entries = Object.entries(cityCounts) as [string, number][];
    const mostCommonCity = entries.sort((a, b) => b[1] - a[1])[0];
    return mostCommonCity ? `${mostCommonCity[0]}, CA` : 'Montreal, CA';
  }, [hostEvents]);
  
  // Bio text
  const bio = isPoperaProfile 
    ? "Popera is where local events come alive. We help creators, organizers, and communities host 10–1000 person events that bring people together. From hands-on workshops to meaningful gatherings, Popera makes it easy to connect with your neighbors and create real-world experiences. Join our early-user community and help shape the future of in-person connection."
    : "Community organizer and event host.";
  
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

  // Host-not-found: deep link to /host/{name} resolved no user.
  if (hostNotFound) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-12">
        <div className="max-w-5xl mx-auto px-6">
          <button onClick={onBack} className="flex items-center text-gray-500 hover:text-popera-teal transition-colors font-medium mb-6">
            <ArrowLeft size={20} className="mr-2" /> Back
          </button>
          <div className="bg-white rounded-2xl p-8 text-center">
            <h2 className="text-xl font-semibold text-[#15383c] mb-2">Host not found</h2>
            <p className="text-gray-500">We couldn't find a host called "{displayName}".</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-20 pb-12 font-sans">
      {/* SEO: Dynamic meta tags for host profile page */}
      <SeoHelmet 
        viewState={ViewState.HOST_PROFILE} 
        hostName={displayName} 
        hostBio={bio}
        hostPhotoUrl={hostProfilePicture || undefined}
      />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Back Button + (own profile) Share-link Button */}
        <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center text-gray-400 hover:text-[#15383c] transition-colors font-medium text-sm sm:text-base touch-manipulation active:scale-95"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5 mr-1" /> Back
          </button>
          {isOwnProfile && (
            <button
              onClick={copyOwnHostLink}
              aria-label="Copy your public host page link"
              title="Copy your public host page link"
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-gray-200 hover:border-[#15383c] hover:shadow-md transition-all text-xs sm:text-sm text-[#15383c] touch-manipulation active:scale-[0.98]"
            >
              {linkCopied ? (
                <>
                  <Check size={14} className="text-green-600" />
                  <span className="font-semibold text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <LinkIcon size={14} />
                  <span className="font-semibold">Share link</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Profile Banner with Profile Picture */}
        <div className="relative mb-6 sm:mb-8">
          {/* Banner Image - Custom cover photo or random gradient */}
          <div 
            className="h-32 sm:h-40 md:h-48 rounded-2xl sm:rounded-3xl overflow-hidden relative"
            style={{
              background: hostCoverPhoto 
                ? `url(${hostCoverPhoto}) center/cover no-repeat` 
                : getDefaultCoverGradient
            }}
          >
            <div className="absolute inset-0 bg-black/10"></div>
          </div>
          
          {/* Profile Picture - Centered on Banner */}
          {/* FIX: Show Popera logo only as fallback when no custom photo is uploaded */}
          <div className="absolute -bottom-12 sm:-bottom-16 left-1/2 transform -translate-x-1/2">
            {isPoperaProfile && !hostProfilePicture ? (
              // Popera profile with no custom photo: show branded "P" logo
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32">
                <PoperaProfilePicture size="md" className="w-full h-full rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-900/30 border-4 border-white" />
              </div>
            ) : (
              // All other profiles OR Popera with custom photo: show uploaded image or initials
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
                    <div className={`w-full h-full flex items-center justify-center ${getAvatarBgColor(displayName, hostId)} text-white font-heading font-bold text-2xl sm:text-3xl md:text-4xl`}>
                      {getInitials(displayName)}
                    </div>
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
          <div className="flex items-center justify-center gap-2 mb-2">
            <MapPin size={16} className="text-[#e35e25]" />
            <span className="text-gray-500 text-sm sm:text-base">{primaryCity}</span>
          </div>
          {/* Member since date */}
          {hostMemberSince && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Star size={16} className="text-[#e35e25] fill-[#e35e25]" />
              <span className="text-gray-500 text-sm sm:text-base">
                Member since {new Date(hostMemberSince).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
          
          {/* Bio Section */}
          {bio && (
            <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto mb-4 leading-relaxed">
              {bio}
            </p>
          )}

          {/* Follow Button - Glass Style */}
          {isLoggedIn && currentUser?.id !== hostId && (
            <button 
              onClick={handleFollowToggle}
              disabled={isUpdatingFollow}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-semibold text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95 ${
                isFollowingState 
                  ? 'bg-white/80 backdrop-blur-sm text-[#15383c] border border-gray-200/60 hover:bg-white hover:border-gray-300' 
                  : 'bg-[#e35e25] text-white shadow-lg shadow-[#e35e25]/25 hover:shadow-xl hover:shadow-[#e35e25]/30'
              }`}
            >
              {isUpdatingFollow ? '...' : (isFollowingState ? 'Following' : 'Follow')}
            </button>
          )}
        </div>

        {/* Stats Section - Glass Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-5 rounded-2xl shadow-sm border border-white/60 flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
              <Users size={16} className="sm:w-[18px] sm:h-[18px] text-[#e35e25]" />
            </div>
            <div className="text-left flex-1">
              {hostDataLoading ? (
                <MetricSkeleton width="w-12" height="h-6" />
              ) : (
                <div className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">{followersCount.toLocaleString()}</div>
              )}
              <div className="text-xs sm:text-sm text-gray-500">Followers</div>
            </div>
          </div>
          
          {reviewsLoading ? (
            <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-5 rounded-2xl shadow-sm border border-white/60 flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
                <Star size={16} className="sm:w-[18px] sm:h-[18px] text-[#e35e25] fill-[#e35e25]" />
              </div>
              <div className="text-left flex-1">
                <MetricSkeleton width="w-12" height="h-6" />
                <div className="text-xs sm:text-sm text-gray-500">Reviews</div>
              </div>
            </div>
          ) : reviewCount > 0 ? (
            <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-5 rounded-2xl shadow-sm border border-white/60 flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
                <Star size={16} className="sm:w-[18px] sm:h-[18px] text-[#e35e25] fill-[#e35e25]" />
              </div>
              <div className="text-left flex-1">
                <div className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">{formatRating(averageRating)}</div>
                <div className="text-xs sm:text-sm text-gray-500">{reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'}</div>
              </div>
            </div>
          ) : null}
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
                      profileVariant={true}
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
                          {/* FIX: Display reviewer profile picture consistently */}
                          <div className="w-12 h-12 rounded-full overflow-hidden shadow-md shrink-0">
                            {review.userPhoto ? (
                              <img 
                                src={review.userPhoto} 
                                alt={review.userName} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // On error, hide the img and show fallback
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-full h-full flex items-center justify-center ${getAvatarBgColor(review.userName, review.userId)} text-white font-bold text-lg`}
                              style={{ display: review.userPhoto ? 'none' : 'flex' }}
                            >
                              {getInitials(review.userName)}
                            </div>
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