import { create } from 'zustand';
import { ALL_VIBES } from '../utils/vibes';

export interface EventFilters {
  // Location
  country: string | null;
  city: string | null;
  
  // Group Size
  groupSize: 'tiny' | 'small' | 'larger' | null; // 2-5, 5-10, 10+
  
  // Session Frequency
  sessionFrequency: string[]; // Multiple allowed: ["Weekly", "Monthly", etc.]
  
  // Session Mode
  sessionMode: string[]; // Multiple allowed: ["In-Person", "Remote"]
  
  // Vibes
  vibes: string[]; // Multiple vibes selected
  
  // Circle Continuity
  circleContinuity: 'startingSoon' | 'ongoing' | null;
}

interface FilterStore {
  filters: EventFilters;
  isFilterDrawerOpen: boolean;
  setFilter: <K extends keyof EventFilters>(key: K, value: EventFilters[K]) => void;
  resetFilters: () => void;
  setFilterDrawerOpen: (open: boolean) => void;
  getActiveFilterCount: () => number;
}

const defaultFilters: EventFilters = {
  country: null,
  city: null,
  groupSize: null,
  sessionFrequency: [],
  sessionMode: [],
  vibes: [],
  circleContinuity: null,
};

export const useFilterStore = create<FilterStore>((set, get) => ({
  filters: defaultFilters,
  isFilterDrawerOpen: false,
  
  setFilter: (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    }));
  },
  
  resetFilters: () => {
    set({ filters: defaultFilters });
  },
  
  setFilterDrawerOpen: (open) => {
    set({ isFilterDrawerOpen: open });
  },
  
  getActiveFilterCount: () => {
    const { filters } = get();
    let count = 0;
    
    if (filters.country) count++;
    if (filters.city) count++;
    if (filters.groupSize) count++;
    if (filters.sessionFrequency.length > 0) count++;
    if (filters.sessionMode.length > 0) count++;
    if (filters.vibes.length > 0) count++;
    if (filters.circleContinuity) count++;
    
    return count;
  },
}));

