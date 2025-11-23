/**
 * useDebouncedFavorite - Debounced favorite toggle with optimistic UI
 * Updates UI immediately, writes to Firestore after delay
 */

import { useCallback, useRef } from 'react';
import { useUserStore } from '../stores/userStore';

const DEBOUNCE_MS = 500;

export function useDebouncedFavorite() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingWrites = useRef<Set<string>>(new Set());
  const addFavorite = useUserStore((state) => state.addFavorite);
  const removeFavorite = useUserStore((state) => state.removeFavorite);
  const user = useUserStore((state) => state.user);

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
        const eventIdsToWrite = Array.from(pendingWrites.current);
        pendingWrites.current.clear();

        // Batch write all pending changes
        await Promise.all(
          eventIdsToWrite.map(async (id) => {
            const currentFavorites = useUserStore.getState().user?.favorites || [];
            const shouldBeFavorite = currentFavorites.includes(id);
            
            try {
              if (shouldBeFavorite) {
                await addFavorite(user.uid, id);
              } else {
                await removeFavorite(user.uid, id);
              }
            } catch (error) {
              console.error(`Error updating favorite for event ${id}:`, error);
              // Revert optimistic update on error
              const currentUser = useUserStore.getState().user;
              if (currentUser) {
                const revertedFavorites = shouldBeFavorite
                  ? currentFavorites.filter(favId => favId !== id)
                  : [...currentFavorites, id];
                useUserStore.setState({
                  user: { ...currentUser, favorites: revertedFavorites },
                  currentUser: { ...currentUser, favorites: revertedFavorites },
                });
              }
            }
          })
        );
      }, DEBOUNCE_MS);
    },
    [user, addFavorite, removeFavorite]
  );

  return { toggleFavorite };
}

