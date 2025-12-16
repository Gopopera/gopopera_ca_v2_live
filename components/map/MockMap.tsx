import React, { useState } from 'react';
import { MapPin, ExternalLink, Navigation } from 'lucide-react';

// Map Component - Clean branded static map with link to Google Maps
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
  const [imageError, setImageError] = useState(false);
  const hasCoordinates = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // Build the address string for Google Maps links
  const fullAddress = address && city ? `${address}, ${city}` : address || city || '';
  const encodedAddress = encodeURIComponent(fullAddress);
  
  // Google Maps links for "Open in Maps" button
  const googleMapsUrl = hasCoordinates 
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : fullAddress 
    ? `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
    : null;

  // PRIORITY 1: If we have API key and coordinates, use Static Maps (best quality)
  // Custom styling: clean minimal look with our brand colors
  if (hasCoordinates && apiKey && !imageError) {
    // Custom map styles for a clean, branded look - hide everything except roads and water
    const mapStyles = [
      // Hide all labels and icons
      'feature:all|element:labels|visibility:off',
      // Base geometry - light cool grey
      'feature:all|element:geometry|color:0xeaeff1',
      // Water - brand teal tint
      'feature:water|element:geometry|color:0xc5d5d8',
      // Roads - white
      'feature:road|element:geometry|color:0xffffff',
      'feature:road.highway|element:geometry|color:0xf0f0f0',
      // Hide all POIs
      'feature:poi|visibility:off',
      'feature:transit|visibility:off',
      'feature:administrative|element:geometry|visibility:off',
      // Landscape - subtle
      'feature:landscape|element:geometry|color:0xe8edef',
    ].map(s => `style=${encodeURIComponent(s)}`).join('&');
    
    // Use custom icon URL or default orange marker
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x400&scale=2&maptype=roadmap&markers=color:0xe35e25%7Csize:mid%7C${lat},${lng}&${mapStyles}&key=${apiKey}`;
    
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img 
          src={staticMapUrl}
          alt={`Map showing ${fullAddress || 'event location'}`}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
        {/* Open in Maps button */}
        {googleMapsUrl && (
          <a 
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full text-xs font-medium text-[#15383c] hover:bg-white transition-all shadow-md border border-gray-200/60 z-10"
          >
            <Navigation size={12} />
            Get Directions
          </a>
        )}
      </div>
    );
  }

  // FALLBACK: Beautiful branded static map placeholder
  // No Google iframe - fully controlled branding with our orange marker only
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Branded map background - cool grey/teal gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#e8edef] via-[#dfe7ea] to-[#d5dfe2]" />
      
      {/* Subtle road-like grid pattern */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.7) 2px, transparent 2px),
            linear-gradient(to bottom, rgba(255,255,255,0.7) 2px, transparent 2px),
            linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px, 120px 120px, 40px 40px, 40px 40px',
          backgroundPosition: '0 0, 0 0, 20px 20px, 20px 20px'
        }}
      />
      
      {/* Decorative curved "water" element */}
      <div 
        className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full"
        style={{ backgroundColor: 'rgba(197, 213, 216, 0.6)' }}
      />
      
      {/* Orange location marker - centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Marker shadow/glow */}
          <div className="absolute inset-0 bg-[#e35e25]/20 rounded-full blur-xl scale-150" />
          {/* Marker pin */}
          <div className="relative flex flex-col items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#e35e25] rounded-full flex items-center justify-center shadow-lg shadow-[#e35e25]/30 border-4 border-white">
              <MapPin size={20} className="text-white sm:w-6 sm:h-6" />
            </div>
            {/* Pin tail */}
            <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-white -mt-1" />
          </div>
        </div>
      </div>
      
      {/* Address label */}
      {fullAddress && (
        <div className="absolute top-3 left-3 right-16 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-medium text-[#15383c] shadow-sm border border-gray-200/60 max-w-full">
            <MapPin size={12} className="text-[#e35e25] shrink-0" />
            <span className="truncate">{fullAddress}</span>
          </div>
        </div>
      )}
      
      {/* Get Directions button */}
      {googleMapsUrl && (
        <a 
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-4 py-2 bg-[#15383c] rounded-full text-sm font-semibold text-white hover:bg-[#1f4d52] transition-all shadow-lg z-10"
        >
          <Navigation size={14} />
          Get Directions
        </a>
      )}
    </div>
  );
};
