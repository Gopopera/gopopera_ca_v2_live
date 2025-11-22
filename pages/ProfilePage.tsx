import React from 'react';
import { ViewState } from '../types';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface ProfilePageProps {
  setViewState: (view: ViewState) => void;
  userName: string;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ setViewState, userName, onLogout }) => {
  const stats = { revenue: 0, hosted: 0, attendees: 0, following: 0, attended: 0, reviews: 0 };
  const settingsLinks = [
    { label: 'My Pop-ups', action: () => setViewState(ViewState.MY_POPS) },
    { label: 'Basic Details', action: () => setViewState(ViewState.PROFILE_BASIC) },
    { label: 'Notification Preferences', action: () => setViewState(ViewState.PROFILE_NOTIFICATIONS) },
    { label: 'Privacy Settings', action: () => setViewState(ViewState.PROFILE_PRIVACY) },
    { label: 'Get Help', action: () => setViewState(ViewState.HELP) },
    { label: 'Stripe Payout Settings', action: () => setViewState(ViewState.PROFILE_STRIPE) },
    { label: 'Reviews', action: () => setViewState(ViewState.PROFILE_REVIEWS) },
    { label: 'Logout', action: onLogout, isLogout: true },
  ];
  return (
    <div className="min-h-screen bg-[#f8fafb] pt-20 sm:pt-24 md:pt-28 pb-12 sm:pb-16 md:pb-20 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4 sm:mb-6"><button onClick={() => setViewState(ViewState.FEED)} className="flex items-center text-gray-400 hover:text-[#15383c] transition-colors font-medium text-sm sm:text-base touch-manipulation active:scale-95"><ChevronLeft size={18} className="sm:w-5 sm:h-5 mr-1" /> Back</button></div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-[#15383c] mb-6 sm:mb-8">Profile</h1>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8">
           <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-[#e35e25] rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-lg shadow-orange-900/20 shrink-0"><span className="font-heading font-bold text-white text-3xl sm:text-4xl md:text-5xl">P</span></div>
           <div className="flex-1 min-w-0"><p className="text-[#15383c] font-medium text-base sm:text-lg md:text-xl truncate">@{userName.toLowerCase().replace(/\s/g, '') || 'user'}</p><p className="text-gray-500 text-xs sm:text-sm md:text-base mb-3">Member since Nov '23</p><button onClick={() => setViewState(ViewState.PROFILE_BASIC)} className="px-5 sm:px-6 md:px-7 py-1.5 sm:py-2 rounded-full border border-gray-200 text-xs sm:text-sm md:text-base font-medium text-gray-600 hover:bg-white hover:border-[#15383c] hover:text-[#15383c] transition-all bg-white shadow-sm touch-manipulation active:scale-95">Edit</button></div>
        </div>
        <div className="bg-white p-5 sm:p-6 md:p-7 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center mb-6 sm:mb-8"><span className="text-gray-500 font-medium text-sm sm:text-base md:text-lg">Total Revenue</span><span className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-[#15383c]">${stats.revenue}</span></div>
        <div className="mb-8 sm:mb-10"><div className="flex gap-3 sm:gap-4 md:gap-5 overflow-x-auto pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 md:grid md:grid-cols-2 md:gap-6 md:mx-0 md:px-0 md:pb-0 snap-x snap-mandatory scroll-smooth hide-scrollbar"><div className="bg-white p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center min-w-[140px] sm:min-w-[160px] md:min-w-0 snap-center"><span className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#15383c] mb-1">{stats.hosted}</span><span className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 uppercase tracking-wide">Events Hosted</span></div></div></div>
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">{settingsLinks.map((item, idx) => (<button key={idx} onClick={item.action} className={`w-full flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors text-left touch-manipulation active:scale-95 ${item.isLogout ? 'text-gray-500 hover:text-red-500' : 'text-[#15383c]'}`}><span className={`text-sm sm:text-base md:text-lg ${item.isLogout ? '' : 'font-light'}`}>{item.label}</span><div className="flex items-center gap-3 shrink-0"><ChevronRight size={16} className="sm:w-[18px] sm:h-[18px] md:w-5 md:h-5 text-gray-400" /></div></button>))}</div>
      </div>
    </div>
  );
};