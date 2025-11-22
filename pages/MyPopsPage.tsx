import React, { useState } from 'react';
import { ViewState, Event } from '../types';
import { ChevronLeft, Calendar } from 'lucide-react';
import { EventCard } from '../components/events/EventCard';

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

export const MyPopsPage: React.FC<MyPopsPageProps> = ({ setViewState, events, onEventClick, onChatClick, onReviewsClick, isLoggedIn, favorites = [], onToggleFavorite }) => {
  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8"><div className="flex items-center"><button onClick={() => setViewState(ViewState.PROFILE)} className="mr-4 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors"><ChevronLeft size={20} /></button><h1 className="font-heading font-bold text-3xl text-[#15383c]">My Pops</h1></div></div>
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-gray-200 rounded-3xl"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400"><Calendar size={32} /></div><h3 className="text-xl font-bold text-[#15383c] mb-2">No events found</h3></div>
      </div>
    </div>
  );
};