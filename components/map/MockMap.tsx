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
  if (hasCoordinates && apiKey && !imageError) {
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x400&scale=2&maptype=roadmap&markers=color:0xe35e25%7C${lat},${lng}&key=${apiKey}`;
    
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
  if (hasValidQuery && !iframeError) {
    // Simple embed URL - works without any API key
    const simpleEmbedUrl = `https://maps.google.com/maps?q=${embedQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <iframe
          src={simpleEmbedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map showing ${fullAddress || 'event location'}`}
          onError={() => setIframeError(true)}
          style={{ minHeight: '200px' }}
        />
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
