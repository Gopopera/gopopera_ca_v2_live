/**
 * Format a date for ticket export display.
 * Returns: "Fri, January 30th 2026"
 */
export function formatTicketDate(date: Date): string {
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
  const day = date.getDate();
  const year = date.getFullYear();
  
  // Ordinal suffix
  const ordinal = getOrdinalSuffix(day);
  
  return `${weekday}, ${month} ${day}${ordinal} ${year}`;
}

/**
 * Get ordinal suffix for a day number.
 * 1 -> "st", 2 -> "nd", 3 -> "rd", 4-20 -> "th", 21 -> "st", etc.
 */
function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Safely truncate a title to a max length with ellipsis.
 * Used instead of CSS line-clamp for export reliability.
 */
export function truncateTitle(title: string, maxLength: number = 120): string {
  if (!title) return '';
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength - 3).trimEnd() + '…';
}

