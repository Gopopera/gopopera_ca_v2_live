import { Event } from '../types';
import { EventFilters } from '../stores/filterStore';
import { getCircleContinuity, getAvailableSpots } from './eventHelpers';
import { getMainCategory, normalizeCategory, type MainCategory } from './categoryMapper';

/**
 * Apply filters to events array
 */
export function applyEventFilters(events: Event[], filters: EventFilters): Event[] {
  let filtered = [...events];

  // Main category filter (uses getMainCategory for fallback derivation)
  // Backward compatible: matches both new and legacy category values
  if (filters.mainCategory) {
    filtered = filtered.filter(event => {
      // Get the normalized category from the event (handles legacy values)
      const eventCategory = getMainCategory(event);
      // Compare with the filter category
      return eventCategory === filters.mainCategory;
    });
  }

  // Location filters
  if (filters.country) {
    filtered = filtered.filter(event => event.country === filters.country);
  }
  if (filters.city) {
    filtered = filtered.filter(event => event.city === filters.city);
  }

  // Group size filter
  if (filters.groupSize) {
    filtered = filtered.filter(event => {
      if (!event.capacity) return false; // No capacity = can't determine size
      
      const capacity = event.capacity;
      switch (filters.groupSize) {
        case 'tiny':
          return capacity >= 2 && capacity <= 5;
        case 'small':
          return capacity > 5 && capacity <= 10;
        case 'larger':
          return capacity > 10;
        default:
          return true;
      }
    });
  }

  // Session frequency filter
  if (filters.sessionFrequency.length > 0) {
    filtered = filtered.filter(event => 
      event.sessionFrequency && filters.sessionFrequency.includes(event.sessionFrequency)
    );
  }

  // Session mode filter
  if (filters.sessionMode.length > 0) {
    filtered = filtered.filter(event => 
      event.sessionMode && filters.sessionMode.includes(event.sessionMode)
    );
  }

  // Vibes filter (event must have at least one of the selected vibes)
  if (filters.vibes.length > 0) {
    filtered = filtered.filter(event => {
      if (!event.vibes || event.vibes.length === 0) return false;
      // Event must have at least one of the selected vibes
      return filters.vibes.some(vibe => event.vibes?.includes(vibe));
    });
  }

  // Circle continuity filter
  if (filters.circleContinuity) {
    filtered = filtered.filter(event => {
      const continuity = getCircleContinuity(event);
      return continuity === filters.circleContinuity;
    });
  }

  return filtered;
}

