import React, { useState, useCallback } from 'react';
import { MapPin } from 'lucide-react';

interface MockMapProps {
  lat?: number;
  lng?: number;
  address?: string;
  city?: string;
  className?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

// Default center (Montreal)
const defaultCenter = {
  lat: 45.5017,
  lng: -73.5673
};

export const MockMap: React.FC<MockMapProps> = ({ 
  lat, 
  lng, 
  address, 
  city,
  className = '' 
}) => {
  // CRITICAL: Call ALL hooks first, before any early returns
  // This ensures consistent hook order across all renders
  const [map, setMap] = useState<any>(null);
  const [GoogleMapComponent, setGoogleMapComponent] = useState<React.ComponentType<any> | null>(null);
  const [LoadScriptComponent, setLoadScriptComponent] = useState<React.ComponentType<any> | null>(null);
  const [MarkerComponent, setMarkerComponent] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [markerIcon, setMarkerIcon] = React.useState<any>(undefined);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const hasCoordinates = lat !== undefined && lng !== undefined;

  const center = hasCoordinates 
    ? { lat: lat!, lng: lng! }
    : defaultCenter;

  const onLoad = useCallback((map: any) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Callback to create marker icon after LoadScript loads google.maps
  const onLoadScript = React.useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).google?.maps) {
      try {
        const google = (window as any).google;
        setMarkerIcon({
          url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDBDMTIuMjY4IDAgNiA2LjI2OCA2IDE0QzYgMjEuNzMyIDEyLjI2OCAyOCAyMCAyOEMyNy43MzIgMjggMzQgMjEuNzMyIDM0IDE0QzM0IDYuMjY4IDI3LjczMiAwIDIwIDBaIiBmaWxsPSIjRTM1RTI1Ii8+CjxwYXRoIGQ9Ik0yMCAyMEMxOC4zNDMgMjAgMTcgMTguNjU3IDE3IDE3QzE3IDE1LjM0MyAxOC4zNDMgMTQgMjAgMTRDMjEuNjU3IDE0IDIzIDE1LjM0MyAyMyAxN0MyMyAxOC42NTcgMjEuNjU3IDIwIDIwIDIwWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 40)
        });
      } catch (error) {
        console.warn('[MOCK_MAP] Error creating marker icon:', error);
        setMarkerIcon(undefined);
      }
    }
  }, []);

  // Load Google Maps components if API key is available
  React.useEffect(() => {
    if (apiKey) {
      // Dynamically import Google Maps components
      Promise.all([
        import('@react-google-maps/api').then(m => m.GoogleMap),
        import('@react-google-maps/api').then(m => m.LoadScript),
        import('@react-google-maps/api').then(m => m.Marker),
      ]).then(([GoogleMap, LoadScript, Marker]) => {
        setGoogleMapComponent(() => GoogleMap);
        setLoadScriptComponent(() => LoadScript);
        setMarkerComponent(() => Marker);
        setIsLoading(false);
      }).catch((error) => {
        console.error('[MOCK_MAP] Error loading Google Maps components:', error);
        setIsLoading(false);
      });
    } else {
      // No API key, don't try to load Google Maps
      setIsLoading(false);
    }
  }, [apiKey]);

  // NOW safe to have early returns - all hooks have been called
  // If no API key, show fallback mock map
  if (!apiKey) {
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
        
        {/* Streets Pattern */}
        <div className="absolute inset-0">
          <svg className="w-full h-full opacity-20" viewBox="0 0 400 300" preserveAspectRatio="none">
            {/* Horizontal streets */}
            <line x1="0" y1="100" x2="400" y2="100" stroke="#15383c" strokeWidth="2" />
            <line x1="0" y1="200" x2="400" y2="200" stroke="#15383c" strokeWidth="2" />
            {/* Vertical streets */}
            <line x1="150" y1="0" x2="150" y2="300" stroke="#15383c" strokeWidth="2" />
            <line x1="250" y1="0" x2="250" y2="300" stroke="#15383c" strokeWidth="2" />
          </svg>
        </div>

        {/* Content Overlay */}
        {hasCoordinates ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Marker */}
            <div className="relative z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-[#e35e25] transform -translate-y-1/2">
                <MapPin 
                  size={24} 
                  className="sm:w-7 sm:h-7 md:w-8 md:h-8 text-[#e35e25]" 
                  fill="currentColor"
                  stroke="currentColor"
                />
              </div>
              {/* Pulse animation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-[#e35e25]/20 rounded-full animate-ping"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-200/50">
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-xl mb-2 sm:mb-3 text-[#e35e25]">
              <MapPin 
                size={20} 
                className="sm:w-6 sm:h-6 md:hidden text-[#e35e25]/50" 
                fill="currentColor" 
                stroke="currentColor" 
              />
              <MapPin 
                size={32} 
                className="hidden md:block text-[#e35e25]/50" 
                fill="currentColor" 
                stroke="currentColor" 
              />
            </div>
            <p className="font-medium text-xs sm:text-sm md:text-base text-gray-500 px-4 text-center">
              Location coming soon
            </p>
          </div>
        )}

        {/* Watermark */}
        <div className="absolute bottom-2 right-2 text-[8px] text-gray-400/50 font-mono">
          {hasCoordinates ? 'Google Maps API key required' : 'Mock Map'}
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading || !GoogleMapComponent || !LoadScriptComponent) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 ${className} flex items-center justify-center`}>
        <div className="text-gray-400 text-sm">Loading map...</div>
      </div>
    );
  }

  // Use real Google Maps when API key is available
  return (
    <div className={`relative ${className}`}>
      <LoadScriptComponent 
        googleMapsApiKey={apiKey}
        onLoad={onLoadScript}
      >
        <GoogleMapComponent
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={hasCoordinates ? 15 : 10}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          }}
        >
          {hasCoordinates && MarkerComponent && markerIcon && (
            <MarkerComponent
              position={{ lat: lat!, lng: lng! }}
              icon={markerIcon}
            />
          )}
        </GoogleMapComponent>
      </LoadScriptComponent>
    </div>
  );
};
