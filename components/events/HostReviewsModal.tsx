import React, { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { formatRating } from '@/utils/formatRating';
import { getUserProfile } from '@/firebase/db';
import { FirestoreReview } from '@/firebase/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { getInitials, getAvatarBgColor } from '@/utils/avatarUtils';
import { useHostReviews } from '@/hooks/useHostReviewsCache';

interface HostReviewsModalProps {
  hostId: string;
  hostName: string;
  hostRating: number | null;
  hostReviewCount: number;
  isOpen: boolean;
  onClose: () => void;
  onReviewerClick?: (userId: string, userName: string) => void;
}

interface ReviewWithUser extends FirestoreReview {
  userPhoto?: string;
  eventTitle?: string;
}

export const HostReviewsModal: React.FC<HostReviewsModalProps> = ({
  hostId,
  hostName,
  hostRating,
  hostReviewCount,
  isOpen,
  onClose,
  onReviewerClick
}) => {
  // Use reviews cache hook for reviews data
  const { reviews: cachedReviews, averageRating, reviewCount, isLoading: reviewsLoading } = useHostReviews(hostId);
  
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { language, t } = useLanguage();

  // Fetch user photos for reviews when modal opens and reviews are loaded
  useEffect(() => {
    if (!isOpen || !hostId || reviewsLoading || cachedReviews.length === 0) {
      setReviews([]);
      setLoading(reviewsLoading);
      return;
    }

    const loadReviewPhotos = async () => {
      try {
        setLoading(true);
        console.log('[HOST_REVIEWS_MODAL] Loading user photos for reviews:', cachedReviews.length);
        
        // Fetch user profiles and event titles for each review
        // FIX: First check review.userPhotoURL, then fetch from profile, use consistent fallback
        const reviewsWithUsers = await Promise.all(
          cachedReviews.map(async (review) => {
            try {
              // First check if review has stored photo URL (for seeded/migrated reviews)
              if ((review as any).userPhotoURL) {
                return {
                  ...review,
                  userPhoto: (review as any).userPhotoURL,
                  eventTitle: 'Event',
                };
              }
              
              // Otherwise fetch from user profile
              const userProfile = await getUserProfile(review.userId);
              const userPhoto = userProfile?.photoURL || userProfile?.imageUrl || null;
              
              return {
                ...review,
                userPhoto,
                eventTitle: 'Event',
              };
            } catch (error) {
              console.error(`[HOST_REVIEWS_MODAL] Error fetching user profile for ${review.userId}:`, error);
              return {
                ...review,
                userPhoto: null, // Use null to allow fallback to initials
                eventTitle: 'Event',
              };
            }
          })
        );
        
        console.log('[HOST_REVIEWS_MODAL] Loaded reviews with user data:', reviewsWithUsers.length);
        setReviews(reviewsWithUsers);
      } catch (error) {
        console.error('[HOST_REVIEWS_MODAL] Error loading review photos:', error);
        setReviews(cachedReviews.map(r => ({ ...r, userPhoto: null, eventTitle: 'Event' })));
      } finally {
        setLoading(false);
      }
    };

    loadReviewPhotos();
  }, [isOpen, hostId, cachedReviews, reviewsLoading]);
  
  // Use calculated values from cache hook
  const calculatedRating = averageRating;
  const calculatedCount = reviewCount;

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

  // Use calculated values if available, otherwise fall back to props
  const displayRating = calculatedRating > 0 ? calculatedRating : (hostRating || 0);
  const displayCount = calculatedCount > 0 ? calculatedCount : hostReviewCount;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 sm:px-6">
      <div className="absolute inset-0 bg-popera-teal/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <div>
            <h3 className="text-lg sm:text-xl font-heading font-bold text-popera-teal">{t('hostReviews.title')}</h3>
            <p className="text-xs sm:text-sm text-gray-500">{t('hostReviews.hostedBy')} {hostName}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-6 sm:py-8 bg-[#fafafa] border-b border-gray-100 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-4xl sm:text-5xl font-heading font-bold text-popera-teal">
              {formatRating(displayRating)}
            </span>
            <div className="flex flex-col items-start">
              <div className="flex text-popera-orange">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    size={16} 
                    fill={i < Math.floor(displayRating) ? "currentColor" : "none"} 
                    className={i < Math.floor(displayRating) ? "" : "text-gray-300"} 
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {displayCount} {displayCount === 1 ? t('hostReviews.review') : t('hostReviews.reviews')}
              </span>
            </div>
          </div>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('hostReviews.loading')}</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t('hostReviews.noReviews')}</div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-50 last:border-0 pb-4 sm:pb-6 last:pb-0">
                <div className="flex items-center justify-between mb-3">
                  <div 
                    className={`flex items-center gap-2 sm:gap-3 ${onReviewerClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                    onClick={() => handleReviewerClick(review)}
                  >
                    {/* FIX: Use consistent profile picture display with initials fallback */}
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 ring-1 ring-gray-200">
                      {review.userPhoto ? (
                        <img 
                          src={review.userPhoto} 
                          alt={review.userName} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // On error, hide the img and show fallback
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-full h-full flex items-center justify-center ${getAvatarBgColor(review.userName, review.userId)} text-white font-bold text-xs sm:text-sm`}
                        style={{ display: review.userPhoto ? 'none' : 'flex' }}
                      >
                        {getInitials(review.userName)}
                      </div>
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

