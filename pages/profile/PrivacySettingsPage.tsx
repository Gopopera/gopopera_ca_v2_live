
import React from 'react';
import { ViewState } from '../../types';
import { X } from 'lucide-react';

interface PrivacySettingsPageProps {
  setViewState: (view: ViewState) => void;
}

export const PrivacySettingsPage: React.FC<PrivacySettingsPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-white pt-24 pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
           <h1 className="font-heading font-bold text-3xl text-[#15383c]">Privacy Settings</h1>
           <button onClick={() => setViewState(ViewState.PROFILE)} className="w-10 h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity">
             <X size={20} />
           </button>
        </div>
        <div className="mb-12">
           <h2 className="font-heading font-bold text-2xl text-[#15383c] mb-6">Attendee Reservation</h2>
           <div className="space-y-6">
              <label className="flex items-start gap-4 cursor-pointer group">
                 <div className="relative pt-1"><input type="checkbox" className="w-6 h-6 border-2 border-gray-200 rounded-md appearance-none checked:bg-[#15383c] checked:border-[#15383c] transition-all cursor-pointer" /></div>
                 <span className="text-gray-600 group-hover:text-[#15383c] transition-colors font-light">Show my full name and photo on my public profile</span>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group">
                 <div className="relative pt-1"><input type="checkbox" className="w-6 h-6 border-2 border-gray-200 rounded-md appearance-none checked:bg-[#15383c] checked:border-[#15383c] transition-all cursor-pointer" /></div>
                 <span className="text-gray-600 group-hover:text-[#15383c] transition-colors font-light">Hide my profile from search results</span>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group">
                 <div className="relative pt-1"><input type="checkbox" className="w-6 h-6 border-2 border-gray-200 rounded-md appearance-none checked:bg-[#15383c] checked:border-[#15383c] transition-all cursor-pointer" /></div>
                 <span className="text-gray-600 group-hover:text-[#15383c] transition-colors font-light">Only show my profile to people I've interacted with</span>
              </label>
           </div>
        </div>
        <div>
           <h2 className="font-heading font-bold text-2xl text-[#15383c] mb-6">Activity Visibility</h2>
           <div className="space-y-6">
              <label className="flex items-start gap-4 cursor-pointer group">
                 <div className="relative pt-1"><input type="checkbox" className="w-6 h-6 border-2 border-gray-200 rounded-md appearance-none checked:bg-[#15383c] checked:border-[#15383c] transition-all cursor-pointer" /></div>
                 <span className="text-gray-600 group-hover:text-[#15383c] transition-colors font-light">Show events I'm attending on my profile</span>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group">
                 <div className="relative pt-1"><input type="checkbox" className="w-6 h-6 border-2 border-gray-200 rounded-md appearance-none checked:bg-[#15383c] checked:border-[#15383c] transition-all cursor-pointer" /></div>
                 <span className="text-gray-600 group-hover:text-[#15383c] transition-colors font-light">Keep my event activity private</span>
              </label>
           </div>
        </div>
      </div>
    </div>
  );
};
