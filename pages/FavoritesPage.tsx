import React from 'react';
import { ViewState, Event } from '../types';
import { ChevronLeft, Heart } from 'lucide-react';
import { EventCard } from '../components/events/EventCard';

interface FavoritesPageProps {
  setViewState: (view: ViewState) => void;
  events: Event[];
  onEventClick: (event: Event) => void;
  onChatClick: (e: React.MouseEvent, event: Event) => void;
  onReviewsClick: (e: React.MouseEvent, event: Event) => void;
  favorites: string[];
  onToggleFavorite: (e: React.MouseEvent, eventId: string) => void;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ setViewState, events, onEventClick, onChatClick, onReviewsClick, favorites, onToggleFavorite }) => {
  const favoriteEvents = events.filter(event => favorites.includes(event.id));
  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center mb-8"><button onClick={() => setViewState(ViewState.PROFILE)} className="mr-4 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-popera-teal hover:bg-gray-50 transition-colors"><ChevronLeft size={20} /></button><div className="flex items-center gap-3"><h1 className="font-heading font-bold text-3xl text-popera-teal">My Favorites</h1><Heart className="text-popera-orange fill-popera-orange" size={24} /></div></div>
        {favoriteEvents.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 animate-fade-in">{favoriteEvents.map(event => (<div key={event.id} className="h-auto"><EventCard event={event} onClick={onEventClick} onChatClick={onChatClick} onReviewsClick={onReviewsClick} isLoggedIn={true} isFavorite={true} onToggleFavorite={onToggleFavorite} /></div>))}</div>) : (<div className="flex flex-col items-center justify-center py-24 text-center"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400"><Heart size={32} /></div><h3 className="text-xl font-bold text-popera-teal mb-2">No favorites yet</h3></div>)}
      </div>
    </div>
  );
};