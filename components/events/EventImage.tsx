import React from 'react';

/**
 * EventImage - Smart image component for event display
 * 
 * Two variants:
 * - "card": For feed/grid cards - object-cover with slight upward bias to protect faces
 * - "hero": For event detail page - two-layer technique (blurred bg + contained fg) to prevent cropping
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

  // Hero variant: Two-layer technique - blurred background + contained foreground
  // This prevents top cropping while maintaining a premium look
  // No grey bars - blurred image fills any empty space seamlessly
  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Background layer: blurred, scaled up, fully covers container (no grey visible) */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125"
        style={{ objectPosition: 'center' }}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={handleError}
      />
      
      {/* Foreground layer: full image visible, no cropping */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-contain z-[1]"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'low'}
        onError={handleError}
      />
    </div>
  );
};

export default EventImage;

