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
  const [hasError, setHasError] = React.useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const hasCoordinates = lat !== undefined && lng !== undefined;
  
  // TEMPORARILY DISABLE GOOGLE MAPS - Always use mock map until API key issues are resolved
  // This prevents all Google Maps errors from appearing
  const [googleMapsDisabled, setGoogleMapsDisabled] = React.useState(() => {
    // Always disable Google Maps for now to prevent errors
    if (typeof window !== 'undefined') {
      (window as any).__GOOGLE_MAPS_DISABLED__ = true;
      try {
        sessionStorage.setItem('googleMapsDisabled', 'true');
      } catch (e) {
        // Ignore sessionStorage errors
      }
    }
    return true; // Always return true to disable Google Maps
  });
  
  // If Google Maps is disabled, immediately set error state and skip all Google Maps code
  React.useEffect(() => {
    if (googleMapsDisabled) {
      setHasError(true);
      setIsLoading(false);
      // Make sure global flag is set
      if (typeof window !== 'undefined') {
        (window as any).__GOOGLE_MAPS_DISABLED__ = true;
      }
    }
  }, [googleMapsDisabled]);

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
        // Check if google.maps.Size and Point are available before using them
        if (google.maps && google.maps.Size && google.maps.Point) {
          setMarkerIcon({
            url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDBDMTIuMjY4IDAgNiA2LjI2OCA2IDE0QzYgMjEuNzMyIDEyLjI2OCAyOCAyMCAyOEMyNy43MzIgMjggMzQgMjEuNzMyIDM0IDE0QzM0IDYuMjY4IDI3LjczMiAwIDIwIDBaIiBmaWxsPSIjRTM1RTI1Ii8+CjxwYXRoIGQ9Ik0yMCAyMEMxOC4zNDMgMjAgMTcgMTguNjU3IDE3IDE3QzE3IDE1LjM0MyAxOC4zNDMgMTQgMjAgMTRDMjEuNjU3IDE0IDIzIDE1LjM0MyAyMyAxN0MyMyAxOC42NTcgMjEuNjU3IDIwIDIwIDIwWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 40)
          });
        }
      } catch (error) {
        console.warn('[MOCK_MAP] Error creating marker icon:', error);
        setMarkerIcon(undefined);
      }
    }
  }, []);

  // DISABLED: Google Maps is temporarily disabled to prevent errors
  // Always use mock map instead
  React.useEffect(() => {
    // Never load Google Maps - always use mock map
    setIsLoading(false);
    setHasError(false); // Not an error, just disabled
  }, []);

  // Catch unhandled promise rejections from Google Maps - MUST run early
  // Since Google Maps is disabled, this handler just suppresses any errors that might slip through
  React.useEffect(() => {
    // Google Maps is always disabled now, so just suppress any errors
    if (googleMapsDisabled) {
      return; // Early return - no need to set error state since we're not using Google Maps
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Check if error is from Google Maps - check multiple sources
      const errorMessage = event.reason?.message || String(event.reason || '');
      const errorStack = event.reason?.stack || '';
      const errorString = String(event.reason || '');
      
      // Check for Google Maps errors in various ways - be very aggressive
      const isGoogleMapsError = 
        errorMessage.includes('GD') || 
        errorMessage.includes('map.js') || 
        errorMessage.includes('google.maps') ||
        errorMessage.includes('maps.googleapis.com') ||
        errorStack.includes('map.js') ||
        errorStack.includes('maps.googleapis.com') ||
        errorStack.includes('common.js') ||
        errorStack.includes('maps-api-v3') ||
        errorString.includes('maps.googleapis.com') ||
        (event.reason && typeof event.reason === 'object' && 'name' in event.reason && String(event.reason.name).includes('TypeError')) ||
        // Check if error source URL contains maps.googleapis.com
        (event.target && String(event.target).includes('maps.googleapis.com'));
      
      if (isGoogleMapsError) {
        // Immediately disable Google Maps and suppress error
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('googleMapsDisabled', 'true');
          } catch (err) {
            // Ignore sessionStorage errors
          }
        }
        setHasError(true);
        setGoogleMapsDisabled(true);
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    };

    // Add listener with capture phase to catch early
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, [googleMapsDisabled]);

  // Add timeout to detect if Google Maps fails to load
  React.useEffect(() => {
    if (apiKey && !hasError) {
      const timeout = setTimeout(() => {
        // If Google Maps hasn't loaded after 10 seconds, assume it failed
        if (isLoading && GoogleMapComponent) {
          console.warn('[MOCK_MAP] Google Maps loading timeout, using fallback');
          setHasError(true);
        }
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [apiKey, hasError, isLoading, GoogleMapComponent]);

  // NOW safe to have early returns - all hooks have been called
  // If no API key, error occurred, or Google Maps was disabled, show fallback mock map
  if (!apiKey || hasError || googleMapsDisabled) {
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

  // If error occurred, show fallback
  if (hasError) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-[#e35e25]">
            <MapPin size={24} className="text-[#e35e25]" fill="currentColor" stroke="currentColor" />
          </div>
        </div>
      </div>
    );
  }

  // Use real Google Maps when API key is available and no errors
  // FINAL CHECK: Make absolutely sure Google Maps is not disabled before rendering LoadScript
  if (typeof window !== 'undefined' && ((window as any).__GOOGLE_MAPS_DISABLED__ === true || sessionStorage.getItem('googleMapsDisabled') === 'true')) {
    // Google Maps is disabled, use fallback immediately
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-[#e35e25]">
            <MapPin size={24} className="text-[#e35e25]" fill="currentColor" stroke="currentColor" />
          </div>
        </div>
      </div>
    );
  }

  // FINAL SAFETY CHECK: Never render Google Maps if disabled
  // This should never execute since we return early above, but adding as extra safety
  if (googleMapsDisabled || !apiKey || hasError) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-[#e35e25]">
            <MapPin size={24} className="text-[#e35e25]" fill="currentColor" stroke="currentColor" />
          </div>
        </div>
      </div>
    );
  }

  // Wrap in error boundary - if Google Maps throws any error, catch it and use fallback
  // NOTE: This code should never execute since Google Maps is disabled
  try {
    return (
      <div className={`relative ${className}`}>
        <LoadScriptComponent 
          googleMapsApiKey={apiKey!}
          onLoad={onLoadScript}
          loadingElement={<div className="text-gray-400 text-sm">Loading map...</div>}
        >
          <GoogleMapComponent
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={hasCoordinates ? 15 : 10}
            onLoad={(map: any) => {
              try {
                onLoad(map);
              } catch (error) {
                console.warn('[MOCK_MAP] Error in onLoad, using fallback:', error);
                setHasError(true);
              }
            }}
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
  } catch (error) {
    console.warn('[MOCK_MAP] Error rendering Google Maps, using fallback:', error);
    setHasError(true);
    // Return fallback immediately
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-[#e35e25]">
            <MapPin size={24} className="text-[#e35e25]" fill="currentColor" stroke="currentColor" />
          </div>
        </div>
      </div>
    );
  }
};
