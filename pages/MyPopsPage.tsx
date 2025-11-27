import React, { useState, useMemo } from 'react';
import { ViewState, Event } from '../types';
import { ChevronLeft, Calendar, MapPin, Clock, Star, MessageCircle, Edit } from 'lucide-react';
import { useUserStore } from '../stores/userStore';
import { getUserProfile } from '../firebase/db';

interface MyPopsPageProps {
  setViewState: (view: ViewState) => void;
  events: Event[];
  onEventClick: (event: Event) => void;
  onChatClick: (e: React.MouseEvent, event: Event) => void;
  onReviewsClick: (e: React.MouseEvent, event: Event) => void;
  isLoggedIn?: boolean;
  favorites?: string[];
  onToggleFavorite?: (e: React.MouseEvent, eventId: string) => void;
  onEditEvent?: (event: Event) => void; // Handler for edit button
}

type TabType = 'hosting' | 'attending' | 'draft' | 'past';

// Helper to check if event is past
const isEventPast = (event: Event): boolean => {
  if (!event.date) return false;
  const eventDate = new Date(event.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  return eventDate < today;
};

// Format date helper
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Format rating helper
const formatRating = (rating: number): string => {
  if (!rating || rating === 0) return '0.0';
  return rating.toFixed(1);
};

export const MyPopsPage: React.FC<MyPopsPageProps> = ({ 
  setViewState, 
  events, 
  onEventClick, 
  onChatClick, 
  onReviewsClick, 
  isLoggedIn, 
  favorites = [], 
  onToggleFavorite,
  onEditEvent
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('hosting');
  const user = useUserStore((state) => state.user);
  const [hostProfilePictures, setHostProfilePictures] = useState<Record<string, string | null>>({});

  // Fetch host profile pictures for hosting events
  React.useEffect(() => {
    if (!user?.uid) return;

    const fetchProfilePictures = async () => {
      const hosting = events.filter(event => 
        event.hostId === user.uid || user.hostedEvents?.includes(event.id)
      );

      const pictureMap: Record<string, string | null> = {};
      
      // Use current user's profile picture for their events
      const userProfilePic = user?.photoURL || user?.profileImageUrl || null;
      
      for (const event of hosting) {
        if (event.hostId === user.uid) {
          pictureMap[event.id] = userProfilePic;
        } else {
          // For other hosts, fetch from Firestore
          try {
            const hostProfile = await getUserProfile(event.hostId || '');
            pictureMap[event.id] = hostProfile?.photoURL || hostProfile?.imageUrl || null;
          } catch (error) {
            pictureMap[event.id] = null;
          }
        }
      }
      
      setHostProfilePictures(pictureMap);
    };

    fetchProfilePictures();
  }, [events, user]);

  // Filter events by hosting vs attending vs draft vs past
  const { hostingEvents, attendingEvents, draftEvents, pastEvents } = useMemo(() => {
    if (!user) {
      return { hostingEvents: [], attendingEvents: [], draftEvents: [], pastEvents: [] };
    }

    const hosting = events.filter(event => 
      (event.hostId === user.uid || user.hostedEvents?.includes(event.id)) && !event.isDraft && !isEventPast(event)
    );

    const attending = events.filter(event => 
      user.rsvps?.includes(event.id) && !isEventPast(event)
    );

    const drafts = events.filter(event => 
      (event.hostId === user.uid || user.hostedEvents?.includes(event.id)) && event.isDraft === true
    );

    const past = events.filter(event => {
      const isHosted = event.hostId === user.uid || user.hostedEvents?.includes(event.id);
      const isAttending = user.rsvps?.includes(event.id);
      return (isHosted || isAttending) && isEventPast(event) && !event.isDraft;
    });

    return { hostingEvents: hosting, attendingEvents: attending, draftEvents: drafts, pastEvents: past };
  }, [events, user]);

  const currentEvents = 
    activeTab === 'hosting' ? hostingEvents :
    activeTab === 'attending' ? attendingEvents :
    activeTab === 'draft' ? draftEvents :
    pastEvents;

  // Handle event click - navigate to chat for hosting events, detail for others
  const handleEventClick = (event: Event) => {
    if (activeTab === 'hosting') {
      // Navigate directly to group conversation for hosting events
      onChatClick(new MouseEvent('click') as any, event);
    } else {
      // Navigate to event detail for attending/past/draft events
      onEventClick(event);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-20 font-sans">
      <div className="md:container md:mx-auto md:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button 
              onClick={() => setViewState(ViewState.PROFILE)} 
              className="mr-4 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-heading font-bold text-3xl text-[#15383c]">My Pop-Ups</h1>
          </div>
          <button
            onClick={() => setViewState(ViewState.MY_CALENDAR)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-[#15383c] hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Calendar size={16} />
            Calendar View
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('hosting')}
            className={`pb-4 px-1 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'hosting'
                ? 'text-[#e35e25] border-b-2 border-[#e35e25]'
                : 'text-gray-500 hover:text-[#15383c]'
            }`}
          >
            My Hosting ({hostingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('attending')}
            className={`pb-4 px-1 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'attending'
                ? 'text-[#e35e25] border-b-2 border-[#e35e25]'
                : 'text-gray-500 hover:text-[#15383c]'
            }`}
          >
            Attending ({attendingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={`pb-4 px-1 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'draft'
                ? 'text-[#e35e25] border-b-2 border-[#e35e25]'
                : 'text-gray-500 hover:text-[#15383c]'
            }`}
          >
            Drafts ({draftEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`pb-4 px-1 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'past'
                ? 'text-[#e35e25] border-b-2 border-[#e35e25]'
                : 'text-gray-500 hover:text-[#15383c]'
            }`}
          >
            Past ({pastEvents.length})
          </button>
        </div>

        {/* Events List - List View */}
        {currentEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-gray-200 rounded-3xl">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <Calendar size={32} />
            </div>
            <h3 className="text-xl font-bold text-[#15383c] mb-2">
              No {activeTab === 'hosting' ? 'hosting' : activeTab === 'attending' ? 'attending' : activeTab === 'draft' ? 'draft' : 'past'} events found
            </h3>
            <p className="text-gray-500 text-sm">
              {activeTab === 'hosting' 
                ? 'Start hosting your first pop-up!' 
                : activeTab === 'attending'
                ? 'RSVP to events to see them here.'
                : activeTab === 'draft'
                ? 'Save events as drafts while creating them.'
                : 'Past events will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentEvents.map(event => {
              const profilePic = hostProfilePictures[event.id] || null;
              const eventImage = event.imageUrls?.[0] || event.imageUrl || `https://picsum.photos/seed/${event.id}/400/300`;
              
              return (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="bg-white rounded-xl border border-gray-200 hover:border-[#e35e25] transition-all cursor-pointer overflow-hidden group"
                >
                  <div className="flex gap-4 p-4">
                    {/* Event Image */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      <img 
                        src={eventImage} 
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://picsum.photos/seed/${event.id}/400/300`;
                        }}
                      />
                    </div>

                    {/* Event Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-[#15383c] mb-1 truncate group-hover:text-[#e35e25] transition-colors">
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-2 mb-2">
                            {/* Host Profile Picture */}
                            {activeTab === 'hosting' && (
                              <>
                                <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                  {profilePic ? (
                                    <img 
                                      src={profilePic} 
                                      alt="You" 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-[#15383c] text-white text-xs font-bold">${user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'Y'}</div>`;
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#15383c] text-white text-xs font-bold">
                                      {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'Y'}
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500 font-medium">Hosted by you</span>
                              </>
                            )}
                            {activeTab !== 'hosting' && (
                              <span className="text-xs text-gray-500 font-medium">Hosted by {event.hostName}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Rating */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star size={14} className="text-[#e35e25] fill-[#e35e25]" />
                          <span className="text-sm font-bold text-[#15383c]">{formatRating(event.rating)}</span>
                          <span className="text-xs text-gray-400">({event.reviewCount})</span>
                        </div>
                      </div>

                      {/* Date, Location, Attendees */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={12} className="text-gray-400" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-gray-400" />
                          <span className="truncate">{event.location || event.city}</span>
                        </div>
                        {event.attendeesCount > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">•</span>
                            <span>{event.attendeesCount} attending</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons for hosting events */}
                      {activeTab === 'hosting' && (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(event);
                            }}
                            className="flex-1 px-3 py-1.5 bg-[#e35e25] text-white text-xs font-bold rounded-full hover:bg-[#cf4d1d] transition-colors flex items-center justify-center gap-1.5"
                          >
                            <MessageCircle size={12} />
                            Manage
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Navigate to edit page
                              if (onEditEvent) {
                                onEditEvent(event);
                              } else {
                                // Fallback: use custom event if handler not provided
                                setTimeout(() => {
                                  window.dispatchEvent(new CustomEvent('editEvent', { detail: { eventId: event.id } }));
                                }, 100);
                              }
                            }}
                            className="px-3 py-1.5 bg-gray-100 text-[#15383c] text-xs font-bold rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 border border-gray-200"
                          >
                            <Edit size={12} />
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
