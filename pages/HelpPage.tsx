import React from 'react';
import { ViewState } from '../types';
import { ChevronLeft } from 'lucide-react';

interface HelpPageProps {
  setViewState: (view: ViewState) => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-[#15383c] pt-20 sm:pt-24 pb-8 sm:pb-12 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6"><button onClick={() => setViewState(ViewState.LANDING)} className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"><ChevronLeft size={20} className="sm:w-6 sm:h-6" /></button><div className="text-center mb-8 sm:mb-12"><h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">Help & Support</h1></div></div>
    </div>
  );
};