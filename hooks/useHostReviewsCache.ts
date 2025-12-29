/**
 * Host Reviews Cache Hook
 * 
 * Caches host reviews and ratings to prevent duplicate fetches.
 * Reviews are NOT real-time (fetched once per session per host).
 * 
 * Features:
 * - In-memory cache shared across components
 * - localStorage persistence for instant loading on page refresh
 * - Calculates average rating and count from cached reviews
 */

import { useState, useEffect } from 'react';
import { listHostReviews } from '../firebase/db';
import type { FirestoreReview } from '../firebase/types';

interface CachedHostReviews {
  reviews: FirestoreReview[];
  averageRating: number;
  reviewCount: number;
  isLoading: boolean;
}

// Global cache for host reviews - persists across component mounts
const hostReviewsCache = new Map<string, CachedHostReviews>();

// Track loading state per hostId to prevent duplicate fetches
const loadingHosts = new Set<string>();

// localStorage persistence
const CACHE_KEY = 'popera_host_reviews_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Persist cache to localStorage (safe error handling for private browsing)
 */
function persistCache(): void {
  try {
    const data = Object.fromEntries(hostReviewsCache);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Ignore quota exceeded or private browsing mode errors
  }
}

/**
 * Restore cache from localStorage on module load
 */
function restoreCache(): void {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return;
    
    const { data, ts } = JSON.parse(cached);
    if (Date.now() - ts > CACHE_TTL) return;
    
    Object.entries(data).forEach(([k, v]) => {
      hostReviewsCache.set(k, v as CachedHostReviews);
    });
  } catch {
    // Ignore parse errors or missing localStorage
  }
}

// Restore cache on module load
if (typeof window !== 'undefined') {
  restoreCache();
}

/**
 * Calculate average rating and count from reviews
 */
function calculateMetrics(reviews: FirestoreReview[]): { averageRating: number; reviewCount: number } {
  if (reviews.length === 0) {
    return { averageRating: 0, reviewCount: 0 };
  }
  
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;
  
  return { averageRating, reviewCount: reviews.length };
}

/**
 * Hook to get a host's reviews with caching
 * Multiple components using the same hostId share the same cached data
 * 
 * @returns CachedHostReviews with isLoading flag
 */
export function useHostReviews(hostId: string | undefined): CachedHostReviews {
  // Initialize with cached data if available
  const [reviews, setReviews] = useState<CachedHostReviews>(() => {
    if (!hostId) {
      return { reviews: [], averageRating: 0, reviewCount: 0, isLoading: false };
    }
    
    const cached = hostReviewsCache.get(hostId);
    if (cached) {
      return cached;
    }
    
    return { reviews: [], averageRating: 0, reviewCount: 0, isLoading: true };
  });

  useEffect(() => {
    if (!hostId) {
      setReviews({ reviews: [], averageRating: 0, reviewCount: 0, isLoading: false });
      return;
    }

    // Return cached data immediately if available
    const cached = hostReviewsCache.get(hostId);
    if (cached) {
      setReviews(cached);
      return;
    }

    // Prevent duplicate fetches
    if (loadingHosts.has(hostId)) {
      return;
    }

    // Fetch reviews
    loadingHosts.add(hostId);
    setReviews({ reviews: [], averageRating: 0, reviewCount: 0, isLoading: true });

    listHostReviews(hostId, false) // Only accepted reviews for public display
      .then((fetchedReviews) => {
        const { averageRating, reviewCount } = calculateMetrics(fetchedReviews);
        
        const cachedData: CachedHostReviews = {
          reviews: fetchedReviews,
          averageRating,
          reviewCount,
          isLoading: false,
        };
        
        // Update global cache
        hostReviewsCache.set(hostId, cachedData);
        // Persist to localStorage
        persistCache();
        // Update state
        setReviews(cachedData);
      })
      .catch((error) => {
        console.error('[HOST_REVIEWS_CACHE] Error fetching reviews:', error);
        const errorData: CachedHostReviews = {
          reviews: [],
          averageRating: 0,
          reviewCount: 0,
          isLoading: false,
        };
        setReviews(errorData);
      })
      .finally(() => {
        loadingHosts.delete(hostId);
      });
  }, [hostId]);

  return reviews;
}

/**
 * Clear the reviews cache (useful for logout or refresh)
 */
export function clearHostReviewsCache(): void {
  hostReviewsCache.clear();
  loadingHosts.clear();
  
  // Clear localStorage
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore errors
  }
}

