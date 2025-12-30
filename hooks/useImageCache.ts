/**
 * Global Image Cache Hook
 * 
 * Tracks which images have been loaded globally (not per-component).
 * This prevents the "white flash" when scrolling back to sections because:
 * 1. The hook knows the image URL is already in browser cache
 * 2. It skips showing the skeleton placeholder
 * 3. The browser serves the cached image instantly
 * 
 * Apple-like experience: Images appear instantly when scrolling back.
 */

import { useState, useEffect, useCallback } from 'react';

// Global set of loaded image URLs - persists across component mounts/unmounts
const loadedImageUrls = new Set<string>();

// Preload queue for images that should be loaded soon
const preloadQueue = new Set<string>();

/**
 * Hook to track if an image has been loaded globally
 * @param src - The image source URL
 * @returns Object with isLoaded state and markLoaded callback
 */
export function useImageCache(src: string) {
  // Check if already loaded on initial render (no flash if cached)
  const [isLoaded, setIsLoaded] = useState(() => {
    if (!src) return false;
    return loadedImageUrls.has(src);
  });

  // Update state if src changes and is already cached
  useEffect(() => {
    if (src && loadedImageUrls.has(src) && !isLoaded) {
      setIsLoaded(true);
    }
  }, [src, isLoaded]);

  // Mark image as loaded globally
  const markLoaded = useCallback(() => {
    if (src) {
      loadedImageUrls.add(src);
      preloadQueue.delete(src);
    }
    setIsLoaded(true);
  }, [src]);

  return { isLoaded, markLoaded };
}

/**
 * Preload an image so it's ready when scrolled into view
 * Uses the browser's native preload mechanism
 * @param src - The image source URL to preload
 */
export function preloadImage(src: string): void {
  if (!src || loadedImageUrls.has(src) || preloadQueue.has(src)) return;
  
  preloadQueue.add(src);
  
  // Use Image constructor for preloading (triggers browser cache)
  const img = new Image();
  img.onload = () => {
    loadedImageUrls.add(src);
    preloadQueue.delete(src);
  };
  img.onerror = () => {
    preloadQueue.delete(src);
  };
  img.src = src;
}

/**
 * Preload multiple images at once
 * @param srcs - Array of image source URLs to preload
 */
export function preloadImages(srcs: string[]): void {
  srcs.forEach(preloadImage);
}

/**
 * Check if an image is already in the global cache
 * Useful for conditional rendering decisions
 * @param src - The image source URL
 * @returns boolean indicating if image is cached
 */
export function isImageCached(src: string): boolean {
  return loadedImageUrls.has(src);
}

/**
 * Clear the image cache (useful for testing or memory cleanup)
 */
export function clearImageCache(): void {
  loadedImageUrls.clear();
  preloadQueue.clear();
}

export default useImageCache;

