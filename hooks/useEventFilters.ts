import { useMemo } from 'react';
import { Event } from '@/types';
import { categoryMatches } from '@/utils/categoryMapper';
import { useEventStore } from '@/stores/eventStore';

interface UseEventFiltersOptions {
  city?: string;
  category?: string;
  searchQuery?: string;
  isDemo?: boolean;
  isOfficialLaunch?: boolean;
  includeDemo?: boolean;
  includeOfficialLaunch?: boolean;
}

/**
 * Shared hook for filtering events consistently across all pages
 * Handles city, category, search, and event type filtering
 */
export const useEventFilters = (
  events: Event[],
  options: UseEventFiltersOptions = {}
): Event[] => {
  const {
    city,
    category = 'All',
    searchQuery = '',
    isDemo,
    isOfficialLaunch,
    includeDemo = true,
    includeOfficialLaunch = true,
  } = options;

  return useMemo(() => {
    let filtered = [...events];

    // Filter by event type (demo vs official launch)
    if (isDemo !== undefined) {
      filtered = filtered.filter(event => event.isDemo === isDemo);
    }
    if (isOfficialLaunch !== undefined) {
      filtered = filtered.filter(event => event.isOfficialLaunch === isOfficialLaunch);
    }
    if (!includeDemo) {
      filtered = filtered.filter(event => !event.isDemo);
    }
    if (!includeOfficialLaunch) {
      filtered = filtered.filter(event => !event.isOfficialLaunch);
    }

    // Apply category filter
    if (category && category !== 'All') {
      filtered = filtered.filter(event => 
        categoryMatches(event.category, category)
      );
    }

    // Apply city filter
    if (city && city.trim()) {
      const cityName = city.split(',')[0].trim();
      filtered = filtered.filter(event => 
        event.city.toLowerCase().includes(cityName.toLowerCase())
      );
    }

    // Apply search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.hostName.toLowerCase().includes(query) ||
        event.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [events, city, category, searchQuery, isDemo, isOfficialLaunch, includeDemo, includeOfficialLaunch]);
};

