# Google Maps Integration Setup Guide

## Overview
The app now supports real Google Maps integration to display event locations on interactive maps. The system gracefully falls back to a mock map if the API key is not configured.

## Features
- ✅ Real Google Maps with interactive markers
- ✅ Automatic geocoding of addresses when creating events
- ✅ Custom Popera-branded marker pins (orange)
- ✅ Graceful fallback to mock map if API key is missing
- ✅ Responsive design for mobile and desktop

## Setup Instructions

### Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select your existing project (e.g., `gopopera2026`)
3. Enable the following APIs:
   - **Maps JavaScript API** (for displaying maps)
   - **Geocoding API** (for converting addresses to coordinates)
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. **Restrict the API key** (recommended for security):
   - Application restrictions: HTTP referrers
   - Add your domains:
     - `localhost:*` (for development)
     - `*.vercel.app/*` (for Vercel deployments)
     - `gopopera.ca/*` (for production)
   - API restrictions: Restrict to "Maps JavaScript API" and "Geocoding API"

### Step 2: Add API Key to Environment Variables

Create or update your `.env` file in the project root:

```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**For Vercel deployment:**
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add `VITE_GOOGLE_MAPS_API_KEY` with your API key value
4. Redeploy your application

### Step 3: Verify Installation

The Google Maps library (`@react-google-maps/api`) is already installed. To verify:

```bash
npm list @react-google-maps/api
```

## How It Works

### Map Component (`components/map/MockMap.tsx`)

The `MockMap` component automatically detects if a Google Maps API key is available:

- **With API Key**: Displays real Google Maps with interactive features
- **Without API Key**: Shows a styled mock map with a marker (if coordinates exist)

### Geocoding (`utils/geocoding.ts`)

When creating an event:
1. The system automatically geocodes the address using Google Geocoding API
2. Coordinates (`lat`, `lng`) are saved with the event
3. If geocoding fails or API key is missing, the event is still created (without coordinates)

### Event Creation Flow

1. User fills in event details including address and city
2. On submit, the address is automatically geocoded
3. Coordinates are saved with the event in Firestore
4. The map component displays the location using these coordinates

## Usage

### Displaying Maps

Maps are automatically displayed on:
- **Event Detail Page**: Shows the event location
- **Create Event Page**: Preview of the event location (if coordinates exist)

### Example Code

```typescript
import { MockMap } from '../components/map/MockMap';

<MockMap 
  lat={event.lat}
  lng={event.lng}
  address={event.address}
  city={event.city}
  className="w-full h-64 rounded-xl"
/>
```

## Cost Considerations

Google Maps API has a free tier:
- **Maps JavaScript API**: $200 free credit per month (covers ~28,000 map loads)
- **Geocoding API**: $200 free credit per month (covers ~40,000 geocoding requests)

For most applications, the free tier is sufficient. Monitor usage in Google Cloud Console.

## Troubleshooting

### Map Not Loading

1. **Check API Key**: Verify `VITE_GOOGLE_MAPS_API_KEY` is set correctly
2. **Check Console**: Look for errors in browser console
3. **Check API Restrictions**: Ensure your domain is allowed in API key restrictions
4. **Check Billing**: Ensure billing is enabled in Google Cloud (required even for free tier)

### Geocoding Not Working

1. **Check API Key**: Same as above
2. **Check Geocoding API**: Ensure "Geocoding API" is enabled in Google Cloud Console
3. **Check Address Format**: Ensure address and city are provided
4. **Check Console Logs**: Look for geocoding errors in console

### Fallback Behavior

If the API key is missing:
- Maps will show a styled mock map
- Events can still be created (without coordinates)
- Users will see "Location coming soon" if no coordinates exist
- Users will see "Google Maps API key required" if coordinates exist but API key is missing

## Files Modified

1. **`components/map/MockMap.tsx`**: Updated to use real Google Maps when API key is available
2. **`utils/geocoding.ts`**: New utility for geocoding addresses
3. **`pages/CreateEventPage.tsx`**: Added automatic geocoding on event creation
4. **`package.json`**: Added `@react-google-maps/api` dependency

## Next Steps

- Consider adding a map view to the explore page showing all events
- Add ability to click on map markers to view event details
- Consider clustering markers when many events are nearby
- Add directions/route planning feature

