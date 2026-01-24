/**
 * Formats a date string to a readable format: "Thurs, May 12th 2025"
 * @param dateString - Date string in various formats (ISO, "2026-02-01", etc.)
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    // Handle different date formats
    let date: Date;
    
    // Handle ISO date format (YYYY-MM-DD) - parse manually to avoid timezone issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day); // month is 0-indexed
    } else if (dateString.includes('T') || dateString.includes('-')) {
      // Try parsing as ISO string
      date = new Date(dateString);
    } else {
      // Try parsing other formats
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // Fallback: try to parse common formats
      const parts = dateString.split(/[,\s-]+/);
      if (parts.length >= 3) {
        // Try "Fri, Feb 1, 2026" format
        const monthMap: Record<string, number> = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };
        const month = monthMap[parts[1]?.toLowerCase().substring(0, 3)];
        const day = parseInt(parts[2]);
        const year = parseInt(parts[3] || parts[parts.length - 1]);
        if (month !== undefined && !isNaN(day) && !isNaN(year)) {
          date = new Date(year, month, day);
        } else {
          return dateString; // Return original if can't parse
        }
      } else {
        return dateString; // Return original if can't parse
      }
    }
    
    // Format the date
    const weekdays = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    const weekday = weekdays[date.getDay()];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    // Add ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
    const getOrdinal = (n: number): string => {
      if (n > 3 && n < 21) return n + 'th'; // 4th-20th all use 'th'
      switch (n % 10) {
        case 1: return n + 'st';
        case 2: return n + 'nd';
        case 3: return n + 'rd';
        default: return n + 'th';
      }
    };
    
    return `${weekday}, ${month} ${getOrdinal(day)} ${year}`;
  } catch (error) {
    // If parsing fails, return original string
    return dateString;
  }
};

