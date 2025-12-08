/**
 * Avatar Utility Functions
 * Ensures consistent avatar fallbacks across all components
 */

/**
 * Generate initials from a display name
 * Returns first letter, or first letter of each word (up to 2 letters)
 */
export function getInitials(displayName: string | null | undefined): string {
  if (!displayName || displayName.trim() === '') {
    return 'U'; // Default to 'U' for Unknown
  }
  
  const words = displayName.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0][0].toUpperCase();
  }
  
  // Return first letter of first two words (up to 2 letters)
  return words
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

/**
 * Generate a consistent color based on user's name/ID
 * Uses a simple hash function to ensure the same user always gets the same color
 * Prefers ID over name for consistency across different name formats
 */
export function getAvatarColor(identifier: string | null | undefined, userId?: string | null): string {
  // Prefer userId for consistency, fallback to identifier (name)
  const key = userId || identifier;
  if (!key || key.trim() === '') {
    return '#15383c'; // Default dark teal
  }
  
  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use Popera brand colors as the palette
  const colors = [
    '#15383c', // Dark teal (primary)
    '#1f4d52', // Medium teal
    '#e35e25', // Orange (accent)
    '#2a5f66', // Darker teal
    '#3d7a82', // Lighter teal
  ];
  
  // Convert hash to positive number and select color
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Get avatar background color class for Tailwind
 * Returns the hex color (for inline styles) or a predefined class
 * Prefers userId over identifier for consistency
 */
export function getAvatarBgColor(identifier: string | null | undefined, userId?: string | null): string {
  const color = getAvatarColor(identifier, userId);
  
  // Map hex colors to Tailwind classes for consistency
  const colorMap: Record<string, string> = {
    '#15383c': 'bg-[#15383c]',
    '#1f4d52': 'bg-[#1f4d52]',
    '#e35e25': 'bg-[#e35e25]',
    '#2a5f66': 'bg-[#2a5f66]',
    '#3d7a82': 'bg-[#3d7a82]',
  };
  
  return colorMap[color] || 'bg-[#15383c]';
}

