import React from 'react';
import { ViewState } from '../types';
import { X } from 'lucide-react';

interface PrivacySettingsPageProps {
  setViewState: (view: ViewState) => void;
}

export const PrivacySettingsPage: React.FC<PrivacySettingsPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-white pt-20 sm:pt-24 pb-8 sm:pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6"><div className="flex items-center justify-between mb-6 sm:mb-8 border-b border-gray-100 pb-4 sm:pb-6"><h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c]">Privacy Settings</h1><button onClick={() => setViewState(ViewState.PROFILE)} className="w-9 h-9 sm:w-10 sm:h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity touch-manipulation active:scale-95 shrink-0"><X size={18} className="sm:w-5 sm:h-5" /></button></div></div>
    </div>
  );
};