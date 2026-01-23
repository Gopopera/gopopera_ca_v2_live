/**
 * Centralized location utilities for US + Canada support.
 * 
 * This module provides consistent location handling across the app:
 * - Normalizes city names with country suffixes (", CA" / ", US")
 * - Detects country from city suffix or event.country field
 * - Provides a single matchesLocationFilter() for all filtering
 * 
 * BACKWARD COMPATIBILITY:
 * - Existing events with "Montreal, CA" and no country field still work
 * - Existing events with country="Canada" work
 * - "Canada" filter shows all Canadian events
 * - "All Locations" shows everything
 * 
 * SAFETY:
 * - Unknown cities (no suffix, no country) do NOT default to Canada for filtering
 * - Geocoding returns empty string for unknown cities (safe fallback)
 */

// =============================================================================
// REGEX PATTERNS
// =============================================================================

/** Matches ", CA", ", US", ", USA", ", Canada", ", United States" at end (case-insensitive) */
const ANY_COUNTRY_SUFFIX_REGEX = /,\s*(ca|us|usa|canada|united states)$/i;

const ALL_LOCATIONS_ALIASES = new Set([
  'all locations',
  'all',
  'everywhere',
  'world',
  'worldwide',
  'global',
]);

const EUROPE_ALIASES = new Set([
  'europe',
  'eu',
  'european union',
]);

const EUROPE_COUNTRIES = new Set([
  'Albania',
  'Andorra',
  'Austria',
  'Belarus',
  'Belgium',
  'Bosnia and Herzegovina',
  'Bulgaria',
  'Croatia',
  'Cyprus',
  'Czechia',
  'Denmark',
  'Estonia',
  'Finland',
  'France',
  'Germany',
  'Greece',
  'Hungary',
  'Iceland',
  'Ireland',
  'Italy',
  'Kosovo',
  'Latvia',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Malta',
  'Moldova',
  'Monaco',
  'Montenegro',
  'Netherlands',
  'North Macedonia',
  'Norway',
  'Poland',
  'Portugal',
  'Romania',
  'San Marino',
  'Serbia',
  'Slovakia',
  'Slovenia',
  'Spain',
  'Sweden',
  'Switzerland',
  'Ukraine',
  'United Kingdom',
  'Vatican City',
]);

const COUNTRY_ALIASES: Record<string, string> = {
  // North America
  'ca': 'Canada',
  'can': 'Canada',
  'canada': 'Canada',
  'us': 'United States',
  'usa': 'United States',
  'united states': 'United States',
  'unitedstates': 'United States',
  'america': 'United States',

  // Europe (common)
  'fr': 'France',
  'france': 'France',
  'de': 'Germany',
  'germany': 'Germany',
  'es': 'Spain',
  'spain': 'Spain',
  'it': 'Italy',
  'italy': 'Italy',
  'uk': 'United Kingdom',
  'united kingdom': 'United Kingdom',
  'great britain': 'United Kingdom',
  'gb': 'United Kingdom',
  'nl': 'Netherlands',
  'netherlands': 'Netherlands',
  'be': 'Belgium',
  'belgium': 'Belgium',
  'ch': 'Switzerland',
  'switzerland': 'Switzerland',
  'se': 'Sweden',
  'sweden': 'Sweden',
  'no': 'Norway',
  'norway': 'Norway',
  'pt': 'Portugal',
  'portugal': 'Portugal',
  'ie': 'Ireland',
  'ireland': 'Ireland',
  'pl': 'Poland',
  'poland': 'Poland',
  'at': 'Austria',
  'austria': 'Austria',
  'dk': 'Denmark',
  'denmark': 'Denmark',
  'fi': 'Finland',
  'finland': 'Finland',
  'gr': 'Greece',
  'greece': 'Greece',
};

const NORMALIZED_COUNTRY_CANONICALS = new Set(
  Object.values(COUNTRY_ALIASES).map(normalizeCountryToken)
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize a city/location token for comparison.
 * - Trims whitespace
 * - Lowercases
 * - Removes trailing country suffix (", CA", ", US", ", USA", ", Canada", ", United States")
 * - Replaces hyphens with spaces (e.g., "new-york" → "new york")
 * 
 * @example
 * normalizeCityToken("Montreal, CA") → "montreal"
 * normalizeCityToken("New York, US") → "new york"
 * normalizeCityToken("new-york") → "new york"
 * normalizeCityToken("  TORONTO ,  CA  ") → "toronto"
 */
export function normalizeCityToken(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(ANY_COUNTRY_SUFFIX_REGEX, '')
    .replace(/-/g, ' ')
    .trim();
}

/**
 * Normalize a country token for comparison.
 */
function normalizeCountryToken(str: string | undefined | null): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[().']/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Extract country token from a city string when it has a comma suffix.
 * e.g., "Paris, FR" -> "FR"
 */
function getCountryTokenFromCity(city: string | undefined | null): string | null {
  if (!city) return null;
  const idx = city.lastIndexOf(',');
  if (idx === -1) return null;
  return city.slice(idx + 1).trim();
}

/**
 * Resolve aliases / variants to a canonical country name.
 */
function resolveCountryName(token: string | undefined | null): string | undefined {
  if (!token) return undefined;
  const normalized = normalizeCountryToken(token);
  return COUNTRY_ALIASES[normalized] || (normalized ? token.trim() : undefined);
}

function isEventInEurope(event: { city?: string; country?: string }): boolean {
  const country = getCountryFromEvent(event);
  return !!country && EUROPE_COUNTRIES.has(country);
}

/**
 * Extract country code suffix from a city string.
 * Returns "CA", "US", or null if not found.
 * 
 * Handles: ", CA", ", US", ", USA", ", Canada", ", United States" (case-insensitive)
 * 
 * @example
 * getCountrySuffixFromCity("Montreal, CA") → "CA"
 * getCountrySuffixFromCity("New York, US") → "US"
 * getCountrySuffixFromCity("Miami, USA") → "US"
 * getCountrySuffixFromCity("Toronto, Canada") → "CA"
 * getCountrySuffixFromCity("Paris") → null
 */
export function getCountrySuffixFromCity(city: string | undefined | null): 'CA' | 'US' | null {
  if (!city) return null;
  const trimmed = city.trim();
  
  // Check for short suffixes (case-insensitive)
  if (/,\s*ca$/i.test(trimmed)) return 'CA';
  if (/,\s*us$/i.test(trimmed)) return 'US';
  if (/,\s*usa$/i.test(trimmed)) return 'US';
  
  // Check for full country names
  if (/,\s*canada$/i.test(trimmed)) return 'CA';
  if (/,\s*united states$/i.test(trimmed)) return 'US';
  
  return null;
}

/**
 * Get the country for an event, checking both event.country and city suffix.
 * Returns normalized country name: "Canada", "United States", or undefined.
 * 
 * Priority:
 * 1. event.country (if exists and valid)
 * 2. Inferred from event.city suffix
 * 
 * SAFETY: Returns undefined for unknown cities (does NOT default to Canada)
 * 
 * @example
 * getCountryFromEvent({ city: "Montreal, CA" }) → "Canada"
 * getCountryFromEvent({ city: "NYC", country: "United States" }) → "United States"
 * getCountryFromEvent({ city: "Paris" }) → undefined
 */
export function getCountryFromEvent(event: { city?: string; country?: string }): string | undefined {
  // 1. Check explicit country field first
  if (event.country) {
    return resolveCountryName(event.country);
  }

  // 2. Infer from city suffix (e.g., "Paris, FR")
  const suffixToken = getCountryTokenFromCity(event.city);
  if (suffixToken) {
    return resolveCountryName(suffixToken);
  }

  // SAFETY: Unknown cities return undefined (not assumed to be any country)
  return undefined;
}

/**
 * Check if an event matches the selected location filter.
 * 
 * Filter types:
 * - "All Locations" / "all locations" / "all-locations" → matches everything
 * - "Canada" → matches events in Canada (by country field OR city suffix)
 * - "United States" / "united-states" → matches events in US
 * - Specific city like "Montreal, CA" → matches by normalized city name
 * 
 * SAFETY:
 * - Unknown cities (no suffix, no country) do NOT match "Canada" or "United States"
 * - Only explicit country field or city suffix triggers country match
 * 
 * @example
 * matchesLocationFilter({ city: "Montreal, CA" }, "Canada") → true
 * matchesLocationFilter({ city: "Montreal, CA" }, "montreal") → true
 * matchesLocationFilter({ city: "Montreal, CA" }, "United States") → false
 * matchesLocationFilter({ city: "Paris" }, "Canada") → false (unknown != Canada)
 */
export function matchesLocationFilter(
  event: { city?: string; country?: string },
  selectedCity: string | undefined | null
): boolean {
  // No filter → show everything
  if (!selectedCity || !selectedCity.trim()) return true;

  const normalizedFilter = normalizeCountryToken(selectedCity);

  // "All Locations" variants
  if (ALL_LOCATIONS_ALIASES.has(normalizedFilter)) {
    return true;
  }

  // Europe region filter
  if (EUROPE_ALIASES.has(normalizedFilter)) {
    return isEventInEurope(event);
  }

  // Country-level filters (includes aliases)
  const filterCountry =
    COUNTRY_ALIASES[normalizedFilter] ||
    (NORMALIZED_COUNTRY_CANONICALS.has(normalizedFilter) ? selectedCity.trim() : undefined);

  if (filterCountry) {
    const eventCountry = getCountryFromEvent(event);
    return (
      !!eventCountry &&
      normalizeCountryToken(eventCountry) === normalizeCountryToken(filterCountry)
    );
  }

  // City-level filter: strict matching
  const eventCity = event.city || '';
  if (!eventCity) return false;

  const normalizedEventCity = normalizeCityToken(eventCity);
  const normalizedFilterCity = normalizeCityToken(selectedCity);

  if (!normalizedFilterCity) return false;

  // Exact match after normalization (e.g., "montreal" === "montreal")
  if (normalizedEventCity === normalizedFilterCity) {
    return true;
  }

  // For multi-word filters, check if event city STARTS with filter or vice versa
  // This prevents "tor" matching "toronto" but allows "new york" to match "new york city"
  // Only allow includes() for filters >= 4 chars to prevent false positives
  if (normalizedFilterCity.length >= 4) {
    if (normalizedEventCity.includes(normalizedFilterCity) || 
        normalizedFilterCity.includes(normalizedEventCity)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract country for geocoding from a city string.
 * Returns ", United States", ", Canada", or "" (empty) if no country detected.
 * 
 * SAFETY: Returns empty string (not a wrong country) if unsure.
 * 
 * @example
 * getGeocodingCountrySuffix("Montreal, CA") → ", Canada"
 * getGeocodingCountrySuffix("New York, US") → ", United States"
 * getGeocodingCountrySuffix("Paris") → ""
 */
export function getGeocodingCountrySuffix(city: string | undefined | null): string {
  if (!city) return '';
  
  const suffix = getCountrySuffixFromCity(city);
  if (suffix === 'CA') return ', Canada';
  if (suffix === 'US') return ', United States';
  
  return '';
}

// =============================================================================
// DEV-ONLY: Real Data Validator
// =============================================================================

/**
 * DEV-ONLY: Validate location logic against real event data.
 * 
 * Usage:
 * 1. In browser console: window.__POPERA_VALIDATE_LOCATIONS__ = true
 * 2. Reload the page or call validateLocationsWithRealData(events)
 * 
 * Prints:
 * - Count of events by country detection method
 * - Unknown/suspicious city values
 * - Filter test results
 */
export function validateLocationsWithRealData(events: { city?: string; country?: string }[]): void {
  // Only run in dev mode
  if (!import.meta.env.DEV) {
    console.warn('[location] validateLocationsWithRealData only runs in dev mode');
    return;
  }
  
  console.group('🗺️ Location Validation Report');
  
  // Count by detection method
  let caSuffix = 0, usSuffix = 0, countryCA = 0, countryUS = 0, unknown = 0;
  const unknownCities: string[] = [];
  const allCities = new Map<string, number>();
  
  events.forEach(event => {
    const city = event.city || '(empty)';
    allCities.set(city, (allCities.get(city) || 0) + 1);
    
    const suffix = getCountrySuffixFromCity(event.city);
    const country = getCountryFromEvent(event);
    
    if (suffix === 'CA') caSuffix++;
    else if (suffix === 'US') usSuffix++;
    
    if (event.country?.toLowerCase() === 'canada') countryCA++;
    else if (event.country?.toLowerCase() === 'united states') countryUS++;
    
    if (!country) {
      unknown++;
      if (!unknownCities.includes(city)) unknownCities.push(city);
    }
  });
  
  console.log('📊 Event Counts:');
  console.table({
    'Total events': events.length,
    'CA suffix (e.g., Montreal, CA)': caSuffix,
    'US suffix (e.g., New York, US)': usSuffix,
    'country="Canada"': countryCA,
    'country="United States"': countryUS,
    'Unknown (no suffix, no country)': unknown,
  });
  
  // Show unknown cities
  if (unknownCities.length > 0) {
    console.log('⚠️ Unknown/suspicious cities (first 20):');
    console.log(unknownCities.slice(0, 20));
  }
  
  // Show top cities
  console.log('📍 Top 20 city values:');
  const sortedCities = [...allCities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.table(Object.fromEntries(sortedCities));
  
  // Test filters
  console.log('🧪 Filter Tests:');
  const testFilters = ['All Locations', 'Canada', 'United States', 'Montreal, CA', 'New York, US'];
  testFilters.forEach(filter => {
    const matches = events.filter(e => matchesLocationFilter(e, filter)).length;
    console.log(`  "${filter}": ${matches}/${events.length} events match`);
  });
  
  console.groupEnd();
}

// Auto-run validator if flag is set (dev only)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // @ts-ignore
  window.__validatePoperaLocations = (events: any[]) => validateLocationsWithRealData(events);
}
