import { Event } from '../types';

/**
 * Check if an event has ended
 * An event is considered ended if its date + time has passed
 */
export function isEventEnded(event: Event): boolean {
  if (!event.date) return false;
  
  try {
    // Parse event date
    const eventDate = new Date(event.date);
    
    // If time is provided, parse it and add to date
    if (event.time) {
      const timeParts = event.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (timeParts) {
        let hours = parseInt(timeParts[1], 10);
        const minutes = parseInt(timeParts[2], 10);
        const period = timeParts[3]?.toUpperCase();
        
        // Convert to 24-hour format
        if (period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0;
        }
        
        eventDate.setHours(hours, minutes, 0, 0);
      }
    } else {
      // If no time, assume event ends at end of day (23:59:59)
      eventDate.setHours(23, 59, 59, 999);
    }
    
    // Compare with current time
    const now = new Date();
    return eventDate < now;
  } catch (error) {
    console.warn('[EVENT_DATE] Error parsing event date:', error, event);
    // If we can't parse the date, assume event hasn't ended
    return false;
  }
}

/**
 * Check if an event date has passed (simpler check, just date without time)
 */
export function isEventPast(event: Event): boolean {
  if (!event.date) return false;
  
  try {
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < today;
  } catch (error) {
    console.warn('[EVENT_DATE] Error parsing event date:', error, event);
    return false;
  }
}

