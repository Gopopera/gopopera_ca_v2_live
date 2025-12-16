import React, { useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

// Map Component - Uses Google Maps embed (no API key required) with optional Static API upgrade
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
  const [imageError, setImageError] = useState(false);
  const hasCoordinates = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // Build the address string for Google Maps links
  const fullAddress = address && city ? `${address}, ${city}` : address || city || '';
  const encodedAddress = encodeURIComponent(fullAddress);
  
  // Determine what to use as the query - prefer coordinates, fallback to address
  const hasValidQuery = hasCoordinates || fullAddress.trim().length > 0;
  const embedQuery = hasCoordinates ? `${lat},${lng}` : encodedAddress;
  
  // Google Maps links for "Open in Maps" button
  const googleMapsUrl = hasCoordinates 
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : fullAddress 
    ? `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
    : null;

  // OpenStreetMap button component - reused across views
  const OpenInMapsButton = () => googleMapsUrl ? (
    <a 
      href={googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-[#15383c] hover:bg-white transition-all shadow-md border border-white/60 z-10"
    >
      <ExternalLink size={12} />
      Open in Maps
    </a>
  ) : null;

  // PRIORITY 1: If we have API key and coordinates, use Static Maps (best quality)
  // Custom styling: cool blue/grey/white theme, hide POIs, only show our orange marker
  if (hasCoordinates && apiKey && !imageError) {
    // Custom map styles for a clean, minimal look
    const mapStyles = [
      // Base map - light grey/white
      'feature:all|element:geometry|color:0xf5f5f5',
      'feature:all|element:labels.icon|visibility:off',
      'feature:all|element:labels.text.fill|color:0x616161',
      'feature:all|element:labels.text.stroke|color:0xf5f5f5',
      // Water - cool blue (our brand blue tint)
      'feature:water|element:geometry|color:0xc9d6da',
      'feature:water|element:labels.text.fill|color:0x9e9e9e',
      // Roads - subtle grey
      'feature:road|element:geometry|color:0xffffff',
      'feature:road.highway|element:geometry|color:0xdadada',
      'feature:road.arterial|element:labels.text.fill|color:0x757575',
      // Parks/nature - very subtle green-grey
      'feature:poi.park|element:geometry|color:0xe5e5e5',
      // Hide all POI icons and labels
      'feature:poi|visibility:off',
      'feature:poi.business|visibility:off',
      'feature:transit|visibility:off',
      // Buildings - light
      'feature:landscape.man_made|element:geometry|color:0xeeeeee',
    ].map(s => `style=${encodeURIComponent(s)}`).join('&');
    
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x400&scale=2&maptype=roadmap&markers=color:0xe35e25%7C${lat},${lng}&${mapStyles}&key=${apiKey}`;
    
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img 
          src={staticMapUrl}
          alt={`Map showing ${fullAddress || 'event location'}`}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
        <OpenInMapsButton />
      </div>
    );
  }

  // PRIORITY 2: Use Google Maps iframe embed (works without API key)
  // Apply a subtle desaturation filter for a cooler look
  if (hasValidQuery && !iframeError) {
    // Simple embed URL - works without any API key
    const simpleEmbedUrl = `https://maps.google.com/maps?q=${embedQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {/* Desaturation overlay for cooler color scheme */}
        <div className="absolute inset-0 pointer-events-none z-[1] mix-blend-color" style={{ backgroundColor: 'rgba(21, 56, 60, 0.08)' }} />
        <iframe
          src={simpleEmbedUrl}
          className="w-full h-full border-0"
          style={{ minHeight: '200px', filter: 'saturate(0.7) contrast(1.05)' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map showing ${fullAddress || 'event location'}`}
          onError={() => setIframeError(true)}
        />
        {/* Custom marker overlay */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[2] pointer-events-none">
          <div className="flex flex-col items-center">
            <MapPin size={32} className="text-[#e35e25] drop-shadow-lg" fill="#e35e25" />
          </div>
        </div>
        <OpenInMapsButton />
      </div>
    );
  }

  // PRIORITY 3: Use OpenStreetMap as alternative (always works)
  if (hasCoordinates && !iframeError) {
    const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
    
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <iframe
          src={osmEmbedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          loading="lazy"
          title={`Map showing ${fullAddress || 'event location'}`}
          style={{ minHeight: '200px' }}
        />
        <OpenInMapsButton />
      </div>
    );
  }

  // FINAL FALLBACK: Mock map placeholder with link to Google Maps
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#eef4f5] to-[#e0eaec] ${className}`}>
      {/* Subtle map-like pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(21,56,60,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(21,56,60,0.15) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px'
        }}
      />
      
      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-lg mb-3">
          <MapPin 
            size={24} 
            className="text-[#e35e25]" 
            fill="currentColor" 
          />
        </div>
        <p className="font-medium text-sm text-[#15383c] px-4 text-center mb-3">
          {fullAddress || 'Location details'}
        </p>
        {googleMapsUrl && (
          <a 
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#15383c] rounded-full text-sm font-medium text-white hover:bg-[#1f4d52] transition-all shadow-md"
          >
            <ExternalLink size={14} />
            View on Google Maps
          </a>
        )}
      </div>
    </div>
  );
};
