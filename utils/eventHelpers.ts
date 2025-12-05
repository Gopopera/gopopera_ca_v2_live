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
 */
export function getCircleContinuityText(event: Event): string | null {
  const continuity = getCircleContinuity(event);
  
  if (continuity === 'ongoing') {
    // Calculate weeks since start
    let weeks = 0;
    if (event.startDate) {
      const start = new Date(event.startDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - start.getTime());
      weeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    }
    return weeks > 0 ? `Ongoing (${weeks} week${weeks !== 1 ? 's' : ''})` : 'Ongoing';
  } else if (continuity === 'startingSoon') {
    return 'Starting Soon';
  }
  
  return null;
}

/**
 * Get session frequency display text
 */
export function getSessionFrequencyText(frequency?: string): string {
  if (!frequency) return '';
  
  const frequencyMap: Record<string, string> = {
    'Weekly': 'Weekly',
    'Monthly': 'Monthly',
    'One-Time': 'One-Time Session',
    'Flexible': 'Flexible',
  };
  
  return frequencyMap[frequency] || frequency;
}

/**
 * Get session mode display text
 */
export function getSessionModeText(mode?: string): string {
  if (!mode) return '';
  
  const modeMap: Record<string, string> = {
    'In-Person': 'In-Person',
    'Remote': 'Remote',
  };
  
  return modeMap[mode] || mode;
}

