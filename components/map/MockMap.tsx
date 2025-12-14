import React, { useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

// Map Component - Uses Google Maps Static API when available, falls back to embed or mock
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
  const hasCoordinates = lat !== undefined && lng !== undefined;
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // Build the address string for Google Maps links
  const fullAddress = address && city ? `${address}, ${city}` : address || city || '';
  const encodedAddress = encodeURIComponent(fullAddress);
  
  // Google Maps links
  const googleMapsUrl = hasCoordinates 
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : fullAddress 
    ? `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
    : null;

  // If we have coordinates and API key, use Google Static Maps
  if (hasCoordinates && apiKey && !imageError) {
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&scale=2&maptype=roadmap&markers=color:0xe35e25%7C${lat},${lng}&key=${apiKey}&style=feature:all%7Celement:labels.text.fill%7Ccolor:0x15383c`;
    
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img 
          src={staticMapUrl}
          alt={`Map showing ${fullAddress || 'event location'}`}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
        {/* Click to open in Google Maps */}
        {googleMapsUrl && (
          <a 
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-[#15383c] hover:bg-white transition-all shadow-md border border-white/60"
          >
            <ExternalLink size={12} />
            Open in Maps
          </a>
        )}
      </div>
    );
  }

  // Fallback: Use Google Maps embed iframe if we have address or coordinates
  if ((hasCoordinates || fullAddress) && !imageError) {
    const embedQuery = hasCoordinates ? `${lat},${lng}` : encodedAddress;
    const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey || 'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8'}&q=${embedQuery}&zoom=15`;
    
    // If no API key, use simple embed without key (limited but works)
    const simpleEmbedUrl = `https://maps.google.com/maps?q=${embedQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <iframe
          src={apiKey ? embedUrl : simpleEmbedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map showing ${fullAddress || 'event location'}`}
        />
        {/* Click to open in Google Maps */}
        {googleMapsUrl && (
          <a 
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-[#15383c] hover:bg-white transition-all shadow-md border border-white/60"
          >
            <ExternalLink size={12} />
            Open in Maps
          </a>
        )}
      </div>
    );
  }

  // Final fallback: Mock map placeholder
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}>
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-200/50">
        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center shadow-xl mb-2 sm:mb-3">
          <MapPin 
            size={20} 
            className="sm:w-6 sm:h-6 text-[#e35e25]" 
            fill="currentColor" 
            stroke="currentColor" 
          />
        </div>
        <p className="font-medium text-xs sm:text-sm text-gray-500 px-4 text-center">
          {fullAddress || 'Location coming soon'}
        </p>
        {googleMapsUrl && (
          <a 
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-medium text-[#e35e25] hover:bg-gray-50 transition-all shadow-sm"
          >
            <ExternalLink size={12} />
            View on Google Maps
          </a>
        )}
      </div>
    </div>
  );
};
