import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

// Map Component - Interactive Google Maps with brand styling
interface MockMapProps {
  lat?: number;
  lng?: number;
  address?: string;
  city?: string;
  className?: string;
}

export const MockMap: React.FC<MockMapProps> = ({ 
  lat, 
  lng, 
  address, 
  city,
  className = '' 
}) => {
  const [iframeError, setIframeError] = useState(false);
  const hasCoordinates = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);
  
  // Build the address string for Google Maps links
  const fullAddress = address && city ? `${address}, ${city}` : address || city || '';
  const encodedAddress = encodeURIComponent(fullAddress);
  
  // Determine what to use as the query
  const hasValidQuery = hasCoordinates || fullAddress.trim().length > 0;
  const embedQuery = hasCoordinates ? `${lat},${lng}` : encodedAddress;
  
  // Google Maps links for "Get Directions" button
  const googleMapsUrl = hasCoordinates 
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : fullAddress 
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
    : null;

  // Interactive Google Maps iframe with cool color filter
  if (hasValidQuery && !iframeError) {
    const simpleEmbedUrl = `https://maps.google.com/maps?q=${embedQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    
    return (
      <div className={`relative overflow-hidden rounded-xl ${className}`}>
        {/* Color overlay for cooler/branded look */}
        <div 
          className="absolute inset-0 pointer-events-none z-[2]" 
          style={{ 
            background: 'linear-gradient(135deg, rgba(21,56,60,0.05) 0%, rgba(21,56,60,0.1) 100%)',
            mixBlendMode: 'multiply'
          }} 
        />
        
        {/* Interactive Google Maps iframe */}
        <iframe
          src={simpleEmbedUrl}
          className="w-full h-full border-0"
          style={{ 
            minHeight: '250px',
            filter: 'saturate(0.85) brightness(1.02) hue-rotate(-5deg)'
          }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map showing ${fullAddress || 'event location'}`}
          onError={() => setIframeError(true)}
        />
        
        {/* Address pill - top left */}
        {fullAddress && (
          <div className="absolute top-3 left-3 z-10 max-w-[calc(100%-100px)]">
            <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-xl text-xs font-medium text-[#15383c] shadow-lg border border-gray-100">
              <MapPin size={14} className="text-[#e35e25] shrink-0" />
              <span className="truncate">{fullAddress}</span>
            </div>
          </div>
        )}
        
        {/* Get Directions button - bottom right */}
        {googleMapsUrl && (
          <a 
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2.5 bg-[#e35e25] rounded-xl text-sm font-semibold text-white hover:bg-[#cf4d1d] transition-all shadow-lg z-10"
          >
            <Navigation size={16} />
            Directions
          </a>
        )}
      </div>
    );
  }

  // Fallback: Simple branded placeholder
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-[#f0f4f5] to-[#e5ebec] ${className}`}>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 bg-[#e35e25] rounded-full flex items-center justify-center shadow-lg shadow-[#e35e25]/20 mb-4">
          <MapPin size={24} className="text-white" />
        </div>
        <p className="font-medium text-sm text-[#15383c] text-center mb-4 max-w-xs">
          {fullAddress || 'Location will be shared after booking'}
        </p>
        {googleMapsUrl && (
          <a 
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#15383c] rounded-full text-sm font-semibold text-white hover:bg-[#1f4d52] transition-all shadow-md"
          >
            <Navigation size={16} />
            Get Directions
          </a>
        )}
      </div>
    </div>
  );
};
