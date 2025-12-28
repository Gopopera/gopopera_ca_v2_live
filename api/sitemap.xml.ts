/**
 * Dynamic Sitemap Generator for Popera Events
 * 
 * Generates sitemap.xml with all public, non-demo, non-draft events.
 * Uses firebase-admin with service account from environment variable.
 * 
 * URL: /api/sitemap.xml
 * 
 * Required env var:
 *   FIREBASE_SERVICE_ACCOUNT = JSON string of service account credentials
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

// Initialize Firebase Admin with service account from env var
function getFirestoreDb(): admin.firestore.Firestore | null {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    console.error('[SITEMAP] FIREBASE_SERVICE_ACCOUNT env var not set');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    // Handle escaped newlines in private_key
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return admin.firestore();
  } catch (error) {
    console.error('[SITEMAP] Failed to initialize Firebase Admin:', error);
    return null;
  }
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

// Format timestamp to YYYY-MM-DD
function formatDate(timestamp: number | admin.firestore.Timestamp | undefined): string {
  if (!timestamp) {
    return new Date().toISOString().split('T')[0];
  }
  try {
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp) 
      : timestamp.toDate();
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

interface EventDoc {
  id: string;
  isPublic?: boolean;
  isDraft?: boolean;
  isDemo?: boolean;
  updatedAt?: number | admin.firestore.Timestamp;
  createdAt?: number | admin.firestore.Timestamp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set headers early for consistent response
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

  const emptyResponse = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

  try {
    const db = getFirestoreDb();
    if (!db) {
      console.error('[SITEMAP] No Firestore connection');
      return res.status(200).send(emptyResponse);
    }

    const events: Array<{ id: string; lastmod: string }> = [];
    const pageSize = 500;
    let lastDocId: string | null = null;

    // Paginate through all events using documentId ordering
    while (true) {
      let query = db.collection('events')
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(pageSize);

      if (lastDocId) {
        query = query.startAfter(lastDocId);
      }

      const snapshot = await query.get();

      if (snapshot.empty) {
        break;
      }

      for (const doc of snapshot.docs) {
        const data = doc.data() as EventDoc;

        // Filter per store logic:
        // - Exclude if isPublic === false (explicitly private)
        // - Exclude if isDraft === true
        // - Exclude if isDemo === true
        if (data.isPublic === false) continue;
        if (data.isDraft === true) continue;
        if (data.isDemo === true) continue;

        // Get lastmod from updatedAt, createdAt, or doc metadata
        let lastmod: string;
        if (data.updatedAt) {
          lastmod = formatDate(data.updatedAt);
        } else if (data.createdAt) {
          lastmod = formatDate(data.createdAt);
        } else if (doc.updateTime) {
          lastmod = doc.updateTime.toDate().toISOString().split('T')[0];
        } else {
          lastmod = new Date().toISOString().split('T')[0];
        }

        events.push({ id: doc.id, lastmod });
      }

      // Update lastDocId for next page
      lastDocId = snapshot.docs[snapshot.docs.length - 1].id;

      // If we got fewer than pageSize, we've reached the end
      if (snapshot.docs.length < pageSize) {
        break;
      }
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
  <!-- Generated: ${new Date().toISOString()} -->
  <!-- Total events: ${events.length} -->
${urlEntries}
</urlset>`;

    return res.status(200).send(sitemap);

  } catch (error) {
    console.error('[SITEMAP] Error generating sitemap:', error);
    return res.status(200).send(emptyResponse);
  }
}

