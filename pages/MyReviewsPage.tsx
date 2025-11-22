import React from 'react';
import { ViewState } from '../types';
import { X, Star } from 'lucide-react';

interface MyReviewsPageProps {
  setViewState: (view: ViewState) => void;
}

export const MyReviewsPage: React.FC<MyReviewsPageProps> = ({ setViewState }) => {
  const reviews = [{ id: 1, name: "Fadel Gergab", date: "Nov 8, 2025", rating: 4.2, image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop", comment: "Great event!", eventName: "Retro Record Fair" }];
  return (
    <div className="min-h-screen bg-[#f8fafb] pt-20 sm:pt-24 pb-12 sm:pb-20 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6"><div className="flex items-center justify-between mb-6 sm:mb-8"><h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c]">My Reviews</h1><button onClick={() => setViewState(ViewState.PROFILE)} className="w-9 h-9 sm:w-10 sm:h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-sm touch-manipulation active:scale-95 shrink-0"><X size={18} className="sm:w-5 sm:h-5" /></button></div></div>
    </div>
  );
};