/**
 * Vibes constants and utilities
 * All available vibe tags for events
 */

export const ALL_VIBES = [
  'Creative',
  'Movement',
  'Social',
  'Wellness',
  'Spiritual',
  'Learning',
  'Resilience',
  'Cozy',
  'Outdoors',
  'Curious',
  'Purposeful',
  'Music',
  'Sports',
  'Food & Drink',
  'Markets',
  'Hands-On',
  'Performances',
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

