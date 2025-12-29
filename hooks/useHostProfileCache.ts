/**
 * Host Profile Cache Hook
 * 
 * Performance optimization: Shares a single Firestore subscription across
 * multiple EventCards that display the same host. This prevents N subscriptions
 * for N cards with the same host.
 * 
 * Features:
 * - Global cache for instant data on subsequent renders
 * - Reference counting to cleanup unused subscriptions
 * - Real-time updates still work for all subscribers
 * - localStorage persistence for instant loading on page refresh
 * - Includes followers count from the same subscription
 */

import { useState, useEffect, useCallback } from 'react';
import { subscribeToUserProfile, type UserProfileData } from '../firebase/userSubscriptions';

interface CachedHostData {
  displayName: string;
  photoURL: string | null;
  coverPhotoURL?: string | null;
  createdAt?: number | null;
  followersCount: number;
  isLoading: boolean;
}

// Global cache for host profiles - persists across component mounts
const hostProfileCache = new Map<string, CachedHostData>();

// Track subscribers per hostId for reference counting
const hostSubscribers = new Map<string, Set<(data: CachedHostData | null) => void>>();

// Track active subscriptions to avoid duplicates
const activeSubscriptions = new Map<string, () => void>();

// localStorage persistence
const CACHE_KEY = 'popera_host_data_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Persist cache to localStorage (safe error handling for private browsing)
 */
function persistCache(): void {
  try {
    const data = Object.fromEntries(hostProfileCache);
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
      hostProfileCache.set(k, v as CachedHostData);
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
 * Hook to get a host's profile with shared subscription
 * Multiple components using the same hostId share ONE Firestore subscription
 * 
 * @returns null while loading (show skeleton), or CachedHostData when loaded
 */
export function useHostData(hostId: string | undefined): CachedHostData | null {
  // Initialize with cached data if available
  const [profile, setProfile] = useState<CachedHostData | null>(() => 
    hostId ? hostProfileCache.get(hostId) || null : null
  );

  useEffect(() => {
    if (!hostId) {
      setProfile(null);
      return;
    }

    // Return cached data immediately if available
    const cached = hostProfileCache.get(hostId);
    if (cached) {
      setProfile(cached);
    } else {
      // Show loading state if no cache
      setProfile({ displayName: '', photoURL: null, followersCount: 0, isLoading: true });
    }

    // Create subscriber set if doesn't exist
    if (!hostSubscribers.has(hostId)) {
      hostSubscribers.set(hostId, new Set());
    }
    
    // Callback that updates this component's state
    const updateCallback = (data: CachedHostData | null) => {
      setProfile(data);
    };
    
    // Add this component as a subscriber
    hostSubscribers.get(hostId)!.add(updateCallback);

    // Create subscription if this is the first subscriber for this hostId
    if (!activeSubscriptions.has(hostId)) {
      const unsubscribe = subscribeToUserProfile(hostId, (userData: UserProfileData | null) => {
        if (userData) {
          const profileData: CachedHostData = {
            displayName: userData.displayName || 'Unknown Host',
            photoURL: userData.photoURL || null,
            coverPhotoURL: userData.coverPhotoURL || null,
            createdAt: userData.createdAt || null,
            followersCount: userData.followers?.length || 0,
            isLoading: false,
          };
          // Update global cache
          hostProfileCache.set(hostId, profileData);
          // Persist to localStorage
          persistCache();
          // Notify all subscribers
          hostSubscribers.get(hostId)?.forEach(cb => cb(profileData));
        } else {
          hostProfileCache.delete(hostId);
          persistCache();
          hostSubscribers.get(hostId)?.forEach(cb => cb(null));
        }
      });
      activeSubscriptions.set(hostId, unsubscribe);
    }

    // Cleanup on unmount
    return () => {
      // Remove this component from subscribers
      hostSubscribers.get(hostId)?.delete(updateCallback);
      
      // If no more subscribers, cleanup the subscription
      if (hostSubscribers.get(hostId)?.size === 0) {
        const unsubscribe = activeSubscriptions.get(hostId);
        if (unsubscribe) {
          unsubscribe();
          activeSubscriptions.delete(hostId);
        }
        hostSubscribers.delete(hostId);
        // Keep cache for quick re-render, will be refreshed on next subscription
      }
    };
  }, [hostId]);

  return profile;
}

/**
 * @deprecated Use useHostData instead. Kept for backward compatibility.
 */
export function useHostProfile(hostId: string | undefined): { displayName: string; photoURL: string | null } | null {
  const data = useHostData(hostId);
  if (!data) return null;
  return { displayName: data.displayName, photoURL: data.photoURL };
}

/**
 * Prefetch host profiles for a list of events
 * Useful for preloading before rendering EventCards
 */
export function prefetchHostProfiles(hostIds: string[]): void {
  const uniqueHostIds = [...new Set(hostIds.filter(Boolean))];
  
  uniqueHostIds.forEach(hostId => {
    // Skip if already cached or subscribed
    if (hostProfileCache.has(hostId) || activeSubscriptions.has(hostId)) {
      return;
    }
    
    // Create temporary subscription just to populate cache
    if (!hostSubscribers.has(hostId)) {
      hostSubscribers.set(hostId, new Set());
    }
    
    const unsubscribe = subscribeToUserProfile(hostId, (userData: UserProfileData | null) => {
      if (userData) {
        const profileData: CachedHostData = {
          displayName: userData.displayName || 'Unknown Host',
          photoURL: userData.photoURL || null,
          coverPhotoURL: userData.coverPhotoURL || null,
          createdAt: userData.createdAt || null,
          followersCount: userData.followers?.length || 0,
          isLoading: false,
        };
        hostProfileCache.set(hostId, profileData);
        persistCache();
      }
      // Auto-cleanup after first data
      setTimeout(() => {
        if (hostSubscribers.get(hostId)?.size === 0) {
          unsubscribe();
          activeSubscriptions.delete(hostId);
        }
      }, 5000);
    });
    activeSubscriptions.set(hostId, unsubscribe);
  });
}

/**
 * Clear the cache (useful for logout)
 */
export function clearHostProfileCache(): void {
  // Unsubscribe from all active subscriptions
  activeSubscriptions.forEach((unsubscribe) => unsubscribe());
  activeSubscriptions.clear();
  hostSubscribers.clear();
  hostProfileCache.clear();
  
  // Clear localStorage
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore errors
  }
}

