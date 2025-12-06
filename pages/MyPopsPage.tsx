import React, { useState, useMemo, useEffect } from 'react';
import { ViewState, Event } from '../types';
import { ChevronLeft, Calendar, MapPin, Clock, Star, MessageCircle, Edit } from 'lucide-react';
import { useUserStore } from '../stores/userStore';
import { getUserProfile } from '../firebase/db';
import { getDbSafe } from '../src/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { mapFirestoreEventToEvent } from '../firebase/db';
import type { FirestoreEvent } from '../firebase/types';

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
  // Load draft events separately from Firestore (they're filtered out from main event store)
  const [draftEventsFromFirestore, setDraftEventsFromFirestore] = useState<Event[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);

  useEffect(() => {
    const loadDraftEvents = async () => {
      if (!user?.uid) {
        setDraftEventsFromFirestore([]);
        return;
      }

      setDraftsLoading(true);
      try {
        const db = getDbSafe();
        if (!db) {
          setDraftEventsFromFirestore([]);
          return;
        }

        // Query for draft events where user is the host
        const eventsCol = collection(db, 'events');
        const q = query(
          eventsCol,
          where('hostId', '==', user.uid),
          where('isDraft', '==', true)
        );
        const snapshot = await getDocs(q);
        
        const drafts: Event[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          const firestoreEvent: FirestoreEvent = {
            id: doc.id,
            ...(data as Omit<FirestoreEvent, 'id'>),
          };
          return mapFirestoreEventToEvent(firestoreEvent);
        });

        setDraftEventsFromFirestore(drafts);
      } catch (error) {
        console.error('[MY_POPS] Error loading draft events:', error);
        setDraftEventsFromFirestore([]);
      } finally {
        setDraftsLoading(false);
      }
    };

    loadDraftEvents();
  }, [user?.uid]);

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

    // Combine draft events from main events array with drafts loaded from Firestore
    const draftsFromMain = events.filter(event => 
      (event.hostId === user.uid || user.hostedEvents?.includes(event.id)) && event.isDraft === true
    );
    // Merge and deduplicate by event ID
    const allDrafts = [...draftsFromMain, ...draftEventsFromFirestore];
    const uniqueDrafts = allDrafts.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    );

    const past = events.filter(event => {
      const isHosted = event.hostId === user.uid || user.hostedEvents?.includes(event.id);
      const isAttending = user.rsvps?.includes(event.id);
      return (isHosted || isAttending) && isEventPast(event) && !event.isDraft;
    });

    return { hostingEvents: hosting, attendingEvents: attending, draftEvents: uniqueDrafts, pastEvents: past };
  }, [events, user, draftEventsFromFirestore]);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center">
            <button 
              onClick={() => setViewState(ViewState.PROFILE)} 
              className="mr-3 sm:mr-4 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors active:scale-95 touch-manipulation"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c]">My Pop-Ups</h1>
          </div>
          <button
            onClick={() => setViewState(ViewState.MY_CALENDAR)}
            className="px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-full text-xs sm:text-sm font-medium text-[#15383c] hover:bg-gray-50 transition-colors flex items-center gap-1.5 sm:gap-2 active:scale-95 touch-manipulation"
          >
            <Calendar size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Calendar View</span>
            <span className="sm:hidden">Calendar</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-8 border-b border-gray-200 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 hide-scrollbar">
          <button
            onClick={() => setActiveTab('hosting')}
            className={`pb-3 sm:pb-4 px-2 sm:px-1 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === 'hosting'
                ? 'text-[#e35e25] border-b-2 border-[#e35e25]'
                : 'text-gray-500 hover:text-[#15383c]'
            }`}
          >
            My Hosting ({hostingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('attending')}
            className={`pb-3 sm:pb-4 px-2 sm:px-1 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === 'attending'
                ? 'text-[#e35e25] border-b-2 border-[#e35e25]'
                : 'text-gray-500 hover:text-[#15383c]'
            }`}
          >
            Attending ({attendingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={`pb-3 sm:pb-4 px-2 sm:px-1 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === 'draft'
                ? 'text-[#e35e25] border-b-2 border-[#e35e25]'
                : 'text-gray-500 hover:text-[#15383c]'
            }`}
          >
            Drafts ({draftEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`pb-3 sm:pb-4 px-2 sm:px-1 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
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
          <div className="space-y-3 sm:space-y-4">
            {currentEvents.map(event => {
              const profilePic = hostProfilePictures[event.id] || null;
              const eventImage = event.imageUrls?.[0] || event.imageUrl || `https://picsum.photos/seed/${event.id}/400/300`;
              
              return (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 hover:border-[#e35e25] transition-all cursor-pointer overflow-hidden group shadow-sm hover:shadow-md active:scale-[0.98] touch-manipulation"
                >
                  <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
                    {/* Event Image - Made taller to fill space better */}
                    <div className="w-32 h-40 sm:w-36 sm:h-44 md:w-40 md:h-48 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
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
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base sm:text-lg text-[#15383c] mb-1 line-clamp-2 group-hover:text-[#e35e25] transition-colors">
                              {event.title}
                            </h3>
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                              {/* Host Profile Picture */}
                              {activeTab === 'hosting' && (
                                <>
                                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
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
                                            parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-[#15383c] text-white text-[10px] sm:text-xs font-bold">${user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'Y'}</div>`;
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-[#15383c] text-white text-[10px] sm:text-xs font-bold">
                                        {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'Y'}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[10px] sm:text-xs text-gray-500 font-medium">Hosted by you</span>
                                </>
                              )}
                              {activeTab !== 'hosting' && (
                                <span className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Hosted by {event.hostName}</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Rating */}
                          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                            <Star size={12} className="sm:w-3.5 sm:h-3.5 text-[#e35e25] fill-[#e35e25]" />
                            <span className="text-xs sm:text-sm font-bold text-[#15383c]">{formatRating(event.rating)}</span>
                            <span className="text-[10px] sm:text-xs text-gray-400">({event.reviewCount})</span>
                          </div>
                        </div>

                        {/* Date, Location, Attendees */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar size={10} className="sm:w-3 sm:h-3 text-gray-400" />
                            <span className="whitespace-nowrap">{formatDate(event.date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={10} className="sm:w-3 sm:h-3 text-gray-400" />
                            <span className="whitespace-nowrap">{event.time}</span>
                          </div>
                          <div className="flex items-center gap-1 min-w-0">
                            <MapPin size={10} className="sm:w-3 sm:h-3 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{event.location || event.city}</span>
                          </div>
                          {event.attendeesCount > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400">•</span>
                              <span>{event.attendeesCount} attending</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons for hosting events */}
                      {activeTab === 'hosting' && (
                        <div className="mt-2 sm:mt-3 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Navigate to group conversation for managing the event
                              onChatClick(e, event);
                            }}
                            className="flex-1 px-3 py-1.5 sm:py-2 bg-[#e35e25] text-white text-[10px] sm:text-xs font-bold rounded-full hover:bg-[#cf4d1d] transition-colors flex items-center justify-center gap-1 sm:gap-1.5 active:scale-95 touch-manipulation"
                          >
                            <MessageCircle size={11} className="sm:w-3 sm:h-3" />
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
                            className="px-3 py-1.5 sm:py-2 bg-gray-100 text-[#15383c] text-[10px] sm:text-xs font-bold rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center gap-1 sm:gap-1.5 border border-gray-200 active:scale-95 touch-manipulation"
                          >
                            <Edit size={11} className="sm:w-3 sm:h-3" />
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
