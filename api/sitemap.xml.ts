/**
 * Dynamic Sitemap Generator for Popera Events
 * 
 * Generates sitemap.xml with all public, non-demo, non-draft events.
 * Uses Firestore REST API (Edge-compatible, no firebase-admin/gRPC issues).
 * 
 * URL: /api/sitemap.xml
 * 
 * Env vars (optional, for project resolution):
 *   FIREBASE_PROJECT_ID - Firebase project ID
 *   FIREBASE_SERVICE_ACCOUNT - JSON string (project_id extracted if FIREBASE_PROJECT_ID not set)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'edge',
};

// Default project ID fallback
const DEFAULT_PROJECT_ID = 'gopopera2026';

// Get project ID from environment
function getProjectId(): string {
  // Priority 1: Explicit FIREBASE_PROJECT_ID
  if (process.env.FIREBASE_PROJECT_ID) {
    return process.env.FIREBASE_PROJECT_ID.trim();
  }
  
  // Priority 2: Extract from FIREBASE_SERVICE_ACCOUNT JSON
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      if (parsed.project_id) {
        return parsed.project_id.trim();
      }
    } catch {
      // Fall through to default
    }
  }
  
  // Priority 3: Default
  return DEFAULT_PROJECT_ID;
}

// Escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Build empty sitemap with optional comment
function emptySitemap(comment?: string): string {
  const commentLine = comment ? `\n  <!-- ${escapeXml(comment)} -->` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${commentLine}
</urlset>`;
}

// Parse Firestore REST API document fields
interface FirestoreFields {
  [key: string]: {
    stringValue?: string;
    booleanValue?: boolean;
    integerValue?: string;
    timestampValue?: string;
    nullValue?: null;
  };
}

interface FirestoreDocument {
  name: string;
  fields?: FirestoreFields;
  createTime?: string;
  updateTime?: string;
}

interface FirestoreListResponse {
  documents?: FirestoreDocument[];
  nextPageToken?: string;
}

// Extract boolean field value (handles missing = undefined)
function getBooleanField(fields: FirestoreFields | undefined, key: string): boolean | undefined {
  if (!fields || !fields[key]) return undefined;
  return fields[key].booleanValue;
}

// Extract document ID from Firestore REST API document name
function getDocId(docName: string): string {
  // Format: projects/{project}/databases/(default)/documents/events/{docId}
  const parts = docName.split('/');
  return parts[parts.length - 1] || '';
}

// Format ISO timestamp to YYYY-MM-DD
function formatDate(isoString: string | undefined): string {
  if (!isoString) {
    return new Date().toISOString().split('T')[0];
  }
  try {
    return new Date(isoString).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export default async function handler(request: Request) {
  const projectId = getProjectId();
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/events`;
  
  console.log('[SITEMAP] Starting sitemap generation for project:', projectId);

  try {
    const events: Array<{ id: string; lastmod: string }> = [];
    let pageToken: string | undefined;
    const pageSize = 300;
    let totalDocs = 0;
    let filteredOut = { isPublicFalse: 0, isDraftTrue: 0, isDemoTrue: 0 };
    let fetchErrors: string[] = [];

    // Paginate through all events
    do {
      const url = new URL(baseUrl);
      url.searchParams.set('pageSize', String(pageSize));
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const status = response.status;
        let errorBody = '';
        try {
          errorBody = await response.text();
          errorBody = errorBody.substring(0, 200); // Truncate for safety
        } catch {}
        
        const errorMsg = `Firestore API error: HTTP ${status}. Project: ${projectId}. ${errorBody}`;
        console.error('[SITEMAP]', errorMsg);
        fetchErrors.push(`HTTP ${status}`);
        
        // Return helpful error sitemap
        return new Response(emptySitemap(errorMsg), {
          status: 200,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=300', // Shorter cache on error
          },
        });
      }

      const data: FirestoreListResponse = await response.json();

      if (data.documents) {
        for (const doc of data.documents) {
          totalDocs++;
          const fields = doc.fields;
          
          // Filter per store logic:
          // - Exclude if isPublic === false (missing = public)
          // - Exclude if isDraft === true
          // - Exclude if isDemo === true
          const isPublic = getBooleanField(fields, 'isPublic');
          const isDraft = getBooleanField(fields, 'isDraft');
          const isDemo = getBooleanField(fields, 'isDemo');

          if (isPublic === false) {
            filteredOut.isPublicFalse++;
            continue;
          }
          if (isDraft === true) {
            filteredOut.isDraftTrue++;
            continue;
          }
          if (isDemo === true) {
            filteredOut.isDemoTrue++;
            continue;
          }

          const docId = getDocId(doc.name);
          if (!docId) continue;

          // Get lastmod from updateTime or createTime
          const lastmod = formatDate(doc.updateTime || doc.createTime);

          events.push({ id: docId, lastmod });
        }
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    console.log('[SITEMAP] Stats:', {
      projectId,
      totalDocs,
      included: events.length,
      filteredOut
    });

    // If no events after filtering, explain why
    if (events.length === 0) {
      const reason = totalDocs === 0 
        ? `No events found in Firestore for project ${projectId}`
        : `0 events after filtering (total: ${totalDocs}, filtered: isPublic=false: ${filteredOut.isPublicFalse}, isDraft=true: ${filteredOut.isDraftTrue}, isDemo=true: ${filteredOut.isDemoTrue})`;
      
      return new Response(emptySitemap(reason), {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      });
    }

    // Generate sitemap XML
    const urlEntries = events.map(event => 
      `  <url>
    <loc>https://gopopera.ca/event/${escapeXml(event.id)}</loc>
    <lastmod>${event.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
    ).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <!-- Dynamic event sitemap for Popera -->
  <!-- Project: ${projectId} -->
  <!-- Generated: ${new Date().toISOString()} -->
  <!-- Total events: ${events.length} (from ${totalDocs} docs, filtered ${totalDocs - events.length}) -->
${urlEntries}
</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    console.error('[SITEMAP] Error:', errorMessage);
    
    return new Response(emptySitemap(`Error generating sitemap: ${errorMessage}`), {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  }
}
