/**
 * Geocoding utility to convert addresses to coordinates
 * Uses Google Geocoding API
 */

import { getGeocodingCountrySuffix } from './location';

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress?: string;
}

/**
 * Geocode an address to get coordinates
 * @param address - Street address
 * @param city - City name
 * @returns Coordinates or null if geocoding fails
 */
export async function geocodeAddress(
  address: string,
  city: string
): Promise<GeocodeResult | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('[GEOCODING] Google Maps API key not found. Cannot geocode address.');
    return null;
  }

  if (!address || !city) {
    console.warn('[GEOCODING] Address or city is missing.');
    return null;
  }

  try {
    // Use centralized helper to detect country from city suffix
    // SAFETY: Returns empty string if no country detected (never appends wrong country)
    const countrySuffix = getGeocodingCountrySuffix(city);
    const fullAddress = `${address}, ${city}${countrySuffix}`;
    const encodedAddress = encodeURIComponent(fullAddress);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      
      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: result.formatted_address,
      };
    } else {
      console.warn('[GEOCODING] No results found for address:', fullAddress, 'Status:', data.status);
      return null;
    }
  } catch (error) {
    console.error('[GEOCODING] Error geocoding address:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to get address
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Formatted address or null if reverse geocoding fails
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('[GEOCODING] Google Maps API key not found. Cannot reverse geocode.');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    } else {
      console.warn('[GEOCODING] No results found for coordinates:', lat, lng, 'Status:', data.status);
      return null;
    }
  } catch (error) {
    console.error('[GEOCODING] Error reverse geocoding:', error);
    return null;
  }
}

