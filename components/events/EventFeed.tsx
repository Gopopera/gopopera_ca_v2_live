import React from 'react';
import { EventCard } from './EventCard';
import { Event } from '@/types';
import { CARD_GRID_GAP } from '@/src/components/events/EventCardLayout';

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
  const displayEvents = limit ? events.slice(0, limit) : events;

  return (
    <div className={`grid ${CARD_GRID_GAP} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 place-items-center`}>
      {displayEvents.map(event => (
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
      ))}
    </div>
  );
};