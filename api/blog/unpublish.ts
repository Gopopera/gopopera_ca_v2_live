/**
 * Blog Unpublish API
 *
 * POST /api/blog/unpublish
 * Input: { postId: string } OR { slug: string }
 * Output: { success: true, postId: string }
 *
 * - Node serverless (not Edge)
 * - Requires admin auth
 * - Deletes post from blog_posts (or archives - configurable)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminToken, getAdminFirestore } from '../_lib/firebaseAdmin.js';

// ============================================
// Types
// ============================================

interface UnpublishRequest {
    postId?: string;
    slug?: string;
    archive?: boolean; // If true, move to blog_archive instead of delete
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
        console.error('[blog/unpublish] Auth failed');
        return res.status(403).json({
            success: false,
            error: 'Forbidden',
        });
    }

    try {
        const body = req.body as UnpublishRequest;

        if (!body.postId && !body.slug) {
            return res.status(400).json({ success: false, error: 'Missing postId or slug' });
        }

        const db = getAdminFirestore();
        if (!db) {
            return res.status(500).json({ success: false, error: 'Firebase not configured' });
        }
        const postsRef = db.collection('blog_posts');

        let postId: string;
        let postData: FirebaseFirestore.DocumentData | undefined;

        if (body.postId) {
            // Find by postId
            const postDoc = await postsRef.doc(body.postId).get();
            if (!postDoc.exists) {
                return res.status(404).json({ success: false, error: 'Post not found' });
            }
            postId = body.postId;
            postData = postDoc.data();
        } else if (body.slug) {
            // Find by slug
            const postQuery = await postsRef.where('slug', '==', body.slug).limit(1).get();
            if (postQuery.empty) {
                return res.status(404).json({ success: false, error: 'Post not found' });
            }
            postId = postQuery.docs[0].id;
            postData = postQuery.docs[0].data();
        } else {
            return res.status(400).json({ success: false, error: 'Missing postId or slug' });
        }

        // Archive or delete
        if (body.archive && postData) {
            // Move to archive collection
            const archiveRef = db.collection('blog_archive');
            await archiveRef.doc(postId).set({
                ...postData,
                archivedAt: Date.now(),
            });
            await postsRef.doc(postId).delete();
            console.log('[blog/unpublish] Archived post:', postId);
        } else {
            // Simply delete
            await postsRef.doc(postId).delete();
            console.log('[blog/unpublish] Deleted post:', postId);
        }

        return res.status(200).json({
            success: true,
            postId,
            action: body.archive ? 'archived' : 'deleted',
        });

    } catch (error: any) {
        console.error('[blog/unpublish] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
}
