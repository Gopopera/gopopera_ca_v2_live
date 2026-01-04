/**
 * Blog Draft Generation API
 *
 * POST /api/blog/generate
 * Input: { topics: Array<{ title: string; context?: string }>, language?: "en" | "fr" }
 * Output: { success: true, drafts: Array<DraftPayload> } (always length 1)
 *
 * - Node serverless (not Edge)
 * - Requires admin auth
 * - Uses OpenAI SDK with Structured Outputs
 * - Returns single draft payload per topic (client saves to Firestore)
 */

import OpenAI from 'openai';
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
    language?: 'en' | 'fr';
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

// ============================================
// OpenAI Structured Output Schema
// ============================================

const blogDraftSchema = {
    name: 'popera_blog_draft',
    strict: true,
    schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
            title: { type: 'string', minLength: 10, maxLength: 80 },

            slug: {
                type: 'string',
                description:
                    'Clean production slug. Lowercase. Hyphens. No trailing hyphen. Must NOT end with "-a" or "-b".',
                pattern: '^(?!.*-(a|b)$)[a-z0-9]+(?:-[a-z0-9]+)*$',
                minLength: 10,
                maxLength: 120,
            },

            metaTitle: { type: 'string', minLength: 10, maxLength: 60 },
            metaDescription: { type: 'string', minLength: 50, maxLength: 155 },
            excerpt: { type: 'string', minLength: 80, maxLength: 220 },

            tags: {
                type: 'array',
                minItems: 3,
                maxItems: 6,
                items: { type: 'string', minLength: 2, maxLength: 24 },
            },

            heroImageAlt: { type: 'string', minLength: 20, maxLength: 140 },

            tldrBullets: {
                type: 'array',
                minItems: 3,
                maxItems: 5,
                items: { type: 'string', minLength: 20, maxLength: 120 },
            },

            internalLinks: {
                type: 'array',
                minItems: 2,
                maxItems: 5,
                items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        anchorText: { type: 'string', minLength: 4, maxLength: 60 },
                        href: { type: 'string', minLength: 2, maxLength: 120 },
                    },
                    required: ['anchorText', 'href'],
                },
            },

            visualIdeas: {
                type: 'array',
                minItems: 1,
                maxItems: 3,
                items: { type: 'string', minLength: 25, maxLength: 160 },
            },

            contentHtml: {
                type: 'string',
                description:
                    'Full article HTML. Must include TL;DR block near top, Popera-specific examples, 1 mini case study, inline internal links, and a trust block near end.',
                minLength: 1200,
                maxLength: 20000,
            },
        },
        required: [
            'title',
            'slug',
            'metaTitle',
            'metaDescription',
            'excerpt',
            'tags',
            'heroImageAlt',
            'tldrBullets',
            'internalLinks',
            'visualIdeas',
            'contentHtml',
        ],
    },
} as const;

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
        const { topics, language = 'en' }: GenerateRequest = req.body || {};

        if (!Array.isArray(topics) || topics.length === 0) {
            return res.status(400).json({ success: false, error: 'topics array is required' });
        }

        // Process only the first topic (single draft)
        const topic = topics[0];
        if (!topic?.title) {
            return res.status(400).json({ success: false, error: 'Topic title is required' });
        }

        const now = Date.now();
        const topicId = `topic_${now}_${Math.random().toString(36).substring(2, 8)}`;

        // Initialize OpenAI client
        const client = new OpenAI({ apiKey: OPENAI_API_KEY });
        const model = process.env.POPERA_BLOG_MODEL ?? 'gpt-4.1-mini';

        const siteBaseUrl = 'https://gopopera.ca';

        // Category taxonomy based on language
        const categoryTaxonomy =
            language === 'fr'
                ? 'CRÉER & FABRIQUER; MANGER & BOIRE; BOUGER & RESPIRER; DISCUTER & RÉFLÉCHIR; COMMUNAUTÉ & SOUTIEN (+ TOUT)'
                : 'MAKE & CREATE; EAT & DRINK; MOVE & FLOW; TALK & THINK; COMMUNITY & SUPPORT (+ ALL)';

        const systemPrompt = `
You write blog posts for Popera (${siteBaseUrl}).
Popera is a peer-to-peer marketplace for small in-person circles (3–10 people) designed for real local connection and micro-learning.
Categories taxonomy:
${categoryTaxonomy}

Hard rules:
- Output MUST match the provided JSON schema exactly.
- Generate EXACTLY ONE blog draft. No variants, no "Version A/B", no multiple options.
- Slug must be clean production (NO "-a", "-b", "variant", etc.).
- Writing must NOT sound generic AI: be specific, practical, and opinionated (Popera POV).
- Add E-E-A-T signals WITHOUT pretending to be a person:
  include a trust block: "Written by Popera Team" + 1–2 lines about the mission.
- Avoid fake stats, fake quotes, or made-up sources. If you cannot cite reliably, don't cite.
- Do NOT invent heroImageUrl. The heroImageUrl field is not in this schema.
- Must work in ${language === 'fr' ? 'French' : 'English'}.

Content requirements (must be included inside contentHtml):
1) TL;DR at the top (3–5 bullets) using <ul><li>...</li></ul>
2) 2–3 Popera-specific "Circle" examples across different categories
3) 1 mini case study (practical: steps + what works + what fails)
4) 2–5 inline internal links using provided hrefs (e.g., /explore, /auth, /community)
5) A "trust block" near the end:
   <div class="popera-trust"><strong>Written by Popera Team</strong><p>...</p></div>
6) End with a short, non-cringe CTA paragraph (no shouting).
`;

        const userPrompt = `
LANGUAGE: ${language}
TOPIC: ${topic.title}
SHARED CONTEXT: ${topic.context ?? '(none)'}

Internal links you can use (choose 2–5):
- Browse circles: /explore
- Join Popera: /auth
- Community: /community
- Host a Circle: /host
- Blog: /blog

Also return:
- internalLinks array matching the anchors you used
- visualIdeas: 1–3 original visual suggestions (e.g., simple diagram, screenshot idea)
- tags: 3–6 short tags
`;

        const resp = await client.responses.create({
            model,
            input: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            max_output_tokens: 4500,
            text: {
                format: {
                    type: 'json_schema',
                    ...blogDraftSchema,
                },
            },
        });

        const parsed = JSON.parse(resp.output_text);

        // Build draft payload matching existing UI expectations
        const draft: DraftPayload = {
            title: parsed.title,
            slug: parsed.slug,
            excerpt: parsed.excerpt,
            metaTitle: parsed.metaTitle,
            metaDescription: parsed.metaDescription,
            contentHtml: sanitizeHtml(parsed.contentHtml),
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
            status: 'draft',
            createdAt: now,
            updatedAt: now,
            topicId,
            variantLabel: 'Primary',
        };

        // Return single draft in array (preserves existing response shape)
        return res.status(200).json({ success: true, drafts: [draft] });
    } catch (error: any) {
        console.error('[blog/generate] Error:', error.message);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
}
