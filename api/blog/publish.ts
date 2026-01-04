/**
 * Blog Publish API
 *
 * POST /api/blog/publish
 * Input: { draftId: string } OR { draft: DraftPayload } for unpersisted drafts
 * Output: { success: true, postId: string, slug: string }
 *
 * - Node serverless (not Edge)
 * - Requires admin auth
 * - Creates or updates blog_posts document
 * - Enforces unique slug (appends -2, -3, etc. if needed)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminToken, getAdminFirestore } from '../_lib/firebaseAdmin.js';

// ============================================
// Types
// ============================================

interface DraftPayload {
    slug: string;
    title: string;
    metaTitle: string;
    metaDescription: string;
    excerpt: string;
    contentHtml: string;
    heroImageUrl?: string;
    heroImageAlt?: string;
    tags?: string[];
    sourceUrl?: string;
    attribution?: string;
    canonicalUrl?: string;
}

interface PublishRequest {
    draftId?: string;
    draft?: DraftPayload;
}

// ============================================
// Helpers
// ============================================

/**
 * Generate a unique slug by appending -2, -3, etc. if the base slug exists
 */
async function getUniqueSlug(db: FirebaseFirestore.Firestore, baseSlug: string): Promise<string> {
    const postsRef = db.collection('blog_posts');

    // Check if base slug exists
    const baseCheck = await postsRef.where('slug', '==', baseSlug).limit(1).get();
    if (baseCheck.empty) {
        return baseSlug;
    }

    // Find next available suffix
    let suffix = 2;
    while (suffix < 100) {
        const candidateSlug = `${baseSlug}-${suffix}`;
        const check = await postsRef.where('slug', '==', candidateSlug).limit(1).get();
        if (check.empty) {
            return candidateSlug;
        }
        suffix++;
    }

    // Fallback: append timestamp
    return `${baseSlug}-${Date.now()}`;
}

// ============================================
// Handler
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Verify admin auth
    const authHeader = req.headers.authorization;
    const authResult = await verifyAdminToken(authHeader);

    if (!authResult.success) {
        console.error('[blog/publish] Auth failed');
        return res.status(403).json({
            success: false,
            error: 'Forbidden',
        });
    }

    try {
        const body = req.body as PublishRequest;

        // Validate input
        let draftData: DraftPayload;

        if (body.draftId) {
            // Fetch draft from Firestore
            const db = getAdminFirestore();
            if (!db) {
                return res.status(500).json({ success: false, error: 'Firebase not configured' });
            }
            const draftDoc = await db.collection('blog_drafts').doc(body.draftId).get();
            if (!draftDoc.exists) {
                return res.status(404).json({ success: false, error: 'Draft not found' });
            }
            draftData = draftDoc.data() as DraftPayload;
        } else if (body.draft) {
            // Use provided draft payload (for unpersisted drafts)
            draftData = body.draft;
        } else {
            return res.status(400).json({ success: false, error: 'Missing draftId or draft payload' });
        }

        // Validate required fields
        if (!draftData.slug || !draftData.title || !draftData.contentHtml) {
            return res.status(400).json({ success: false, error: 'Draft missing required fields (slug, title, contentHtml)' });
        }

        const db = getAdminFirestore();
        if (!db) {
            return res.status(500).json({ success: false, error: 'Firebase not configured' });
        }
        const now = Date.now();

        // Get unique slug
        const finalSlug = await getUniqueSlug(db, draftData.slug);

        // Create or update blog_posts document
        const postsRef = db.collection('blog_posts');

        // Check if post with this slug already exists (for republishing)
        const existingPost = await postsRef.where('slug', '==', finalSlug).limit(1).get();

        let postId: string;

        if (!existingPost.empty) {
            // Update existing post
            postId = existingPost.docs[0].id;
            await postsRef.doc(postId).update({
                slug: finalSlug,
                title: draftData.title,
                metaTitle: draftData.metaTitle || draftData.title,
                metaDescription: draftData.metaDescription || draftData.excerpt || '',
                excerpt: draftData.excerpt || '',
                contentHtml: draftData.contentHtml,
                heroImageUrl: draftData.heroImageUrl || null,
                heroImageAlt: draftData.heroImageAlt || null,
                tags: draftData.tags || [],
                sourceUrl: draftData.sourceUrl || null,
                attribution: draftData.attribution || null,
                canonicalUrl: draftData.canonicalUrl || null,
                updatedAt: now,
            });
            console.log('[blog/publish] Updated existing post:', postId);
        } else {
            // Create new post
            const newPostRef = await postsRef.add({
                slug: finalSlug,
                title: draftData.title,
                metaTitle: draftData.metaTitle || draftData.title,
                metaDescription: draftData.metaDescription || draftData.excerpt || '',
                excerpt: draftData.excerpt || '',
                contentHtml: draftData.contentHtml,
                heroImageUrl: draftData.heroImageUrl || null,
                heroImageAlt: draftData.heroImageAlt || null,
                tags: draftData.tags || [],
                sourceUrl: draftData.sourceUrl || null,
                attribution: draftData.attribution || null,
                canonicalUrl: draftData.canonicalUrl || null,
                publishedAt: now,
                updatedAt: now,
            });
            postId = newPostRef.id;
            console.log('[blog/publish] Created new post:', postId);
        }

        // If draftId was provided, update draft status
        if (body.draftId) {
            await db.collection('blog_drafts').doc(body.draftId).update({
                status: 'approved',
                updatedAt: now,
            });
        }

        return res.status(200).json({
            success: true,
            postId,
            slug: finalSlug,
        });

    } catch (error: any) {
        console.error('[blog/publish] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
}
