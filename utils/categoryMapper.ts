/**
 * Maps display category names (from UI buttons) to actual event category values
 * Handles plural/singular variations and case-insensitive matching
 */
export const normalizeCategory = (displayCategory: string): string => {
  const categoryMap: Record<string, string> = {
    'All': 'All',
    'Community': 'Community',
    'Music': 'Music',
    'Markets': 'Market',      // UI uses plural, events use singular
    'Market': 'Market',       // Also handle singular
    'Workshops': 'Workshop',  // UI uses plural, events use singular
    'Workshop': 'Workshop',   // Also handle singular
    'Sports': 'Sports',
    'Social': 'Social',
    'Shows': 'Shows',
    'Food & Drink': 'Food & Drink',
    'Wellness': 'Wellness',
  };

  // Return mapped value or original if not found (case-insensitive)
  const normalized = categoryMap[displayCategory] || displayCategory;
  
  // Fallback: try case-insensitive match
  const lowerDisplay = displayCategory.toLowerCase();
  for (const [key, value] of Object.entries(categoryMap)) {
    if (key.toLowerCase() === lowerDisplay) {
      return value;
    }
  }
  
  return normalized;
};

/**
 * Checks if an event category matches a display category (handles plural/singular)
 */
export const categoryMatches = (eventCategory: string, displayCategory: string): boolean => {
  if (displayCategory === 'All') return true;
  
  const normalizedDisplay = normalizeCategory(displayCategory);
  const normalizedEvent = normalizeCategory(eventCategory);
  
  // Direct match
  if (normalizedDisplay === normalizedEvent) return true;
  
  // Case-insensitive match
  if (normalizedDisplay.toLowerCase() === normalizedEvent.toLowerCase()) return true;
  
  // Handle plural/singular variations
  const pluralVariations: Record<string, string[]> = {
    'Market': ['Market', 'Markets'],
    'Markets': ['Market', 'Markets'],
    'Workshop': ['Workshop', 'Workshops'],
    'Workshops': ['Workshop', 'Workshops'],
  };
  
  const eventVariations = pluralVariations[normalizedEvent] || [normalizedEvent];
  const displayVariations = pluralVariations[normalizedDisplay] || [normalizedDisplay];
  
  return eventVariations.some(ev => displayVariations.includes(ev));
};

