# Google Maps Integration Guide

## Current Implementation

The app currently uses a **MockMap** component that displays a placeholder map with:
- Grid pattern background
- Street lines pattern
- Marker pin (if coordinates are available)
- "Location coming soon" message (if coordinates are missing)

## Files Modified

1. **`components/map/MockMap.tsx`** (NEW)
   - Mock map component with placeholder visualization
   - Shows marker if `lat`/`lng` are provided
   - Shows "Location coming soon" if coordinates are missing

2. **`types.ts`**
   - Added `lat?: number` and `lng?: number` to Event interface

3. **`pages/EventDetailPage.tsx`**
   - Replaced placeholder div with `<MockMap>` component
   - Passes event coordinates and location data

## How to Switch to Real Google Maps

### Step 1: Install Google Maps React Library

```bash
npm install @react-google-maps/api
```

### Step 2: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Maps JavaScript API"
4. Create credentials (API Key)
5. Restrict the API key to your domain (recommended)

### Step 3: Create Environment Variable

Create `.env` file in project root:

```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Step 4: Update `components/map/MockMap.tsx`

Replace the entire file with:

```typescript
import React from { useState, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
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

const defaultCenter = {
  lat: 45.5017, // Montreal default
  lng: -73.5673
};

export const MockMap: React.FC<MockMapProps> = ({ 
  lat, 
  lng, 
  address, 
  city,
  className = '' 
}) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const center = lat && lng 
    ? { lat, lng }
    : defaultCenter;

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // If no API key, show fallback
  if (!apiKey) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}>
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
            {lat && lng ? 'Google Maps API key required' : 'Location coming soon'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <LoadScript googleMapsApiKey={apiKey}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={lat && lng ? 15 : 10}
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
          {lat && lng && (
            <Marker
              position={{ lat, lng }}
              icon={{
                url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDBDMTIuMjY4IDAgNiA2LjI2OCA2IDE0QzYgMjEuNzMyIDEyLjI2OCAyOCAyMCAyOEMyNy43MzIgMjggMzQgMjEuNzMyIDM0IDE0QzM0IDYuMjY4IDI3LjczMiAwIDIwIDBaIiBmaWxsPSIjRTM1RTI1Ii8+CjxwYXRoIGQ9Ik0yMCAyMEMxOC4zNDMgMjAgMTcgMTguNjU3IDE3IDE3QzE3IDE1LjM0MyAxOC4zNDMgMTQgMjAgMTRDMjEuNjU3IDE0IDIzIDE1LjM0MyAyMyAxN0MyMyAxOC42NTcgMjEuNjU3IDIwIDIwIDIwWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 40)
              }}
            />
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};
```

### Step 5: Update `vite.config.ts` (if needed)

Ensure environment variables are loaded:

```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Environment variables are automatically available
  };
});
```

### Step 6: Add Coordinates to Events

When creating events, you'll need to geocode addresses to get lat/lng. You can:

1. **Use Google Geocoding API** (requires API key):
```typescript
// In CreateEventPage or event store
const geocodeAddress = async (address: string, city: string) => {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(`${address}, ${city}`)}&key=${apiKey}`
  );
  const data = await response.json();
  if (data.results[0]) {
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  }
  return null;
};
```

2. **Or manually add coordinates** when creating events in the store.

### Step 7: Update Event Store

In `stores/eventStore.ts`, when adding events, include lat/lng:

```typescript
addEvent: (eventData) => {
  const newEvent = createEvent({
    ...eventData,
    lat: eventData.lat, // Add if available
    lng: eventData.lng, // Add if available
  });
  // ...
}
```

## Testing

1. **With API Key:**
   - Add `VITE_GOOGLE_MAPS_API_KEY` to `.env`
   - Restart dev server
   - Map should load with Google Maps tiles
   - Marker should appear if coordinates are provided

2. **Without API Key:**
   - Remove or don't set the env variable
   - Map should show fallback placeholder
   - "Google Maps API key required" message if coordinates exist
   - "Location coming soon" if no coordinates

## Current Map Display

- **Location:** `pages/EventDetailPage.tsx` (line ~88)
- **Component:** `components/map/MockMap.tsx`
- **Height:** Responsive (h-40 sm:h-48 md:h-64)
- **Styling:** Rounded corners, proper object-cover, responsive width

## Notes

- The mock map works without any API keys
- Coordinates are optional - map gracefully handles missing data
- The component is fully responsive
- When switching to Google Maps, the component interface stays the same
- Only the internal implementation changes


