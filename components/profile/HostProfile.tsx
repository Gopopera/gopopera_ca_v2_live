import React, { useState } from 'react';
import { ArrowLeft, MapPin, Star, Users, Instagram, Twitter, Globe, MessageCircle, Check } from 'lucide-react';
import { Event } from '@/types';
import { EventCard } from '../events/EventCard';

interface HostProfileProps {
  hostName: string;
  onBack: () => void;
  onEventClick: (event: Event) => void;
  allEvents: Event[];
  isLoggedIn?: boolean;
  favorites?: string[];
  onToggleFavorite?: (e: React.MouseEvent, eventId: string) => void;
}

export const HostProfile: React.FC<HostProfileProps> = ({ hostName, onBack, onEventClick, allEvents, isLoggedIn, favorites = [], onToggleFavorite }) => {
  const [activeTab, setActiveTab] = useState<'events' | 'reviews'>('events');
  const [isFollowing, setIsFollowing] = useState(false);
  const hostEvents = allEvents.filter(e => e.hostName === hostName);
  const stats = { followers: 1240, following: 45, rating: 4.9, reviewCount: 128, bio: "Community organizer and event enthusiast." };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
           <div className="px-6 py-6"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-[#15383c] transition-colors font-medium"><ArrowLeft size={20} className="mr-2" /> Back</button></div>
           <div className="px-6 pb-10 flex flex-col md:flex-row items-start md:items-center gap-8">
             <div className="relative">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-200 p-1 ring-4 ring-white shadow-lg"><img src={`https://picsum.photos/seed/${hostName}/200/200`} alt={hostName} className="w-full h-full rounded-full object-cover"/></div>
                <div className="absolute bottom-1 right-1 w-8 h-8 bg-[#e35e25] text-white rounded-full flex items-center justify-center ring-4 ring-white"><Check size={16} strokeWidth={3} /></div>
             </div>
             <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                   <div><h1 className="text-3xl md:text-4xl font-heading font-bold text-[#15383c] mb-1">{hostName}</h1><p className="text-gray-500 flex items-center text-sm"><MapPin size={14} className="mr-1 text-[#e35e25]" /> Montreal, CA</p></div>
                   <div className="flex items-center gap-3">
                      <button onClick={() => setIsFollowing(!isFollowing)} className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${isFollowing ? 'bg-gray-100 text-[#15383c] border border-gray-200' : 'bg-[#e35e25] text-white hover:bg-[#cf4d1d] shadow-orange-900/20'}`}>{isFollowing ? 'Following' : 'Follow'}</button>
                      <button className="p-2.5 rounded-full border border-gray-200 text-gray-400 hover:text-[#15383c] hover:border-[#15383c] transition-all"><MessageCircle size={20} /></button>
                   </div>
                </div>
                <p className="text-gray-600 max-w-2xl leading-relaxed text-sm md:text-base mb-6">{stats.bio}</p>
                <div className="flex flex-wrap gap-6 md:gap-10 border-t border-gray-100 pt-6">
                   <div className="flex items-center gap-2"><Users size={18} className="text-gray-400" /><span className="font-bold text-[#15383c] text-lg">{stats.followers.toLocaleString()}</span><span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Followers</span></div>
                   <div className="flex items-center gap-2"><Star size={18} className="text-[#e35e25]" fill="currentColor" /><span className="font-bold text-[#15383c] text-lg">{stats.rating}</span><span className="text-xs text-gray-500 uppercase tracking-wide font-medium">({stats.reviewCount} Reviews)</span></div>
                </div>
             </div>
           </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex gap-8 border-b border-gray-200 mb-10">
           <button onClick={() => setActiveTab('events')} className={`pb-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'events' ? 'border-[#e35e25] text-[#e35e25]' : 'border-transparent text-gray-400 hover:text-[#15383c]'}`}>Events ({hostEvents.length})</button>
           <button onClick={() => setActiveTab('reviews')} className={`pb-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'reviews' ? 'border-[#e35e25] text-[#e35e25]' : 'border-transparent text-gray-400 hover:text-[#15383c]'}`}>Reviews ({stats.reviewCount})</button>
        </div>
        {activeTab === 'events' ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {hostEvents.map(event => (<EventCard key={event.id} event={event} onClick={onEventClick} onChatClick={() => {}} onReviewsClick={() => {}} isLoggedIn={isLoggedIn} isFavorite={favorites.includes(event.id)} onToggleFavorite={onToggleFavorite} />))}
             {hostEvents.length === 0 && (<div className="col-span-full py-20 text-center text-gray-400"><p>No upcoming events listed.</p></div>)}
           </div>
        ) : (
           <div className="max-w-2xl space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden"><img src={`https://picsum.photos/seed/reviewer${i}/50/50`} alt="reviewer" /></div><div><h4 className="text-sm font-bold text-[#15383c]">Verified User</h4></div></div>
                      <div className="flex text-[#e35e25]">{[...Array(5)].map((_, starI) => (<Star key={starI} size={14} fill="currentColor" />))}</div>
                   </div>
                   <p className="text-gray-600 text-sm leading-relaxed">"Such a wonderful host!"</p>
                </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
};