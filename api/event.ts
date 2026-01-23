/**
 * Event Share Metadata (Open Graph)
 *
 * GET /event/:id (via vercel.json rewrite for crawlers)
 * Returns HTML with per-event meta tags for social previews.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminFirestore } from './_lib/firebaseAdmin.js';

const SITE_URL = 'https://gopopera.ca';
const DEFAULT_OG_IMAGE = `${SITE_URL}/2.jpg`;
const DEFAULT_TITLE = 'Popera — Small in-person experiences, hosted by people near you';
const DEFAULT_DESCRIPTION = 'Join intimate 3–50 person circles in your neighborhood to cook, create, learn, and connect — or host your own and earn from what you know.';

function toAbsoluteUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const eventIdParam = Array.isArray(req.query.eventId) ? req.query.eventId[0] : req.query.eventId;
  const fallbackIdParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const eventId = (eventIdParam || fallbackIdParam || '').toString().trim();

  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESCRIPTION;
  let ogImage = DEFAULT_OG_IMAGE;
  let eventUrl = SITE_URL;

  if (eventId) {
    eventUrl = `${SITE_URL}/event/${eventId}`;
    try {
      const db = getAdminFirestore();
      if (db) {
        const doc = await db.collection('events').doc(eventId).get();
        if (doc.exists) {
          const data = doc.data() || {};
          const eventTitle = (data.title || '').toString().trim();
          const city = (data.city || '').toString().trim();
          const dateText = formatDate((data.date || '').toString());
          const summary = [dateText, city].filter(Boolean).join(' • ');
          const shortDescription = (data.shortDescription || '').toString().trim();
          const rawDescription = summary || shortDescription || (data.description || '').toString().trim();
          const coverImageUrl =
            (data.coverImageUrl || '').toString().trim() ||
            (Array.isArray(data.imageUrls) && data.imageUrls.length > 0 ? String(data.imageUrls[0]) : '') ||
            (data.imageUrl || '').toString().trim();

          title = eventTitle ? eventTitle : DEFAULT_TITLE;
          description = rawDescription ? rawDescription : DEFAULT_DESCRIPTION;
          ogImage = coverImageUrl ? toAbsoluteUrl(coverImageUrl) : DEFAULT_OG_IMAGE;
        }
      }
    } catch (error) {
      console.error('[event-meta] Error fetching event:', error);
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(eventUrl)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(eventUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta property="og:site_name" content="Popera" />
    <meta property="og:locale" content="en_CA" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${escapeHtml(eventUrl)}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  </head>
  <body>
    <p>Loading event…</p>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  return res.status(200).send(html);
}

