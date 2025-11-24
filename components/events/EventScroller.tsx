/**
 * Unified Event Scroller Component
 * Airbnb-style horizontal scrolling with gradient fade edges
 */

import React from 'react';
import { EventCard } from './EventCard';
import { Event } from '@/types';

interface EventScrollerProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onChatClick: (e: React.MouseEvent, event: Event) => void;
  onReviewsClick: (e: React.MouseEvent, event: Event) => void;
  isLoggedIn?: boolean;
  favorites?: string[];
  onToggleFavorite?: (e: React.MouseEvent, eventId: string) => void;
  className?: string;
}

export const EventScroller: React.FC<EventScrollerProps> = ({
  events,
  onEventClick,
  onChatClick,
  onReviewsClick,
  isLoggedIn,
  favorites = [],
  onToggleFavorite,
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      {/* Gradient fade edges - left */}
      <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 md:w-20 bg-gradient-to-r from-[#FAFAFA] to-transparent pointer-events-none z-10 md:hidden" />
      
      {/* Gradient fade edges - right */}
      <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-16 md:w-20 bg-gradient-to-l from-[#FAFAFA] to-transparent pointer-events-none z-10 md:hidden" />
      
      {/* Scroller Container */}
      <div className="flex overflow-x-auto gap-fluid pb-2 snap-x snap-mandatory scroll-smooth hide-scrollbar scroll-pl-fluid">
        {events.map((event) => (
          <div
            key={event.id}
            className="snap-start shrink-0 mr-fluid"
          >
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
    </div>
  );
};

