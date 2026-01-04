/**
 * Sitemap XML Generator
 * 
 * GET /sitemap.xml (via vercel.json rewrite)
 * Returns XML sitemap with:
 * - Static pages: /, /blog
 * - Dynamic: all published blog posts from blog_posts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminFirestore } from './_lib/firebaseAdmin.js';

const SITE_URL = 'https://gopopera.ca';

interface BlogPost {
    slug: string;
    publishedAt: number;
    updatedAt: number;
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
        if (!db) {
            return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Firebase not configured</error>');
        }
        const postsRef = db.collection('blog_posts');
        const snapshot = await postsRef.orderBy('publishedAt', 'desc').get();

        const posts: BlogPost[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.slug) {
                posts.push({
                    slug: data.slug,
                    publishedAt: data.publishedAt || Date.now(),
                    updatedAt: data.updatedAt || data.publishedAt || Date.now(),
                });
            }
        });

        const now = new Date().toISOString().split('T')[0];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

        for (const post of posts) {
            const lastmod = new Date(post.updatedAt).toISOString().split('T')[0];
            xml += `
  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        }

        xml += `
</urlset>`;

        return res.status(200).send(xml);

    } catch (error: any) {
        console.error('[sitemap] Error:', error);
        return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Internal server error</error>');
    }
}
