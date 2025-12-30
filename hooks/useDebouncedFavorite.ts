/**
 * useDebouncedFavorite - Debounced favorite toggle with optimistic UI
 * Updates UI immediately, writes to Firestore after delay
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { useUserStore } from '../stores/userStore';

const DEBOUNCE_MS = 500;

export function useDebouncedFavorite() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingWrites = useRef<Set<string>>(new Set());
  const pendingWritePromises = useRef<Promise<void>[]>([]);
  const addFavorite = useUserStore((state) => state.addFavorite);
  const removeFavorite = useUserStore((state) => state.removeFavorite);
  const user = useUserStore((state) => state.user);
  
  // Flush pending writes on unmount
  useEffect(() => {
    return () => {
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Wait for any pending writes to complete
      if (pendingWritePromises.current.length > 0) {
        Promise.all(pendingWritePromises.current).catch(err => {
          console.error('[FAVORITES] Error flushing pending writes on unmount:', err);
        });
      }
    };
  }, []);

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent, eventId: string) => {
      e.stopPropagation();
      
      if (!user) {
        return;
      }

      const favorites = user.favorites || [];
      const isFavorite = favorites.includes(eventId);

      // Optimistic UI update - update store immediately
      if (isFavorite) {
        // Remove from favorites optimistically
        const updatedFavorites = favorites.filter(id => id !== eventId);
        useUserStore.setState((state) => ({
          user: state.user ? { ...state.user, favorites: updatedFavorites } : null,
          currentUser: state.currentUser ? { ...state.currentUser, favorites: updatedFavorites } : null,
        }));
      } else {
        // Add to favorites optimistically
        const updatedFavorites = [...favorites, eventId];
        useUserStore.setState((state) => ({
          user: state.user ? { ...state.user, favorites: updatedFavorites } : null,
          currentUser: state.currentUser ? { ...state.currentUser, favorites: updatedFavorites } : null,
        }));
      }

      // Track pending write
      pendingWrites.current.add(eventId);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce Firestore write
      timeoutRef.current = setTimeout(async () => {
        const eventIdsToWrite: string[] = Array.from(pendingWrites.current);
        pendingWrites.current.clear();

        // Get current state to determine what needs to be written
        const currentUser = useUserStore.getState().user;
        if (!currentUser) {
          console.warn('[FAVORITES] No user found, skipping favorite write');
          return;
        }

        const currentFavorites = currentUser.favorites || [];
        
        // Batch write all pending changes - use current store state as source of truth
        const writePromises = eventIdsToWrite.map(async (id) => {
          const shouldBeFavorite = currentFavorites.includes(id);
          
          try {
            if (shouldBeFavorite) {
              await addFavorite(currentUser.uid, id);
            } else {
              await removeFavorite(currentUser.uid, id);
            }
          } catch (error) {
            console.error(`Error updating favorite for event ${id}:`, error);
            // Revert optimistic update on error
            const updatedUser = useUserStore.getState().user;
            if (updatedUser) {
              const revertedFavorites: string[] = shouldBeFavorite
                ? currentFavorites.filter((favId: string) => favId !== id)
                : [...currentFavorites, id];
              useUserStore.setState({
                user: { ...updatedUser, favorites: revertedFavorites },
                currentUser: { ...updatedUser, favorites: revertedFavorites },
              });
            }
            throw error; // Re-throw to track in Promise.all
          }
        });
        
        // Track promises for cleanup
        pendingWritePromises.current = writePromises;
        
        try {
          await Promise.all(writePromises);
        } finally {
          // Clear after completion
          pendingWritePromises.current = [];
        }
      }, DEBOUNCE_MS);
    },
    [user, addFavorite, removeFavorite]
  );

  // Function to flush pending writes immediately (useful for logout)
  const flushPendingWrites = useCallback(async () => {
    // Clear timeout and execute immediately
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    const eventIdsToWrite: string[] = Array.from(pendingWrites.current);
    if (eventIdsToWrite.length === 0) {
      return;
    }
    
    pendingWrites.current.clear();
    
    const currentUser = useUserStore.getState().user;
    if (!currentUser) {
      return;
    }
    
    const currentFavorites = currentUser.favorites || [];
    
    // Execute all pending writes immediately
    await Promise.all(
      eventIdsToWrite.map(async (id) => {
        const shouldBeFavorite = currentFavorites.includes(id);
        try {
          if (shouldBeFavorite) {
            await addFavorite(currentUser.uid, id);
          } else {
            await removeFavorite(currentUser.uid, id);
          }
        } catch (error) {
          console.error(`Error flushing favorite for event ${id}:`, error);
        }
      })
    );
  }, [addFavorite, removeFavorite]);

  return { toggleFavorite, flushPendingWrites };
}

