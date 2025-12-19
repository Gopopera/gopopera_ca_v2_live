import React from 'react';

/**
 * EventImage - Smart image component for event display
 * 
 * Two variants:
 * - "card": For feed/grid cards - object-cover with slight upward bias to protect faces
 * - "hero": For event detail page - fixed frame with full image visible (blurred background fills gaps)
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
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    const placeholder = fallbackSrc || `https://picsum.photos/seed/${eventId || 'event'}/800/600`;
    
    // Prevent infinite loop - only replace if not already a placeholder
    if (!target.src.includes('picsum.photos')) {
      target.src = placeholder;
    }
    
    onError?.(e);
  };

  if (variant === 'card') {
    // Card variant: object-cover with slight upward bias to protect faces/headroom
    return (
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-transform duration-700 ${
          hoverScale ? 'group-hover:scale-105' : ''
        } ${className}`}
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
        onError={handleError}
      />
    );
  }

  // Hero variant: Fixed frame with full image visible
  // Two-layer technique: blurred background fills gaps + contained foreground shows full image
  // No dead space (blur fills edges), no cropping (object-contain)
  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Background layer: blurred version fills any empty space */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-80"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={handleError}
      />
      
      {/* Foreground layer: full image visible, centered, no cropping */}
      <img
        src={src}
        alt={alt}
        className="relative z-[1] w-full h-full object-contain"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'low'}
        onError={handleError}
      />
    </div>
  );
};

export default EventImage;

