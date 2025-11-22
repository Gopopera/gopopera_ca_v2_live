import React from 'react';
import { ViewState } from '../types';
import { X } from 'lucide-react';

interface BasicDetailsPageProps {
  setViewState: (view: ViewState) => void;
}

export const BasicDetailsPage: React.FC<BasicDetailsPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-white pt-24 pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6"><h1 className="font-heading font-bold text-3xl text-[#15383c]">Basic Details</h1><button onClick={() => setViewState(ViewState.PROFILE)} className="w-10 h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity"><X size={20} /></button></div>
      </div>
    </div>
  );
};