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
 */

import { useState, useEffect, useCallback } from 'react';
import { subscribeToUserProfile, type UserProfileData } from '../firebase/userSubscriptions';

interface CachedHostProfile {
  displayName: string;
  photoURL: string | null;
}

// Global cache for host profiles - persists across component mounts
const hostProfileCache = new Map<string, CachedHostProfile>();

// Track subscribers per hostId for reference counting
const hostSubscribers = new Map<string, Set<(data: CachedHostProfile | null) => void>>();

// Track active subscriptions to avoid duplicates
const activeSubscriptions = new Map<string, () => void>();

/**
 * Hook to get a host's profile with shared subscription
 * Multiple components using the same hostId share ONE Firestore subscription
 */
export function useHostProfile(hostId: string | undefined): CachedHostProfile | null {
  // Initialize with cached data if available
  const [profile, setProfile] = useState<CachedHostProfile | null>(() => 
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
    }

    // Create subscriber set if doesn't exist
    if (!hostSubscribers.has(hostId)) {
      hostSubscribers.set(hostId, new Set());
    }
    
    // Callback that updates this component's state
    const updateCallback = (data: CachedHostProfile | null) => {
      setProfile(data);
    };
    
    // Add this component as a subscriber
    hostSubscribers.get(hostId)!.add(updateCallback);

    // Create subscription if this is the first subscriber for this hostId
    if (!activeSubscriptions.has(hostId)) {
      const unsubscribe = subscribeToUserProfile(hostId, (userData: UserProfileData | null) => {
        if (userData) {
          const profileData: CachedHostProfile = {
            displayName: userData.displayName || 'Unknown Host',
            photoURL: userData.photoURL || null,
          };
          // Update global cache
          hostProfileCache.set(hostId, profileData);
          // Notify all subscribers
          hostSubscribers.get(hostId)?.forEach(cb => cb(profileData));
        } else {
          hostProfileCache.delete(hostId);
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
        hostProfileCache.set(hostId, {
          displayName: userData.displayName || 'Unknown Host',
          photoURL: userData.photoURL || null,
        });
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
}

