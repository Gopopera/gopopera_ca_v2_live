/**
 * Vibes constants and utilities
 * 
 * This file re-exports from src/constants/vibes.ts and provides
 * backward compatibility for legacy vibe usage.
 */

// Re-export everything from the new constants file
export {
  type BilingualLabel,
  type VibePreset,
  type EventVibe,
  type LegacyVibe,
  type AnyVibe,
  VIBE_PRESETS_BY_CATEGORY,
  ALL_PRESET_KEYS,
  ALL_PRESET_LABELS,
  getVibePresetsForCategory,
  getVibeLabel,
  findPresetByKeyOrLabel,
  normalizeVibeKey,
  createCustomVibe,
  presetToEventVibe,
  isPresetVibe,
  labelMatchesPreset,
  dedupeVibes,
  normalizeLegacyVibes,
  isLegacyVibesFormat,
  validateCustomVibeLabel,
  MAX_VIBES,
  MIN_VIBES,
  MAX_VIBE_LABEL_LENGTH,
  FOOD_DRINK_VIBES,
  SPORTS_RECREATION_VIBES,
  WORKSHOPS_SKILLS_VIBES,
  ARTS_CULTURE_VIBES,
  COMMUNITY_CAUSES_VIBES,
} from '../src/constants/vibes';

/**
 * LEGACY: All vibes as a flat array of strings
 * @deprecated Use VIBE_PRESETS_BY_CATEGORY instead
 * Kept for backward compatibility with existing code
 */
export const ALL_VIBES = [
  // Legacy attribute vibes (for existing filter UI)
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
  
  // Legacy subcategory vibes
  'Music',
  'Food & Drink',
  'Markets',
  'Sports',
  'Wellness',
  'Community',
  'Workshops',
  'Shows',
  
  // New preset keys (for filter compatibility)
  'private_chef',
  'tasting_pairing',
  'brunch_dinner_meetup',
  'pickleball',
  'soccer',
  'run_club',
  'hands_on_skill',
  'beginner_friendly',
  'practice_circle',
  'live_local',
  'creative_jam',
  'museums_exhibits',
  'volunteer_give_back',
  'support_circle',
  'local_action',
] as const;

export type Vibe = typeof ALL_VIBES[number];

/**
 * Check if a string is a valid vibe (legacy or new)
 */
export function isValidVibe(vibe: string): vibe is Vibe {
  return ALL_VIBES.includes(vibe as Vibe);
}

/**
 * Get display label for a vibe (legacy version - no locale)
 * @deprecated Use getVibeLabel(vibe, locale) from src/constants/vibes instead
 */
export function getLegacyVibeLabel(vibe: string): string {
  if (isValidVibe(vibe)) {
    return vibe;
  }
  // Fallback: capitalize first letter of each word
  return vibe
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
