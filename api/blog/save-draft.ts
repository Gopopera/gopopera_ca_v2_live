/**
 * Blog Save Draft API
 *
 * POST /api/blog/save-draft
 * Input: { draft: DraftPayload, draftId?: string }
 * Output: { success: true, draftId: string }
 *
 * - Node serverless (not Edge)
 * - Requires admin auth
 * - Creates new or updates existing draft in blog_drafts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminToken, getAdminFirestore } from '../_lib/firebaseAdmin.js';

// ============================================
// Types
// ============================================

interface DraftPayload {
    slug: string;
    title: string;
    metaTitle?: string;
    metaDescription?: string;
    excerpt?: string;
    contentHtml: string;
    heroImageUrl?: string;
    heroImageAlt?: string;
    tags?: string[];
    status?: string;
    topicId?: string;
    variantLabel?: string;
    sourceUrl?: string;
    attribution?: string;
    canonicalUrl?: string;
}

interface SaveDraftRequest {
    draft: DraftPayload;
    draftId?: string; // If provided, update existing; else create new
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
        console.error('[blog/save-draft] Auth failed');
        return res.status(403).json({
            success: false,
            error: 'Forbidden',
        });
    }

    try {
        const body = req.body as SaveDraftRequest;

        if (!body.draft || !body.draft.title || !body.draft.slug) {
            return res.status(400).json({ success: false, error: 'Draft with title and slug is required' });
        }

        const db = getAdminFirestore();
        if (!db) {
            return res.status(500).json({ success: false, error: 'Firebase not configured' });
        }
        const draftsRef = db.collection('blog_drafts');
        const now = Date.now();

        const draftData = {
            slug: body.draft.slug,
            title: body.draft.title,
            metaTitle: body.draft.metaTitle || body.draft.title,
            metaDescription: body.draft.metaDescription || '',
            excerpt: body.draft.excerpt || '',
            contentHtml: body.draft.contentHtml || '',
            heroImageUrl: body.draft.heroImageUrl || null,
            heroImageAlt: body.draft.heroImageAlt || null,
            tags: body.draft.tags || [],
            status: body.draft.status || 'draft',
            topicId: body.draft.topicId || null,
            variantLabel: body.draft.variantLabel || null,
            sourceUrl: body.draft.sourceUrl || null,
            attribution: body.draft.attribution || null,
            canonicalUrl: body.draft.canonicalUrl || null,
            updatedAt: now,
        };

        let draftId: string;

        if (body.draftId) {
            // Update existing draft
            await draftsRef.doc(body.draftId).update(draftData);
            draftId = body.draftId;
            console.log('[blog/save-draft] Updated draft:', draftId);
        } else {
            // Create new draft
            const newDraftRef = await draftsRef.add({
                ...draftData,
                createdAt: now,
            });
            draftId = newDraftRef.id;
            console.log('[blog/save-draft] Created draft:', draftId);
        }

        return res.status(200).json({
            success: true,
            draftId,
        });

    } catch (error: any) {
        console.error('[blog/save-draft] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
}
