/**
 * POST /api/leads/places-search
 * 
 * Search for business candidates using Google Places Text Search API.
 * Returns placeIds + basic display fields for efficient subsequent lookups.
 * 
 * Admin-only endpoint.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminToken } from '../_lib/firebaseAdmin.js';

interface PlacesSearchRequest {
  city: string;            // e.g., "Montreal, QC"
  radiusKm: number;        // e.g., 10
  query: string;           // e.g., "restaurants" or "yoga studio"
  maxCandidates?: number;  // default 250
}

interface PlaceCandidate {
  placeId: string;
  name: string;
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
}

interface PlacesSearchResponse {
  success: boolean;
  error?: string;
  candidates?: PlaceCandidate[];
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      .end();
    return;
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Verify admin auth
  const authResult = await verifyAdminToken(req.headers.authorization);
  if (!authResult.success) {
    console.warn('[places-search] Unauthorized:', authResult.reason);
    res.status(403).json({ success: false, error: 'Forbidden', reason: authResult.reason });
    return;
  }

  // Check API key
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('[places-search] Missing GOOGLE_PLACES_API_KEY');
    res.status(500).json({ success: false, error: 'Places API not configured' });
    return;
  }

  try {
    const { city, radiusKm = 10, query, maxCandidates = 250 } = req.body as PlacesSearchRequest;

    if (!city || !query) {
      res.status(400).json({ success: false, error: 'city and query are required' });
      return;
    }

    console.log(`[places-search] Searching for "${query}" in ${city}, radius ${radiusKm}km`);

    // Use Text Search (New) API
    // https://developers.google.com/maps/documentation/places/web-service/text-search
    const candidates: PlaceCandidate[] = [];
    let pageToken: string | undefined;
    
    // Collect candidates across pages
    while (candidates.length < maxCandidates) {
      const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
      
      const requestBody: Record<string, unknown> = {
        textQuery: `${query} in ${city}`,
        maxResultCount: Math.min(20, maxCandidates - candidates.length),
        languageCode: 'en',
      };

      // Add location bias for better results
      if (radiusKm > 0) {
        requestBody.locationBias = {
          circle: {
            center: {
              // We'll use geocoding to get lat/lng if needed
              // For now, rely on textQuery containing city
            },
            radius: radiusKm * 1000, // meters
          },
        };
        // Remove locationBias if center not provided - textQuery already includes city
        delete requestBody.locationBias;
      }

      if (pageToken) {
        requestBody.pageToken = pageToken;
      }

      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,nextPageToken',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[places-search] API error:', response.status, errorText);
        throw new Error(`Places API error: ${response.status}`);
      }

      const data = await response.json() as {
        places?: Array<{
          id: string;
          displayName?: { text: string };
          formattedAddress?: string;
          rating?: number;
          userRatingCount?: number;
        }>;
        nextPageToken?: string;
      };

      // Map results to our format
      if (data.places) {
        for (const place of data.places) {
          if (candidates.length >= maxCandidates) break;
          
          candidates.push({
            placeId: place.id,
            name: place.displayName?.text || 'Unknown',
            formattedAddress: place.formattedAddress || '',
            rating: place.rating,
            userRatingCount: place.userRatingCount,
          });
        }
      }

      // Check for next page
      pageToken = data.nextPageToken;
      if (!pageToken) break;

      // Small delay between pages
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`[places-search] Found ${candidates.length} candidates`);

    res.status(200).json({
      success: true,
      candidates,
    } as PlacesSearchResponse);

  } catch (error: any) {
    console.error('[places-search] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search places',
    });
  }
}

