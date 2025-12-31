/**
 * Centralized Email Configuration
 * 
 * All outgoing emails MUST use these constants to ensure consistent
 * sender identity across all Resend API calls.
 * 
 * IMPORTANT: Never use a bare email address (e.g., 'support@gopopera.ca')
 * without the display name. Always use RESEND_FROM which includes "Popera <...>".
 */

/**
 * Default From address with display name.
 * Format: "Display Name <email@domain.com>"
 * 
 * This can be overridden via RESEND_FROM environment variable.
 * If you need to change the sender name, update the env var to:
 *   RESEND_FROM="Popera Support <support@gopopera.ca>"
 */
export const RESEND_FROM = process.env.RESEND_FROM ?? 'Popera <support@gopopera.ca>';

/**
 * Reply-To email address.
 * This is where replies should go - always use the support email, 
 * NOT any personal email like eatezca@gmail.com.
 */
export const RESEND_REPLY_TO = 'support@gopopera.ca';

/**
 * Resend API Key (server-side only).
 * Falls back to VITE_ prefixed version for legacy compatibility.
 */
export const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;

