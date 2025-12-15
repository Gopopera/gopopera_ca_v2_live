
import React from 'react';
import { ViewState } from '../../../types';
import { X, Star } from 'lucide-react';

interface MyReviewsPageProps {
  setViewState: (view: ViewState) => void;
}

export const MyReviewsPage: React.FC<MyReviewsPageProps> = ({ setViewState }) => {
  
  const reviews = [
    {
      id: 1,
      name: "Fadel Gergab",
      date: "Nov 8, 2025",
      rating: 4.2,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop",
      comment: "The circle was well-organized and engaging. The setup attracted good attention, and the flow of activities kept participants interested throughout. The overall presentation was visually appealing, and the host managed everything efficiently. Guests appreciated the interactive elements and the professional approach.",
      eventName: "Retro Record Fair Extravaganza"
    },
    {
      id: 2,
      name: "Sarah Jenkins",
      date: "Oct 15, 2025",
      rating: 5.0,
      image: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?q=80&w=2070&auto=format&fit=crop", 
      comment: "Absolutely loved the vibe! The host was incredibly welcoming and the venue was perfect for the occasion. Can't wait for the next one.",
      eventName: "Urban Garden Workshop"
    },
    {
      id: 3,
      name: "Marcus Cole",
      date: "Sep 22, 2025",
      rating: 4.8,
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop",
      comment: "Great networking opportunity. I met some really interesting people. The only downside was that it ended too soon!",
      eventName: "Tech Networking Night"
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-20 font-sans">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
           <h1 className="font-heading font-bold text-3xl text-[#15383c]">My Reviews</h1>
           <button 
             onClick={() => setViewState(ViewState.PROFILE)}
             className="w-10 h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-sm"
           >
             <X size={20} />
           </button>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
           {reviews.map((review) => (
             <div key={review.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 transition-transform hover:scale-[1.01] duration-300">
                <div className="flex gap-4 mb-4">
                   {/* Avatar */}
                   <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 shrink-0 ring-2 ring-white shadow-sm">
                      <img src={review.image} alt={review.name} className="w-full h-full object-cover" />
                   </div>
                   
                   {/* Header Info */}
                   <div className="flex-1">
                      <div className="flex justify-between items-start">
                          <h3 className="font-bold text-[#15383c] text-lg leading-tight">{review.name}</h3>
                          <span className="text-xs text-gray-400 mt-1">{review.date}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                         <Star size={16} className="fill-[#e35e25] text-[#e35e25]" />
                         <span className="text-sm font-bold text-[#15383c]">{review.rating}</span>
                      </div>
                   </div>
                </div>
                
                <p className="text-gray-600 leading-relaxed font-light text-sm md:text-base mb-4">
                  "{review.comment}"
                </p>

                <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Event</span>
                    <span className="text-sm font-medium text-[#15383c]">{review.eventName}</span>
                </div>
             </div>
           ))}
        </div>
        
      </div>
    </div>
  );
};
