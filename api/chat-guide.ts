/**
 * Vercel Serverless Function for "Ask Popera Guide"
 * 
 * Allows users to ask the AI guide a question, which gets posted as a chat message.
 * 
 * Features:
 * - Rate limiting: 1 request per 30 seconds per user per event
 * - Token efficient: max 10-12 messages context, 220 tokens output
 * - Uses gpt-4o-mini for cost efficiency
 */

import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize OpenAI client
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// ============================================================================
// TYPES
// ============================================================================

interface ChatMessage {
  message: string;
  userName: string;
  isHost: boolean;
  timestamp: string;
}

interface EventContext {
  title: string;
  description?: string;
  category?: string;
  date?: string;
  location?: string;
}

interface GuideRequest {
  question: string;
  event: EventContext;
  messages: ChatMessage[];
  userId?: string;
  eventId?: string;
}

interface GuideResponse {
  success: boolean;
  reply?: string;
  error?: string;
  cooldown?: boolean;
}

// ============================================================================
// RATE LIMITING (in-memory for serverless warm instances)
// ============================================================================

interface RateLimitEntry {
  lastRequestAt: number;
}

const rateLimitCache = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MS = 30 * 1000; // 30 seconds cooldown

// Per-event global rate limit: max 10 requests per 5 minutes
const eventRateLimitCache = new Map<string, number[]>();
const EVENT_RATE_LIMIT_MAX = 10;
const EVENT_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function getRateLimitKey(userId: string | undefined, eventId: string | undefined): string {
  return `${userId || 'anon'}:${eventId || 'unknown'}`;
}

function isRateLimited(key: string): boolean {
  const entry = rateLimitCache.get(key);
  if (!entry) return false;
  
  const now = Date.now();
  if (now - entry.lastRequestAt < RATE_LIMIT_MS) {
    return true;
  }
  
  return false;
}

function isEventRateLimited(eventId: string | undefined): boolean {
  const key = eventId || 'unknown';
  
  const now = Date.now();
  const timestamps = eventRateLimitCache.get(key) || [];
  
  // Filter to only keep timestamps within the window
  const recentTimestamps = timestamps.filter(t => now - t < EVENT_RATE_LIMIT_WINDOW_MS);
  eventRateLimitCache.set(key, recentTimestamps);
  
  return recentTimestamps.length >= EVENT_RATE_LIMIT_MAX;
}

function recordEventRequest(eventId: string | undefined): void {
  const key = eventId || 'unknown';
  
  const now = Date.now();
  const timestamps = eventRateLimitCache.get(key) || [];
  
  // Filter to only keep timestamps within the window, then add new one
  const recentTimestamps = timestamps.filter(t => now - t < EVENT_RATE_LIMIT_WINDOW_MS);
  recentTimestamps.push(now);
  eventRateLimitCache.set(key, recentTimestamps);
  
  // Clean up old event entries (keep cache small)
  if (eventRateLimitCache.size > 200) {
    for (const [k, v] of eventRateLimitCache.entries()) {
      const filtered = v.filter(t => now - t < EVENT_RATE_LIMIT_WINDOW_MS);
      if (filtered.length === 0) {
        eventRateLimitCache.delete(k);
      }
    }
  }
}

function recordRequest(key: string): void {
  rateLimitCache.set(key, { lastRequestAt: Date.now() });
  
  // Clean up old entries (keep cache small)
  if (rateLimitCache.size > 500) {
    const cutoff = Date.now() - RATE_LIMIT_MS * 2;
    for (const [k, v] of rateLimitCache.entries()) {
      if (v.lastRequestAt < cutoff) {
        rateLimitCache.delete(k);
      }
    }
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, event, messages, userId, eventId }: GuideRequest = req.body;

    // Validate required fields
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: question' 
      });
    }

    // Rate limiting check (per user)
    const rateLimitKey = getRateLimitKey(userId, eventId);
    if (isRateLimited(rateLimitKey)) {
      return res.status(429).json({
        success: false,
        error: 'Please wait a moment before asking again.',
        cooldown: true,
      });
    }

    // Event-level rate limiting check (max 10 per 5 minutes per event)
    if (isEventRateLimited(eventId)) {
      return res.status(429).json({
        success: false,
        error: 'Popera Guide is taking a short break for this circle. Try again in a few minutes.',
        cooldown: true,
      });
    }

    // Validate OpenAI
    if (!openai || !OPENAI_API_KEY) {
      console.error('[API] OpenAI not configured - missing OPENAI_API_KEY');
      return res.status(200).json({ 
        success: false, 
        error: 'AI guide is not available right now. Please try again later.',
      });
    }

    // Record this request for rate limiting
    recordRequest(rateLimitKey);
    recordEventRequest(eventId);

    // ========================================================================
    // BUILD PROMPT (reduced: last 10-12 messages)
    // ========================================================================
    const recentMessages = (messages || []).slice(-12).map(m => 
      `${m.isHost ? '[HOST]' : '[ATTENDEE]'} ${m.userName}: ${m.message}`
    ).join('\n');

    const eventContext = event ? `
Event: "${event.title}"
${event.description ? `Description: ${event.description.slice(0, 150)}` : ''}
${event.category ? `Category: ${event.category}` : ''}
${event.date ? `Date: ${event.date}` : ''}
${event.location ? `Location: ${event.location}` : ''}
` : '';

    const prompt = `You are Popera Guide, a friendly AI assistant for a group event chat. A participant has asked you a question.

${eventContext}

Recent conversation (for context):
${recentMessages || 'No messages yet.'}

User's question: "${question.trim()}"

Instructions:
1. Give a helpful, friendly, and concise reply (1-3 sentences max)
2. Stay relevant to the event context if the question relates to it
3. If it's a creative request (like "give us an icebreaker" or "suggest an activity"), provide a fun, engaging suggestion
4. Keep the tone warm and inclusive
5. Never ask for personal information
6. If the question is inappropriate or off-topic, politely redirect to the event
7. If asked for medical/legal/financial advice, refuse briefly and suggest a qualified professional
8. If asked for dangerous, illegal, hateful, or sexual content, refuse and redirect to safe alternatives

Reply directly (no JSON, no quotes, just the message text):`;

    // ========================================================================
    // CALL OPENAI
    // ========================================================================
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: `You are Popera Guide, an AI helper inside a small in-person group chat on Popera.
Rules:
- Reply in 1–3 short sentences. Be warm, practical, and relevant to the circle.
- Do NOT request or infer sensitive personal data (phone, email, address, IDs, payment details).
- Do NOT claim you are human, present at the event, or that you can verify facts outside the chat.
- If asked for medical, legal, or financial advice, refuse briefly and suggest consulting a qualified professional. For food/allergy questions, tell users to check ingredients and confirm allergies directly with participants.
- Refuse any request that facilitates wrongdoing, danger, self-harm, violence, weapons, or illegal activity; redirect to a safe alternative.
- Refuse harassment, hate, sexual content (especially anything involving minors), or explicit content; redirect to respectful community norms.
- Output plain text only (no markdown, no JSON).`
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 220,
      temperature: 0.4,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || '';
    
    if (!reply) {
      return res.status(200).json({
        success: false,
        error: 'Unable to generate a response. Please try again.',
      });
    }

    console.log('[API] Chat guide reply generated:', {
      eventId,
      userId,
      questionLength: question.length,
      replyLength: reply.length,
    });

    return res.status(200).json({
      success: true,
      reply,
    });

  } catch (error: any) {
    console.error('[API] Chat guide error:', error);
    
    return res.status(200).json({
      success: false,
      error: 'Unable to generate a response right now. Please try again.',
    });
  }
}

