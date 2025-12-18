
import React from 'react';
import { ViewState } from '../../../types';
import { X, Eye, EyeOff, Users, Calendar } from 'lucide-react';

interface PrivacySettingsPageProps {
  setViewState: (view: ViewState) => void;
}

export const PrivacySettingsPage: React.FC<PrivacySettingsPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-[#f8fafb] pt-20 sm:pt-24 pb-8 sm:pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
           <div>
             <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c] mb-2">Privacy Settings</h1>
             <p className="text-sm text-gray-500">Control your privacy and visibility</p>
           </div>
           <button 
             onClick={() => setViewState(ViewState.PROFILE)} 
             className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors touch-manipulation active:scale-95 shadow-sm"
           >
             <X size={18} className="sm:w-5 sm:h-5" />
           </button>
        </div>
        
        {/* Profile Visibility Section */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 p-6 sm:p-8 mb-6">
           <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#15383c] mb-6">Profile Visibility</h2>
           <div className="space-y-4">
              <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-xl hover:bg-gray-50 transition-colors">
                 <div className="relative pt-1">
                   <input 
                     type="checkbox" 
                     className="w-5 h-5 border-2 border-gray-300 rounded-md appearance-none checked:bg-[#e35e25] checked:border-[#e35e25] transition-all cursor-pointer focus:ring-2 focus:ring-[#e35e25]/20" 
                   />
                 </div>
                 <div className="flex-1">
                   <span className="text-[#15383c] font-medium block group-hover:text-[#e35e25] transition-colors">Show my full name and photo on my public profile</span>
                   <span className="text-gray-500 text-sm mt-1">Make your profile visible to other users</span>
                 </div>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-xl hover:bg-gray-50 transition-colors">
                 <div className="relative pt-1">
                   <input 
                     type="checkbox" 
                     className="w-5 h-5 border-2 border-gray-300 rounded-md appearance-none checked:bg-[#e35e25] checked:border-[#e35e25] transition-all cursor-pointer focus:ring-2 focus:ring-[#e35e25]/20" 
                   />
                 </div>
                 <div className="flex-1">
                   <span className="text-[#15383c] font-medium block group-hover:text-[#e35e25] transition-colors">Hide my profile from search results</span>
                   <span className="text-gray-500 text-sm mt-1">Your profile won't appear in search</span>
                 </div>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-xl hover:bg-gray-50 transition-colors">
                 <div className="relative pt-1">
                   <input 
                     type="checkbox" 
                     className="w-5 h-5 border-2 border-gray-300 rounded-md appearance-none checked:bg-[#e35e25] checked:border-[#e35e25] transition-all cursor-pointer focus:ring-2 focus:ring-[#e35e25]/20" 
                   />
                 </div>
                 <div className="flex-1">
                   <span className="text-[#15383c] font-medium block group-hover:text-[#e35e25] transition-colors">Only show my profile to people I've interacted with</span>
                   <span className="text-gray-500 text-sm mt-1">Limit profile visibility to connections</span>
                 </div>
              </label>
           </div>
        </div>
        
        {/* Activity Visibility Section */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 p-6 sm:p-8">
           <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#15383c] mb-6">Activity Visibility</h2>
           <div className="space-y-4">
              <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-xl hover:bg-gray-50 transition-colors">
                 <div className="relative pt-1">
                   <input 
                     type="checkbox" 
                     className="w-5 h-5 border-2 border-gray-300 rounded-md appearance-none checked:bg-[#e35e25] checked:border-[#e35e25] transition-all cursor-pointer focus:ring-2 focus:ring-[#e35e25]/20" 
                   />
                 </div>
                 <div className="flex-1">
                   <span className="text-[#15383c] font-medium block group-hover:text-[#e35e25] transition-colors">Show events I'm attending on my profile</span>
                   <span className="text-gray-500 text-sm mt-1">Display your event activity publicly</span>
                 </div>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-xl hover:bg-gray-50 transition-colors">
                 <div className="relative pt-1">
                   <input 
                     type="checkbox" 
                     className="w-5 h-5 border-2 border-gray-300 rounded-md appearance-none checked:bg-[#e35e25] checked:border-[#e35e25] transition-all cursor-pointer focus:ring-2 focus:ring-[#e35e25]/20" 
                   />
                 </div>
                 <div className="flex-1">
                   <span className="text-[#15383c] font-medium block group-hover:text-[#e35e25] transition-colors">Keep my event activity private</span>
                   <span className="text-gray-500 text-sm mt-1">Hide your event participation from others</span>
                 </div>
              </label>
           </div>
        </div>
      </div>
    </div>
  );
};
