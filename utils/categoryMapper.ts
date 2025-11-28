/**
 * Maps display category names (from UI buttons) to actual event category values
 * Handles plural/singular variations and case-insensitive matching
 */
export const normalizeCategory = (displayCategory: string): string => {
  const categoryMap: Record<string, string> = {
    'All': 'All',
    'Community': 'Community',
    'Music': 'Music',
    'Markets': 'Markets',     // UI and events both use plural
    'Market': 'Markets',       // Map singular to plural
    'Workshops': 'Workshop',  // UI uses plural, events use singular
    'Workshop': 'Workshop',   // Also handle singular
    'Sports': 'Sports',
    'Social': 'Social',
    'Shows': 'Shows',
    'Food & Drink': 'Food & Drink',
    'Wellness': 'Wellness',
    // French translations
    'Tous': 'All',
    'Communauté': 'Community',
    'Musique': 'Music',
    'Marchés': 'Markets',
    'Marché': 'Markets',
    'Ateliers': 'Workshop',
    'Atelier': 'Workshop',
    'Sports': 'Sports',
    'Social': 'Social',
    'Spectacles': 'Shows',
    'Nourriture et boissons': 'Food & Drink',
    'Bien-être': 'Wellness',
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
 * Translates category name based on current language
 */
export const translateCategory = (category: string, language: 'en' | 'fr' = 'en'): string => {
  const categoryTranslations: Record<string, { en: string; fr: string }> = {
    'All': { en: 'All', fr: 'Tous' },
    'Community': { en: 'Community', fr: 'Communauté' },
    'Music': { en: 'Music', fr: 'Musique' },
    'Markets': { en: 'Markets', fr: 'Marchés' },
    'Market': { en: 'Market', fr: 'Marché' },
    'Workshop': { en: 'Workshop', fr: 'Atelier' },
    'Workshops': { en: 'Workshops', fr: 'Ateliers' },
    'Sports': { en: 'Sports', fr: 'Sports' },
    'Social': { en: 'Social', fr: 'Social' },
    'Shows': { en: 'Shows', fr: 'Spectacles' },
    'Food & Drink': { en: 'Food & Drink', fr: 'Nourriture et boissons' },
    'Wellness': { en: 'Wellness', fr: 'Bien-être' },
  };

  const translation = categoryTranslations[category];
  if (translation) {
    return translation[language];
  }
  
  // Fallback to original if no translation found
  return category;
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
    'Markets': ['Markets', 'Market'],
    'Market': ['Markets', 'Market'],
    'Workshop': ['Workshop', 'Workshops'],
    'Workshops': ['Workshop', 'Workshops'],
  };
  
  const eventVariations = pluralVariations[normalizedEvent] || [normalizedEvent];
  const displayVariations = pluralVariations[normalizedDisplay] || [normalizedDisplay];
  
  return eventVariations.some(ev => displayVariations.includes(ev));
};

