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

    // Rate limiting check
    const rateLimitKey = getRateLimitKey(userId, eventId);
    if (isRateLimited(rateLimitKey)) {
      return res.status(429).json({
        success: false,
        error: 'Please wait a moment before asking again.',
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

Reply directly (no JSON, no quotes, just the message text):`;

    // ========================================================================
    // CALL OPENAI
    // ========================================================================
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are Popera Guide, a friendly AI assistant for group event chats. Keep responses brief, warm, and helpful. Never use markdown formatting.' 
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 220,
      temperature: 0.7,
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

