import React from 'react';
import { ViewState } from '../types';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';

interface ReportPageProps {
  setViewState: (view: ViewState) => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-[#15383c] pt-24 pb-12 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6"><button onClick={() => setViewState(ViewState.LANDING)} className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"><ChevronLeft size={20} className="sm:w-6 sm:h-6" /></button><div className="text-center mb-6 sm:mb-8"><h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">Report an Event</h1></div></div>
    </div>
  );
};