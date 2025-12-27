// src/stores/cityStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { matchesLocationFilter } from '../../utils/location';

export type City =
  | "montreal" | "ottawa" | "gatineau" | "quebec" | "toronto" | "vancouver";

// localStorage keys for geo cache
const GEO_CACHE_KEY = 'popera:geoCache';
const GEO_CACHE_EXPIRY_DAYS = 7;
const MANUAL_LOCATION_KEY = 'popera:manualLocationSet';

// Allow arbitrary city names as strings, but keep City union for backward compatibility
type CityState = {
  selectedCity: string; // Now accepts any string, defaults to user's city or "Canada"
  isGeoInitialized: boolean; // Track if geo lookup has been attempted
  setCity: (c: string, isManual?: boolean) => void; // Accept any string, optionally mark as manual
  resetCity: () => void;
  initializeFromGeo: () => Promise<void>; // Initialize location from IP if not manually set
};

// Check if user has manually set location
function hasManualLocationSet(): boolean {
  try {
    return localStorage.getItem(MANUAL_LOCATION_KEY) === 'true';
  } catch {
    return false;
  }
}

// Mark location as manually set
function setManualLocationFlag(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(MANUAL_LOCATION_KEY, 'true');
    } else {
      localStorage.removeItem(MANUAL_LOCATION_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
}

// Get cached geo data if still valid
function getCachedGeo(): { city: string; region: string; country: string } | null {
  try {
    const cached = localStorage.getItem(GEO_CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const cachedAt = new Date(data.timestamp);
    const now = new Date();
    const daysDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > GEO_CACHE_EXPIRY_DAYS) {
      localStorage.removeItem(GEO_CACHE_KEY);
      return null;
    }
    
    return { city: data.city, region: data.region, country: data.country };
  } catch {
    return null;
  }
}

// Cache geo data
function setCachedGeo(city: string, region: string, country: string): void {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({
      city,
      region,
      country,
      timestamp: new Date().toISOString(),
    }));
  } catch {
    // Ignore localStorage errors
  }
}

// Single source of truth. Persist to localStorage.
export const useCityStore = create<CityState>()(
  persist(
    (set, get) => ({
      selectedCity: "All Locations", // Default: shows all events globally
      isGeoInitialized: false,
      
      setCity: (c: string, isManual = true) => {
        const normalized = c.trim() || "All Locations";
        set({ selectedCity: normalized });
        
        // If user manually set the city, remember that preference
        if (isManual) {
          setManualLocationFlag(true);
        }
      },
      
      resetCity: () => {
        set({ selectedCity: "All Locations" });
        setManualLocationFlag(false);
      },
      
      initializeFromGeo: async () => {
        // Skip if already initialized or user has manually set location
        if (get().isGeoInitialized || hasManualLocationSet()) {
          set({ isGeoInitialized: true });
          return;
        }
        
        // Check cache first
        const cached = getCachedGeo();
        if (cached && cached.city) {
          set({ 
            selectedCity: cached.city,
            isGeoInitialized: true,
          });
          return;
        }
        
        // Fetch from API
        try {
          const response = await fetch('/api/geo');
          if (!response.ok) {
            console.warn('[cityStore] Geo lookup failed, using default');
            set({ isGeoInitialized: true });
            return;
          }
          
          const data = await response.json();
          
          if (data.city) {
            // Cache the result
            setCachedGeo(data.city, data.region || '', data.country || '');
            
            // Set the city (without marking as manual)
            set({ 
              selectedCity: data.city,
              isGeoInitialized: true,
            });
          } else {
            set({ isGeoInitialized: true });
          }
        } catch (error) {
          console.warn('[cityStore] Geo lookup error:', error);
          set({ isGeoInitialized: true });
        }
      },
    }),
    { 
      name: "popera:selectedCity",
      // Only persist selectedCity, not isGeoInitialized
      partialize: (state) => ({ selectedCity: state.selectedCity }),
      // Ensure we have a valid default on rehydration
      onRehydrateStorage: () => (state) => {
        if (state && !state.selectedCity) {
          state.selectedCity = "All Locations";
        }
      },
    }
  )
);

// Lightweight selector hooks (avoid accidental re-renders)
export const useSelectedCity = (): string => useCityStore((s) => s.selectedCity);
export const useSetCity = () => useCityStore((s) => s.setCity);
export const resetCity = () => useCityStore.getState().resetCity();
export const initializeGeoLocation = () => useCityStore.getState().initializeFromGeo();

/**
 * Validate that the current city has events, otherwise fall back to "All Locations"
 * Call this after events are loaded to ensure the user sees results
 */
export function validateCityHasEvents(events: { city?: string; country?: string }[]): void {
  const state = useCityStore.getState();
  const currentCity = state.selectedCity;
  
  // If already a broad filter or user manually set it, don't override
  const lowerCity = currentCity.toLowerCase();
  if (lowerCity === 'all locations' || lowerCity === 'canada' || lowerCity === 'united states' || hasManualLocationSet()) {
    return;
  }
  
  // Check if any events match using centralized helper
  const hasEventsInCity = events.some(event => matchesLocationFilter(event, currentCity));
  
  // If no events in this city, fall back to All Locations
  if (!hasEventsInCity && events.length > 0) {
    console.log('[cityStore] No events in detected city, falling back to All Locations');
    state.setCity('All Locations', false); // Set without marking as manual
  }
}
