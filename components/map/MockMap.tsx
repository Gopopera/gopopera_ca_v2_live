import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

// Map Component - Branded static map with custom styling
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
  
  // Google Maps links for "Get Directions" button
  const googleMapsUrl = hasCoordinates 
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : fullAddress 
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
    : null;

  // PRIORITY 1: Use Static Maps API with custom styling (requires API key)
  // This gives us full control: hide POIs, custom colors, orange marker
  if (hasCoordinates && apiKey && !imageError) {
    // Custom map styles - clean branded look, hide all POIs
    const mapStyles = [
      // Hide ALL POIs (businesses, landmarks, etc.)
      'feature:poi|visibility:off',
      'feature:poi.business|visibility:off',
      'feature:poi.attraction|visibility:off',
      'feature:poi.government|visibility:off',
      'feature:poi.medical|visibility:off',
      'feature:poi.park|element:labels|visibility:off',
      'feature:poi.place_of_worship|visibility:off',
      'feature:poi.school|visibility:off',
      'feature:poi.sports_complex|visibility:off',
      // Hide transit
      'feature:transit|visibility:off',
      // Base colors - light grey/white
      'feature:all|element:geometry|color:0xf0f3f4',
      'feature:all|element:labels.text.fill|color:0x6b7280',
      'feature:all|element:labels.text.stroke|color:0xffffff',
      // Water - brand teal tint
      'feature:water|element:geometry|color:0xc9d6d9',
      'feature:water|element:labels|visibility:off',
      // Roads - white with subtle grey
      'feature:road|element:geometry.fill|color:0xffffff',
      'feature:road|element:geometry.stroke|color:0xe5e7eb',
      'feature:road.highway|element:geometry.fill|color:0xf9fafb',
      'feature:road.highway|element:geometry.stroke|color:0xd1d5db',
      'feature:road|element:labels.text.fill|color:0x6b7280',
      // Landscape - subtle
      'feature:landscape.man_made|element:geometry|color:0xe8ecee',
      'feature:landscape.natural|element:geometry|color:0xe5eaec',
      // Administrative labels - subtle
      'feature:administrative|element:labels.text.fill|color:0x9ca3af',
      'feature:administrative|element:geometry|visibility:off',
    ].map(s => `style=${encodeURIComponent(s)}`).join('&');
    
    // Build Static Maps URL with orange marker
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=800x400&scale=2&maptype=roadmap&markers=color:0xe35e25%7Csize:mid%7C${lat},${lng}&${mapStyles}&key=${apiKey}`;
    
    return (
      <div className={`relative overflow-hidden rounded-xl ${className}`}>
        <img 
          src={staticMapUrl}
          alt={`Map showing ${fullAddress || 'event location'}`}
          className="w-full h-full object-cover"
          style={{ minHeight: '250px' }}
          onError={() => setImageError(true)}
        />
        
        {/* Address pill - top left */}
        {fullAddress && (
          <div className="absolute top-3 left-3 z-10 max-w-[calc(100%-120px)]">
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

  // FALLBACK: Branded placeholder with directions link
  // Used when no API key or coordinates not available
  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {/* Branded map-like background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#e8ecee] via-[#dfe5e7] to-[#d5dcdf]" />
      
      {/* Subtle grid pattern resembling streets */}
      <div 
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.8) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.8) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Water-like decorative element */}
      <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-[#c9d6d9]/50" />
      
      {/* Orange location marker - centered */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ minHeight: '250px' }}>
        <div className="relative flex flex-col items-center">
          {/* Marker glow */}
          <div className="absolute w-16 h-16 bg-[#e35e25]/20 rounded-full blur-xl" />
          {/* Marker */}
          <div className="relative w-12 h-12 bg-[#e35e25] rounded-full flex items-center justify-center shadow-lg border-4 border-white">
            <MapPin size={22} className="text-white" />
          </div>
          {/* Pin point */}
          <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-white -mt-1 relative z-10" />
          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-[#e35e25] -mt-[14px]" />
        </div>
      </div>
      
      {/* Address pill - top left */}
      {fullAddress && (
        <div className="absolute top-3 left-3 z-10 max-w-[calc(100%-120px)]">
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
};
