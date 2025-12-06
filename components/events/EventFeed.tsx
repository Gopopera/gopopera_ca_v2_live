import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

  if (displayEvents.length === 0) {
    return (
      <>
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No events match your filters.</p>
          <button
            onClick={() => setFilterDrawerOpen(true)}
            className="mt-4 text-[#e35e25] hover:underline"
          >
            Adjust filters
          </button>
        </div>
        <FilterDrawer
          isOpen={isFilterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          events={events}
        />
      </>
    );
  }

  return (
    <>
      {/* Horizontal Scroll Layout - Matching Landing Page */}
      <div className="relative group">
        {/* Left Arrow - Desktop only */}
        <button
          onClick={() => {
            const container = document.getElementById('explore-events-scroll');
            if (container) {
              container.scrollBy({ left: -400, behavior: 'smooth' });
            }
          }}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 items-center justify-center text-[#15383c] hover:bg-[#eef4f5] hover:border-[#15383c] transition-all opacity-0 group-hover:opacity-100 hidden lg:flex"
          aria-label="Scroll left"
        >
          <ChevronLeft size={20} />
        </button>
        
        {/* Scrollable Row - One event at a time */}
        <div 
          id="explore-events-scroll"
          className="flex overflow-x-auto gap-4 lg:gap-6 pb-2 snap-x snap-mandatory scroll-smooth hide-scrollbar w-full touch-pan-x overscroll-x-contain cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}
          onWheel={(e) => {
            // Allow horizontal scrolling with mouse wheel when hovering over the container
            const container = e.currentTarget;
            if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
              // Use requestAnimationFrame to avoid passive listener warning
              requestAnimationFrame(() => {
                container.scrollLeft += e.deltaY;
              });
            }
          }}
          onMouseDown={(e) => {
            // Enable drag scrolling - only on non-touch devices
            if ('ontouchstart' in window) return;
            
            const container = e.currentTarget;
            const startX = e.pageX - container.offsetLeft;
            const scrollLeft = container.scrollLeft;
            let isDown = true;

            const handleMouseMove = (e: MouseEvent) => {
              if (!isDown) return;
              const x = e.pageX - container.offsetLeft;
              const walk = (x - startX) * 2;
              container.scrollLeft = scrollLeft - walk;
            };

            const handleMouseUp = () => {
              isDown = false;
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove, { passive: true });
            document.addEventListener('mouseup', handleMouseUp, { passive: true });
          }}
        >
          {displayEvents.map(event => (
            <div key={event.id} className="snap-start shrink-0 w-[85vw] sm:w-[70vw] md:w-[60vw] lg:w-[50vw] xl:w-[40vw] max-w-[500px] flex-shrink-0" style={{ touchAction: 'pan-x pan-y' }}>
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
          ))}
        </div>
        
        {/* Right Arrow - Desktop only */}
        <button
          onClick={() => {
            const container = document.getElementById('explore-events-scroll');
            if (container) {
              container.scrollBy({ left: 400, behavior: 'smooth' });
            }
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 items-center justify-center text-[#15383c] hover:bg-[#eef4f5] hover:border-[#15383c] transition-all opacity-0 group-hover:opacity-100 hidden lg:flex"
          aria-label="Scroll right"
        >
          <ChevronRight size={20} />
        </button>
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