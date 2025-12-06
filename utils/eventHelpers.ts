import { Event } from '../types';

/**
 * Calculate available spots for an event
 */
export function getAvailableSpots(event: Event): number | null {
  if (event.capacity === undefined || event.capacity === null) {
    return null; // Unlimited capacity
  }
  const attendees = event.attendeesCount || 0;
  return Math.max(0, event.capacity - attendees);
}

/**
 * Determine circle continuity status
 * Returns "ongoing" if event has started and has spots, "startingSoon" if not started yet
 */
export function getCircleContinuity(event: Event): 'ongoing' | 'startingSoon' | null {
  if (!event.startDate) {
    // If no startDate, try to infer from date string
    if (!event.date) {
      return null;
    }
    // Parse date string (format: "YYYY-MM-DD")
    const eventDate = new Date(event.date + 'T' + (event.time || '12:00'));
    const now = new Date();
    
    if (eventDate > now) {
      return 'startingSoon';
    } else {
      const availableSpots = getAvailableSpots(event);
      return availableSpots !== null && availableSpots > 0 ? 'ongoing' : null;
    }
  }
  
  // Use startDate timestamp
  const eventStart = new Date(event.startDate);
  const now = new Date();
  
  if (eventStart > now) {
    return 'startingSoon';
  } else {
    const availableSpots = getAvailableSpots(event);
    return availableSpots !== null && availableSpots > 0 ? 'ongoing' : null;
  }
}

/**
 * Get circle continuity display text
 * Returns formatted text for "Starting Soon" or "Ongoing — X Weeks"
 * Uses durationWeeks if available, otherwise calculates from startDate
 */
export function getCircleContinuityText(event: Event): { text: string; type: 'startingSoon' | 'ongoing' } | null {
  const continuity = getCircleContinuity(event);
  
  if (continuity === 'ongoing') {
    // Use durationWeeks if available, otherwise calculate from startDate
    const durationWeeks = (event as any).durationWeeks;
    let weeks = 0;
    
    if (typeof durationWeeks === 'number' && durationWeeks > 0) {
      weeks = durationWeeks;
    } else if (event.startDate) {
      const start = new Date(event.startDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - start.getTime());
      weeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    }
    
    const text = weeks > 0 ? `Ongoing — ${weeks} Week${weeks !== 1 ? 's' : ''}` : 'Ongoing';
    return { text, type: 'ongoing' };
  } else if (continuity === 'startingSoon') {
    return { text: 'Starting Soon', type: 'startingSoon' };
  }
  
  return null;
}

/**
 * Get session frequency display text
 * Maps: weekly → 'Weekly Session', monthly → 'Monthly Session', one-time → 'One-Time Session'
 * Filters out "flexible" - returns empty string if frequency is flexible or unknown
 */
export function getSessionFrequencyText(frequency?: string): string {
  if (!frequency) return '';
  
  // Normalize to lowercase for comparison
  const normalized = frequency.toLowerCase().trim();
  
  // Filter out "flexible" - it's no longer a valid option
  if (normalized === 'flexible') {
    return '';
  }
  
  const frequencyMap: Record<string, string> = {
    'weekly': 'Weekly Session',
    'monthly': 'Monthly Session',
    'one-time': 'One-Time Session',
    'onetime': 'One-Time Session',
  };
  
  return frequencyMap[normalized] || '';
}

/**
 * Get session mode display text
 * Maps: In-Person → 'In-Person Session', Remote → 'Remote Session'
 */
export function getSessionModeText(mode?: string): string {
  if (!mode) return '';
  
  // Normalize for comparison
  const normalized = mode.toLowerCase();
  
  const modeMap: Record<string, string> = {
    'in-person': 'In-Person Session',
    'inperson': 'In-Person Session',
    'remote': 'Remote Session',
  };
  
  return modeMap[normalized] || mode;
}

