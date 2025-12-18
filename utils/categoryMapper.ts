/**
 * Category Taxonomy - Single Source of Truth
 * 
 * This file defines all category-related constants, types, and helper functions.
 * All UI surfaces that display/select/filter categories should use this file.
 * 
 * NEW CATEGORIES (as of Dec 2024):
 * - MAKE & CREATE
 * - EAT & DRINK
 * - MOVE & FLOW
 * - TALK & THINK
 * - COMMUNITY & SUPPORT
 * 
 * LEGACY CATEGORIES (for backward compatibility):
 * - SELL & SHOP (curatedSales) → MAKE & CREATE
 * - CONNECT & PROMOTE (connectPromote) → TALK & THINK
 * - MOBILIZE & SUPPORT (mobilizeSupport) → COMMUNITY & SUPPORT
 * - LEARN & GROW (learnGrow) → TALK & THINK
 */

import type { Language } from '../translations';
import { translations } from '../translations';

// ============================================================================
// CATEGORY KEYS (stable internal identifiers)
// ============================================================================

export type MainCategory = 
  | 'makeCreate' 
  | 'eatDrink' 
  | 'moveFlow' 
  | 'talkThink'
  | 'communitySupport';

// Legacy category keys (for backward compatibility)
export type LegacyCategory = 
  | 'curatedSales' 
  | 'connectPromote' 
  | 'mobilizeSupport' 
  | 'learnGrow';

// Combined type for any category key
export type AnyCategory = MainCategory | LegacyCategory;

// ============================================================================
// CATEGORY ARRAYS (for iteration)
// ============================================================================

/**
 * Ordered list of new category keys
 * This order is used for UI display (filter chips, selectors, pillar cards)
 */
export const MAIN_CATEGORIES: MainCategory[] = [
  'makeCreate',
  'eatDrink',
  'moveFlow',
  'talkThink',
  'communitySupport',
];

/**
 * Legacy category keys (for reference and backward compatibility)
 */
export const LEGACY_CATEGORIES: LegacyCategory[] = [
  'curatedSales',
  'connectPromote',
  'mobilizeSupport',
  'learnGrow',
];

// ============================================================================
// CATEGORY LABELS (English)
// ============================================================================

export const MAIN_CATEGORY_LABELS: Record<MainCategory, string> = {
  makeCreate: 'MAKE & CREATE',
  eatDrink: 'EAT & DRINK',
  moveFlow: 'MOVE & FLOW',
  talkThink: 'TALK & THINK',
  communitySupport: 'COMMUNITY & SUPPORT',
};

export const MAIN_CATEGORY_LABELS_FR: Record<MainCategory, string> = {
  makeCreate: 'CRÉER & FABRIQUER',
  eatDrink: 'MANGER & BOIRE',
  moveFlow: 'BOUGER & RESPIRER',
  talkThink: 'DISCUTER & RÉFLÉCHIR',
  communitySupport: 'COMMUNAUTÉ & SOUTIEN',
};

// ============================================================================
// BACKWARD COMPATIBILITY MAPPING
// ============================================================================

/**
 * Maps old category keys to new category keys
 * 
 * Mapping decisions:
 * - curatedSales (SELL & SHOP) → makeCreate: Selling often involves handmade/craft items
 * - connectPromote (CONNECT & PROMOTE) → talkThink: Connection through conversation
 * - mobilizeSupport (MOBILIZE & SUPPORT) → communitySupport: Direct match in purpose
 * - learnGrow (LEARN & GROW) → talkThink: Learning through discussion and thought
 */
export const LEGACY_CATEGORY_MAP: Record<LegacyCategory, MainCategory> = {
  curatedSales: 'makeCreate',
  connectPromote: 'talkThink',
  mobilizeSupport: 'communitySupport',
  learnGrow: 'talkThink',
};

/**
 * Maps old stored label strings to new category keys
 * Handles various formats that might exist in the database
 */
const LEGACY_LABEL_MAP: Record<string, MainCategory> = {
  // Old label strings (English)
  'sell & shop': 'makeCreate',
  'connect & promote': 'talkThink',
  'mobilize & support': 'communitySupport',
  'learn & grow': 'talkThink',
  // Old label strings (variations)
  'sellandshop': 'makeCreate',
  'connectandpromote': 'talkThink',
  'mobilizeandsupport': 'communitySupport',
  'learnandgrow': 'talkThink',
  // Old key variations
  'curatedsales': 'makeCreate',
  'connectpromote': 'talkThink',
  'mobilizesupport': 'communitySupport',
  'learngrow': 'talkThink',
  // New labels (for validation)
  'make & create': 'makeCreate',
  'eat & drink': 'eatDrink',
  'move & flow': 'moveFlow',
  'talk & think': 'talkThink',
  'community & support': 'communitySupport',
  // New keys
  'makecreate': 'makeCreate',
  'eatdrink': 'eatDrink',
  'moveflow': 'moveFlow',
  'talkthink': 'talkThink',
  'communitysupport': 'communitySupport',
};

// ============================================================================
// VIBE TO CATEGORY MAPPING
// ============================================================================

/**
 * Mapping of vibes to main categories
 * Each vibe belongs to exactly one main category
 * Used for fallback derivation when mainCategory is not set
 */
export const VIBE_TO_CATEGORY: Record<string, MainCategory> = {
  // MAKE & CREATE
  'Markets': 'makeCreate',
  'Hands-On': 'makeCreate',
  'Creative': 'makeCreate',
  'Workshops': 'makeCreate',
  
  // EAT & DRINK
  'Food & Drink': 'eatDrink',
  
  // MOVE & FLOW
  'Sports': 'moveFlow',
  'Movement': 'moveFlow',
  'Wellness': 'moveFlow',
  'Outdoors': 'moveFlow',
  
  // TALK & THINK
  'Learning': 'talkThink',
  'Curious': 'talkThink',
  'Social': 'talkThink',
  
  // COMMUNITY & SUPPORT
  'Community': 'communitySupport',
  'Purposeful': 'communitySupport',
  'Spiritual': 'communitySupport',
  
  // Entertainment (default to talkThink for social gatherings)
  'Music': 'talkThink',
  'Performances': 'talkThink',
  'Shows': 'talkThink',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a string is a valid new category key
 */
export function isValidMainCategory(category: string): category is MainCategory {
  return MAIN_CATEGORIES.includes(category as MainCategory);
}

/**
 * Check if a string is a legacy category key
 */
export function isLegacyCategory(category: string): category is LegacyCategory {
  return LEGACY_CATEGORIES.includes(category as LegacyCategory);
}

/**
 * Normalize any category input to a valid MainCategory key
 * Returns null if input cannot be mapped to any category
 */
export function normalizeCategory(input: string | null | undefined): MainCategory | null {
  if (!input) return null;
  
  const normalized = input.toLowerCase().trim().replace(/[\s&]+/g, '');
  
  // Check if it's already a valid new category key
  if (isValidMainCategory(input)) {
    return input;
  }
  
  // Check if it's a legacy category key
  if (isLegacyCategory(input)) {
    return LEGACY_CATEGORY_MAP[input];
  }
  
  // Check label map (handles various string formats)
  const lowercaseInput = input.toLowerCase().trim();
  if (lowercaseInput in LEGACY_LABEL_MAP) {
    return LEGACY_LABEL_MAP[lowercaseInput];
  }
  
  // Try normalized version
  if (normalized in LEGACY_LABEL_MAP) {
    return LEGACY_LABEL_MAP[normalized];
  }
  
  // No mapping found
  return null;
}

/**
 * Get display label for a category key
 * Handles both new and legacy keys, with locale support
 */
export function getCategoryLabel(key: string | null | undefined, locale: Language = 'en'): string {
  if (!key) return '';
  
  // Normalize to new category key
  const normalizedKey = normalizeCategory(key);
  
  if (!normalizedKey) {
    // Return empty string for unknown categories (hide rather than show "OTHER")
    return '';
  }
  
  return locale === 'fr' 
    ? MAIN_CATEGORY_LABELS_FR[normalizedKey] 
    : MAIN_CATEGORY_LABELS[normalizedKey];
}

/**
 * Get all database values that should match a given category filter
 * Includes both new and legacy values for backward compatibility
 */
export function getFilterCategoryMatches(key: MainCategory): string[] {
  const matches: string[] = [key];
  
  // Add legacy keys that map to this category
  for (const [legacyKey, mappedCategory] of Object.entries(LEGACY_CATEGORY_MAP)) {
    if (mappedCategory === key) {
      matches.push(legacyKey);
    }
  }
  
  // Add label strings (for events that might have stored labels instead of keys)
  matches.push(MAIN_CATEGORY_LABELS[key].toLowerCase());
  
  return matches;
}

/**
 * Get vibes grouped by main category
 * Returns an object with category keys and arrays of vibes
 */
export function getVibesByCategory(): Record<MainCategory, string[]> {
  const result: Record<MainCategory, string[]> = {
    makeCreate: [],
    eatDrink: [],
    moveFlow: [],
    talkThink: [],
    communitySupport: [],
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
  // If mainCategory exists, try to normalize it
  if (item.mainCategory) {
    const normalized = normalizeCategory(item.mainCategory);
    if (normalized) return normalized;
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
    return normalizeCategory(item.category);
  }
  
  // No category can be determined
  return null;
}

/**
 * Get mainCategory from event, with backward compatibility
 * Checks mainCategory first, then falls back to category field
 * Returns a default category if none can be determined
 */
export function getMainCategoryFromEvent(event: { mainCategory?: string | null; category?: string | null }): MainCategory {
  // If mainCategory exists, try to normalize it
  if (event.mainCategory) {
    const normalized = normalizeCategory(event.mainCategory);
    if (normalized) return normalized;
  }

  // Otherwise, try to map from old category field
  if (event.category) {
    const normalized = normalizeCategory(event.category);
    if (normalized) return normalized;
  }

  // Default to talkThink (most generic category) if nothing can be determined
  return 'talkThink';
}

/**
 * Get display label for main category from event
 * Handles backward compatibility automatically
 */
export function getMainCategoryLabelFromEvent(event: { mainCategory?: string | null; category?: string | null }, locale: Language = 'en'): string {
  const mainCategory = getMainCategoryFromEvent(event);
  return getCategoryLabel(mainCategory, locale);
}

/**
 * Check if an event category matches a filter category
 * Used for filtering events by category with backward compatibility
 */
export function categoryMatches(eventCategory: string | undefined, filterCategory: MainCategory | null): boolean {
  if (!filterCategory) return true; // No filter = show all
  if (!eventCategory) return false;
  
  // Normalize the event's category
  const normalizedEventCategory = normalizeCategory(eventCategory);
  
  // Check if they match
  return normalizedEventCategory === filterCategory;
}

/**
 * Translate category name to the specified language
 * This is a convenience function that wraps getCategoryLabel
 */
export function translateCategory(category: string, language: Language): string {
  return getCategoryLabel(category, language) || category;
}
