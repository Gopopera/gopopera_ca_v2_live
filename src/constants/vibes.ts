/**
 * Vibes Constants - Single Source of Truth for Bilingual Vibe Presets
 * 
 * This file defines all vibe presets organized by main category.
 * All vibes support both English and French labels.
 */

import type { MainCategory } from '../../utils/categoryMapper';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Bilingual label structure
 */
export interface BilingualLabel {
  en: string;
  fr: string;
}

/**
 * Vibe preset (predefined vibes with known keys)
 */
export interface VibePreset {
  key: string;
  label: BilingualLabel;
}

/**
 * Event vibe (can be preset or custom)
 * This is the structure stored in Firestore for new events
 */
export interface EventVibe {
  key: string;
  label: BilingualLabel;
  isCustom?: boolean;
}

/**
 * Legacy vibe (string format for backward compatibility)
 */
export type LegacyVibe = string;

/**
 * Union type for vibes that can be either new format or legacy
 */
export type AnyVibe = EventVibe | LegacyVibe;

// ============================================================================
// VIBE PRESETS BY CATEGORY
// ============================================================================

/**
 * Food & Drink vibes (eatDrink)
 */
export const FOOD_DRINK_VIBES: VibePreset[] = [
  { key: 'private_chef', label: { en: 'Private Chef', fr: 'Chef privé' } },
  { key: 'tasting_pairing', label: { en: 'Tasting / Pairing', fr: 'Dégustation / Accords' } },
  { key: 'brunch_dinner_meetup', label: { en: 'Brunch / Dinner Meet-up', fr: 'Brunch / Souper social' } },
];

/**
 * Sports & Recreation vibes (moveFlow)
 */
export const SPORTS_RECREATION_VIBES: VibePreset[] = [
  { key: 'pickleball', label: { en: 'Pickleball', fr: 'Pickleball' } },
  { key: 'soccer', label: { en: 'Soccer', fr: 'Soccer' } },
  { key: 'run_club', label: { en: 'Run Club', fr: 'Club de course' } },
];

/**
 * Workshops & Skills vibes (makeCreate)
 */
export const WORKSHOPS_SKILLS_VIBES: VibePreset[] = [
  { key: 'hands_on_skill', label: { en: 'Hands-on Skill', fr: 'Compétence pratique' } },
  { key: 'beginner_friendly', label: { en: 'Beginner-friendly', fr: 'Débutant bienvenu' } },
  { key: 'practice_circle', label: { en: 'Practice Circle', fr: 'Cercle de pratique' } },
];

/**
 * Arts & Culture vibes (talkThink)
 */
export const ARTS_CULTURE_VIBES: VibePreset[] = [
  { key: 'live_local', label: { en: 'Live & Local', fr: 'Scène locale' } },
  { key: 'creative_jam', label: { en: 'Creative Jam', fr: 'Jam créatif' } },
  { key: 'museums_exhibits', label: { en: 'Museums / Exhibits', fr: 'Musées / Expos' } },
];

/**
 * Community & Causes vibes (communitySupport)
 */
export const COMMUNITY_CAUSES_VIBES: VibePreset[] = [
  { key: 'volunteer_give_back', label: { en: 'Volunteer / Give Back', fr: 'Bénévolat' } },
  { key: 'support_circle', label: { en: 'Support Circle', fr: 'Cercle de soutien' } },
  { key: 'local_action', label: { en: 'Local Action', fr: 'Action locale' } },
];

/**
 * All vibe presets organized by main category key
 */
export const VIBE_PRESETS_BY_CATEGORY: Record<MainCategory, VibePreset[]> = {
  eatDrink: FOOD_DRINK_VIBES,
  moveFlow: SPORTS_RECREATION_VIBES,
  makeCreate: WORKSHOPS_SKILLS_VIBES,
  talkThink: ARTS_CULTURE_VIBES,
  communitySupport: COMMUNITY_CAUSES_VIBES,
};

/**
 * All preset keys for quick lookup
 */
export const ALL_PRESET_KEYS: Set<string> = new Set(
  Object.values(VIBE_PRESETS_BY_CATEGORY).flatMap(vibes => vibes.map(v => v.key))
);

/**
 * All preset labels (both EN and FR) for duplicate detection
 */
export const ALL_PRESET_LABELS: Set<string> = new Set(
  Object.values(VIBE_PRESETS_BY_CATEGORY).flatMap(vibes => 
    vibes.flatMap(v => [v.label.en.toLowerCase(), v.label.fr.toLowerCase()])
  )
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get vibes for a specific category
 */
export function getVibePresetsForCategory(category: MainCategory): VibePreset[] {
  return VIBE_PRESETS_BY_CATEGORY[category] || [];
}

/**
 * Get the display label for a vibe in the specified locale
 * Handles both EventVibe objects and legacy string vibes
 */
export function getVibeLabel(vibe: AnyVibe, locale: 'en' | 'fr' = 'en'): string {
  // If it's a string (legacy format), return as-is
  if (typeof vibe === 'string') {
    // Try to find matching preset by key or label
    const preset = findPresetByKeyOrLabel(vibe);
    if (preset) {
      return preset.label[locale];
    }
    // Return the string as-is (legacy fallback)
    return vibe;
  }
  
  // It's an EventVibe object
  return vibe.label[locale];
}

/**
 * Find a preset by key or label (case-insensitive)
 */
export function findPresetByKeyOrLabel(search: string): VibePreset | null {
  const normalized = search.toLowerCase().trim();
  
  for (const vibes of Object.values(VIBE_PRESETS_BY_CATEGORY)) {
    for (const preset of vibes) {
      if (
        preset.key === normalized ||
        preset.label.en.toLowerCase() === normalized ||
        preset.label.fr.toLowerCase() === normalized
      ) {
        return preset;
      }
    }
  }
  
  return null;
}

/**
 * Normalize a string to create a stable key
 * Used for custom vibes
 */
export function normalizeVibeKey(enLabel: string, frLabel: string): string {
  const base = `${enLabel}_${frLabel}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 30);
  
  // Add a short hash for uniqueness
  const hash = simpleHash(`${enLabel}${frLabel}`).toString(16).substring(0, 6);
  return `custom_${base}_${hash}`;
}

/**
 * Simple hash function for generating unique-ish keys
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Create a custom vibe from EN and FR labels
 */
export function createCustomVibe(enLabel: string, frLabel: string): EventVibe {
  return {
    key: normalizeVibeKey(enLabel, frLabel),
    label: {
      en: enLabel.trim(),
      fr: frLabel.trim(),
    },
    isCustom: true,
  };
}

/**
 * Create an EventVibe from a preset
 */
export function presetToEventVibe(preset: VibePreset): EventVibe {
  return {
    key: preset.key,
    label: preset.label,
    isCustom: false,
  };
}

/**
 * Check if a vibe is a preset (by key)
 */
export function isPresetVibe(key: string): boolean {
  return ALL_PRESET_KEYS.has(key);
}

/**
 * Check if a label matches any preset (for duplicate detection)
 */
export function labelMatchesPreset(label: string): boolean {
  return ALL_PRESET_LABELS.has(label.toLowerCase().trim());
}

/**
 * Deduplicate vibes by key
 */
export function dedupeVibes(vibes: EventVibe[]): EventVibe[] {
  const seen = new Set<string>();
  return vibes.filter(vibe => {
    if (seen.has(vibe.key)) return false;
    seen.add(vibe.key);
    return true;
  });
}

/**
 * Convert legacy string[] vibes to EventVibe[] for rendering
 * Does NOT modify the database - just for display
 */
export function normalizeLegacyVibes(vibes: (string | EventVibe)[]): EventVibe[] {
  return vibes.map(vibe => {
    // Already in new format
    if (typeof vibe === 'object' && vibe.key && vibe.label) {
      return vibe as EventVibe;
    }
    
    // Legacy string format
    const str = vibe as string;
    const preset = findPresetByKeyOrLabel(str);
    
    if (preset) {
      return presetToEventVibe(preset);
    }
    
    // Unknown legacy vibe - use same string for both languages
    return {
      key: str.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      label: { en: str, fr: str },
      isCustom: true,
    };
  });
}

/**
 * Check if vibes array is in legacy format (string[])
 */
export function isLegacyVibesFormat(vibes: unknown): vibes is string[] {
  if (!Array.isArray(vibes)) return false;
  if (vibes.length === 0) return false;
  return typeof vibes[0] === 'string';
}

/**
 * Validate that a vibe label doesn't conflict with existing vibes
 * Returns error message if invalid, null if valid
 */
export function validateCustomVibeLabel(
  enLabel: string,
  frLabel: string,
  existingVibes: EventVibe[]
): string | null {
  const enNormalized = enLabel.toLowerCase().trim();
  const frNormalized = frLabel.toLowerCase().trim();
  
  // Check if empty
  if (!enNormalized || !frNormalized) {
    return 'Both EN and FR labels are required';
  }
  
  // Check length
  if (enLabel.length > 28 || frLabel.length > 28) {
    return 'Labels must be 28 characters or less';
  }
  
  // Check against presets
  if (labelMatchesPreset(enNormalized) || labelMatchesPreset(frNormalized)) {
    return 'This label matches an existing preset';
  }
  
  // Check against already selected vibes
  for (const existing of existingVibes) {
    if (
      existing.label.en.toLowerCase() === enNormalized ||
      existing.label.fr.toLowerCase() === frNormalized ||
      existing.label.en.toLowerCase() === frNormalized ||
      existing.label.fr.toLowerCase() === enNormalized
    ) {
      return 'This label is already selected';
    }
  }
  
  return null; // Valid
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum number of vibes allowed per event
 */
export const MAX_VIBES = 3;

/**
 * Minimum number of vibes required per event
 */
export const MIN_VIBES = 1;

/**
 * Maximum length for custom vibe labels
 */
export const MAX_VIBE_LABEL_LENGTH = 28;

