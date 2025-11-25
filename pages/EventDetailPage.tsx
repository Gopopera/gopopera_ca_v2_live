import React, { useState, useEffect } from 'react';
import { Event, ViewState } from '../types';
import { Calendar, MapPin, User, Share2, MessageCircle, ChevronLeft, Heart, Info, Star, Sparkles, X, UserPlus, UserCheck, ChevronRight } from 'lucide-react';
import { followHost, unfollowHost, isFollowing } from '../firebase/follow';
import { useUserStore } from '../stores/userStore';
import { EventCard } from '../components/events/EventCard';
import { MockMap } from '../components/map/MockMap';
import { FakeEventReservationModal } from '../components/events/FakeEventReservationModal';
import { formatDate } from '../utils/dateFormatter';
import { formatRating } from '../utils/formatRating';

interface EventDetailPageProps {
  event: Event;
  setViewState: (view: ViewState) => void;
  onReviewsClick: (e: React.MouseEvent, event: Event) => void;
  onHostClick: (hostName: string) => void;
  allEvents: Event[];
  onEventClick: (event: Event) => void;
  isLoggedIn?: boolean;
  favorites?: string[];
  onToggleFavorite?: (e: React.MouseEvent, eventId: string) => void;
  onRSVP?: (eventId: string) => void;
  rsvps?: string[];
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({ 
  event, 
  setViewState, 
  onReviewsClick, 
  onHostClick, 
  allEvents, 
  onEventClick,
  isLoggedIn,
  favorites = [],
  onToggleFavorite,
  onRSVP,
  rsvps = []
}) => {
  const recommendedEvents = allEvents.filter(e => e.id !== event.id).slice(0, 5);
  const hasRSVPed = rsvps.includes(event.id);
  const isFakeEvent = event.isFakeEvent === true;
  const isDemo = event.isDemo === true || isFakeEvent; // Check both flags for compatibility
  const isPoperaOwned = event.isPoperaOwned === true;
  const isOfficialLaunch = event.isOfficialLaunch === true;
  const [showFakeEventModal, setShowFakeEventModal] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isFollowingHost, setIsFollowingHost] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const user = useUserStore((state) => state.user);

  // Check if user is following the host
  useEffect(() => {
    if (user?.uid && event.hostId) {
      const checkFollowStatus = async () => {
        const following = await isFollowing(user.uid, event.hostId);
        setIsFollowingHost(following);
      };
      checkFollowStatus();
    }
  }, [user?.uid, event.hostId]);

  const handleFollowToggle = async () => {
    if (!user?.uid || !event.hostId) {
      setShowAuthModal(true);
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowingHost) {
        await unfollowHost(user.uid, event.hostId);
        setIsFollowingHost(false);
      } else {
        await followHost(user.uid, event.hostId);
        setIsFollowingHost(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };
  
  const handleRSVP = () => {
    if (isDemo) {
      // Show modal for demo events instead of reserving
      setShowFakeEventModal(true);
      return;
    }
    
    // Official launch events and regular events can be reserved
    if (onRSVP) {
      onRSVP(event.id);
    }
  };
  
  const handleBrowseEvents = () => {
    setShowFakeEventModal(false);
    setViewState(ViewState.FEED);
  };

  const handleShare = async () => {
    const url = window.location.origin + `/event/${event.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description,
          url: url,
        });
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleConversationClick = () => {
    if (!isLoggedIn) {
      // Show auth modal for logged-out users
      setShowAuthModal(true);
      return;
    }
    
    // If logged in, check access and navigate to chat
    // GroupChat component will handle blocked state
    setViewState(ViewState.CHAT);
  };

  return (
    <div className="min-h-screen bg-white pt-0">
      <FakeEventReservationModal
        isOpen={showFakeEventModal}
        onClose={() => setShowFakeEventModal(false)}
        onBrowseEvents={handleBrowseEvents}
      />
      <div className="fixed top-0 left-0 right-0 z-30 p-4 sm:p-4 flex items-center justify-between lg:hidden pointer-events-none safe-area-inset-top">
         <button onClick={() => setViewState(ViewState.FEED)} className="w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center text-popera-teal shadow-lg pointer-events-auto hover:scale-105 active:scale-[0.92] transition-transform touch-manipulation border border-white/50"><ChevronLeft size={22} className="sm:w-6 sm:h-6" /></button>
         <div className="flex gap-2.5 sm:gap-3 pointer-events-auto">
             <button onClick={handleShare} className="w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center text-popera-teal shadow-lg hover:scale-105 active:scale-[0.92] transition-transform touch-manipulation border border-white/50" aria-label="Share Event"><Share2 size={20} className="sm:w-5 sm:h-5" /></button>
             {isLoggedIn && onToggleFavorite && (<button onClick={(e) => onToggleFavorite(e, event.id)} className="w-11 h-11 sm:w-10 sm:h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center text-popera-teal shadow-lg hover:scale-105 active:scale-[0.92] transition-transform touch-manipulation border border-white/50"><Heart size={20} className="sm:w-5 sm:h-5" fill={favorites.includes(event.id) ? "#e35e25" : "none"} style={{ color: favorites.includes(event.id) ? "#e35e25" : "currentColor" }} /></button>)}
         </div>
         {showShareToast && (
           <div className="fixed bottom-4 right-4 bg-[#15383c] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 animate-fade-in pointer-events-none">
             Link copied!
           </div>
         )}
      </div>

      {/* Auth Modal for Chat Access */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#eef4f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={32} className="text-[#e35e25]" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-2">
                Sign In to Join Conversations
              </h2>
              <p className="text-gray-600 text-sm">
                Conversations are only available after signing up or logging in.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setViewState(ViewState.AUTH);
                }}
                className="w-full px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors"
              >
                Sign In / Sign Up
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden lg:block max-w-7xl mx-auto px-6 py-6 mt-20">
        <button onClick={() => setViewState(ViewState.FEED)} className="flex items-center text-gray-500 hover:text-popera-teal transition-colors font-medium"><ChevronLeft size={20} className="mr-1" /> Back to Events</button>
      </div>

      {/* Demo Event Banner */}
      {isDemo && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 sm:p-5 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-bold text-amber-800 mb-1">Demo Popera Event</h3>
                <p className="text-sm text-amber-700 leading-relaxed">
                  {event.demoPurpose || "This is an example use case scenario created by Popera. It's meant to help you explore the app and imagine your own pop-ups. It is not an actual event and you should not attend it in real life."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery - Scrollable if multiple images */}
      <div className="relative h-[40vh] sm:h-[45vh] md:h-[50vh] lg:h-[55vh] xl:h-[60vh] w-full overflow-hidden group">
        {event.imageUrls && event.imageUrls.length > 1 ? (
          // Multiple images - horizontal scrollable gallery
          <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth h-full hide-scrollbar">
            {event.imageUrls.map((url, index) => (
              <div key={index} className="relative min-w-full h-full snap-center flex-shrink-0">
                <img 
                  src={url} 
                  alt={`${event.title} - Image ${index + 1}`} 
                  className="w-full h-full object-cover object-center"
                />
              </div>
            ))}
          </div>
        ) : (
          // Single image
          <img 
            src={event.imageUrl || (event.imageUrls && event.imageUrls[0]) || `https://picsum.photos/seed/${event.id}/800/600`} 
            alt={event.title} 
            className="w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-105" 
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#15383c] via-[#15383c]/40 to-transparent opacity-90" />
        
        {/* Image counter for multiple images */}
        {event.imageUrls && event.imageUrls.length > 1 && (
          <div className="absolute top-4 right-4 bg-black/50 text-white text-xs font-medium px-2 py-1 rounded backdrop-blur-sm z-10">
            1 / {event.imageUrls.length}
          </div>
        )}
         <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 lg:p-12 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
            <div className="text-white animate-fade-in-up">
               <span className="inline-block px-3 sm:px-3.5 py-1 sm:py-1.5 bg-popera-orange rounded-full text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider mb-2 sm:mb-3 md:mb-4 shadow-lg">{event.category}</span>
               <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-heading font-bold leading-tight mb-3 sm:mb-4 text-balance shadow-black drop-shadow-lg">{event.title}</h1>
               <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 md:gap-3 lg:gap-4 text-gray-200 text-xs sm:text-sm md:text-base font-medium">
                  <span className="flex items-center bg-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg backdrop-blur-md border border-white/10"><Calendar size={14} className="sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-popera-orange shrink-0" /> <span className="truncate">{formatDate(event.date)} • {event.time}</span></span>
                  <span className="flex items-center bg-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg backdrop-blur-md border border-white/10"><MapPin size={14} className="sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-popera-orange shrink-0" /> <span className="truncate">{event.location}</span></span>
                  {event.attendees !== undefined && (<span className="flex items-center bg-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg backdrop-blur-md border border-white/10"><User size={14} className="sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-popera-orange shrink-0" /> <span>{event.attendees} attending</span></span>)}
               </div>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 lg:py-12 grid lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10 lg:gap-12">
        <div className="lg:col-span-2 space-y-6 sm:space-y-8 md:space-y-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-5 p-5 sm:p-6 md:p-7 lg:p-8 bg-gray-50 rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto min-w-0">
               <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gray-200 overflow-hidden ring-2 sm:ring-4 ring-white shadow-sm cursor-pointer shrink-0" onClick={() => onHostClick(event.hostName)}><img src={`https://picsum.photos/seed/${event.hostName}/100/100`} alt={event.hostName} className="w-full h-full object-cover"/></div>
               <div className="min-w-0 flex-1">
                 <p className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Hosted by</p>
                 <h3 className="text-base sm:text-lg md:text-xl font-bold text-popera-teal cursor-pointer hover:text-popera-orange transition-colors truncate" onClick={() => onHostClick(event.hostName)}>{event.hostName}</h3>
                 {(event.hostName === 'Popera' || user?.email === 'eatezca@gmail.com') && (
                   <p className="text-xs text-gray-500 mt-1.5 italic">
                     This Popera profile is used to showcase example scenarios and demo events. These events are not real — they exist to help you understand what you can host yourself.
                   </p>
                 )}
                 <button onClick={(e) => onReviewsClick(e, event)} className="flex items-center space-x-1 mt-1.5 bg-white hover:bg-orange-50 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-colors border border-gray-200 hover:border-orange-100 group/rating shrink-0 w-fit touch-manipulation active:scale-95"><Star size={11} className="sm:w-3 sm:h-3 text-gray-300 group-hover/rating:text-popera-orange group-hover/rating:fill-popera-orange transition-colors" fill="currentColor" /><span className="text-[10px] sm:text-xs font-bold text-popera-teal">{formatRating(event.rating)}</span><span className="text-[9px] sm:text-[10px] text-gray-400 group-hover/rating:text-orange-400">({event.reviewCount})</span></button>
               </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <button onClick={() => onHostClick(event.hostName)} className="w-full sm:w-auto px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-full text-sm md:text-base font-bold text-popera-teal hover:border-popera-orange hover:text-popera-orange transition-colors shadow-sm whitespace-nowrap touch-manipulation active:scale-95">View Profile</button>
              {isLoggedIn && (
                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`w-full sm:w-auto px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 rounded-full text-sm md:text-base font-bold transition-colors shadow-sm whitespace-nowrap touch-manipulation active:scale-95 flex items-center justify-center gap-2 ${
                    isFollowingHost
                      ? 'bg-popera-teal text-white hover:bg-[#1f4d52]'
                      : 'bg-white border border-gray-200 text-popera-teal hover:border-popera-orange hover:text-popera-orange'
                  } disabled:opacity-50`}
                >
                  {isFollowingHost ? (
                    <>
                      <UserCheck size={18} /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} /> Follow Host
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-5">
             <div className="bg-gray-50 p-5 sm:p-6 md:p-7 rounded-2xl border border-gray-100 text-center"><h4 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-popera-teal">{event.attendees || 0}</h4><p className="text-xs sm:text-sm uppercase tracking-wide text-gray-500 font-bold mt-1.5">Attending</p></div>
             <div className="bg-gray-50 p-5 sm:p-6 md:p-7 rounded-2xl border border-gray-100 text-center"><h4 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-popera-teal">{event.capacity || 'Unlimited'}</h4><p className="text-xs sm:text-sm uppercase tracking-wide text-gray-500 font-bold mt-1.5">Capacity</p></div>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-heading font-bold text-popera-teal mb-3 sm:mb-4 md:mb-6 flex items-center gap-2 sm:gap-3">About this event</h2>
            <div className="prose prose-lg text-gray-600 leading-relaxed font-light text-sm sm:text-base md:text-base"><p>{event.description || "Join us for an incredible experience..."}</p></div>
          </div>

          {event.whatToExpect && (
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-heading font-bold text-popera-teal mb-3 sm:mb-4 md:mb-6 flex items-center gap-2 sm:gap-3">
                <Sparkles size={18} className="sm:w-5 sm:h-5 text-popera-orange" /> What to Expect
              </h2>
              <div className="bg-popera-softTeal p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-popera-teal/5 text-gray-600 font-light leading-relaxed text-sm sm:text-base">
                <p className="mb-3 sm:mb-4 whitespace-pre-line">{event.whatToExpect}</p>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-6 sm:pt-8 md:pt-10">
            <h2 className="text-lg sm:text-xl md:text-2xl font-heading font-bold text-popera-teal mb-4 sm:mb-6">Location</h2>
            <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] overflow-hidden h-40 sm:h-48 md:h-64 relative group cursor-pointer shadow-inner border border-gray-200">
              <MockMap 
                lat={event.lat}
                lng={event.lng}
                address={event.address}
                city={event.city}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="mt-3 sm:mt-4 md:mt-6 text-popera-teal font-medium text-sm sm:text-base md:text-lg flex items-center">
              <MapPin size={16} className="sm:w-[18px] sm:h-[18px] mr-1.5 sm:mr-2 md:mr-3 text-popera-orange shrink-0" /> 
              <span className="truncate">{event.location}</span>
            </p>
          </div>
        </div>

        <div className="relative hidden lg:block">
           <div className="sticky top-32 bg-white rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.04)] border border-gray-100 p-6 lg:p-8">
              <div className="flex justify-between items-center mb-6 lg:mb-8"><div><span className="text-3xl lg:text-4xl font-heading font-bold text-popera-teal">{event.price}</span><p className="text-xs lg:text-sm text-gray-500 font-medium mt-1">per person</p></div></div>
              <div className="space-y-3">
                <button 
                  onClick={handleRSVP}
                  disabled={isDemo}
                  className={`w-full py-3.5 lg:py-4 font-bold text-base lg:text-lg rounded-full shadow-xl transition-all hover:-translate-y-0.5 touch-manipulation active:scale-95 ${
                    isDemo 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : hasRSVPed
                      ? 'bg-popera-teal text-white hover:bg-popera-teal/90'
                      : 'bg-popera-orange text-white hover:bg-[#cf4d1d] shadow-orange-900/20 hover:shadow-orange-900/30'
                  }`}
                >
                  {isDemo ? 'Demo Event (Locked)' : hasRSVPed ? 'Reserved ✓' : 'Reserve Spot'}
                </button>
                <button
                  onClick={handleShare}
                  className="w-full py-3.5 lg:py-4 bg-popera-teal text-white rounded-full text-base lg:text-lg font-bold hover:bg-[#1f4d52] transition-colors shadow-md whitespace-nowrap touch-manipulation active:scale-95 flex items-center justify-center gap-2"
                >
                  <Share2 size={18} /> Share Event
                </button>
                <button 
                  onClick={handleConversationClick}
                  disabled={isDemo}
                  className={`w-full py-3.5 lg:py-4 font-bold text-base lg:text-lg rounded-full border flex items-center justify-center gap-2 touch-manipulation active:scale-95 transition-colors ${
                    isDemo
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-popera-teal/5 text-popera-teal border-popera-teal/10 hover:bg-popera-teal/10'
                  }`}
                >
                  <MessageCircle size={20} className="lg:w-[22px] lg:h-[22px]" /> 
                  {isDemo ? 'Chat Locked' : 'Join Group Chat'}
                </button>
              </div>
              <div className="mt-6 lg:mt-8 pt-4 lg:pt-6 border-t border-gray-100 text-center"><p className="text-[10px] lg:text-xs text-gray-400 leading-relaxed">Secure payment powered by Stripe.</p></div>
           </div>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12 border-t border-gray-100">
         <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-popera-teal mb-6 sm:mb-8">Other events you might be interested in</h2>
         {/* Desktop Grid */}
         <div className="hidden md:grid gap-fluid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 place-items-center w-full px-fluid">
             {recommendedEvents.map((recEvent, index) => (<div key={recEvent.id} className="w-full h-auto animate-stagger" style={{ animationDelay: `${index * 0.1}s` }}><EventCard event={recEvent} onClick={onEventClick} onChatClick={(e) => { e.stopPropagation(); if (!isLoggedIn) { setShowAuthModal(true); } else { setViewState(ViewState.CHAT); } }} onReviewsClick={onReviewsClick} isLoggedIn={isLoggedIn} isFavorite={favorites.includes(recEvent.id)} onToggleFavorite={onToggleFavorite} /></div>))}
         </div>
         {/* Mobile Scroller */}
         <div className="md:hidden">
           <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-4 pb-2 -mx-4 px-4 hide-scrollbar scroll-smooth w-full touch-pan-x overscroll-x-contain scroll-pl-4">
             {recommendedEvents.map((recEvent, index) => (
               <div key={recEvent.id} className="snap-start shrink-0 w-[85vw] max-w-[360px]">
                 <EventCard 
                   event={recEvent} 
                   onClick={onEventClick} 
                   onChatClick={(e, event) => { 
                     e.stopPropagation(); 
                     if (!isLoggedIn) { 
                       setShowAuthModal(true); 
                     } else { 
                       setViewState(ViewState.CHAT); 
                     } 
                   }} 
                   onReviewsClick={onReviewsClick} 
                   isLoggedIn={isLoggedIn} 
                   isFavorite={favorites.includes(recEvent.id)} 
                   onToggleFavorite={onToggleFavorite} 
                 />
               </div>
             ))}
           </div>
         </div>
      </section>

      <section className="bg-popera-teal py-10 sm:py-12 md:py-16 lg:py-20 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-64 h-64 bg-popera-orange rounded-full blur-[120px] opacity-20 -translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
         <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-heading font-bold text-white mb-5 sm:mb-6">Inspired? Host your own event.</h2>
            <button className="px-8 sm:px-10 py-3.5 sm:py-4 bg-popera-orange text-white rounded-full font-bold text-base sm:text-lg hover:bg-[#cf4d1d] transition-all shadow-xl shadow-orange-900/20 hover:-translate-y-1 touch-manipulation active:scale-95" onClick={() => setViewState(ViewState.CREATE_EVENT)}>Start Hosting</button>
         </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 bg-white/98 backdrop-blur-lg border-t border-gray-200 px-4 sm:px-6 py-4 sm:py-4 lg:hidden z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-inset-bottom">
        <div className="flex items-center justify-between gap-3 sm:gap-4 max-w-xl mx-auto">
           <div className="flex flex-col shrink-0 min-w-0"><span className="text-xl sm:text-xl md:text-2xl font-heading font-bold text-popera-teal truncate">{event.price}</span><span className="text-xs sm:text-xs text-gray-600 sm:text-gray-500 font-bold uppercase tracking-wide">per person</span></div>
           <div className="flex items-center gap-3 sm:gap-3 flex-1 justify-end min-w-0">
             <button 
               onClick={handleConversationClick}
               disabled={isDemo}
               className={`w-12 h-12 sm:w-12 sm:h-12 shrink-0 rounded-full border-2 flex items-center justify-center active:scale-[0.92] transition-transform touch-manipulation shadow-sm ${
                 isDemo
                   ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                   : 'bg-popera-teal/5 text-popera-teal border-popera-teal/10'
               }`}
               aria-label="Chat"
             >
               <MessageCircle size={20} className="sm:w-5 sm:h-5" />
             </button>
             <button 
               onClick={handleRSVP}
               disabled={isDemo}
               className={`flex-1 min-w-0 max-w-[200px] sm:max-w-[200px] h-12 sm:h-12 font-bold text-base sm:text-base rounded-full shadow-lg active:scale-[0.97] transition-transform whitespace-nowrap flex items-center justify-center touch-manipulation px-5 ${
                 isDemo
                   ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                   : hasRSVPed
                   ? 'bg-popera-teal text-white'
                   : 'bg-popera-orange text-white shadow-orange-900/20'
               }`}
             >
               {isDemo ? 'Locked' : hasRSVPed ? 'Reserved ✓' : 'Reserve'}
             </button>
           </div>
        </div>
      </div>

      {/* Auth Modal for Chat Access */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#eef4f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={32} className="text-[#e35e25]" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-2">
                Sign In to Join Conversations
              </h2>
              <p className="text-gray-600 text-sm">
                Conversations are only available after signing up or logging in.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setViewState(ViewState.AUTH);
                }}
                className="w-full px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors"
              >
                Sign In / Sign Up
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};