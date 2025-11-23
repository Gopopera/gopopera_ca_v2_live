import React from 'react';
import { EventCard } from './EventCard';
import { Event } from '@/types';

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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 xl:gap-8">
      {displayEvents.map(event => (
        <div key={event.id} className="md:col-span-6 lg:col-span-4 h-auto">
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