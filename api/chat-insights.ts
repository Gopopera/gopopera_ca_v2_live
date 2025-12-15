/**
 * Vercel Serverless Function for AI Chat Insights via OpenAI
 * Analyzes chat messages and event context to provide meaningful insights
 */

import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize OpenAI client
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

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
    // Validate OpenAI is configured
    if (!openai || !OPENAI_API_KEY) {
      console.error('[API] OpenAI not configured - missing OPENAI_API_KEY');
      return res.status(200).json({ 
        success: true, 
        insight: 'Chat insights are being set up. Check back soon!',
        highlights: [],
        fallback: true
      });
    }

    // Extract data from request
    const { messages, event }: { messages: ChatMessage[], event: EventContext } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: messages (array)' 
      });
    }

    // If no messages or very few, return a simple response
    if (messages.length === 0) {
      return res.status(200).json({
        success: true,
        insight: 'The conversation is just getting started. Be the first to share your thoughts!',
        highlights: [],
      });
    }

    // Build the prompt for OpenAI
    const recentMessages = messages.slice(-30); // Last 30 messages
    const messagesSummary = recentMessages.map(m => 
      `${m.isHost ? '[HOST]' : '[ATTENDEE]'} ${m.userName}: ${m.message}`
    ).join('\n');

    const eventContext = event ? `
Event: "${event.title}"
${event.description ? `Description: ${event.description}` : ''}
${event.category ? `Category: ${event.category}` : ''}
${event.date ? `Date: ${event.date}` : ''}
${event.location ? `Location: ${event.location}` : ''}
` : '';

    const prompt = `You are analyzing a group chat for an event/social gathering. Provide a brief, honest insight about the conversation.

${eventContext}

Recent messages (${recentMessages.length} messages):
${messagesSummary}

Instructions:
1. Be honest and accurate - don't exaggerate or be overly positive if the conversation is just simple greetings
2. If messages are just "hello", "hey", "hi" - acknowledge it's early/quiet without fake enthusiasm
3. Highlight any genuine questions, topics of discussion, or excitement if present
4. Keep the response to 1-2 sentences, natural and conversational
5. If there are meaningful discussions, briefly mention the topics

Respond with a JSON object:
{
  "insight": "Your honest 1-2 sentence summary",
  "highlights": ["highlight 1", "highlight 2"] // 0-3 notable messages/topics, empty array if none
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that analyzes group chat conversations. Always respond with valid JSON only, no markdown.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse the JSON response
    let parsedResponse;
    try {
      // Clean up potential markdown code blocks
      const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('[API] Failed to parse OpenAI response:', responseText);
      // Fallback: use the raw text as insight
      parsedResponse = {
        insight: responseText.slice(0, 200),
        highlights: []
      };
    }

    return res.status(200).json({
      success: true,
      insight: parsedResponse.insight || 'The conversation is active.',
      highlights: parsedResponse.highlights || [],
    });

  } catch (error: any) {
    console.error('[API] Chat insights error:', error);
    
    // Return a graceful fallback instead of error
    return res.status(200).json({
      success: true,
      insight: 'Unable to analyze the conversation right now.',
      highlights: [],
      fallback: true
    });
  }
}
