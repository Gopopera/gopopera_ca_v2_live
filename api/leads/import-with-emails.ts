/**
 * POST /api/leads/import-with-emails
 * 
 * Main import job that:
 * 1. Searches Google Places for candidates
 * 2. Filters by rating/reviews
 * 3. Fetches details for each
 * 4. Crawls websites to extract emails
 * 5. Only creates leads that have emails
 * 6. Stops when target reached
 * 
 * Admin-only endpoint with rate limiting.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminToken, getAdminFirestore } from '../_lib/firebaseAdmin.js';

interface ImportRequest {
  categoryKey: string;      // e.g., 'restaurant', 'yoga_studio'
  leadType: string;         // e.g., 'restaurant', 'hot yoga'
  city: string;             // e.g., 'Montreal, QC'
  query: string;            // Search query for Places
  radiusKm?: number;        // Default 10
  minRating?: number;       // e.g., 4.3
  minReviews?: number;      // e.g., 100
  targetLeads?: number;     // Default 100
  maxCandidates?: number;   // Default 250
  maxSitesToScan?: number;  // Default 250
}

interface ImportReportItem {
  placeId: string;
  name: string;
  website?: string;
  outcome: 'CREATED' | 'NO_EMAIL' | 'NO_WEBSITE' | 'DUPLICATE' | 'CACHED_NO_EMAIL' | 'ERROR';
  email?: string;
  emailSourceUrl?: string;
}

interface ImportResponse {
  success: boolean;
  error?: string;
  created: number;
  scanned: number;
  skippedNoWebsite: number;
  skippedNoEmail: number;
  skippedDedupe: number;
  skippedCached: number;
  stoppedReason: 'target_reached' | 'candidate_limit_reached' | 'error';
  report: ImportReportItem[];
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Rate limiting: 1 import per minute per admin
const RATE_LIMIT_MS = 60000; // 1 minute

// Scan cache TTL (30 days in ms)
const SCAN_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Check and update rate limit using Firestore (persistent across cold starts)
 */
async function checkRateLimit(db: FirebaseFirestore.Firestore, adminEmail: string): Promise<boolean> {
  const now = Date.now();
  const rateLimitDocId = `import_${adminEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  try {
    const docRef = db.collection('rate_limits').doc(rateLimitDocId);
    const doc = await docRef.get();
    
    if (doc.exists) {
      const data = doc.data() as { lastImportAt?: number };
      if (data.lastImportAt && now - data.lastImportAt < RATE_LIMIT_MS) {
        return false;
      }
    }
    
    // Update the rate limit timestamp
    await docRef.set({ lastImportAt: now, adminEmail }, { merge: true });
    return true;
  } catch (error) {
    console.warn('[import] Rate limit check failed, allowing request:', error);
    return true; // Allow on error to not block functionality
  }
}

/**
 * Search Places API
 */
async function searchPlaces(
  apiKey: string,
  query: string,
  city: string,
  maxCandidates: number
): Promise<Array<{ placeId: string; name: string; rating?: number; userRatingCount?: number }>> {
  const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
  const candidates: Array<{ placeId: string; name: string; rating?: number; userRatingCount?: number }> = [];
  
  let pageToken: string | undefined;
  
  while (candidates.length < maxCandidates) {
    const requestBody: Record<string, unknown> = {
      textQuery: `${query} in ${city}`,
      maxResultCount: Math.min(20, maxCandidates - candidates.length),
      languageCode: 'en',
    };
    
    if (pageToken) {
      requestBody.pageToken = pageToken;
    }
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,nextPageToken',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      console.error('[import] Places search error:', response.status);
      break;
    }
    
    const data = await response.json() as {
      places?: Array<{ id: string; displayName?: { text: string }; rating?: number; userRatingCount?: number }>;
      nextPageToken?: string;
    };
    
    if (data.places) {
      for (const place of data.places) {
        if (candidates.length >= maxCandidates) break;
        candidates.push({
          placeId: place.id,
          name: place.displayName?.text || 'Unknown',
          rating: place.rating,
          userRatingCount: place.userRatingCount,
        });
      }
    }
    
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return candidates;
}

/**
 * Get Place Details
 */
async function getPlaceDetails(
  apiKey: string,
  placeId: string
): Promise<{ website?: string; phone?: string; formattedAddress?: string } | null> {
  const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}`;
  
  try {
    const response = await fetch(detailsUrl, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'websiteUri,nationalPhoneNumber,formattedAddress',
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json() as {
      websiteUri?: string;
      nationalPhoneNumber?: string;
      formattedAddress?: string;
    };
    
    return {
      website: data.websiteUri,
      phone: data.nationalPhoneNumber,
      formattedAddress: data.formattedAddress,
    };
  } catch {
    return null;
  }
}

/**
 * Extract email from website (inline version for this endpoint)
 */
async function extractEmail(website: string): Promise<{
  emailFound: boolean;
  email?: string;
  emailSourceUrl?: string;
  confidence?: 'high' | 'medium' | 'low';
}> {
  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const SKIP_PATTERNS = [/^noreply@/i, /^no-reply@/i, /^donotreply@/i, /example\.com$/i, /@sentry\./i, /@wixpress\./i];
  
  const isValidEmail = (email: string): boolean => {
    if (!email || email.length < 6) return false;
    for (const p of SKIP_PATTERNS) if (p.test(email)) return false;
    return true;
  };
  
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    const origin = url.origin;
    const host = url.hostname.replace(/^www\./, '');
    
    // Fetch homepage
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PoperaBot/1.0)',
        'Accept': 'text/html',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return { emailFound: false };
    
    const html = await response.text();
    
    // Extract mailto first
    const mailtoMatch = html.match(/href=["']mailto:([^"'?]+)/i);
    if (mailtoMatch) {
      const email = mailtoMatch[1].toLowerCase();
      if (isValidEmail(email)) {
        return { emailFound: true, email, emailSourceUrl: url.toString(), confidence: 'high' };
      }
    }
    
    // Extract all emails
    const emails = (html.match(EMAIL_REGEX) || [])
      .map(e => e.toLowerCase())
      .filter(isValidEmail)
      .filter(e => e.includes(host) || !e.includes('example'));
    
    if (emails.length > 0) {
      // Prefer domain-matching
      const domainMatch = emails.find(e => e.split('@')[1]?.replace(/^www\./, '') === host);
      const email = domainMatch || emails[0];
      return { emailFound: true, email, emailSourceUrl: url.toString(), confidence: domainMatch ? 'medium' : 'low' };
    }
    
    // Try /contact page
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const contactResponse = await fetch(`${origin}/contact`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PoperaBot/1.0)', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);
    
    if (contactResponse?.ok) {
      const contactHtml = await contactResponse.text();
      const contactEmails = (contactHtml.match(EMAIL_REGEX) || [])
        .map(e => e.toLowerCase())
        .filter(isValidEmail);
      
      if (contactEmails.length > 0) {
        return { emailFound: true, email: contactEmails[0], emailSourceUrl: `${origin}/contact`, confidence: 'high' };
      }
    }
    
    return { emailFound: false };
  } catch {
    return { emailFound: false };
  }
}

/**
 * Check scan cache in Firestore
 */
async function getScanCache(db: FirebaseFirestore.Firestore, key: string): Promise<{
  result: string;
  email?: string;
  emailSourceUrl?: string;
  lastScannedAt: number;
} | null> {
  try {
    const docRef = db.collection('lead_scan_cache').doc(key);
    const doc = await docRef.get();
    if (!doc.exists) return null;
    return doc.data() as any;
  } catch {
    return null;
  }
}

/**
 * Set scan cache in Firestore
 */
async function setScanCache(db: FirebaseFirestore.Firestore, key: string, data: {
  placeId?: string;
  websiteHost?: string;
  result: string;
  email?: string;
  emailSourceUrl?: string;
}): Promise<void> {
  try {
    const docRef = db.collection('lead_scan_cache').doc(key);
    await docRef.set({
      ...data,
      lastScannedAt: Date.now(),
    });
  } catch (error) {
    console.warn('[import] Failed to set scan cache:', error);
  }
}

/**
 * Check if lead exists by placeId
 */
async function leadExistsByPlaceId(db: FirebaseFirestore.Firestore, placeId: string): Promise<boolean> {
  try {
    const snapshot = await db.collection('leads').where('placeId', '==', placeId).limit(1).get();
    return !snapshot.empty;
  } catch {
    return false;
  }
}

/**
 * Create a lead in Firestore
 */
async function createLead(db: FirebaseFirestore.Firestore, lead: Record<string, unknown>, adminEmail: string): Promise<string> {
  const now = Date.now();
  const leadData = {
    ...lead,
    status: 'new',
    source: 'places_api',
    importedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  
  const docRef = await db.collection('leads').add(leadData);
  
  // Add activity log
  await db.collection('lead_activities').add({
    leadId: docRef.id,
    type: 'imported',
    description: `Lead "${lead.businessName}" imported via Places API`,
    performedBy: adminEmail,
    timestamp: now,
  });
  
  return docRef.id;
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
    console.warn('[import] Unauthorized:', authResult.reason);
    res.status(403).json({ success: false, error: 'Forbidden', reason: authResult.reason });
    return;
  }

  const adminEmail = authResult.email;

  // Check API key
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('[import] Missing GOOGLE_PLACES_API_KEY');
    res.status(500).json({ success: false, error: 'Places API not configured' });
    return;
  }

  // Get Firestore
  const db = getAdminFirestore();
  if (!db) {
    console.error('[import] Firestore not initialized');
    res.status(500).json({ success: false, error: 'Database not available' });
    return;
  }

  // Rate limit check (using Firestore for persistence)
  const rateLimitOk = await checkRateLimit(db, adminEmail);
  if (!rateLimitOk) {
    res.status(429).json({ success: false, error: 'Rate limited: max 1 import per minute' });
    return;
  }

  try {
    const {
      categoryKey,
      leadType,
      city,
      query,
      radiusKm = 10,
      minRating,
      minReviews,
      targetLeads = 100,
      maxCandidates = 250,
      maxSitesToScan = 250,
    } = req.body as ImportRequest;

    if (!categoryKey || !leadType || !city || !query) {
      res.status(400).json({ success: false, error: 'categoryKey, leadType, city, and query are required' });
      return;
    }

    console.log(`[import] Starting import: ${query} in ${city}, target=${targetLeads}`);

    const report: ImportReportItem[] = [];
    let created = 0;
    let scanned = 0;
    let skippedNoWebsite = 0;
    let skippedNoEmail = 0;
    let skippedDedupe = 0;
    let skippedCached = 0;
    let stoppedReason: 'target_reached' | 'candidate_limit_reached' | 'error' = 'candidate_limit_reached';

    // 1. Search for candidates
    console.log('[import] Searching for candidates...');
    const candidates = await searchPlaces(apiKey, query, city, maxCandidates);
    console.log(`[import] Found ${candidates.length} candidates`);

    // 2. Filter by rating/reviews
    const filtered = candidates.filter(c => {
      if (minRating !== undefined && (c.rating === undefined || c.rating < minRating)) return false;
      if (minReviews !== undefined && (c.userRatingCount === undefined || c.userRatingCount < minReviews)) return false;
      return true;
    });
    console.log(`[import] ${filtered.length} candidates after rating/review filter`);

    // 3. Process each candidate
    for (const candidate of filtered) {
      if (created >= targetLeads) {
        stoppedReason = 'target_reached';
        break;
      }
      
      if (scanned >= maxSitesToScan) {
        break;
      }

      // Check dedupe
      const exists = await leadExistsByPlaceId(db, candidate.placeId);
      if (exists) {
        skippedDedupe++;
        report.push({ placeId: candidate.placeId, name: candidate.name, outcome: 'DUPLICATE' });
        continue;
      }

      // Check scan cache
      const cached = await getScanCache(db, candidate.placeId);
      if (cached && Date.now() - cached.lastScannedAt < SCAN_CACHE_TTL_MS) {
        if (cached.result === 'email_found' && cached.email) {
          // Use cached email to create lead
          const details = await getPlaceDetails(apiKey, candidate.placeId);
          if (details) {
            await createLead(db, {
              businessName: candidate.name,
              categoryKey,
              leadType,
              city,
              address: details.formattedAddress,
              website: details.website,
              phone: details.phone,
              email: cached.email,
              emailSourceUrl: cached.emailSourceUrl,
              emailConfidence: (cached as any).confidence || 'high', // Use cached confidence
              rating: candidate.rating,
              reviewCount: candidate.userRatingCount,
              placeId: candidate.placeId,
            }, adminEmail);
            
            created++;
            report.push({ 
              placeId: candidate.placeId, 
              name: candidate.name, 
              website: details.website,
              outcome: 'CREATED', 
              email: cached.email,
              emailSourceUrl: cached.emailSourceUrl,
            });
            continue;
          }
        } else {
          // Cached as no email, skip
          skippedCached++;
          report.push({ placeId: candidate.placeId, name: candidate.name, outcome: 'CACHED_NO_EMAIL' });
          continue;
        }
      }

      // Get details
      const details = await getPlaceDetails(apiKey, candidate.placeId);
      scanned++;

      if (!details?.website) {
        skippedNoWebsite++;
        report.push({ placeId: candidate.placeId, name: candidate.name, outcome: 'NO_WEBSITE' });
        await setScanCache(db, candidate.placeId, { placeId: candidate.placeId, result: 'no_website' });
        continue;
      }

      // Extract email
      const emailResult = await extractEmail(details.website);

      if (!emailResult.emailFound || !emailResult.email) {
        skippedNoEmail++;
        report.push({ placeId: candidate.placeId, name: candidate.name, website: details.website, outcome: 'NO_EMAIL' });
        
        // Cache the failure
        try {
          const host = new URL(details.website).hostname.replace(/^www\./, '');
          await setScanCache(db, candidate.placeId, { 
            placeId: candidate.placeId, 
            websiteHost: host,
            result: 'no_email' 
          });
        } catch {}
        continue;
      }

      // Create lead with email
      await createLead(db, {
        businessName: candidate.name,
        categoryKey,
        leadType,
        city,
        address: details.formattedAddress,
        website: details.website,
        phone: details.phone,
        email: emailResult.email,
        emailSourceUrl: emailResult.emailSourceUrl,
        emailConfidence: emailResult.confidence,
        rating: candidate.rating,
        reviewCount: candidate.userRatingCount,
        placeId: candidate.placeId,
      }, adminEmail);

      // Cache success
      try {
        const host = new URL(details.website).hostname.replace(/^www\./, '');
        await setScanCache(db, candidate.placeId, {
          placeId: candidate.placeId,
          websiteHost: host,
          result: 'email_found',
          email: emailResult.email,
          emailSourceUrl: emailResult.emailSourceUrl,
          confidence: emailResult.confidence,
        });
      } catch {}

      created++;
      report.push({
        placeId: candidate.placeId,
        name: candidate.name,
        website: details.website,
        outcome: 'CREATED',
        email: emailResult.email,
        emailSourceUrl: emailResult.emailSourceUrl,
      });

      // Small delay between candidates to be gentle
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`[import] Complete: created=${created}, scanned=${scanned}, skipped=${skippedNoWebsite + skippedNoEmail + skippedDedupe + skippedCached}`);

    res.status(200).json({
      success: true,
      created,
      scanned,
      skippedNoWebsite,
      skippedNoEmail,
      skippedDedupe,
      skippedCached,
      stoppedReason,
      report,
    } as ImportResponse);

  } catch (error: any) {
    console.error('[import] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Import failed',
      created: 0,
      scanned: 0,
      skippedNoWebsite: 0,
      skippedNoEmail: 0,
      skippedDedupe: 0,
      skippedCached: 0,
      stoppedReason: 'error',
      report: [],
    });
  }
}

