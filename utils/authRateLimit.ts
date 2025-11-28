/**
 * Rate limiting for authentication attempts
 * Tracks failed login attempts and blocks accounts after 5 failures for 10 minutes
 */

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const STORAGE_KEY_PREFIX = 'auth_failed_attempts_';

interface FailedAttempts {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
}

/**
 * Get failed attempts for an email
 */
export function getFailedAttempts(email: string): FailedAttempts {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { count: 0, lastAttempt: 0 };
  }

  try {
    const key = `${STORAGE_KEY_PREFIX}${email.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    if (!stored) {
      return { count: 0, lastAttempt: 0 };
    }

    const data: FailedAttempts = JSON.parse(stored);
    
    // Check if block has expired
    if (data.blockedUntil && Date.now() < data.blockedUntil) {
      return data; // Still blocked
    }
    
    // Block expired, reset if it's been more than 10 minutes since last attempt
    if (data.blockedUntil && Date.now() >= data.blockedUntil) {
      // Reset after block expires
      if (Date.now() - data.lastAttempt > BLOCK_DURATION_MS) {
        clearFailedAttempts(email);
        return { count: 0, lastAttempt: 0 };
      }
    }
    
    return data;
  } catch (error) {
    console.error('[AUTH_RATE_LIMIT] Error reading failed attempts:', error);
    return { count: 0, lastAttempt: 0 };
  }
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(email: string): FailedAttempts {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { count: 1, lastAttempt: Date.now() };
  }

  try {
    const key = `${STORAGE_KEY_PREFIX}${email.toLowerCase()}`;
    const current = getFailedAttempts(email);
    const now = Date.now();
    
    // Reset count if last attempt was more than 10 minutes ago
    let count = current.count;
    if (now - current.lastAttempt > BLOCK_DURATION_MS) {
      count = 0;
    }
    
    count += 1;
    const blockedUntil = count >= MAX_ATTEMPTS ? now + BLOCK_DURATION_MS : undefined;
    
    const data: FailedAttempts = {
      count,
      lastAttempt: now,
      blockedUntil,
    };
    
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('[AUTH_RATE_LIMIT] Error recording failed attempt:', error);
    return { count: 1, lastAttempt: Date.now() };
  }
}

/**
 * Clear failed attempts (on successful login)
 */
export function clearFailedAttempts(email: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const key = `${STORAGE_KEY_PREFIX}${email.toLowerCase()}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('[AUTH_RATE_LIMIT] Error clearing failed attempts:', error);
  }
}

/**
 * Check if account is blocked
 */
export function isAccountBlocked(email: string): { blocked: boolean; remainingTime?: number } {
  const attempts = getFailedAttempts(email);
  
  if (attempts.blockedUntil && Date.now() < attempts.blockedUntil) {
    const remainingTime = Math.ceil((attempts.blockedUntil - Date.now()) / 1000 / 60); // minutes
    return { blocked: true, remainingTime };
  }
  
  return { blocked: false };
}

/**
 * Get remaining attempts before block
 */
export function getRemainingAttempts(email: string): number {
  const attempts = getFailedAttempts(email);
  return Math.max(0, MAX_ATTEMPTS - attempts.count);
}

