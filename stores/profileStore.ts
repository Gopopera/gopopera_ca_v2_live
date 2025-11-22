import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Review {
  id: string;
  hostId: string; // User ID of the host being reviewed
  eventId?: string; // Optional: event this review is for
  userId: string; // User ID of the reviewer
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

interface ProfileStore {
  // Followers: userId -> array of follower user IDs
  followers: Record<string, string[]>; // hostId -> followerIds[]
  // Reviews: hostId -> array of reviews
  reviews: Record<string, Review[]>; // hostId -> reviews[]
  
  // Actions
  followHost: (followerId: string, hostId: string) => void;
  unfollowHost: (followerId: string, hostId: string) => void;
  isFollowing: (followerId: string, hostId: string) => boolean;
  getFollowersCount: (hostId: string) => number;
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => void;
  getReviews: (hostId: string) => Review[];
  getAverageRating: (hostId: string) => number;
  getReviewCount: (hostId: string) => number;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      followers: {},
      reviews: {},

      followHost: (followerId: string, hostId: string) => {
        set((state) => {
          const currentFollowers = state.followers[hostId] || [];
          if (!currentFollowers.includes(followerId)) {
            return {
              followers: {
                ...state.followers,
                [hostId]: [...currentFollowers, followerId],
              },
            };
          }
          return state;
        });
      },

      unfollowHost: (followerId: string, hostId: string) => {
        set((state) => {
          const currentFollowers = state.followers[hostId] || [];
          return {
            followers: {
              ...state.followers,
              [hostId]: currentFollowers.filter(id => id !== followerId),
            },
          };
        });
      },

      isFollowing: (followerId: string, hostId: string) => {
        const followers = get().followers[hostId] || [];
        return followers.includes(followerId);
      },

      getFollowersCount: (hostId: string) => {
        const followers = get().followers[hostId] || [];
        return followers.length;
      },

      addReview: (review: Omit<Review, 'id' | 'createdAt'>) => {
        const newReview: Review = {
          ...review,
          id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const currentReviews = state.reviews[review.hostId] || [];
          return {
            reviews: {
              ...state.reviews,
              [review.hostId]: [...currentReviews, newReview],
            },
          };
        });
      },

      getReviews: (hostId: string) => {
        return get().reviews[hostId] || [];
      },

      getAverageRating: (hostId: string) => {
        const reviews = get().reviews[hostId] || [];
        if (reviews.length === 0) return 0;
        const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
        return Math.round((sum / reviews.length) * 10) / 10; // Round to 1 decimal
      },

      getReviewCount: (hostId: string) => {
        const reviews = get().reviews[hostId] || [];
        return reviews.length;
      },
    }),
    {
      name: 'popera-profile-storage',
    }
  )
);

