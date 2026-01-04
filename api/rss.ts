/**
 * RSS Feed Generator
 * 
 * GET /rss.xml (via vercel.json rewrite)
 * Returns RSS 2.0 feed with latest 20 published blog posts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminFirestore } from './_lib/firebaseAdmin.js';

const SITE_URL = 'https://gopopera.ca';

interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    publishedAt: number;
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Set headers for XML
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

    if (req.method !== 'GET') {
        return res.status(405).send('<?xml version="1.0" encoding="UTF-8"?><error>Method not allowed</error>');
    }

    try {
        const db = getAdminFirestore();
        const postsRef = db.collection('blog_posts');
        const snapshot = await postsRef
            .orderBy('publishedAt', 'desc')
            .limit(20)
            .get();

        const posts: BlogPost[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.slug && data.title) {
                posts.push({
                    id: doc.id,
                    slug: data.slug,
                    title: data.title,
                    excerpt: data.excerpt || data.metaDescription || '',
                    publishedAt: data.publishedAt || Date.now(),
                });
            }
        });

        const buildDate = new Date().toUTCString();

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Popera Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Articles and guides for hosting and attending small community experiences on Popera.</description>
    <language>en-ca</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>`;

        for (const post of posts) {
            const pubDate = new Date(post.publishedAt).toUTCString();
            const link = `${SITE_URL}/blog/${post.slug}`;
            xml += `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${link}</guid>
    </item>`;
        }

        xml += `
  </channel>
</rss>`;

        return res.status(200).send(xml);

    } catch (error: any) {
        console.error('[rss] Error:', error);
        return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Internal server error</error>');
    }
}
