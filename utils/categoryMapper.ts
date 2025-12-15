/**
 * Main Category mapping for Circles + Sessions model
 * Maps stored values to display labels
 */

import type { Language } from '../translations';
import { translations } from '../translations';

export type MainCategory = 
  | 'curatedSales' 
  | 'connectPromote' 
  | 'mobilizeSupport' 
  | 'learnGrow';

// Main category keys for iteration
export const MAIN_CATEGORIES: MainCategory[] = [
  'curatedSales',
  'connectPromote',
  'mobilizeSupport',
  'learnGrow',
];

export const MAIN_CATEGORY_LABELS: Record<MainCategory, string> = {
  curatedSales: 'Sell & Shop',
  connectPromote: 'Connect & Promote',
  mobilizeSupport: 'Mobilize & Support',
  learnGrow: 'Learn & Grow',
};

/**
 * Mapping of vibes to main categories
 * Each vibe belongs to exactly one main category
 * Used for fallback derivation when mainCategory is not set
 */
export const VIBE_TO_CATEGORY: Record<string, MainCategory> = {
  // Sell & Shop (curatedSales)
  'Markets': 'curatedSales',
  'Hands-On': 'curatedSales',
  
  // Connect & Promote (connectPromote)
  'Social': 'connectPromote',
  'Music': 'connectPromote',
  'Performances': 'connectPromote',
  'Shows': 'connectPromote',
  'Sports': 'connectPromote', // Sports → Connect & Promote as specified
  'Food & Drink': 'connectPromote',
  
  // Mobilize & Support (mobilizeSupport)
  'Community': 'mobilizeSupport',
  'Purposeful': 'mobilizeSupport',
  'Outdoors': 'mobilizeSupport',
  
  // Learn & Grow (learnGrow)
  'Learning': 'learnGrow',
  'Workshops': 'learnGrow',
  'Creative': 'learnGrow',
  'Curious': 'learnGrow',
  'Wellness': 'learnGrow',
  'Spiritual': 'learnGrow',
  'Movement': 'learnGrow',
};

/**
 * Get vibes grouped by main category
 * Returns an object with category keys and arrays of vibes
 */
export function getVibesByCategory(): Record<MainCategory, string[]> {
  const result: Record<MainCategory, string[]> = {
    curatedSales: [],
    connectPromote: [],
    mobilizeSupport: [],
    learnGrow: [],
  };
  
  for (const [vibe, category] of Object.entries(VIBE_TO_CATEGORY)) {
    result[category].push(vibe);
  }
  
  return result;
}

/**
 * Get vibes for a specific main category
 */
export function getVibesForCategory(category: MainCategory): string[] {
  return Object.entries(VIBE_TO_CATEGORY)
    .filter(([_, cat]) => cat === category)
    .map(([vibe]) => vibe);
}

/**
 * Get main category from an item (event/circle)
 * Uses mainCategory if set, otherwise derives from first vibe
 * Returns null if no category can be determined
 */
export function getMainCategory(item: { mainCategory?: string | null; vibes?: string[] | null; category?: string | null }): MainCategory | null {
  // If mainCategory exists and is valid, use it
  if (item.mainCategory && isValidMainCategory(item.mainCategory)) {
    return item.mainCategory as MainCategory;
  }
  
  // Try to derive from vibes
  if (item.vibes && item.vibes.length > 0) {
    for (const vibe of item.vibes) {
      const category = VIBE_TO_CATEGORY[vibe];
      if (category) {
        return category;
      }
    }
  }
  
  // Fall back to mapping from old category field
  if (item.category) {
    return mapOldCategoryToMainCategory(item.category);
  }
  
  // No category can be determined
  return null;
}

/**
 * Map old category values to new mainCategory system
 * Handles backward compatibility for existing events
 */
export function mapOldCategoryToMainCategory(oldCategory?: string | null): MainCategory {
  if (!oldCategory) {
    // Default to connectPromote if no category exists
    return 'connectPromote';
  }

  const normalized = oldCategory.toLowerCase().trim();

  // Map old categories to new system
  const categoryMap: Record<string, MainCategory> = {
    // Old category values
    'social': 'connectPromote',
    'experiences': 'learnGrow',
    'shopping': 'curatedSales',
    'gatherings': 'mobilizeSupport',
    // Handle old mainCategory format (with "And")
    'connectandpromote': 'connectPromote',
    'mobilizeandsupport': 'mobilizeSupport',
    'learnandgrow': 'learnGrow',
    // Handle new format (without "And")
    'connectpromote': 'connectPromote',
    'mobilizesupport': 'mobilizeSupport',
    'learngrow': 'learnGrow',
    'curatedsales': 'curatedSales',
  };

  return categoryMap[normalized] || 'connectPromote';
}

/**
 * Get mainCategory from event, with backward compatibility
 * Checks mainCategory first, then falls back to category field
 */
export function getMainCategoryFromEvent(event: { mainCategory?: string | null; category?: string | null }): MainCategory {
  // If mainCategory exists and is valid, use it
  if (event.mainCategory && isValidMainCategory(event.mainCategory)) {
    return event.mainCategory as MainCategory;
  }

  // Otherwise, map from old category field
  return mapOldCategoryToMainCategory(event.category);
}

/**
 * Get display label for main category from event
 * Handles backward compatibility automatically
 */
export function getMainCategoryLabelFromEvent(event: { mainCategory?: string | null; category?: string | null }): string {
  const mainCategory = getMainCategoryFromEvent(event);
  return getMainCategoryLabel(mainCategory);
}

/**
 * Get display label for main category
 * Falls back to "Circle" if category is missing or unknown
 */
export function getMainCategoryLabel(mainCategory?: string | null): string {
  if (!mainCategory) {
    return 'Circle';
  }
  
  // Handle both old and new formats (with and without "And")
  const normalized = mainCategory.toLowerCase().trim();
  const normalizedMap: Record<string, MainCategory> = {
    // New format (without "And")
    'connectpromote': 'connectPromote',
    'mobilizesupport': 'mobilizeSupport',
    'curatedsales': 'curatedSales',
    'learngrow': 'learnGrow',
    // Old format (with "And") - for backward compatibility
    'connectandpromote': 'connectPromote',
    'mobilizeandsupport': 'mobilizeSupport',
    'learnandgrow': 'learnGrow',
  };

  const mappedCategory = normalizedMap[normalized] || (mainCategory as MainCategory);
  
  return MAIN_CATEGORY_LABELS[mappedCategory as MainCategory] || 'Circle';
}

/**
 * Check if a string is a valid main category
 */
export function isValidMainCategory(category: string): category is MainCategory {
  return category in MAIN_CATEGORY_LABELS;
}

/**
 * Check if an event category matches a filter category
 * Used for filtering events by category
 */
export function categoryMatches(eventCategory: string | undefined, filterCategory: string): boolean {
  if (!eventCategory || !filterCategory) return false;
  if (filterCategory === 'All') return true;
  
  // Case-insensitive comparison
  return eventCategory.toLowerCase() === filterCategory.toLowerCase();
}

/**
 * Translate category name to the specified language
 * Maps English category names to their translated equivalents
 */
export function translateCategory(category: string, language: Language): string {
  // Map English category names to translation keys
  const categoryKeyMap: Record<string, keyof typeof translations.en.categories> = {
    'All': 'all',
    'Community': 'community',
    'Music': 'music',
    'Workshops': 'workshops',
    'Workshop': 'workshop',
    'Markets': 'markets',
    'Sports': 'sports',
    'Social': 'social',
    'Shows': 'shows',
    'Food & Drink': 'foodDrink',
    'Wellness': 'wellness',
  };

  const translationKey = categoryKeyMap[category];
  if (translationKey) {
    return translations[language].categories[translationKey] || category;
  }

  // Fallback to original category if no translation found
  return category;
}
