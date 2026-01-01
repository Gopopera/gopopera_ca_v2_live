/**
 * POST /api/leads/extract-email
 * 
 * Crawl a website to extract a contact email address.
 * - No new dependencies: uses fetch + regex
 * - Crawls max 4 pages per site
 * - Same-origin only
 * - Timeout: 8s per request, 20s total per domain
 * 
 * Admin-only endpoint.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminToken } from '../_lib/firebaseAdmin.js';

interface ExtractEmailRequest {
  website: string;
}

interface ExtractEmailResponse {
  success: boolean;
  error?: string;
  emailFound: boolean;
  email?: string;
  emailSourceUrl?: string;
  confidence?: 'high' | 'medium' | 'low';
  checkedUrls: string[];
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Email regex pattern (RFC 5322 simplified)
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Common contact page paths
const CONTACT_PATHS = ['/contact', '/about', '/contact-us', '/about-us', '/reservations', '/book', '/team'];

// Contact-related anchor text patterns
const CONTACT_ANCHOR_PATTERNS = [
  /contact/i,
  /about/i,
  /book/i,
  /reserve/i,
  /reservations/i,
  /team/i,
  /reach\s*us/i,
  /get\s*in\s*touch/i,
];

// Emails to skip (role-based, noreply, etc.)
const SKIP_EMAIL_PATTERNS = [
  /^noreply@/i,
  /^no-reply@/i,
  /^donotreply@/i,
  /^mailer-daemon@/i,
  /^postmaster@/i,
  /^webmaster@/i,
  /^abuse@/i,
  /^spam@/i,
  /example\.com$/i,
  /example\.org$/i,
  /test\.com$/i,
  /@sentry\./i,
  /@wixpress\./i,
  /@squarespace\./i,
];

// Preferred email prefixes (sorted by priority)
const PREFERRED_PREFIXES = ['contact', 'hello', 'info', 'book', 'reservations', 'bonjour', 'reserve'];

interface FetchResult {
  url: string;
  html: string | null;
  error?: string;
}

interface EmailCandidate {
  email: string;
  sourceUrl: string;
  context: 'mailto' | 'contact_page' | 'footer' | 'body';
}

/**
 * Fetch a URL with timeout
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 8000): Promise<FetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PoperaBot/1.0; +https://gopopera.ca)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,fr;q=0.3',
      },
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return { url, html: null, error: `HTTP ${response.status}` };
    }
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return { url, html: null, error: 'Not HTML' };
    }
    
    const html = await response.text();
    return { url, html };
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    const errorMsg = error.name === 'AbortError' ? 'Timeout' : (error.message || 'Fetch failed');
    return { url, html: null, error: errorMsg };
  }
}

/**
 * Extract all emails from HTML content
 */
function extractEmailsFromHtml(html: string): string[] {
  const emails = new Set<string>();
  
  // Extract from mailto: links (highest priority)
  const mailtoMatches = html.match(/href=["']mailto:([^"'?]+)/gi) || [];
  for (const match of mailtoMatches) {
    const email = match.replace(/href=["']mailto:/i, '').toLowerCase();
    if (isValidEmail(email)) {
      emails.add(email);
    }
  }
  
  // Extract from body text
  const bodyMatches = html.match(EMAIL_REGEX) || [];
  for (const email of bodyMatches) {
    const normalized = email.toLowerCase();
    if (isValidEmail(normalized)) {
      emails.add(normalized);
    }
  }
  
  return Array.from(emails);
}

/**
 * Check if email is valid and not in skip list
 */
function isValidEmail(email: string): boolean {
  if (!email || email.length < 6 || email.length > 254) return false;
  if (!email.includes('@') || !email.includes('.')) return false;
  
  // Check against skip patterns
  for (const pattern of SKIP_EMAIL_PATTERNS) {
    if (pattern.test(email)) return false;
  }
  
  return true;
}

/**
 * Check if email domain matches website domain
 */
function emailMatchesDomain(email: string, websiteHost: string): boolean {
  const emailDomain = email.split('@')[1];
  if (!emailDomain) return false;
  
  // Direct match
  if (emailDomain === websiteHost) return true;
  
  // Subdomain match (e.g., email@studio.example.com vs www.example.com)
  const websiteBase = websiteHost.replace(/^www\./, '');
  const emailBase = emailDomain.replace(/^www\./, '');
  
  return emailBase === websiteBase || 
         emailBase.endsWith('.' + websiteBase) ||
         websiteBase.endsWith('.' + emailBase);
}

/**
 * Extract contact page URLs from HTML
 */
function extractContactLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  
  try {
    const origin = new URL(baseUrl).origin;
    
    // Match anchor tags with href
    const anchorMatches = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi) || [];
    
    for (const match of anchorMatches) {
      const hrefMatch = match.match(/href=["']([^"']+)["']/i);
      const textMatch = match.match(/>([^<]*)</);
      
      if (!hrefMatch) continue;
      
      const href = hrefMatch[1];
      const text = textMatch ? textMatch[1] : '';
      
      // Check if anchor text matches contact patterns
      const isContactLink = CONTACT_ANCHOR_PATTERNS.some(pattern => pattern.test(text));
      
      if (isContactLink) {
        try {
          const fullUrl = new URL(href, origin).toString();
          // Only same-origin links
          if (fullUrl.startsWith(origin) && !links.includes(fullUrl)) {
            links.push(fullUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }
  } catch {
    // URL parsing failed
  }
  
  return links.slice(0, 3); // Max 3 discovered contact links
}

/**
 * Select the best email from candidates
 */
function selectBestEmail(
  candidates: EmailCandidate[],
  websiteHost: string
): { email: string; sourceUrl: string; confidence: 'high' | 'medium' | 'low' } | null {
  if (candidates.length === 0) return null;
  
  // Score each candidate
  const scored = candidates.map(c => {
    let score = 0;
    
    // Context scoring
    if (c.context === 'mailto') score += 30;
    else if (c.context === 'contact_page') score += 20;
    else if (c.context === 'footer') score += 10;
    
    // Domain match scoring
    if (emailMatchesDomain(c.email, websiteHost)) score += 25;
    
    // Preferred prefix scoring
    const prefix = c.email.split('@')[0];
    const prefixIndex = PREFERRED_PREFIXES.findIndex(p => prefix.startsWith(p));
    if (prefixIndex >= 0) {
      score += 15 - prefixIndex; // Higher score for earlier in list
    }
    
    return { ...c, score };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  const best = scored[0];
  
  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (best.context === 'mailto' || best.context === 'contact_page') {
    confidence = 'high';
  } else if (emailMatchesDomain(best.email, websiteHost)) {
    confidence = 'medium';
  }
  
  return {
    email: best.email,
    sourceUrl: best.sourceUrl,
    confidence,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      .end();
    return;
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Verify admin auth
  const authResult = await verifyAdminToken(req.headers.authorization);
  if (!authResult.success) {
    console.warn('[extract-email] Unauthorized:', authResult.reason);
    res.status(403).json({ success: false, error: 'Forbidden', reason: authResult.reason });
    return;
  }

  try {
    const { website } = req.body as ExtractEmailRequest;

    if (!website) {
      res.status(400).json({ success: false, error: 'website is required' });
      return;
    }

    // Normalize website URL
    let websiteUrl: URL;
    try {
      websiteUrl = new URL(website.startsWith('http') ? website : `https://${website}`);
    } catch {
      res.status(400).json({ success: false, error: 'Invalid website URL' });
      return;
    }

    const websiteHost = websiteUrl.hostname.replace(/^www\./, '');
    const origin = websiteUrl.origin;
    
    console.log(`[extract-email] Scanning ${websiteUrl.toString()}`);

    const startTime = Date.now();
    const MAX_TOTAL_TIME = 20000; // 20 seconds total
    const PAGE_DELAY = 400; // 400ms between pages
    const MAX_PAGES = 4;

    const checkedUrls: string[] = [];
    const emailCandidates: EmailCandidate[] = [];
    let pagesChecked = 0;

    // Helper to check time limit
    const isTimeExceeded = () => Date.now() - startTime > MAX_TOTAL_TIME;

    // 1. Fetch homepage
    const homepageResult = await fetchWithTimeout(websiteUrl.toString());
    checkedUrls.push(websiteUrl.toString());
    pagesChecked++;

    if (homepageResult.html) {
      const emails = extractEmailsFromHtml(homepageResult.html);
      for (const email of emails) {
        emailCandidates.push({ email, sourceUrl: websiteUrl.toString(), context: 'body' });
      }
      
      // Check for mailto specifically
      const mailtoEmails = extractEmailsFromHtml(homepageResult.html.match(/href=["']mailto:[^"']+["']/gi)?.join(' ') || '');
      for (const email of mailtoEmails) {
        // Upgrade context if it's a mailto
        const existing = emailCandidates.find(c => c.email === email);
        if (existing) {
          existing.context = 'mailto';
        }
      }

      // If we already found a good email, maybe we can stop early
      const bestSoFar = selectBestEmail(emailCandidates, websiteHost);
      if (bestSoFar && bestSoFar.confidence === 'high') {
        console.log(`[extract-email] Found high-confidence email early: ${bestSoFar.email}`);
        res.status(200).json({
          success: true,
          emailFound: true,
          email: bestSoFar.email,
          emailSourceUrl: bestSoFar.sourceUrl,
          confidence: bestSoFar.confidence,
          checkedUrls,
        } as ExtractEmailResponse);
        return;
      }

      // 2. Try discovered contact links from homepage
      if (!isTimeExceeded() && pagesChecked < MAX_PAGES) {
        const contactLinks = extractContactLinks(homepageResult.html, origin);
        
        for (const link of contactLinks) {
          if (isTimeExceeded() || pagesChecked >= MAX_PAGES) break;
          if (checkedUrls.includes(link)) continue;
          
          await new Promise(resolve => setTimeout(resolve, PAGE_DELAY));
          
          const pageResult = await fetchWithTimeout(link);
          checkedUrls.push(link);
          pagesChecked++;
          
          if (pageResult.html) {
            const emails = extractEmailsFromHtml(pageResult.html);
            for (const email of emails) {
              if (!emailCandidates.some(c => c.email === email)) {
                emailCandidates.push({ email, sourceUrl: link, context: 'contact_page' });
              }
            }
            
            // Check for early exit with high confidence
            const bestSoFar = selectBestEmail(emailCandidates, websiteHost);
            if (bestSoFar && bestSoFar.confidence === 'high') {
              console.log(`[extract-email] Found high-confidence email: ${bestSoFar.email}`);
              res.status(200).json({
                success: true,
                emailFound: true,
                email: bestSoFar.email,
                emailSourceUrl: bestSoFar.sourceUrl,
                confidence: bestSoFar.confidence,
                checkedUrls,
              } as ExtractEmailResponse);
              return;
            }
          }
        }
      }

      // 3. Fallback to common contact paths
      if (!isTimeExceeded() && pagesChecked < MAX_PAGES && emailCandidates.length === 0) {
        for (const path of CONTACT_PATHS) {
          if (isTimeExceeded() || pagesChecked >= MAX_PAGES) break;
          
          const fallbackUrl = `${origin}${path}`;
          if (checkedUrls.includes(fallbackUrl)) continue;
          
          await new Promise(resolve => setTimeout(resolve, PAGE_DELAY));
          
          const pageResult = await fetchWithTimeout(fallbackUrl);
          checkedUrls.push(fallbackUrl);
          pagesChecked++;
          
          if (pageResult.html) {
            const emails = extractEmailsFromHtml(pageResult.html);
            for (const email of emails) {
              if (!emailCandidates.some(c => c.email === email)) {
                emailCandidates.push({ email, sourceUrl: fallbackUrl, context: 'contact_page' });
              }
            }
            
            // Found emails on fallback, can stop
            if (emailCandidates.length > 0) break;
          }
        }
      }
    }

    // Select best email from all candidates
    const result = selectBestEmail(emailCandidates, websiteHost);

    if (result) {
      console.log(`[extract-email] Found email: ${result.email} (${result.confidence})`);
      res.status(200).json({
        success: true,
        emailFound: true,
        email: result.email,
        emailSourceUrl: result.sourceUrl,
        confidence: result.confidence,
        checkedUrls,
      } as ExtractEmailResponse);
    } else {
      console.log(`[extract-email] No email found after checking ${checkedUrls.length} URLs`);
      res.status(200).json({
        success: true,
        emailFound: false,
        checkedUrls,
      } as ExtractEmailResponse);
    }

  } catch (error: any) {
    console.error('[extract-email] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract email',
      emailFound: false,
      checkedUrls: [],
    });
  }
}

