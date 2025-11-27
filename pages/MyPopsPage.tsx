import React, { useState, useMemo } from 'react';
import { ViewState, Event } from '../types';
import { ChevronLeft, Calendar, MapPin, Clock, Users } from 'lucide-react';
import { EventCard } from '../components/events/EventCard';
import { useUserStore } from '../stores/userStore';

interface MyPopsPageProps {
  setViewState: (view: ViewState) => void;
  events: Event[];
  onEventClick: (event: Event) => void;
  onChatClick: (e: React.MouseEvent, event: Event) => void;
  onReviewsClick: (e: React.MouseEvent, event: Event) => void;
  isLoggedIn?: boolean;
  favorites?: string[];
  onToggleFavorite?: (e: React.MouseEvent, eventId: string) => void;
}

type TabType = 'hosting' | 'attending';

export const MyPopsPage: React.FC<MyPopsPageProps> = ({ 
  setViewState, 
  events, 
  onEventClick, 
  onChatClick, 
  onReviewsClick, 
  isLoggedIn, 
  favorites = [], 
  onToggleFavorite 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('hosting');
  const user = useUserStore((state) => state.user);

  // Filter events by hosting vs attending
  const { hostingEvents, attendingEvents } = useMemo(() => {
    if (!user) {
      return { hostingEvents: [], attendingEvents: [] };
    }

    const hosting = events.filter(event => 
      event.hostId === user.uid || user.hostedEvents?.includes(event.id)
    );

    const attending = events.filter(event => 
      user.rsvps?.includes(event.id)
    );

    return { hostingEvents: hosting, attendingEvents: attending };
  }, [events, user]);

  const currentEvents = activeTab === 'hosting' ? hostingEvents : attendingEvents;

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
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('hosting')}
            className={`pb-4 px-1 font-medium text-sm transition-colors ${
              activeTab === 'hosting'
                ? 'text-[#e35e25] border-b-2 border-[#e35e25]'
                : 'text-gray-500 hover:text-[#15383c]'
            }`}
          >
            My Hosting ({hostingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('attending')}
            className={`pb-4 px-1 font-medium text-sm transition-colors ${
              activeTab === 'attending'
                ? 'text-[#e35e25] border-b-2 border-[#e35e25]'
                : 'text-gray-500 hover:text-[#15383c]'
            }`}
          >
            Attending ({attendingEvents.length})
          </button>
        </div>

        {/* Events List */}
        {currentEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-gray-200 rounded-3xl">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <Calendar size={32} />
            </div>
            <h3 className="text-xl font-bold text-[#15383c] mb-2">
              No {activeTab === 'hosting' ? 'hosting' : 'attending'} events found
            </h3>
            <p className="text-gray-500 text-sm">
              {activeTab === 'hosting' 
                ? 'Start hosting your first pop-up!' 
                : 'RSVP to events to see them here.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 justify-items-center max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
            {currentEvents.map(event => (
              <div key={event.id} className="w-full h-auto relative">
                <EventCard
                  event={event}
                  onClick={() => onEventClick(event)}
                  onChatClick={(e) => onChatClick(e, event)}
                  onReviewsClick={(e) => onReviewsClick(e, event)}
                  isLoggedIn={isLoggedIn}
                  isFavorite={favorites.includes(event.id)}
                  onToggleFavorite={onToggleFavorite}
                  showEditButton={activeTab === 'hosting' && event.hostId === user?.uid}
                  onEditClick={(e, event) => {
                    e.stopPropagation();
                    // Store event for editing and navigate to edit page
                    onEventClick(event);
                    setViewState(ViewState.EDIT_EVENT);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
