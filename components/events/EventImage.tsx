import React, { useState } from 'react';

/**
 * EventImage - Smart image component for event display
 * 
 * Two variants:
 * - "card": For feed/grid cards - object-cover with slight upward bias to protect faces
 * - "hero": For event detail page - full width, natural height (no dead space)
 * 
 * Features:
 * - Skeleton placeholder while loading
 * - Smooth fade-in transition when loaded
 * - Native image decode for jank-free rendering
 */

interface EventImageProps {
  src: string;
  alt: string;
  variant: 'card' | 'hero';
  priority?: boolean;
  className?: string;
  /** Fallback image URL if the main image fails to load */
  fallbackSrc?: string;
  /** Event ID for generating fallback placeholder */
  eventId?: string;
  /** Whether to show hover scale effect (card variant only) */
  hoverScale?: boolean;
  /** Callback when image fails to load */
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export const EventImage: React.FC<EventImageProps> = ({
  src,
  alt,
  variant,
  priority = false,
  className = '',
  fallbackSrc,
  eventId,
  hoverScale = true,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = async (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    // Wait for browser to decode before showing (prevents visual jank)
    if (img.decode) {
      try {
        await img.decode();
      } catch {
        // Decode failed, show image anyway
      }
    }
    setIsLoaded(true);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    const placeholder = fallbackSrc || `https://picsum.photos/seed/${eventId || 'event'}/800/600`;
    
    // Prevent infinite loop - only replace if not already a placeholder
    if (!target.src.includes('picsum.photos')) {
      target.src = placeholder;
    }
    
    // Still mark as loaded to hide skeleton
    setIsLoaded(true);
    onError?.(e);
  };

  if (variant === 'card') {
    // Card variant: object-cover with slight upward bias to protect faces/headroom
    return (
      <>
        {/* Skeleton placeholder - shown while image loads */}
        {!isLoaded && (
          <div className="absolute inset-0 skeleton-shimmer" />
        )}
        <img
          src={src}
          alt={alt}
          width={800}
          height={600}
          className={`w-full h-full object-cover transition-all duration-500 ${
            hoverScale ? 'group-hover:scale-105' : ''
          } ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          style={{ 
            objectPosition: '50% 25%', // Slight upward bias to protect faces
            userSelect: 'none', 
            WebkitUserSelect: 'none', 
            pointerEvents: 'auto' 
          }}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'low'}
          draggable={false}
          onLoad={handleLoad}
          onError={handleError}
        />
      </>
    );
  }

  // Hero variant: full width, natural height - no dead space
  // Image displays at its natural aspect ratio, container adapts to fit
  return (
    <>
      {/* Skeleton placeholder for hero variant */}
      {!isLoaded && (
        <div className="w-full aspect-[3/2] skeleton-shimmer" />
      )}
      <img
        src={src}
        alt={alt}
        width={1200}
        height={800}
        className={`block w-full h-auto transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'low'}
        onLoad={handleLoad}
        onError={handleError}
      />
    </>
  );
};

export default EventImage;

