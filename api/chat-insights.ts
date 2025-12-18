/**
 * Vercel Serverless Function for AI Chat Insights via OpenAI
 * 
 * UPGRADED: Now includes:
 * - Caching to prevent repeated API calls (5-10 min TTL)
 * - Timing-aware modes (pre, start, during, after)
 * - Category-based suggested prompts/icebreakers
 * - Reduced token usage (15 messages max, short outputs)
 */

import OpenAI from 'openai';
import crypto from 'crypto';

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
  startDateTime?: number; // Unix timestamp for event start
  location?: string;
}

interface SuggestedPrompt {
  text: string;
  type: 'icebreaker' | 'logistics' | 'poll' | 'reflection';
}

interface InsightsResponse {
  success: boolean;
  insight: string;
  highlights: string[];
  topAnnouncement?: string | null;
  suggestedPrompt?: SuggestedPrompt;
  mode?: 'pre' | 'start' | 'during' | 'after';
  fallback?: boolean;
  cached?: boolean;
}

// ============================================================================
// IN-MEMORY CACHE (works for warm serverless instances)
// ============================================================================

interface CacheEntry {
  response: InsightsResponse;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Prevent memory bloat

function generateCacheKey(eventId: string, messages: ChatMessage[], topAnnouncementId: string | null, mode: string): string {
  // Create a hash from last 15 messages + event + mode
  const messagesHash = crypto
    .createHash('md5')
    .update(JSON.stringify(messages.slice(-15).map(m => m.message)))
    .digest('hex')
    .slice(0, 8);
  
  return `${eventId}:${messagesHash}:${topAnnouncementId || 'none'}:${mode}`;
}

function getCachedResponse(key: string): InsightsResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return { ...entry.response, cached: true };
}

function setCachedResponse(key: string, response: InsightsResponse): void {
  // Evict oldest entries if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  
  cache.set(key, {
    response,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ============================================================================
// TIMING MODE CALCULATION
// ============================================================================

type TimingMode = 'pre' | 'start' | 'during' | 'after';

function calculateTimingMode(eventStartTime: number | undefined, nowISO?: string): TimingMode {
  const now = nowISO ? new Date(nowISO).getTime() : Date.now();
  
  if (!eventStartTime) {
    // If no start time, assume "during" (safest default)
    return 'during';
  }
  
  const diffMinutes = (eventStartTime - now) / (1000 * 60);
  
  if (diffMinutes > 120) {
    // More than 2 hours before start
    return 'pre';
  } else if (diffMinutes >= -30 && diffMinutes <= 30) {
    // Within 30 minutes before/after start
    return 'start';
  } else if (diffMinutes < -30 && diffMinutes >= -180) {
    // 30 minutes to 3 hours after start
    return 'during';
  } else {
    // More than 3 hours after start
    return 'after';
  }
}

// ============================================================================
// CATEGORY-BASED PROMPT BANK (deterministic, low-token)
// ============================================================================

type CategoryKey = 'MAKE & CREATE' | 'EAT & DRINK' | 'MOVE & FLOW' | 'TALK & THINK' | 'COMMUNITY & SUPPORT' | 'DEFAULT';

const PROMPT_BANK: Record<CategoryKey, Record<TimingMode, string[]>> = {
  'MAKE & CREATE': {
    pre: [
      "What creative project are you working on lately?",
      "Any materials or tools you're hoping to learn about?",
      "What's your favorite thing you've made recently?",
    ],
    start: [
      "What inspired you to join this creative session today?",
      "Anyone bringing their own project to work on?",
      "What's one creative skill you'd love to develop?",
    ],
    during: [
      "How's everyone's project coming along?",
      "Any unexpected discoveries while making?",
      "What's been the most fun part so far?",
    ],
    after: [
      "What was your biggest takeaway from today?",
      "Did you try something new? How did it go?",
      "Would you share a photo of what you made?",
    ],
  },
  'EAT & DRINK': {
    pre: [
      "What food/drink are you most excited to try?",
      "Any dietary preferences to share with the group?",
      "What's your go-to comfort food?",
    ],
    start: [
      "Anyone tried this spot before? What did you think?",
      "What's the last great meal you had?",
      "Are you adventurous with food or stick to favorites?",
    ],
    during: [
      "What's everyone tasting? Any favorites so far?",
      "Discovered any new flavors you love?",
      "Would you recommend your dish/drink to others?",
    ],
    after: [
      "What was the highlight of today's menu?",
      "Any recipes you'd want to recreate at home?",
      "Where should we go next time?",
    ],
  },
  'MOVE & FLOW': {
    pre: [
      "What's your fitness goal for this session?",
      "New to this activity or a regular?",
      "How do you usually warm up?",
    ],
    start: [
      "How's everyone feeling? Ready to move?",
      "Any injuries or areas to be mindful of?",
      "What energizes you during a workout?",
    ],
    during: [
      "How's your energy level so far?",
      "Anyone need to modify or take a breather?",
      "What's been the most challenging part?",
    ],
    after: [
      "How do you feel after that session?",
      "What will you do to recover today?",
      "Would you try this again?",
    ],
  },
  'TALK & THINK': {
    pre: [
      "What topics are you hoping we'll discuss?",
      "Any burning questions on your mind lately?",
      "What drew you to this conversation topic?",
    ],
    start: [
      "What's one thing you hope to learn today?",
      "Any perspectives you're curious to hear?",
      "How did you first get interested in this topic?",
    ],
    during: [
      "What's resonating with you so far?",
      "Any thoughts you'd like to add?",
      "Does this change how you think about the topic?",
    ],
    after: [
      "What was your key takeaway?",
      "Anything that surprised you today?",
      "How might you apply what you learned?",
    ],
  },
  'COMMUNITY & SUPPORT': {
    pre: [
      "What brings you to this group?",
      "How are you feeling coming into today?",
      "Is there anything specific you're hoping to get support with?",
    ],
    start: [
      "What's one small win from your week?",
      "How can we support each other today?",
      "Anything you'd like to share with the group?",
    ],
    during: [
      "How is everyone doing so far?",
      "Is there anything on your mind you'd like to talk about?",
      "What's been helpful about today's discussion?",
    ],
    after: [
      "What's one thing you're taking away from today?",
      "How are you feeling now compared to when we started?",
      "Any gratitude you'd like to express?",
    ],
  },
  'DEFAULT': {
    pre: [
      "What are you most looking forward to?",
      "How did you hear about this event?",
      "Anyone coming with friends or meeting new people?",
    ],
    start: [
      "Quick intro: where are you joining from?",
      "What's one interesting thing about yourself?",
      "What do you hope to get out of today?",
    ],
    during: [
      "How's everyone enjoying the event so far?",
      "Any questions or topics you'd like to explore?",
      "What's been the highlight so far?",
    ],
    after: [
      "What was your favorite part of today?",
      "Would you come to something like this again?",
      "Any feedback for the host?",
    ],
  },
};

// Map event categories to prompt bank keys
function mapCategoryToKey(category?: string): CategoryKey {
  if (!category) return 'DEFAULT';
  
  const normalized = category.toLowerCase();
  
  if (normalized.includes('make') || normalized.includes('create') || normalized.includes('workshop') || normalized.includes('craft')) {
    return 'MAKE & CREATE';
  }
  if (normalized.includes('eat') || normalized.includes('drink') || normalized.includes('food') || normalized.includes('beverage') || normalized.includes('coffee') || normalized.includes('wine')) {
    return 'EAT & DRINK';
  }
  if (normalized.includes('move') || normalized.includes('flow') || normalized.includes('wellness') || normalized.includes('fitness') || normalized.includes('yoga') || normalized.includes('sport')) {
    return 'MOVE & FLOW';
  }
  if (normalized.includes('talk') || normalized.includes('think') || normalized.includes('discuss') || normalized.includes('book') || normalized.includes('club') || normalized.includes('lecture')) {
    return 'TALK & THINK';
  }
  if (normalized.includes('community') || normalized.includes('support') || normalized.includes('group') || normalized.includes('peer') || normalized.includes('mutual')) {
    return 'COMMUNITY & SUPPORT';
  }
  
  return 'DEFAULT';
}

function getRandomPrompt(categoryKey: CategoryKey, mode: TimingMode): string {
  const prompts = PROMPT_BANK[categoryKey]?.[mode] || PROMPT_BANK['DEFAULT'][mode];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

function getSuggestedPrompt(category?: string, mode: TimingMode = 'during'): SuggestedPrompt {
  const categoryKey = mapCategoryToKey(category);
  const text = getRandomPrompt(categoryKey, mode);
  
  // Determine type based on mode
  const type: SuggestedPrompt['type'] = 
    mode === 'pre' ? 'logistics' :
    mode === 'start' ? 'icebreaker' :
    mode === 'during' ? 'icebreaker' :
    'reflection';
  
  return { text, type };
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
    // Extract data from request
    const { 
      messages, 
      event, 
      eventId,
      nowISO,
      requesterRole,
      forcePrompt,
      topAnnouncementId,
    }: { 
      messages: ChatMessage[], 
      event: EventContext,
      eventId?: string,
      nowISO?: string,
      requesterRole?: 'host' | 'attendee',
      forcePrompt?: boolean,
      topAnnouncementId?: string,
    } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: messages (array)' 
      });
    }

    // Calculate timing mode
    const mode = calculateTimingMode(event?.startDateTime, nowISO);
    
    // Generate suggested prompt (always available, even without OpenAI)
    const suggestedPrompt = getSuggestedPrompt(event?.category, mode);

    // If no messages or very few, return a simple response with prompt
    if (messages.length === 0) {
      return res.status(200).json({
        success: true,
        insight: 'The conversation is just getting started. Be the first to share your thoughts!',
        highlights: [],
        suggestedPrompt,
        mode,
      });
    }

    // ========================================================================
    // CHECK CACHE FIRST
    // ========================================================================
    const cacheKey = generateCacheKey(
      eventId || event?.title || 'unknown',
      messages,
      topAnnouncementId || null,
      mode
    );
    
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse && !forcePrompt) {
      console.log('[API] Returning cached response for key:', cacheKey);
      // Still generate a fresh prompt even for cached responses
      return res.status(200).json({
        ...cachedResponse,
        suggestedPrompt: getSuggestedPrompt(event?.category, mode),
      });
    }

    // ========================================================================
    // VALIDATE OPENAI
    // ========================================================================
    if (!openai || !OPENAI_API_KEY) {
      console.error('[API] OpenAI not configured - missing OPENAI_API_KEY');
      return res.status(200).json({ 
        success: true, 
        insight: 'Chat insights are being set up. Check back soon!',
        highlights: [],
        suggestedPrompt,
        mode,
        fallback: true
      });
    }

    // ========================================================================
    // BUILD PROMPT (reduced: last 15 messages)
    // ========================================================================
    const recentMessages = messages.slice(-15); // Reduced from 30 to 15
    const messagesSummary = recentMessages.map(m => 
      `${m.isHost ? '[HOST]' : '[ATTENDEE]'} ${m.userName}: ${m.message}`
    ).join('\n');

    const eventContext = event ? `
Event: "${event.title}"
${event.description ? `Description: ${event.description.slice(0, 200)}` : ''}
${event.category ? `Category: ${event.category}` : ''}
${event.date ? `Date: ${event.date}` : ''}
${event.location ? `Location: ${event.location}` : ''}
Timing: ${mode} (${mode === 'pre' ? 'before event' : mode === 'start' ? 'event starting' : mode === 'during' ? 'event in progress' : 'event ended'})
` : '';

    const prompt = `You are analyzing a group chat for an event. Provide a brief, honest insight.

${eventContext}

Recent messages (${recentMessages.length} messages):
${messagesSummary}

Instructions:
1. Be honest and accurate - don't exaggerate if conversation is just simple greetings
2. Keep the summary to 1-2 sentences MAX (under 60 tokens)
3. Include 0-3 highlights ONLY if there are notable topics/questions
4. Each highlight should be brief (under 15 tokens)

Respond with JSON only:
{
  "insight": "1-2 sentence honest summary",
  "highlights": ["brief highlight 1", "brief highlight 2"]
}`;

    // ========================================================================
    // CALL OPENAI (with reduced token budget)
    // ========================================================================
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You analyze group chats briefly. Always respond with valid JSON only, no markdown. Keep responses concise.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 150, // Reduced from 200
      temperature: 0.6, // Slightly lower for consistency
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse the JSON response
    let parsedResponse;
    try {
      const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('[API] Failed to parse OpenAI response:', responseText);
      parsedResponse = {
        insight: responseText.slice(0, 150),
        highlights: []
      };
    }

    // Build final response
    const finalResponse: InsightsResponse = {
      success: true,
      insight: parsedResponse.insight || 'The conversation is active.',
      highlights: (parsedResponse.highlights || []).slice(0, 3), // Max 3 highlights
      suggestedPrompt,
      mode,
    };

    // ========================================================================
    // CACHE THE RESPONSE
    // ========================================================================
    setCachedResponse(cacheKey, finalResponse);
    console.log('[API] Cached response for key:', cacheKey);

    return res.status(200).json(finalResponse);

  } catch (error: any) {
    console.error('[API] Chat insights error:', error);
    
    // Return a graceful fallback with suggested prompt
    const mode = 'during' as TimingMode;
    return res.status(200).json({
      success: true,
      insight: 'Unable to analyze the conversation right now.',
      highlights: [],
      suggestedPrompt: getSuggestedPrompt(undefined, mode),
      mode,
      fallback: true
    });
  }
}

// ============================================================================
// ADDITIONAL ENDPOINT: Generate AI message for summon/warmup
// ============================================================================

export async function generateAIMessage(
  eventId: string,
  category: string | undefined,
  mode: TimingMode,
  reason: 'summon' | 'warmup'
): Promise<{ text: string; success: boolean }> {
  const prompt = getSuggestedPrompt(category, mode);
  
  // For AI messages, we prefix with a friendly intro
  const intros = {
    summon: [
      "Here's something to think about:",
      "Try this one:",
      "How about this question:",
      "Let's try:",
    ],
    warmup: [
      "👋 Welcome everyone! Here's a quick icebreaker:",
      "Hey all! To get things started:",
      "Great to have you here! Quick question:",
    ],
  };
  
  const intro = intros[reason][Math.floor(Math.random() * intros[reason].length)];
  
  return {
    text: `${intro} ${prompt.text}`,
    success: true,
  };
}
