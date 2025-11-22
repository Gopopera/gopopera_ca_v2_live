import React from 'react';
import { X, Star, ThumbsUp, MessageSquare } from 'lucide-react';
import { Event } from '@/types';

interface ReviewsModalProps {
  event: Event;
  onClose: () => void;
}

export const ReviewsModal: React.FC<ReviewsModalProps> = ({ event, onClose }) => {
  const reviews = [
    { id: 1, name: "Jessica M.", date: "2 days ago", rating: 5, comment: "Absolutely incredible experience! The host was so welcoming and the atmosphere was unmatched.", likes: 12 },
    { id: 2, name: "David Chen", date: "1 week ago", rating: 4, comment: "Great event, very well organized.", likes: 5 },
    { id: 3, name: "Sarah L.", date: "2 weeks ago", rating: 5, comment: "One of the best pop-ups I've been to in the city.", likes: 24 }
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 sm:px-6">
      <div className="absolute inset-0 bg-[#15383c]/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <div><h3 className="text-lg sm:text-xl font-heading font-bold text-[#15383c]">Host Reviews</h3><p className="text-xs sm:text-sm text-gray-500">Hosted by {event.hostName}</p></div>
          <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors shrink-0"><X size={20} /></button>
        </div>
        <div className="px-4 sm:px-6 py-6 sm:py-8 bg-[#fafafa] border-b border-gray-100 text-center">
           <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-4xl sm:text-5xl font-heading font-bold text-[#15383c]">{event.rating}</span>
              <div className="flex flex-col items-start">
                 <div className="flex text-[#e35e25]">
                    {[...Array(5)].map((_, i) => (<Star key={i} size={16} fill={i < Math.floor(event.rating) ? "currentColor" : "none"} className={i < Math.floor(event.rating) ? "" : "text-gray-300"} />))}
                 </div>
                 <span className="text-xs text-gray-500 font-medium">{event.reviewCount} reviews</span>
              </div>
           </div>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
           {reviews.map((review) => (
             <div key={review.id} className="border-b border-gray-50 last:border-0 pb-4 sm:pb-6 last:pb-0">
                <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 overflow-hidden shrink-0"><img src={`https://picsum.photos/seed/${review.name}/50/50`} alt={review.name} className="w-full h-full object-cover" /></div>
                      <div className="min-w-0"><h4 className="text-xs sm:text-sm font-bold text-[#15383c] truncate">{review.name}</h4><span className="text-[10px] sm:text-xs text-gray-400">{review.date}</span></div>
                   </div>
                </div>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">"{review.comment}"</p>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};