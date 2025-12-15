/**
 * Vibes constants and utilities
 * Unified list combining subcategories and attribute vibes
 * All vibes are treated equally for filtering and event creation
 */

export const ALL_VIBES = [
  // Attribute Vibes (atmosphere/style)
  'Creative',
  'Movement',
  'Social',
  'Spiritual',
  'Learning',
  'Outdoors',
  'Curious',
  'Purposeful',
  'Hands-On',
  'Performances',
  
  // Subcategory Vibes (activity types - blended with attributes)
  'Music',
  'Food & Drink',
  'Markets',
  'Sports',
  'Wellness',
  'Community',
  'Workshops',
  'Shows',
] as const;

export type Vibe = typeof ALL_VIBES[number];

/**
 * Check if a string is a valid vibe
 */
export function isValidVibe(vibe: string): vibe is Vibe {
  return ALL_VIBES.includes(vibe as Vibe);
}

/**
 * Get display label for a vibe (with proper capitalization)
 */
export function getVibeLabel(vibe: string): string {
  if (isValidVibe(vibe)) {
    return vibe;
  }
  // Fallback: capitalize first letter of each word
  return vibe
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

