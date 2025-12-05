import React, { useMemo } from 'react';
import { Filter } from 'lucide-react';
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
  const { filters, isFilterDrawerOpen, setFilterDrawerOpen, getActiveFilterCount } = useFilterStore();
  
  // Apply filters to events
  const filteredEvents = useMemo(() => {
    return applyEventFilters(events, filters);
  }, [events, filters]);
  
  const displayEvents = limit ? filteredEvents.slice(0, limit) : filteredEvents;
  const activeFilterCount = getActiveFilterCount();

  return (
    <>
      {/* Filter Button */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-4">
        <button
          onClick={() => setFilterDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#15383c] text-[#15383c] font-medium hover:bg-[#15383c] hover:text-white transition-colors"
        >
          <Filter size={18} />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#e35e25] text-white text-xs font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Event Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5 justify-items-center max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
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