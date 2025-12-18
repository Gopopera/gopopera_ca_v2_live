import React, { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { Event } from '@/types';
import { formatRating } from '@/utils/formatRating';
import { listReviews } from '@/firebase/db';
import { FirestoreReview } from '@/firebase/types';
import { ViewState } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReviewsModalProps {
  event: Event;
  onClose: () => void;
  onReviewerClick?: (userId: string, userName: string) => void;
}

interface ReviewWithUser extends FirestoreReview {
  userPhoto?: string;
}

export const ReviewsModal: React.FC<ReviewsModalProps> = ({ event, onClose, onReviewerClick }) => {
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        // Only show accepted reviews in the public modal (exclude pending/contested)
        const firestoreReviews = await listReviews(event.id, false);
        
        // Fetch user profiles for reviewers to get their photos
        const reviewsWithUsers = await Promise.all(
          firestoreReviews.map(async (review) => {
            try {
              const { getUserProfile } = await import('@/firebase/db');
              const userProfile = await getUserProfile(review.userId);
              return {
                ...review,
                userPhoto: userProfile?.photoURL || userProfile?.imageUrl || `https://i.pravatar.cc/150?img=${review.userId}`,
              };
            } catch (error) {
              console.error(`Error fetching user profile for ${review.userId}:`, error);
              return {
                ...review,
                userPhoto: `https://i.pravatar.cc/150?img=${review.userId}`,
              };
            }
          })
        );
        
        setReviews(reviewsWithUsers);
      } catch (error) {
        console.error('Error loading reviews:', error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [event.id]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('dateTime.today');
    if (diffDays === 1) return t('dateTime.dayAgo');
    if (diffDays < 7) return t('dateTime.daysAgo').replace('{count}', String(diffDays));
    const weeks = Math.floor(diffDays / 7);
    if (weeks === 1) return t('dateTime.weekAgo');
    if (diffDays < 30) return t('dateTime.weeksAgo').replace('{count}', String(weeks));
    const months = Math.floor(diffDays / 30);
    if (months === 1) return t('dateTime.monthAgo');
    if (diffDays < 365) return t('dateTime.monthsAgo').replace('{count}', String(months));
    return date.toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleReviewerClick = (review: ReviewWithUser) => {
    if (onReviewerClick) {
      onReviewerClick(review.userId, review.userName);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 sm:px-6">
      <div className="absolute inset-0 bg-popera-teal/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <div><h3 className="text-lg sm:text-xl font-heading font-bold text-popera-teal">{t('circleReviews.title')}</h3><p className="text-xs sm:text-sm text-gray-500">{t('circleReviews.hostedBy')} {event.hostName}</p></div>
          <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors shrink-0"><X size={20} /></button>
        </div>
        <div className="px-4 sm:px-6 py-6 sm:py-8 bg-[#fafafa] border-b border-gray-100 text-center">
           <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-4xl sm:text-5xl font-heading font-bold text-popera-teal">{formatRating(event.rating)}</span>
              <div className="flex flex-col items-start">
                 <div className="flex text-popera-orange">
                    {[...Array(5)].map((_, i) => (<Star key={i} size={16} fill={i < Math.floor(event.rating) ? "currentColor" : "none"} className={i < Math.floor(event.rating) ? "" : "text-gray-300"} />))}
                 </div>
                 <span className="text-xs text-gray-500 font-medium">{reviews.length} {reviews.length === 1 ? t('circleReviews.review') : t('circleReviews.reviews')}</span>
              </div>
           </div>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
           {loading ? (
             <div className="text-center py-8 text-gray-500">{t('circleReviews.loading')}</div>
           ) : reviews.length === 0 ? (
             <div className="text-center py-8 text-gray-500">{t('circleReviews.noReviews')}</div>
           ) : (
             reviews.map((review) => (
               <div key={review.id} className="border-b border-gray-50 last:border-0 pb-4 sm:pb-6 last:pb-0">
                  <div className="flex items-center justify-between mb-3">
                     <div 
                       className={`flex items-center gap-2 sm:gap-3 ${onReviewerClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                       onClick={() => handleReviewerClick(review)}
                     >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 ring-1 ring-gray-200">
                          <img 
                            src={review.userPhoto || `https://i.pravatar.cc/150?img=${review.userId}`} 
                            alt={review.userName} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://i.pravatar.cc/150?img=${review.userId}`;
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-popera-teal truncate">{review.userName}</h4>
                          <span className="text-[10px] sm:text-xs text-gray-400">
                            {formatDate(review.createdAt as number)}
                          </span>
                        </div>
                     </div>
                     <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={12} 
                            className={i < review.rating ? 'fill-[#e35e25] text-[#e35e25]' : 'text-gray-300'} 
                          />
                        ))}
                     </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">"{review.comment}"</p>
                  )}
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};