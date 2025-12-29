import React, { useState, useMemo, useEffect } from 'react';
import { ViewState, Event } from '../../types';
import { ChevronLeft, Calendar, MapPin, Clock, Star, MessageCircle, Edit, Users, X, Loader2, Ticket, CheckCircle2, XCircle } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { getUserProfile, cancelReservation, getCheckedInCountForEvent } from '../../firebase/db';
import { getDbSafe } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { mapFirestoreEventToEvent } from '../../firebase/db';
import type { FirestoreEvent, FirestoreReservation } from '../../firebase/types';
import { subscribeToUserProfile } from '../../firebase/userSubscriptions';

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
  const [activeTab, setActiveTab] = useState<TabType>('attending');
  const user = useUserStore((state) => state.user);
  const [hostProfilePictures, setHostProfilePictures] = useState<Record<string, string | null>>({});
  const [failedProfilePics, setFailedProfilePics] = useState<Set<string>>(new Set());
  
  // Reservation data for cancellation and checked-in counts
  const [userReservations, setUserReservations] = useState<Record<string, { id: string; status: string }>>({});
  const [checkedInCounts, setCheckedInCounts] = useState<Record<string, number>>({});
  
  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingEvent, setCancellingEvent] = useState<Event | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelledEvents, setCancelledEvents] = useState<Set<string>>(new Set());
  
  // Real-time subscription to current user's profile picture from Firestore
  const [currentUserProfilePic, setCurrentUserProfilePic] = useState<string | null>(null);
  
  // TASK 3 FIX: Attending events fetched directly from Firestore reservations
  // This ensures events appear even if eventStore hasn't loaded them
  const [attendingEventsFromFirestore, setAttendingEventsFromFirestore] = useState<Event[]>([]);
  const [attendingLoading, setAttendingLoading] = useState(false);
  
  useEffect(() => {
    if (!user?.uid) {
      setCurrentUserProfilePic(null);
      return;
    }
    
    // Subscribe to current user's profile from Firestore - single source of truth
    const unsubscribe = subscribeToUserProfile(user.uid, (userData) => {
      setCurrentUserProfilePic(userData?.photoURL || null);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  // Load user's reservations for cancellation functionality
  useEffect(() => {
    const loadUserReservations = async () => {
      if (!user?.uid) {
        setUserReservations({});
        return;
      }

      try {
        const db = getDbSafe();
        if (!db) return;

        const reservationsCol = collection(db, 'reservations');
        const q = query(
          reservationsCol,
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        
        const reservationMap: Record<string, { id: string; status: string }> = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as FirestoreReservation;
          if (data.eventId) {
            reservationMap[data.eventId] = { id: doc.id, status: data.status || 'reserved' };
          }
        });
        
        setUserReservations(reservationMap);
      } catch (error) {
        console.error('[MY_POPS] Error loading user reservations:', error);
      }
    };

    loadUserReservations();
  }, [user?.uid]);

  // TASK 3 FIX: Load attending events directly from Firestore reservations
  // This ensures events appear in "Attending" even if eventStore hasn't loaded them
  useEffect(() => {
    const loadAttendingEventsFromReservations = async () => {
      if (!user?.uid) {
        setAttendingEventsFromFirestore([]);
        return;
      }

      setAttendingLoading(true);
      try {
        const db = getDbSafe();
        if (!db) {
          console.warn('[MY_POPS] Firestore not available for attending events');
          setAttendingEventsFromFirestore([]);
          return;
        }

        // Get all active reservations for user
        const reservationsCol = collection(db, 'reservations');
        const q = query(
          reservationsCol,
          where('userId', '==', user.uid),
          where('status', '==', 'reserved')
        );
        const snapshot = await getDocs(q);
        
        // Get unique event IDs from reservations
        const eventIds = [...new Set(snapshot.docs.map(d => d.data().eventId).filter(Boolean))];
        
        console.log('[MY_POPS] 📋 Found reservations for events:', { userId: user.uid, eventIds, count: eventIds.length });
        
        if (eventIds.length === 0) {
          setAttendingEventsFromFirestore([]);
          return;
        }
        
        // Fetch each event document
        const eventPromises = eventIds.map(async (eventId) => {
          try {
            const eventDoc = await getDoc(doc(db, 'events', eventId));
            if (eventDoc.exists()) {
              const data = eventDoc.data();
              const firestoreEvent: FirestoreEvent = {
                id: eventDoc.id,
                ...(data as Omit<FirestoreEvent, 'id'>),
              };
              return mapFirestoreEventToEvent(firestoreEvent);
            }
            console.warn('[MY_POPS] Event not found:', eventId);
            return null;
          } catch (err) {
            console.error('[MY_POPS] Error fetching event:', eventId, err);
            return null;
          }
        });
        
        const fetchedEvents = (await Promise.all(eventPromises)).filter((e): e is Event => e !== null);
        console.log('[MY_POPS] ✅ Loaded attending events from Firestore:', fetchedEvents.length);
        setAttendingEventsFromFirestore(fetchedEvents);
      } catch (error: any) {
        console.error('[MY_POPS] ❌ Error loading attending events:', error);
        // Check for permission denied
        if (error?.code === 'permission-denied') {
          console.warn('[MY_POPS] Permission denied loading attending events');
        }
        setAttendingEventsFromFirestore([]);
      } finally {
        setAttendingLoading(false);
      }
    };

    loadAttendingEventsFromReservations();
  }, [user?.uid]);

  // Handle cancel reservation
  const handleCancelReservation = async () => {
    if (!cancellingEvent || !user?.uid) return;

    const reservation = userReservations[cancellingEvent.id];
    if (!reservation) {
      alert('Reservation not found');
      return;
    }

    setCancelling(true);
    try {
      await cancelReservation(reservation.id, user.uid);
      setCancelledEvents(prev => new Set(prev).add(cancellingEvent.id));
      setShowCancelModal(false);
      setCancellingEvent(null);
      
      // Refresh user profile to update rsvps
      await useUserStore.getState().refreshUserProfile();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert('Failed to cancel reservation. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // Update host profile pictures when currentUserProfilePic changes
  React.useEffect(() => {
    if (!user?.uid) return;

    const updateProfilePictures = async () => {
      const hosting = events.filter(event => 
        event.hostId === user.uid || user.hostedEvents?.includes(event.id)
      );

      const pictureMap: Record<string, string | null> = {};
      
      for (const event of hosting) {
        if (event.hostId === user.uid) {
          // Use real-time profile picture from Firestore subscription
          pictureMap[event.id] = currentUserProfilePic;
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

    updateProfilePictures();
  }, [events, user?.uid, user?.hostedEvents, currentUserProfilePic]);

  // Filter events by hosting vs attending vs draft vs past
  // Load draft and past events separately from Firestore (they may be filtered out from main event store)
  const [draftEventsFromFirestore, setDraftEventsFromFirestore] = useState<Event[]>([]);
  const [pastEventsFromFirestore, setPastEventsFromFirestore] = useState<Event[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [pastLoading, setPastLoading] = useState(false);

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

  // Load past events from Firestore to ensure they're always available
  useEffect(() => {
    const loadPastEvents = async () => {
      if (!user?.uid) {
        setPastEventsFromFirestore([]);
        return;
      }

      setPastLoading(true);
      try {
        const db = getDbSafe();
        if (!db) {
          setPastEventsFromFirestore([]);
          return;
        }

        // Query for all events where user is the host (we'll filter past events client-side)
        const eventsCol = collection(db, 'events');
        const hostedQuery = query(
          eventsCol,
          where('hostId', '==', user.uid)
        );
        const hostedSnapshot = await getDocs(hostedQuery);
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const pastHosted: Event[] = hostedSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            const firestoreEvent: FirestoreEvent = {
              id: doc.id,
              ...(data as Omit<FirestoreEvent, 'id'>),
            };
            return mapFirestoreEventToEvent(firestoreEvent);
          })
          .filter(event => {
            if (event.isDraft) return false;
            if (!event.date) return false;
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate < now;
          });

        setPastEventsFromFirestore(pastHosted);
      } catch (error) {
        console.error('[MY_POPS] Error loading past events:', error);
        setPastEventsFromFirestore([]);
      } finally {
        setPastLoading(false);
      }
    };

    loadPastEvents();
  }, [user?.uid]);

  const { hostingEvents, attendingEvents, draftEvents, pastEvents } = useMemo(() => {
    if (!user) {
      return { hostingEvents: [], attendingEvents: [], draftEvents: [], pastEvents: [] };
    }

    const hosting = events.filter(event => 
      (event.hostId === user.uid || user.hostedEvents?.includes(event.id)) && !event.isDraft && !isEventPast(event)
    );

    // TASK 3 FIX: Get attending events from main array filtered by user.rsvps
    const attendingFromMain = events.filter(event => {
      if (!user.rsvps?.includes(event.id)) return false;
      if (isEventPast(event)) return false;
      // Exclude if we have reservation data showing it's cancelled
      if (userReservations[event.id]?.status === 'cancelled') return false;
      // Exclude if in local cancelled state (immediate feedback)
      if (cancelledEvents.has(event.id)) return false;
      return true;
    });
    
    // TASK 3 FIX: Merge with events fetched directly from Firestore reservations
    // This ensures events appear even if eventStore hasn't loaded them
    const attendingFromFirestore = attendingEventsFromFirestore.filter(event => {
      if (isEventPast(event)) return false;
      if (userReservations[event.id]?.status === 'cancelled') return false;
      if (cancelledEvents.has(event.id)) return false;
      return true;
    });
    
    // Merge and deduplicate attending events by event ID
    const allAttending = [...attendingFromMain, ...attendingFromFirestore];
    const attending = allAttending.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
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

    // Combine past events from main events array with past events loaded from Firestore
    const pastFromMain = events.filter(event => {
      const isHosted = event.hostId === user.uid || user.hostedEvents?.includes(event.id);
      const isAttending = user.rsvps?.includes(event.id);
      return (isHosted || isAttending) && isEventPast(event) && !event.isDraft;
    });
    
    // Merge and deduplicate past events by event ID
    const allPast = [...pastFromMain, ...pastEventsFromFirestore];
    const uniquePast = allPast.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    );

    return { hostingEvents: hosting, attendingEvents: attending, draftEvents: uniqueDrafts, pastEvents: uniquePast };
  }, [events, user, draftEventsFromFirestore, pastEventsFromFirestore, attendingEventsFromFirestore, userReservations, cancelledEvents]);

  // Load checked-in counts for hosting events (must be after useMemo that defines hostingEvents)
  useEffect(() => {
    const loadCheckedInCounts = async () => {
      if (!user?.uid || hostingEvents.length === 0) {
        setCheckedInCounts({});
        return;
      }

      try {
        const counts: Record<string, number> = {};
        await Promise.all(
          hostingEvents.map(async (event) => {
            const count = await getCheckedInCountForEvent(event.id);
            counts[event.id] = count;
          })
        );
        setCheckedInCounts(counts);
      } catch (error) {
        console.error('[MY_POPS] Error loading checked-in counts:', error);
      }
    };

    loadCheckedInCounts();
  }, [user?.uid, hostingEvents]);

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
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c]">My Circles</h1>
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

        {/* Tabs - Modern Design */}
        <div className="mb-6 sm:mb-8">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 hide-scrollbar pb-2">
            <button
              onClick={() => setActiveTab('hosting')}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-medium text-xs sm:text-sm transition-all whitespace-nowrap flex-shrink-0 touch-manipulation active:scale-95 ${
                activeTab === 'hosting'
                  ? 'bg-[#e35e25] text-white shadow-md shadow-orange-900/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              My Hosting ({hostingEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('attending')}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-medium text-xs sm:text-sm transition-all whitespace-nowrap flex-shrink-0 touch-manipulation active:scale-95 ${
                activeTab === 'attending'
                  ? 'bg-[#e35e25] text-white shadow-md shadow-orange-900/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Attending ({attendingEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('draft')}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-medium text-xs sm:text-sm transition-all whitespace-nowrap flex-shrink-0 touch-manipulation active:scale-95 ${
                activeTab === 'draft'
                  ? 'bg-[#e35e25] text-white shadow-md shadow-orange-900/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Drafts ({draftEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-medium text-xs sm:text-sm transition-all whitespace-nowrap flex-shrink-0 touch-manipulation active:scale-95 ${
                activeTab === 'past'
                  ? 'bg-[#e35e25] text-white shadow-md shadow-orange-900/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Past ({pastEvents.length})
            </button>
          </div>
        </div>

        {/* Events List - Enhanced Design */}
        {/* Loading state for attending tab */}
        {activeTab === 'attending' && attendingLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
            <Loader2 size={32} className="text-[#e35e25] animate-spin mb-4" />
            <p className="text-gray-500 text-sm">Loading attending circles…</p>
          </div>
        ) : currentEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl sm:rounded-3xl border-2 border-dashed border-gray-200 shadow-sm">
            <div className="w-20 h-20 bg-[#e35e25]/10 rounded-full flex items-center justify-center mb-4">
              <Calendar size={40} className="text-[#e35e25]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#15383c] mb-2">
              No {activeTab === 'hosting' ? 'hosting' : activeTab === 'attending' ? 'attending' : activeTab === 'draft' ? 'draft' : 'past'} events found
            </h3>
            <p className="text-gray-500 text-sm sm:text-base max-w-md">
              {activeTab === 'hosting' 
                ? 'Start hosting your first circle and bring your community together!' 
                : activeTab === 'attending'
                ? 'RSVP to events you\'re interested in and they\'ll appear here.'
                : activeTab === 'draft'
                ? 'Save events as drafts while creating them to finish later.'
                : 'Past events you hosted or attended will appear here.'}
            </p>
            {activeTab === 'hosting' && (
              <button
                onClick={() => setViewState(ViewState.CREATE_EVENT)}
                className="mt-6 px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#cf4d1d] transition-colors shadow-md shadow-orange-900/20"
              >
                Create Your First Event
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {currentEvents.map(event => {
              const profilePic = hostProfilePictures[event.id] || null;
              const eventImage = event.imageUrls?.[0] || event.imageUrl || `https://picsum.photos/seed/${event.id}/400/300`;
              
              return (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 hover:border-[#e35e25] hover:shadow-lg transition-all cursor-pointer overflow-hidden group shadow-sm active:scale-[0.98] touch-manipulation"
                >
                  <div className="flex flex-col sm:flex-row gap-0 sm:gap-4 p-0 sm:p-4">
                    {/* Event Image - Enhanced */}
                    <div className="w-full sm:w-40 md:w-48 h-48 sm:h-40 md:h-48 rounded-t-2xl sm:rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 relative">
                      <img 
                        src={eventImage} 
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://picsum.photos/seed/${event.id}/400/300`;
                        }}
                      />
                      {/* Rating Badge Overlay */}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 shadow-md">
                        <Star size={12} className="text-[#e35e25] fill-[#e35e25]" />
                        <span className="text-xs font-bold text-[#15383c]">{formatRating(event.rating)}</span>
                      </div>
                    </div>

                    {/* Event Info - Enhanced */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between p-4 sm:p-0">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2 sm:mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-heading font-bold text-lg sm:text-xl text-[#15383c] mb-2 line-clamp-2 group-hover:text-[#e35e25] transition-colors">
                              {event.title}
                            </h3>
                            <div className="flex items-center gap-2 mb-2">
                              {/* Host Profile Picture */}
                              {activeTab === 'hosting' && (
                                <>
                                  <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                                    {profilePic && !failedProfilePics.has(event.id) ? (
                                      <img 
                                        src={profilePic} 
                                        alt="You" 
                                        className="w-full h-full object-cover"
                                        onError={() => {
                                          setFailedProfilePics(prev => new Set(prev).add(event.id));
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-[#15383c] text-white text-xs font-bold">
                                        {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'Y'}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-600 font-medium">Hosted by you</span>
                                </>
                              )}
                              {activeTab !== 'hosting' && (
                                <span className="text-xs text-gray-600 font-medium truncate">Hosted by {event.hostName}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Date, Location, Attendees - Enhanced */}
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="w-8 h-8 bg-[#e35e25]/10 rounded-lg flex items-center justify-center">
                              <Calendar size={14} className="text-[#e35e25]" />
                            </div>
                            <span className="font-medium">{formatDate(event.date)}</span>
                            <span className="text-gray-400">•</span>
                            <Clock size={14} className="text-gray-400" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="w-8 h-8 bg-[#e35e25]/10 rounded-lg flex items-center justify-center">
                              <MapPin size={14} className="text-[#e35e25]" />
                            </div>
                            <span className="truncate">{event.location || event.city}</span>
                          </div>
                          {event.attendeesCount > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <div className="w-8 h-8 bg-[#e35e25]/10 rounded-lg flex items-center justify-center">
                                <Users size={14} className="text-[#e35e25]" />
                              </div>
                              <span className="font-medium">{event.attendeesCount} {event.attendeesCount === 1 ? 'person' : 'people'} attending</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons for hosting events - Enhanced */}
                      {activeTab === 'hosting' && (
                        <div className="mt-4">
                          {/* Checked-in count badge */}
                          {(checkedInCounts[event.id] || 0) > 0 && (
                            <div className="mb-3 flex items-center gap-2 text-sm">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full font-medium">
                                <CheckCircle2 size={14} />
                                Checked-in: {checkedInCounts[event.id]} / {event.attendeesCount || 0}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2 sm:gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onChatClick(e, event);
                              }}
                              className="flex-1 px-4 py-2.5 bg-[#e35e25] text-white text-sm font-bold rounded-xl hover:bg-[#cf4d1d] transition-colors flex items-center justify-center gap-2 shadow-md shadow-orange-900/20 active:scale-95 touch-manipulation"
                            >
                              <MessageCircle size={16} />
                              Manage
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onEditEvent) {
                                  onEditEvent(event);
                                } else {
                                  setTimeout(() => {
                                    window.dispatchEvent(new CustomEvent('editEvent', { detail: { eventId: event.id } }));
                                  }, 100);
                                }
                              }}
                              className="px-4 py-2.5 bg-white text-[#15383c] text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 border-2 border-gray-200 active:scale-95 touch-manipulation"
                            >
                              <Edit size={16} />
                              Edit
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action buttons for attending events */}
                      {activeTab === 'attending' && (
                        <div className="mt-4 flex items-center gap-2 sm:gap-3">
                          {/* View Ticket button */}
                          {userReservations[event.id] && userReservations[event.id].status === 'reserved' && !cancelledEvents.has(event.id) && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const reservationId = userReservations[event.id]?.id;
                                  if (reservationId) {
                                    window.history.pushState({ viewState: ViewState.TICKET }, '', `/ticket/${reservationId}`);
                                    setViewState(ViewState.TICKET);
                                  }
                                }}
                                className="flex-1 px-4 py-2.5 bg-[#e35e25] text-white text-sm font-bold rounded-xl hover:bg-[#cf4d1d] transition-colors flex items-center justify-center gap-2 shadow-md shadow-orange-900/20 active:scale-95 touch-manipulation"
                              >
                                <Ticket size={16} />
                                View Ticket
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCancellingEvent(event);
                                  setShowCancelModal(true);
                                }}
                                className="px-4 py-2.5 bg-white text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2 border-2 border-red-200 active:scale-95 touch-manipulation"
                              >
                                <XCircle size={16} />
                                Cancel
                              </button>
                            </>
                          )}
                          {/* Cancelled state */}
                          {(userReservations[event.id]?.status === 'cancelled' || cancelledEvents.has(event.id)) && (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-500 rounded-xl font-medium">
                              <XCircle size={16} />
                              Cancelled
                            </div>
                          )}
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

      {/* Cancel Confirmation Modal */}
      {showCancelModal && cancellingEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            if (!cancelling) {
              setShowCancelModal(false);
              setCancellingEvent(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#15383c]">Cancel Reservation?</h3>
              <button
                onClick={() => {
                  if (!cancelling) {
                    setShowCancelModal(false);
                    setCancellingEvent(null);
                  }
                }}
                disabled={cancelling}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel your reservation for <strong>{cancellingEvent.title}</strong>?
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>Cancellation Policy:</strong> Cancellations are processed immediately. 
                For paid events, refunds are subject to our refund policy and may take 5-10 business days to process.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancellingEvent(null);
                }}
                disabled={cancelling}
                className="flex-1 py-3 bg-gray-100 text-[#15383c] rounded-full font-semibold hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Keep Reservation
              </button>
              <button
                onClick={handleCancelReservation}
                disabled={cancelling}
                className="flex-1 py-3 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Yes, Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
