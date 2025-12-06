/**
 * Main Category mapping for Circles + Sessions model
 * Maps stored values to display labels
 */

export type MainCategory = 
  | 'curatedSales' 
  | 'connectPromote' 
  | 'mobilizeSupport' 
  | 'learnAndGrow';

export const MAIN_CATEGORY_LABELS: Record<MainCategory, string> = {
  curatedSales: 'Curated Sales',
  connectPromote: 'Connect & Promote',
  mobilizeSupport: 'Mobilize & Support',
  learnAndGrow: 'Learn & Grow',
};

/**
 * Get display label for main category
 * Falls back to "Circle" if category is missing or unknown
 */
export function getMainCategoryLabel(mainCategory?: string | null): string {
  if (!mainCategory) {
    return 'Circle';
  }
  
  return MAIN_CATEGORY_LABELS[mainCategory as MainCategory] || 'Circle';
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
