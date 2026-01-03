/**
 * Blog Import from URL API
 *
 * POST /api/blog/import-url
 * Input: { url: string }
 * Output: { success: true, draft: Partial<BlogDraft> }
 *
 * - Node serverless (not Edge)
 * - Requires admin auth
 * - Fetches URL server-side, extracts text, rewrites as original article
 * - Returns draft payload (client saves to Firestore)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminToken } from '../_lib/firebaseAdmin';

// ============================================
// Types
// ============================================

interface ImportRequest {
    url: string;
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
    sourceUrl: string;
    attribution: string;
    canonicalUrl: string;
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
 * Extract readable text content from HTML
 * Simple heuristic: strip tags, keep paragraph-like content
 */
function extractTextFromHtml(html: string): { title: string; text: string } {
    // First sanitize to remove scripts/styles
    let clean = sanitizeHtml(html);

    // Try to extract title
    let title = '';
    const titleMatch = clean.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
        title = titleMatch[1].trim();
    }
    // Fallback: try h1
    if (!title) {
        const h1Match = clean.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (h1Match) {
            title = h1Match[1].trim();
        }
    }

    // Remove header, nav, footer, aside elements
    const layoutTags = ['header', 'nav', 'footer', 'aside', 'form', 'noscript'];
    for (const tag of layoutTags) {
        const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
        clean = clean.replace(regex, '');
    }

    // Extract text from paragraphs, headers, list items
    const textParts: string[] = [];
    const contentRegex = /<(p|h[1-6]|li|blockquote|td|th|dd|dt)[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;
    while ((match = contentRegex.exec(clean)) !== null) {
        const text = match[2]
            .replace(/<[^>]+>/g, ' ') // Strip remaining tags
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#?\w+;/gi, '') // Remove other entities
            .replace(/\s+/g, ' ')
            .trim();
        if (text.length > 20) {
            textParts.push(text);
        }
    }

    return {
        title: title || 'Untitled Article',
        text: textParts.join('\n\n').substring(0, 8000), // Limit to ~8k chars
    };
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
            max_tokens: 2500,
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

/**
 * Extract domain name from URL for attribution
 */
function getDomainFromUrl(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '');
    } catch {
        return 'source';
    }
}

// ============================================
// Main Handler
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

    if (!authResult || typeof authResult !== 'object' || !('success' in authResult) || authResult.success !== true) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Check OpenAI API key
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
        return res.status(500).json({ success: false, error: 'OPENAI_API_KEY is missing' });
    }

    try {
        const { url }: ImportRequest = req.body || {};

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ success: false, error: 'url is required' });
        }

        // Validate URL format
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('Invalid protocol');
            }
        } catch {
            return res.status(400).json({ success: false, error: 'Invalid URL format' });
        }

        // Fetch the URL
        let htmlContent: string;
        try {
            const fetchResponse = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; PoperaBot/1.0; +https://gopopera.ca)',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
                redirect: 'follow',
            });

            if (!fetchResponse.ok) {
                return res.status(400).json({ success: false, error: `Failed to fetch URL: ${fetchResponse.status}` });
            }

            htmlContent = await fetchResponse.text();
        } catch (fetchError: any) {
            return res.status(400).json({ success: false, error: `Failed to fetch URL: ${fetchError.message}` });
        }

        // Extract readable text
        const { title: originalTitle, text: extractedText } = extractTextFromHtml(htmlContent);

        if (extractedText.length < 100) {
            return res.status(400).json({ success: false, error: 'Could not extract enough content from the URL' });
        }

        const domain = getDomainFromUrl(url);
        const now = Date.now();

        // Rewrite as original article with Popera context
        const systemPrompt = `You are a content writer for Popera, a platform for small in-person community experiences called "Circles" (3-10 seats each).

Your task is to take source material and write an ENTIRELY ORIGINAL article inspired by it. DO NOT COPY any text verbatim from the source. Create fresh, unique content that:

1. Takes the core topic/theme and presents it through the lens of small, intimate gatherings
2. Adds specific advice for people hosting or attending Popera Circles
3. Includes at least ONE fictional but realistic Popera Circle example
4. Ends with a call-to-action to host or join a Circle on Popera
5. Uses a warm, friendly, conversational tone
6. Is SEO-optimized with proper heading structure (H2, H3)

Source attribution must be included in the article.

Output format: Return ONLY valid JSON with these fields:
{
  "title": "New original title (different from source)",
  "excerpt": "2-3 sentence summary for preview cards",
  "metaTitle": "SEO title (max 60 chars)",
  "metaDescription": "SEO description (max 160 chars)",
  "tags": ["tag1", "tag2", "tag3"],
  "contentHtml": "<h2>Opening...</h2><p>Content...</p>...<p><em>Inspired by content from ${domain}.</em></p>"
}

Write the contentHtml as proper HTML with <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags only. No markdown.
The article must be COMPLETELY ORIGINAL - do not copy phrases or sentences from the source.`;

        const userPrompt = `Original article title: "${originalTitle}"
Source URL: ${url}

Extracted content from source:
---
${extractedText.substring(0, 6000)}
---

Write a completely ORIGINAL article inspired by this content, reframed for small in-person community gatherings on Popera.`;

        const rawResponse = await callOpenAI(OPENAI_API_KEY, systemPrompt, userPrompt);

        // Parse JSON from response
        let jsonStr = rawResponse;
        const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }

        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            return res.status(500).json({ success: false, error: 'Failed to parse AI response' });
        }

        const draft: DraftPayload = {
            title: parsed.title || `Inspired by: ${originalTitle}`,
            slug: generateSlug(parsed.title || originalTitle),
            excerpt: parsed.excerpt || '',
            metaTitle: parsed.metaTitle || parsed.title || originalTitle,
            metaDescription: parsed.metaDescription || parsed.excerpt || '',
            contentHtml: sanitizeHtml(parsed.contentHtml || ''),
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
            status: 'draft',
            createdAt: now,
            updatedAt: now,
            sourceUrl: url,
            attribution: `Inspired by content from ${domain}`,
            canonicalUrl: url,
        };

        return res.status(200).json({ success: true, draft });
    } catch (error: any) {
        console.error('[blog/import-url] Error:', error.message);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
}
