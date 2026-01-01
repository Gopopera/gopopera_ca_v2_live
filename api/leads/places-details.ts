/**
 * POST /api/leads/places-details
 * 
 * Fetch detailed info for multiple places using Google Places Details API.
 * Uses field masks to minimize API costs.
 * 
 * Admin-only endpoint.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminToken } from '../_lib/firebaseAdmin.js';

interface PlacesDetailsRequest {
  placeIds: string[];  // max 20 per request
}

interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  website?: string;
  phone?: string;
  rating?: number;
  userRatingCount?: number;
}

interface PlacesDetailsResponse {
  success: boolean;
  error?: string;
  details?: PlaceDetails[];
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Normalize website URL to just origin, strip tracking params
 */
function normalizeWebsiteUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  
  try {
    const parsed = new URL(url);
    // Return just the origin (protocol + host)
    // But keep the full URL for crawling, just clean tracking params
    const cleanUrl = new URL(url);
    // Remove common tracking params
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref'].forEach(param => {
      cleanUrl.searchParams.delete(param);
    });
    return cleanUrl.toString().replace(/\/$/, ''); // Remove trailing slash
  } catch {
    return url;
  }
}

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
    console.warn('[places-details] Unauthorized:', authResult.reason);
    res.status(403).json({ success: false, error: 'Forbidden', reason: authResult.reason });
    return;
  }

  // Check API key
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('[places-details] Missing GOOGLE_PLACES_API_KEY');
    res.status(500).json({ success: false, error: 'Places API not configured' });
    return;
  }

  try {
    const { placeIds } = req.body as PlacesDetailsRequest;

    if (!placeIds || !Array.isArray(placeIds) || placeIds.length === 0) {
      res.status(400).json({ success: false, error: 'placeIds array is required' });
      return;
    }

    if (placeIds.length > 20) {
      res.status(400).json({ success: false, error: 'Maximum 20 placeIds per request' });
      return;
    }

    console.log(`[places-details] Fetching details for ${placeIds.length} places`);

    const details: PlaceDetails[] = [];

    // Fetch details for each place (Places API v1 doesn't support batch details)
    // But we parallelize with a small concurrency limit
    const CONCURRENCY = 5;
    
    for (let i = 0; i < placeIds.length; i += CONCURRENCY) {
      const batch = placeIds.slice(i, i + CONCURRENCY);
      
      const batchResults = await Promise.all(
        batch.map(async (placeId) => {
          try {
            // Use Place Details (New) API
            // https://developers.google.com/maps/documentation/places/web-service/place-details
            const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}`;
            
            const response = await fetch(detailsUrl, {
              method: 'GET',
              headers: {
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'id,displayName,formattedAddress,websiteUri,nationalPhoneNumber,rating,userRatingCount',
              },
            });

            if (!response.ok) {
              console.warn(`[places-details] Failed to fetch ${placeId}: ${response.status}`);
              return null;
            }

            const data = await response.json() as {
              id: string;
              displayName?: { text: string };
              formattedAddress?: string;
              websiteUri?: string;
              nationalPhoneNumber?: string;
              rating?: number;
              userRatingCount?: number;
            };

            return {
              placeId: data.id || placeId,
              name: data.displayName?.text || 'Unknown',
              formattedAddress: data.formattedAddress || '',
              website: normalizeWebsiteUrl(data.websiteUri),
              phone: data.nationalPhoneNumber,
              rating: data.rating,
              userRatingCount: data.userRatingCount,
            } as PlaceDetails;

          } catch (error) {
            console.warn(`[places-details] Error fetching ${placeId}:`, error);
            return null;
          }
        })
      );

      // Add successful results
      for (const result of batchResults) {
        if (result) {
          details.push(result);
        }
      }

      // Small delay between batches
      if (i + CONCURRENCY < placeIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[places-details] Retrieved ${details.length}/${placeIds.length} details`);

    res.status(200).json({
      success: true,
      details,
    } as PlacesDetailsResponse);

  } catch (error: any) {
    console.error('[places-details] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch place details',
    });
  }
}

