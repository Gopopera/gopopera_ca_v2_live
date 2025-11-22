/**
 * Formats a rating to display with a maximum of 1 decimal place
 * Removes trailing zeros (e.g., 4.0 -> 4, 4.5 -> 4.5, 4.2 -> 4.2)
 * @param rating - The rating number to format
 * @returns Formatted rating string
 */
export const formatRating = (rating: number | undefined): string => {
  if (rating === undefined || typeof rating !== 'number' || isNaN(rating)) {
    return '0';
  }
  
  // Clamp rating between 0 and 5
  const clampedRating = Math.max(0, Math.min(5, rating));
  
  // Format to 1 decimal place, then remove trailing zeros
  const formatted = clampedRating.toFixed(1);
  
  // Remove trailing zeros and decimal point if not needed
  return parseFloat(formatted).toString();
};

