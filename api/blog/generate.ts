/**
 * Blog Draft Generation API
 *
 * POST /api/blog/generate
 * Input: { topics: Array<{ title: string; context?: string }>, variants?: number }
 * Output: { success: true, drafts: Array<Partial<BlogDraft>> }
 *
 * - Node serverless (not Edge)
 * - Requires admin auth
 * - Uses OpenAI gpt-4o-mini via HTTP fetch
 * - Returns draft payloads (client saves to Firestore)
 */

import { verifyAdminToken } from '../_lib/firebaseAdmin.js';

// ============================================
// Types
// ============================================

interface TopicInput {
    title: string;
    context?: string;
}

interface GenerateRequest {
    topics: TopicInput[];
    variants?: number;
}

interface DraftPayload {
    title: string;
    slug: string;
    excerpt: string;
    metaTitle: string;
    metaDescription: string;
    contentHtml: string;
    tags: string[];
    status: 'draft';
    createdAt: number;
    updatedAt: number;
    topicId?: string;
    variantLabel?: string;
}

// ============================================
// Utilities
// ============================================

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Sanitize HTML by stripping dangerous tags and attributes
 */
function sanitizeHtml(html: string): string {
    let clean = html;

    // Remove dangerous tags (with content)
    const dangerousTags = ['script', 'iframe', 'object', 'embed', 'svg', 'link', 'style'];
    for (const tag of dangerousTags) {
        const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
        clean = clean.replace(regex, '');
        // Also remove self-closing versions
        const selfClosing = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
        clean = clean.replace(selfClosing, '');
    }

    // Remove all on* event handler attributes
    clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');

    // Remove javascript: and data: URLs from href/src (except data:image for inline images)
    clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
    clean = clean.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');
    clean = clean.replace(/href\s*=\s*["']data:(?!image\/)[^"']*["']/gi, 'href="#"');
    clean = clean.replace(/src\s*=\s*["']data:(?!image\/)[^"']*["']/gi, 'src=""');

    return clean;
}

/**
 * Call OpenAI API via HTTP fetch
 */
async function callOpenAI(
    apiKey: string,
    systemPrompt: string,
    userPrompt: string
): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: 2000,
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
}

// ============================================
// Main Handler
// ============================================

export default async function handler(req: any, res: any) {
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
    const authResult = await verifyAdminToken(req.headers.authorization);
    if (!authResult.success) {
        console.error('[blog/generate] Admin verification FAILED');
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Check OpenAI API key
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
        return res.status(500).json({ success: false, error: 'OPENAI_API_KEY is missing' });
    }

    try {
        const { topics, variants = 2 }: GenerateRequest = req.body || {};

        if (!Array.isArray(topics) || topics.length === 0) {
            return res.status(400).json({ success: false, error: 'topics array is required' });
        }

        if (topics.length > 10) {
            return res.status(400).json({ success: false, error: 'Maximum 10 topics per request' });
        }

        const drafts: DraftPayload[] = [];
        const now = Date.now();

        const systemPrompt = `You are a content writer for Popera, a platform for small in-person community experiences called "Circles" (3-10 seats each). 

Your job is to write engaging, educational blog posts that:
1. Provide valuable tips and insights for people who want to host or attend small gatherings
2. Include at least ONE specific Popera Circle example (make it realistic but fictional)
3. End with a call-to-action encouraging readers to host or join a Circle on Popera
4. Use a warm, friendly, conversational tone
5. Are SEO-optimized with proper heading structure (H2, H3)

Output format: Return ONLY valid JSON with these fields:
{
  "title": "Engaging blog post title",
  "excerpt": "2-3 sentence summary for preview cards",
  "metaTitle": "SEO title (max 60 chars)",
  "metaDescription": "SEO description (max 160 chars)",
  "tags": ["tag1", "tag2", "tag3"],
  "contentHtml": "<h2>Opening...</h2><p>Content...</p>..."
}

Write the contentHtml as proper HTML with <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags only. No markdown.`;

        for (const topic of topics) {
            const topicId = `topic_${now}_${Math.random().toString(36).substring(2, 8)}`;

            for (let v = 0; v < variants; v++) {
                const variantLabel = String.fromCharCode(65 + v); // A, B, C...
                const userPrompt = `Write a blog post about: "${topic.title}"${topic.context ? `\n\nAdditional context: ${topic.context}` : ''}

This is variant ${variantLabel}. Make it unique and different from other variants.`;

                try {
                    const rawResponse = await callOpenAI(OPENAI_API_KEY, systemPrompt, userPrompt);

                    // Parse JSON from response (handle potential markdown code blocks)
                    let jsonStr = rawResponse;
                    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
                    if (jsonMatch) {
                        jsonStr = jsonMatch[1];
                    }

                    const parsed = JSON.parse(jsonStr);

                    const draft: DraftPayload = {
                        title: parsed.title || topic.title,
                        slug: generateSlug(parsed.title || topic.title) + `-${variantLabel.toLowerCase()}`,
                        excerpt: parsed.excerpt || '',
                        metaTitle: parsed.metaTitle || parsed.title || topic.title,
                        metaDescription: parsed.metaDescription || parsed.excerpt || '',
                        contentHtml: sanitizeHtml(parsed.contentHtml || ''),
                        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
                        status: 'draft',
                        createdAt: now,
                        updatedAt: now,
                        topicId,
                        variantLabel,
                    };

                    drafts.push(draft);
                } catch (parseError: any) {
                    console.error(`[blog/generate] Failed to generate variant ${variantLabel} for topic "${topic.title}":`, parseError.message);
                    // Continue with other topics/variants
                }
            }
        }

        if (drafts.length === 0) {
            return res.status(500).json({ success: false, error: 'Failed to generate any drafts' });
        }

        return res.status(200).json({ success: true, drafts });
    } catch (error: any) {
        console.error('[blog/generate] Error:', error.message);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
}
