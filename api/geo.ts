import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/geo
 * Returns coarse location info based on IP address using ipapi.co (free tier, no token needed).
 * Response: { city: string, region: string, country: string } or { error: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get client IP from Vercel headers or fallback
    const clientIp = 
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.headers['x-real-ip']?.toString() ||
      req.socket?.remoteAddress ||
      '';

    // Use ipapi.co for IP geolocation (free tier, no API key required)
    // If running locally, use a generic endpoint; otherwise use the client IP
    const geoUrl = clientIp && !clientIp.startsWith('127.') && !clientIp.startsWith('::1')
      ? `https://ipapi.co/${clientIp}/json/`
      : 'https://ipapi.co/json/'; // Will use the server's IP if no client IP

    const geoResponse = await fetch(geoUrl, {
      headers: {
        'User-Agent': 'Popera/1.0',
      },
    });

    if (!geoResponse.ok) {
      console.error('[api/geo] ipapi.co returned non-OK status:', geoResponse.status);
      return res.status(502).json({ error: 'Geolocation service unavailable' });
    }

    const geoData = await geoResponse.json();

    // ipapi.co returns: city, region, region_code, country_code, country_name, etc.
    if (geoData.error) {
      console.error('[api/geo] ipapi.co error:', geoData.reason || geoData.error);
      return res.status(502).json({ error: 'Geolocation lookup failed' });
    }

    // Return only the fields we need
    return res.status(200).json({
      city: geoData.city || null,
      region: geoData.region_code || geoData.region || null,
      country: geoData.country_code || geoData.country || null,
    });
  } catch (error) {
    console.error('[api/geo] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

