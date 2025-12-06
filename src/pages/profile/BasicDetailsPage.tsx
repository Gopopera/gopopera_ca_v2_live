
import React from 'react';
import { ViewState } from '../../types';
import { X } from 'lucide-react';

interface BasicDetailsPageProps {
  setViewState: (view: ViewState) => void;
}

export const BasicDetailsPage: React.FC<BasicDetailsPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-white pt-24 pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
           <h1 className="font-heading font-bold text-3xl text-[#15383c]">Basic Details</h1>
           <button 
             onClick={() => setViewState(ViewState.PROFILE)}
             className="w-10 h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity"
           >
             <X size={20} />
           </button>
        </div>
        <div className="space-y-6">
           <div className="space-y-2">
              <div className="w-full bg-gray-100 rounded-2xl py-4 px-6 text-[#15383c]">Jason</div>
           </div>
           <div className="space-y-2">
              <label className="block text-sm font-light text-gray-600 pl-1">Full Name</label>
              <input type="text" defaultValue="Jason" className="w-full bg-white border border-gray-200 rounded-full py-4 px-6 text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all" />
           </div>
           <div className="space-y-2">
              <label className="block text-sm font-light text-gray-600 pl-1">Phone Number</label>
              <input type="tel" defaultValue="(+1) 999-888-000" className="w-full bg-white border border-gray-200 rounded-full py-4 px-6 text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all" />
           </div>
           <div className="space-y-2">
              <label className="block text-sm font-light text-gray-600 pl-1">Bio</label>
              <textarea rows={4} defaultValue="Discover & host pop-up events in your city. We're commited to empowering pop-culture by creating a safe hub around connections and opportunities to be safely accessible." className="w-full bg-white border border-gray-200 rounded-3xl py-4 px-6 text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all resize-none" />
           </div>
           <div className="pt-8">
             <button className="w-full py-4 bg-[#15383c] text-white font-bold rounded-2xl hover:bg-[#1f4d52] transition-colors shadow-lg">Update</button>
           </div>
        </div>
      </div>
    </div>
  );
};
