/**
 * Blog Firestore Operations
 * 
 * Client-side CRUD for blog_posts, blog_drafts, blog_topics collections.
 * Uses numeric timestamps (Date.now()) for all date fields.
 * 
 * Collections:
 * - blog_posts: Published posts (public read, admin write)
 * - blog_drafts: Draft posts (admin only)
 * - blog_topics: Topic queue for generation (admin only)
 */

import { getDbSafe } from '../src/lib/firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    writeBatch,
} from 'firebase/firestore';
import type { BlogPost, BlogDraft, BlogTopic } from './types';

// ============================================
// Published Posts (blog_posts)
// ============================================

/**
 * List published blog posts, ordered by publishedAt descending
 * @param maxResults - Maximum number of posts to return (default: 50)
 */
export async function listPublishedPosts(maxResults: number = 50): Promise<BlogPost[]> {
    const db = getDbSafe();
    if (!db) {
        console.warn('[blog] No Firestore instance available');
        return [];
    }

    try {
        const postsRef = collection(db, 'blog_posts');
        const q = query(
            postsRef,
            orderBy('publishedAt', 'desc'),
            firestoreLimit(maxResults)
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as Omit<BlogPost, 'id'>;
            return { id: docSnap.id, ...data };
        });
    } catch (error) {
        console.error('[blog] Error listing published posts:', error);
        return [];
    }
}

/**
 * Get a published blog post by its slug
 * @param slug - URL-friendly slug identifier
 */
export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
    const db = getDbSafe();
    if (!db) {
        console.warn('[blog] No Firestore instance available');
        return null;
    }

    try {
        const postsRef = collection(db, 'blog_posts');
        const q = query(postsRef, where('slug', '==', slug), firestoreLimit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const docSnap = snapshot.docs[0];
        const data = docSnap.data() as Omit<BlogPost, 'id'>;
        return { id: docSnap.id, ...data };
    } catch (error) {
        console.error('[blog] Error fetching post by slug:', error);
        return null;
    }
}

// ============================================
// Drafts (blog_drafts) - Admin Only
// ============================================

/**
 * List blog drafts, optionally filtered by status
 * @param status - Optional status filter
 * @param maxResults - Maximum number of drafts to return (default: 100)
 */
export async function listDrafts(
    status?: BlogDraft['status'],
    maxResults: number = 100
): Promise<BlogDraft[]> {
    const db = getDbSafe();
    if (!db) {
        console.warn('[blog] No Firestore instance available');
        return [];
    }

    try {
        const draftsRef = collection(db, 'blog_drafts');
        let q;

        if (status) {
            q = query(
                draftsRef,
                where('status', '==', status),
                orderBy('updatedAt', 'desc'),
                firestoreLimit(maxResults)
            );
        } else {
            q = query(
                draftsRef,
                orderBy('updatedAt', 'desc'),
                firestoreLimit(maxResults)
            );
        }

        const snapshot = await getDocs(q);

        return snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as Omit<BlogDraft, 'id'>;
            return { id: docSnap.id, ...data };
        });
    } catch (error) {
        console.error('[blog] Error listing drafts:', error);
        return [];
    }
}

/**
 * Get a single draft by ID
 * @param draftId - Draft document ID
 */
export async function getDraftById(draftId: string): Promise<BlogDraft | null> {
    const db = getDbSafe();
    if (!db) {
        console.warn('[blog] No Firestore instance available');
        return null;
    }

    try {
        const draftRef = doc(db, 'blog_drafts', draftId);
        const docSnap = await getDoc(draftRef);

        if (!docSnap.exists()) {
            return null;
        }

        const data = docSnap.data() as Omit<BlogDraft, 'id'>;
        return { id: docSnap.id, ...data };
    } catch (error) {
        console.error('[blog] Error fetching draft:', error);
        return null;
    }
}

/**
 * Create multiple drafts in a batch
 * @param drafts - Array of draft objects (without ID)
 * @returns Array of created draft IDs
 */
export async function createDraftsBatch(
    drafts: Omit<BlogDraft, 'id'>[]
): Promise<string[]> {
    const db = getDbSafe();
    if (!db) {
        throw new Error('No Firestore instance available');
    }

    const batch = writeBatch(db);
    const draftIds: string[] = [];
    const draftsRef = collection(db, 'blog_drafts');
    const now = Date.now();

    for (const draft of drafts) {
        const docRef = doc(draftsRef);
        draftIds.push(docRef.id);

        batch.set(docRef, {
            ...draft,
            createdAt: draft.createdAt || now,
            updatedAt: now,
        });
    }

    await batch.commit();
    console.log('[blog] Created', draftIds.length, 'drafts');

    return draftIds;
}

/**
 * Create a single draft
 * @param draft - Draft object (without ID)
 * @returns Created draft ID
 */
export async function createDraft(
    draft: Omit<BlogDraft, 'id'>
): Promise<string> {
    const db = getDbSafe();
    if (!db) {
        throw new Error('No Firestore instance available');
    }

    const now = Date.now();
    const draftsRef = collection(db, 'blog_drafts');

    const docRef = await addDoc(draftsRef, {
        ...draft,
        createdAt: draft.createdAt || now,
        updatedAt: now,
    });

    console.log('[blog] Created draft:', docRef.id);
    return docRef.id;
}

/**
 * Update an existing draft
 * @param draftId - Draft document ID
 * @param data - Partial draft data to update
 */
export async function updateDraft(
    draftId: string,
    data: Partial<Omit<BlogDraft, 'id'>>
): Promise<void> {
    const db = getDbSafe();
    if (!db) {
        throw new Error('No Firestore instance available');
    }

    const draftRef = doc(db, 'blog_drafts', draftId);

    await updateDoc(draftRef, {
        ...data,
        updatedAt: Date.now(),
    });

    console.log('[blog] Updated draft:', draftId);
}

/**
 * Delete a draft
 * @param draftId - Draft document ID
 */
export async function deleteDraft(draftId: string): Promise<void> {
    const db = getDbSafe();
    if (!db) {
        throw new Error('No Firestore instance available');
    }

    const draftRef = doc(db, 'blog_drafts', draftId);
    await deleteDoc(draftRef);

    console.log('[blog] Deleted draft:', draftId);
}

/**
 * Publish a draft to blog_posts
 * Creates or updates the corresponding blog post document.
 * 
 * @param draftId - Draft document ID to publish
 * @returns Created/updated blog post ID
 */
export async function publishDraft(draftId: string): Promise<string> {
    const db = getDbSafe();
    if (!db) {
        throw new Error('No Firestore instance available');
    }

    // Fetch the draft
    const draft = await getDraftById(draftId);
    if (!draft) {
        throw new Error(`Draft not found: ${draftId}`);
    }

    const now = Date.now();
    const postsRef = collection(db, 'blog_posts');

    // Check if a post with this slug already exists
    const existingQuery = query(
        postsRef,
        where('slug', '==', draft.slug),
        firestoreLimit(1)
    );
    const existingSnapshot = await getDocs(existingQuery);

    let postId: string;

    if (!existingSnapshot.empty) {
        // Update existing post
        postId = existingSnapshot.docs[0].id;
        const postRef = doc(db, 'blog_posts', postId);

        await updateDoc(postRef, {
            slug: draft.slug,
            title: draft.title,
            metaTitle: draft.metaTitle,
            metaDescription: draft.metaDescription,
            excerpt: draft.excerpt,
            contentHtml: draft.contentHtml,
            heroImageUrl: draft.heroImageUrl || null,
            heroImageAlt: draft.heroImageAlt || null,
            tags: draft.tags || [],
            updatedAt: now,
            canonicalUrl: draft.canonicalUrl || null,
            sourceUrl: draft.sourceUrl || null,
            attribution: draft.attribution || null,
        });

        console.log('[blog] Updated existing post:', postId);
    } else {
        // Create new post
        const docRef = await addDoc(postsRef, {
            slug: draft.slug,
            title: draft.title,
            metaTitle: draft.metaTitle,
            metaDescription: draft.metaDescription,
            excerpt: draft.excerpt,
            contentHtml: draft.contentHtml,
            heroImageUrl: draft.heroImageUrl || null,
            heroImageAlt: draft.heroImageAlt || null,
            tags: draft.tags || [],
            publishedAt: now,
            updatedAt: now,
            canonicalUrl: draft.canonicalUrl || null,
            sourceUrl: draft.sourceUrl || null,
            attribution: draft.attribution || null,
        });

        postId = docRef.id;
        console.log('[blog] Created new post:', postId);
    }

    // Update draft status to approved
    await updateDraft(draftId, { status: 'approved' });

    return postId;
}

// ============================================
// Topics (blog_topics) - Admin Only
// ============================================

/**
 * List blog topics, ordered by createdAt descending
 * @param maxResults - Maximum number of topics to return (default: 50)
 */
export async function listTopics(maxResults: number = 50): Promise<BlogTopic[]> {
    const db = getDbSafe();
    if (!db) {
        console.warn('[blog] No Firestore instance available');
        return [];
    }

    try {
        const topicsRef = collection(db, 'blog_topics');
        const q = query(
            topicsRef,
            orderBy('createdAt', 'desc'),
            firestoreLimit(maxResults)
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as Omit<BlogTopic, 'id'>;
            return { id: docSnap.id, ...data };
        });
    } catch (error) {
        console.error('[blog] Error listing topics:', error);
        return [];
    }
}

/**
 * Create a topic
 * @param topic - Topic object (without ID)
 * @returns Created topic ID
 */
export async function createTopic(
    topic: Omit<BlogTopic, 'id'>
): Promise<string> {
    const db = getDbSafe();
    if (!db) {
        throw new Error('No Firestore instance available');
    }

    const now = Date.now();
    const topicsRef = collection(db, 'blog_topics');

    const docRef = await addDoc(topicsRef, {
        ...topic,
        createdAt: topic.createdAt || now,
        updatedAt: now,
    });

    console.log('[blog] Created topic:', docRef.id);
    return docRef.id;
}

/**
 * Update a topic
 * @param topicId - Topic document ID
 * @param data - Partial topic data to update
 */
export async function updateTopic(
    topicId: string,
    data: Partial<Omit<BlogTopic, 'id'>>
): Promise<void> {
    const db = getDbSafe();
    if (!db) {
        throw new Error('No Firestore instance available');
    }

    const topicRef = doc(db, 'blog_topics', topicId);

    await updateDoc(topicRef, {
        ...data,
        updatedAt: Date.now(),
    });

    console.log('[blog] Updated topic:', topicId);
}

/**
 * Delete a topic
 * @param topicId - Topic document ID
 */
export async function deleteTopic(topicId: string): Promise<void> {
    const db = getDbSafe();
    if (!db) {
        throw new Error('No Firestore instance available');
    }

    const topicRef = doc(db, 'blog_topics', topicId);
    await deleteDoc(topicRef);

    console.log('[blog] Deleted topic:', topicId);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a URL-friendly slug from a title
 * @param title - Original title string
 * @returns Slugified string
 */
export function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove non-word chars (except spaces and hyphens)
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/-+/g, '-')      // Replace multiple hyphens with single
        .replace(/^-|-$/g, '');   // Remove leading/trailing hyphens
}

/**
 * Check if a slug is already in use
 * @param slug - Slug to check
 * @param excludeDraftId - Optional draft ID to exclude from check
 * @returns true if slug exists in blog_posts or blog_drafts
 */
export async function isSlugTaken(
    slug: string,
    excludeDraftId?: string
): Promise<boolean> {
    const db = getDbSafe();
    if (!db) return false;

    // Check blog_posts
    const postsQuery = query(
        collection(db, 'blog_posts'),
        where('slug', '==', slug),
        firestoreLimit(1)
    );
    const postsSnapshot = await getDocs(postsQuery);
    if (!postsSnapshot.empty) return true;

    // Check blog_drafts
    const draftsQuery = query(
        collection(db, 'blog_drafts'),
        where('slug', '==', slug),
        firestoreLimit(1)
    );
    const draftsSnapshot = await getDocs(draftsQuery);

    if (!draftsSnapshot.empty) {
        // If we're excluding a draft ID, check if this is that draft
        if (excludeDraftId && draftsSnapshot.docs[0].id === excludeDraftId) {
            return false;
        }
        return true;
    }

    return false;
}
