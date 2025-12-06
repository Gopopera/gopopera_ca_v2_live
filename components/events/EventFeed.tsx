import React, { useMemo } from 'react';
import { EventCard } from './EventCard';
import { Event } from '@/types';
import { useFilterStore } from '../../stores/filterStore';
import { FilterDrawer } from '../filters/FilterDrawer';
import { applyEventFilters } from '../../utils/filterEvents';

interface EventFeedProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onChatClick: (e: React.MouseEvent, event: Event) => void;
  onReviewsClick: (e: React.MouseEvent, event: Event) => void;
  limit?: number;
  isLoggedIn?: boolean;
  favorites?: string[];
  onToggleFavorite?: (e: React.MouseEvent, eventId: string) => void;
}

export const EventFeed: React.FC<EventFeedProps> = ({ 
  events, 
  onEventClick, 
  onChatClick, 
  onReviewsClick, 
  limit,
  isLoggedIn,
  favorites = [],
  onToggleFavorite
}) => {
  const { filters, isFilterDrawerOpen, setFilterDrawerOpen } = useFilterStore();
  
  // Apply filters to events
  const filteredEvents = useMemo(() => {
    return applyEventFilters(events, filters);
  }, [events, filters]);
  
  const displayEvents = limit ? filteredEvents.slice(0, limit) : filteredEvents;

  return (
    <>
      {/* Event Grid - Matching Landing Page Spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 justify-items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {displayEvents.length > 0 ? (
          displayEvents.map(event => (
            <div key={event.id} className="w-full h-auto">
              <EventCard 
                event={event} 
                onClick={onEventClick}
                onChatClick={onChatClick}
                onReviewsClick={onReviewsClick}
                isLoggedIn={isLoggedIn}
                isFavorite={favorites.includes(event.id)}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 text-lg">No events match your filters.</p>
            <button
              onClick={() => setFilterDrawerOpen(true)}
              className="mt-4 text-[#e35e25] hover:underline"
            >
              Adjust filters
            </button>
          </div>
        )}
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        events={events}
      />
    </>
  );
};