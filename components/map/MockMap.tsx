import React, { useState, useCallback, useMemo } from 'react';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { MapPin, Navigation, Calendar, Users, X } from 'lucide-react';

// Event type for nearby events
interface NearbyEvent {
  id: string;
  title: string;
  lat?: number;
  lng?: number;
  date?: string;
  city?: string;
}

// Map Component - Interactive Google Maps with brand styling
interface MockMapProps {
  lat?: number;
  lng?: number;
  address?: string;
  city?: string;
  className?: string;
  // Optional: nearby events to show on map
  nearbyEvents?: NearbyEvent[];
  currentEventId?: string;
  onEventClick?: (event: NearbyEvent) => void;
}

// Branded map styles - clean, minimal, hide POIs
const mapStyles: google.maps.MapTypeStyle[] = [
  // Hide ALL POIs
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  // Hide transit
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  // Base colors - light grey/white
  { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#f0f3f4' }] },
  { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'all', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  // Water - brand teal tint
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d6d9' }] },
  { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  // Roads - white with subtle grey
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#f9fafb' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#d1d5db' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  // Landscape - subtle
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#e8ecee' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e5eaec' }] },
  // Administrative labels - subtle
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
];

// Map container style
const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '250px',
};

// Custom marker SVG paths
const CURRENT_MARKER_PATH = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z';

export const MockMap: React.FC<MockMapProps> = ({ 
  lat, 
  lng, 
  address, 
  city,
  className = '',
  nearbyEvents = [],
  currentEventId,
  onEventClick
}) => {
  const [selectedEvent, setSelectedEvent] = useState<NearbyEvent | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
  });
  
  const hasCoordinates = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);
  
  // Build the address string for Google Maps links
  const fullAddress = address && city ? `${address}, ${city}` : address || city || '';
  const encodedAddress = encodeURIComponent(fullAddress);
  
  // Google Maps links for "Get Directions" button
  const googleMapsUrl = hasCoordinates 
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : fullAddress 
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
    : null;

  // Center of the map
  const center = useMemo(() => ({
    lat: lat || 45.5017,
    lng: lng || -73.5673,
  }), [lat, lng]);

  // Filter nearby events that have coordinates and are not the current event
  const validNearbyEvents = useMemo(() => 
    nearbyEvents.filter(e => 
      e.id !== currentEventId && 
      e.lat !== undefined && 
      e.lng !== undefined && 
      !isNaN(e.lat) && 
      !isNaN(e.lng)
    ), [nearbyEvents, currentEventId]
  );

  // Map options
  const mapOptions: google.maps.MapOptions = useMemo(() => ({
    styles: mapStyles,
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    gestureHandling: 'cooperative', // Require two fingers on mobile
    clickableIcons: false, // Disable clicking on POIs
  }), []);

  // Handle marker click
  const handleMarkerClick = useCallback((event: NearbyEvent) => {
    setSelectedEvent(event);
  }, []);

  // Handle info window close
  const handleInfoWindowClose = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  // Handle navigate to event
  const handleNavigateToEvent = useCallback((event: NearbyEvent) => {
    setSelectedEvent(null);
    onEventClick?.(event);
  }, [onEventClick]);

  // Loading state
  if (!isLoaded && apiKey) {
    return (
      <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-[#e8ecee] to-[#d5dcdf] ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center" style={{ minHeight: '250px' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#e35e25] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Loading map...</span>
          </div>
        </div>
      </div>
    );
  }

  // Build static map URL for fallback (uses coordinates or address)
  const staticMapUrl = useMemo(() => {
    if (!apiKey) return null;
    
    // Custom map styling for static maps (simplified version of our branded style)
    const staticStyle = [
      'feature:poi|visibility:off',
      'feature:transit|visibility:off',
      'feature:water|color:0xc9d6d9',
      'feature:road|element:geometry.fill|color:0xffffff',
      'feature:road|element:geometry.stroke|color:0xe5e7eb',
      'feature:landscape|color:0xf0f3f4',
    ].map(s => `&style=${encodeURIComponent(s)}`).join('');
    
    const marker = `&markers=color:0xe35e25|${hasCoordinates ? `${lat},${lng}` : encodedAddress}`;
    const center = hasCoordinates ? `${lat},${lng}` : encodedAddress;
    
    if (!center || center === '') return null;
    
    return `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(center)}&zoom=15&size=800x400&scale=2&maptype=roadmap${marker}${staticStyle}&key=${apiKey}`;
  }, [apiKey, lat, lng, hasCoordinates, encodedAddress]);

  // Error or no API key - show static map fallback or placeholder
  if (loadError || !apiKey || !hasCoordinates) {
    // If we have an API key and address, try static map
    if (apiKey && (fullAddress || hasCoordinates) && staticMapUrl) {
      return (
        <div className={`relative overflow-hidden rounded-xl ${className}`}>
          {/* Static Map Image */}
          <img 
            src={staticMapUrl}
            alt={`Map showing ${fullAddress || 'event location'}`}
            className="w-full h-full object-cover"
            style={{ minHeight: '250px' }}
            onError={(e) => {
              // If static map fails, hide image and show fallback gradient
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
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
    
    // No API key or address - show branded placeholder
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
  }

  // Interactive Google Map
  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={14}
        options={mapOptions}
      >
        {/* Current event marker - Orange, larger */}
        {hasCoordinates && (
          <MarkerF
            position={{ lat: lat!, lng: lng! }}
            icon={{
              path: CURRENT_MARKER_PATH,
              fillColor: '#e35e25',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: 2.2,
              anchor: new google.maps.Point(12, 22),
            }}
            zIndex={1000}
            title={fullAddress || 'Event location'}
          />
        )}

        {/* Nearby event markers - Teal, smaller */}
        {validNearbyEvents.map((event) => (
          <MarkerF
            key={event.id}
            position={{ lat: event.lat!, lng: event.lng! }}
            icon={{
              path: CURRENT_MARKER_PATH,
              fillColor: '#15383c',
              fillOpacity: 0.9,
              strokeColor: '#ffffff',
              strokeWeight: 1.5,
              scale: 1.5,
              anchor: new google.maps.Point(12, 22),
            }}
            onClick={() => handleMarkerClick(event)}
            title={event.title}
            zIndex={100}
          />
        ))}

        {/* Info Window for clicked nearby event */}
        {selectedEvent && selectedEvent.lat && selectedEvent.lng && (
          <InfoWindowF
            position={{ lat: selectedEvent.lat, lng: selectedEvent.lng }}
            onCloseClick={handleInfoWindowClose}
            options={{
              pixelOffset: new google.maps.Size(0, -30),
              maxWidth: 280,
            }}
          >
            <div className="p-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-[#15383c] text-sm leading-tight line-clamp-2">
                  {selectedEvent.title}
                </h3>
              </div>
              {(selectedEvent.date || selectedEvent.city) && (
                <div className="flex flex-col gap-1 text-xs text-gray-600 mb-3">
                  {selectedEvent.date && (
                    <div className="flex items-center gap-1">
                      <Calendar size={12} className="text-[#e35e25]" />
                      <span>{selectedEvent.date}</span>
                    </div>
                  )}
                  {selectedEvent.city && (
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="text-[#e35e25]" />
                      <span>{selectedEvent.city}</span>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => handleNavigateToEvent(selectedEvent)}
                className="w-full px-3 py-2 bg-[#e35e25] text-white text-xs font-semibold rounded-lg hover:bg-[#cf4d1d] transition-colors"
              >
                View Circle
              </button>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

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

      {/* Legend - shows when there are nearby events */}
      {validNearbyEvents.length > 0 && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-100 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-[#e35e25] border border-white shadow-sm" />
              <span className="text-[#15383c] font-medium">This circle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#15383c] border border-white shadow-sm" />
              <span className="text-gray-600">Other circles</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
